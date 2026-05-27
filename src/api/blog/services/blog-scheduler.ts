import type { Core } from '@strapi/strapi';
import { BLOG_UID } from '../../../utils/blog-documents';
import {
  BlogCreateFromGeneratedError,
  createBlogFromGenerated,
} from './blog-create-from-generated';

let generateInProgress = false;

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
});
