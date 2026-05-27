import type { Core } from '@strapi/strapi';
import { BLOG_UID } from '../../../utils/blog-documents';
import { CURATED_INDIA_TRENDING_TOPICS } from '../prompts/blog-generate-enhanced-prompts';
import {
  BlogCreateFromGeneratedError,
  createBlogFromGenerated,
} from './blog-create-from-generated';
import { isInsufficientBalanceError } from './deepseek-client';

let generateInProgress = false;
let enhancedGenerateInProgress = false;

function envBool(name: string, defaultValue: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    return defaultValue;
  }
  return raw === 'true' || raw === '1';
}

function envInt(name: string, defaultValue: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    return defaultValue;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async publishDueBlogs() {
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
    if (!envBool('CRON_BLOG_GENERATE_ENABLED', false)) {
      return { skipped: true, reason: 'disabled' };
    }

    if (generateInProgress) {
      strapi.log.warn('[blog-scheduler] Generate skipped — previous run still in progress');
      return { skipped: true, reason: 'in_progress' };
    }

    const topic = process.env.CRON_BLOG_GENERATE_TOPIC?.trim();
    if (!topic) {
      strapi.log.warn(
        '[blog-scheduler] CRON_BLOG_GENERATE_ENABLED but CRON_BLOG_GENERATE_TOPIC is missing'
      );
      return { skipped: true, reason: 'no_topic' };
    }

    generateInProgress = true;

    try {
      const generated = await strapi
        .service('api::blog.blog-generate')
        .generate(topic);

      const publishImmediately = envBool('CRON_BLOG_GENERATE_PUBLISH', false);
      const delayHours = envInt('CRON_BLOG_GENERATE_DELAY_HOURS', 0);

      let scheduledPublishAt: Date | null = null;
      if (!publishImmediately && delayHours > 0) {
        scheduledPublishAt = new Date(Date.now() + delayHours * 60 * 60 * 1000);
      }

      const entry = await createBlogFromGenerated(strapi, generated, {
        blogAuthorSlug: process.env.CRON_BLOG_GENERATE_AUTHOR_SLUG?.trim() || undefined,
        breadcrumbName: process.env.CRON_BLOG_GENERATE_BREADCRUMB?.trim() || undefined,
        scheduledPublishAt,
        status: publishImmediately ? 'published' : 'draft',
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
    if (!envBool('CRON_BLOG_ENHANCED_ENABLED', false)) {
      return { skipped: true, reason: 'disabled' };
    }

    if (enhancedGenerateInProgress) {
      strapi.log.warn(
        '[blog-scheduler] Enhanced generate skipped — previous run still in progress'
      );
      return { skipped: true, reason: 'in_progress' };
    }

    const minIntervalHours = envInt('CRON_BLOG_ENHANCED_MIN_INTERVAL_HOURS', 72);
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

    const weekIndex = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
    const trending =
      CURATED_INDIA_TRENDING_TOPICS[
        weekIndex % CURATED_INDIA_TRENDING_TOPICS.length
      ];
    const angle =
      trending.suggestedAngles[
        Math.floor(Math.random() * trending.suggestedAngles.length)
      ];

    enhancedGenerateInProgress = true;

    try {
      const generated = await strapi
        .service('api::blog.blog-generate-enhanced')
        .generateEnhanced({
          topic: trending.title,
          angle,
          trendingTopicId: trending.id,
          researchContext: `${trending.keyDetails} ${trending.whyHot}`,
        });

      const publishImmediately = envBool('CRON_BLOG_ENHANCED_PUBLISH', false);
      const delayHours = envInt('CRON_BLOG_ENHANCED_DELAY_HOURS', 24);

      let scheduledPublishAt: Date | null = null;
      if (!publishImmediately && delayHours > 0) {
        scheduledPublishAt = new Date(Date.now() + delayHours * 60 * 60 * 1000);
      }

      const entry = await createBlogFromGenerated(strapi, generated, {
        blogAuthorSlug:
          process.env.CRON_BLOG_ENHANCED_AUTHOR_SLUG?.trim() || undefined,
        breadcrumbName:
          process.env.CRON_BLOG_ENHANCED_BREADCRUMB?.trim() || undefined,
        scheduledPublishAt,
        status: publishImmediately ? 'published' : 'draft',
      });

      strapi.log.info(
        `[blog-scheduler] Enhanced blog documentId=${entry.documentId} topic="${trending.id}" angle="${angle}"`
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
