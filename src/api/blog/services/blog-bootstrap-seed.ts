import type { Core } from '@strapi/strapi';
import {
  DEFAULT_CRON_JOB_SEEDS,
  DEFAULT_TRENDING_TOPIC_SEEDS,
} from '../data/blog-seed-defaults';

const TRENDING_UID = 'api::blog-trending-topic.blog-trending-topic';
const CRON_JOB_UID = 'api::blog-cron-job.blog-cron-job';

export async function seedBlogTrendingTopicsAndCronJobs(
  strapi: Core.Strapi
): Promise<void> {
  const trendingCount = await strapi.documents(TRENDING_UID).count({});
  if (trendingCount === 0) {
    for (const seed of DEFAULT_TRENDING_TOPIC_SEEDS) {
      await strapi.documents(TRENDING_UID).create({
        data: {
          topicId: seed.topicId,
          title: seed.title,
          keyDetails: seed.keyDetails,
          whyHot: seed.whyHot,
          suggestedAngles: [...seed.suggestedAngles],
          isActive: seed.isActive,
          region: seed.region,
          sortOrder: seed.sortOrder,
        },
        status: 'published',
      });
    }
    strapi.log.info(
      `[bootstrap] Seeded ${DEFAULT_TRENDING_TOPIC_SEEDS.length} blog trending topics`
    );
  }

  const cronCount = await strapi.documents(CRON_JOB_UID).count({});
  if (cronCount === 0) {
    for (const seed of DEFAULT_CRON_JOB_SEEDS) {
      await strapi.documents(CRON_JOB_UID).create({
        data: {
          jobKey: seed.jobKey,
          label: seed.label,
          enabled: seed.enabled,
          cronRule: seed.cronRule,
          timezone: seed.timezone,
          topic: seed.topic ?? null,
          publishImmediately: seed.publishImmediately ?? false,
          delayHours: seed.delayHours ?? 0,
          minIntervalHours: seed.minIntervalHours ?? 72,
          blogAuthorSlug: seed.blogAuthorSlug ?? null,
          breadcrumbName: seed.breadcrumbName ?? null,
          categoryName: seed.categoryName ?? null,
        },
      });
    }
    strapi.log.info(
      `[bootstrap] Seeded ${DEFAULT_CRON_JOB_SEEDS.length} blog cron jobs`
    );
  }
}
