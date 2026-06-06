import type { Core } from '@strapi/strapi';
import { BLOG_UID } from '../../../utils/blog-documents';
import { pickTopicForRotation } from '../../blog-trending-topic/services/blog-trending-topic';
import {
  getJobConfigWithEnvFallback,
  isCronGloballyEnabled,
} from '../../blog-cron-job/services/blog-cron-job';
import {
  BlogCreateFromGeneratedError,
  createBlogFromGenerated,
} from './blog-create-from-generated';
import { assertAiSuggestedCategoryAllowed } from './blog-generate-request-validator';
import { listCategoryNames } from './blog-relation-resolvers';
import { isInsufficientBalanceError } from './deepseek-client';

let generateInProgress = false;
let enhancedGenerateInProgress = false;

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async publishDueBlogs() {
    if (!isCronGloballyEnabled()) {
      return { skipped: true, reason: 'cron_disabled' };
    }

    const job = await getJobConfigWithEnvFallback(strapi, 'publish_scheduled');
    if (!job.enabled) {
      return { skipped: true, reason: 'disabled' };
    }

    const now = new Date().toISOString();

    const due = await strapi.documents(BLOG_UID).findMany({
      status: 'draft',
      filters: {
        scheduledPublishAt: { $lte: now },
      },
      fields: ['documentId', 'title', 'scheduledPublishAt'],
    });

    const blogs = Array.isArray(due) ? due : [];
    if (blogs.length === 0) {
      return { published: 0, failed: 0 };
    }

    let published = 0;
    let failed = 0;

    for (const blog of blogs) {
      if (!blog?.documentId) {
        failed += 1;
        continue;
      }

      try {
        await strapi.documents(BLOG_UID).publish({
          documentId: blog.documentId,
        });
        await strapi.documents(BLOG_UID).update({
          documentId: blog.documentId,
          data: { scheduledPublishAt: null },
        });
        published += 1;
        strapi.log.info(
          `[blog-scheduler] Published blog documentId=${blog.documentId} title="${blog.title ?? ''}"`
        );
      } catch (err) {
        failed += 1;
        strapi.log.error(
          `[blog-scheduler] Failed to publish documentId=${blog.documentId}:`,
          err
        );
      }
    }

    strapi.log.info(
      `[blog-scheduler] publishDueBlogs done — published=${published}, failed=${failed}`
    );

    return { published, failed };
  },

  async generateAndMaybeSchedule() {
    if (!isCronGloballyEnabled()) {
      return { skipped: true, reason: 'cron_disabled' };
    }

    const job = await getJobConfigWithEnvFallback(strapi, 'generate_basic');
    if (!job.enabled) {
      return { skipped: true, reason: 'disabled' };
    }

    if (generateInProgress) {
      strapi.log.warn('[blog-scheduler] Generate skipped — previous run still in progress');
      return { skipped: true, reason: 'in_progress' };
    }

    const topic = job.topic?.trim();
    if (!topic) {
      strapi.log.warn(
        '[blog-scheduler] generate_basic enabled but topic is missing in Blog Cron Job'
      );
      return { skipped: true, reason: 'no_topic' };
    }

    generateInProgress = true;

    try {
      const generated = await strapi
        .service('api::blog.blog-generate')
        .generate(topic);

      let scheduledPublishAt: Date | null = null;
      if (!job.publishImmediately && job.delayHours > 0) {
        scheduledPublishAt = new Date(Date.now() + job.delayHours * 60 * 60 * 1000);
      }

      const entry = await createBlogFromGenerated(strapi, generated, {
        blogAuthorSlug: job.blogAuthorSlug ?? undefined,
        breadcrumbName: job.breadcrumbName ?? undefined,
        scheduledPublishAt,
        status: job.publishImmediately ? 'published' : 'draft',
      });

      strapi.log.info(
        `[blog-scheduler] Generated blog documentId=${entry.documentId} title="${entry.title ?? ''}"`
      );

      return {
        skipped: false,
        documentId: entry.documentId,
        title: entry.title,
      };
    } catch (err) {
      if (err instanceof BlogCreateFromGeneratedError) {
        strapi.log.error(`[blog-scheduler] ${err.message}`);
      } else {
        strapi.log.error('[blog-scheduler] generateAndMaybeSchedule failed:', err);
      }
      throw err;
    } finally {
      generateInProgress = false;
    }
  },

  async generateEnhancedFromTrending() {
    if (!isCronGloballyEnabled()) {
      return { skipped: true, reason: 'cron_disabled' };
    }

    const job = await getJobConfigWithEnvFallback(strapi, 'generate_enhanced');
    if (!job.enabled) {
      return { skipped: true, reason: 'disabled' };
    }

    if (enhancedGenerateInProgress) {
      strapi.log.warn(
        '[blog-scheduler] Enhanced generate skipped — previous run still in progress'
      );
      return { skipped: true, reason: 'in_progress' };
    }

    const minIntervalHours = job.minIntervalHours;
    const since = new Date(
      Date.now() - minIntervalHours * 60 * 60 * 1000
    ).toISOString();

    const recentCount = await strapi.documents(BLOG_UID).count({
      filters: { createdAt: { $gte: since } },
    });

    if (recentCount > 0) {
      strapi.log.info(
        `[blog-scheduler] Enhanced generate skipped — ${recentCount} blog(s) created in last ${minIntervalHours}h`
      );
      return { skipped: true, reason: 'recent_blog_exists' };
    }

    const trending = await pickTopicForRotation(strapi);
    if (!trending) {
      strapi.log.warn(
        '[blog-scheduler] Enhanced generate skipped — no active trending topics'
      );
      return { skipped: true, reason: 'no_trending_topics' };
    }

    const angle =
      trending.suggestedAngles.length > 0
        ? trending.suggestedAngles[
            Math.floor(Math.random() * trending.suggestedAngles.length)
          ]
        : undefined;

    const allowedCategories = await listCategoryNames(strapi);
    if (allowedCategories.length === 0) {
      strapi.log.warn(
        '[blog-scheduler] Enhanced generate skipped — no blog categories in Strapi'
      );
      return { skipped: true, reason: 'no_categories' };
    }

    const cronCategoryName = job.categoryName ?? undefined;

    enhancedGenerateInProgress = true;

    try {
      const generated = await strapi
        .service('api::blog.blog-generate-enhanced')
        .generateEnhanced({
          topic: trending.title,
          angle,
          trendingTopicId: trending.id,
          trendingTopic: trending,
          researchContext: `${trending.keyDetails} ${trending.whyHot}`,
          allowedCategories,
          categoryName: cronCategoryName,
        });

      assertAiSuggestedCategoryAllowed(
        generated.suggestedCategory,
        allowedCategories,
        cronCategoryName
      );

      let scheduledPublishAt: Date | null = null;
      if (!job.publishImmediately && job.delayHours > 0) {
        scheduledPublishAt = new Date(Date.now() + job.delayHours * 60 * 60 * 1000);
      }

      const entry = await createBlogFromGenerated(strapi, generated, {
        blogAuthorSlug: job.blogAuthorSlug ?? undefined,
        breadcrumbName: job.breadcrumbName ?? undefined,
        categoryName: cronCategoryName,
        scheduledPublishAt,
        status: job.publishImmediately ? 'published' : 'draft',
      });

      strapi.log.info(
        `[blog-scheduler] Enhanced blog documentId=${entry.documentId} topic="${trending.id}" angle="${angle ?? ''}"`
      );

      return {
        skipped: false,
        documentId: entry.documentId,
        title: entry.title,
        trendingTopicId: trending.id,
        angle,
      };
    } catch (err) {
      if (isInsufficientBalanceError(err)) {
        strapi.log.error(
          '[blog-scheduler] Enhanced generate skipped — DeepSeek insufficient balance (402)'
        );
        return { skipped: true, reason: 'insufficient_balance' };
      }
      if (err instanceof BlogCreateFromGeneratedError) {
        strapi.log.error(`[blog-scheduler] ${err.message}`);
      } else {
        strapi.log.error(
          '[blog-scheduler] generateEnhancedFromTrending failed:',
          err
        );
      }
      throw err;
    } finally {
      enhancedGenerateInProgress = false;
    }
  },
});
