import type { Core } from '@strapi/strapi';
import { seedBlogTrendingTopicsAndCronJobs } from './api/blog/services/blog-bootstrap-seed';

export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    try {
      await seedBlogTrendingTopicsAndCronJobs(strapi);
    } catch (err) {
      strapi.log.error('[bootstrap] Failed to seed blog trending/cron data:', err);
    }
  },
};
