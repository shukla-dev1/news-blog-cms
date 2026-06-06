import type { Core } from '@strapi/strapi';

const cronTasks: Core.Config.Server['cron']['tasks'] = {
  publishScheduledBlogs: {
    task: async ({ strapi }) => {
      await strapi.service('api::blog.blog-scheduler').publishDueBlogs();
    },
    options: {

      // every 1 minute
      rule: process.env.CRON_PUBLISH_RULE ?? '*/1 * * * *', // every 1 minute
      ...(process.env.CRON_TZ ? { tz: process.env.CRON_TZ } : {}), // timezone
    },
  },
  generateScheduledBlog: {
    task: async ({ strapi }) => {
      try {
        await strapi.service('api::blog.blog-scheduler').generateAndMaybeSchedule();
      } catch {
        // Logged inside service; avoid crashing the cron runner
      }
    },
    options: {
      rule: process.env.CRON_BLOG_GENERATE_RULE ?? '0 9 * * 1',
      ...(process.env.CRON_TZ ? { tz: process.env.CRON_TZ } : {}),
    },
  },
  generateEnhancedTrendingBlog: {
    task: async ({ strapi }) => {
      try {
        await strapi
          .service('api::blog.blog-scheduler')
          .generateEnhancedFromTrending();
      } catch {
        // Logged inside service; avoid crashing the cron runner
      }
    },
    options: {
      rule: process.env.CRON_BLOG_ENHANCED_RULE ?? '0 9 * * 1',
      ...(process.env.CRON_TZ ? { tz: process.env.CRON_TZ } : {}),
    },
  },
  generateQuickBlog: {
    task: async ({ strapi }) => {
      try {
        await strapi.service('api::blog.blog-scheduler').generateQuick();
      } catch {
        // Logged inside service; avoid crashing the cron runner
      }
    },
    options: {
      rule: '* * * * *',
      ...(process.env.CRON_TZ ? { tz: process.env.CRON_TZ } : {}),
    },
  },
};

export default cronTasks;
