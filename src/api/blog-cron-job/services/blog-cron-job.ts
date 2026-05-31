import { factories } from '@strapi/strapi';
import type { Core } from '@strapi/strapi';

export type BlogCronJobKey =
  | 'publish_scheduled'
  | 'generate_basic'
  | 'generate_enhanced';

const CRON_JOB_UID = 'api::blog-cron-job.blog-cron-job';

export interface BlogCronJobConfig {
  jobKey: BlogCronJobKey;
  enabled: boolean;
  cronRule: string | null;
  timezone: string | null;
  topic: string | null;
  publishImmediately: boolean;
  delayHours: number;
  minIntervalHours: number;
  blogAuthorSlug: string | null;
  breadcrumbName: string | null;
  categoryName: string | null;
}

type CronJobDocument = {
  jobKey?: BlogCronJobKey;
  enabled?: boolean;
  cronRule?: string | null;
  timezone?: string | null;
  topic?: string | null;
  publishImmediately?: boolean;
  delayHours?: number;
  minIntervalHours?: number;
  blogAuthorSlug?: string | null;
  breadcrumbName?: string | null;
  categoryName?: string | null;
};

const ENV_CRON_RULE: Record<BlogCronJobKey, string> = {
  publish_scheduled: 'CRON_PUBLISH_RULE',
  generate_basic: 'CRON_BLOG_GENERATE_RULE',
  generate_enhanced: 'CRON_BLOG_ENHANCED_RULE',
};

const ENV_ENABLED: Record<BlogCronJobKey, string> = {
  publish_scheduled: '',
  generate_basic: 'CRON_BLOG_GENERATE_ENABLED',
  generate_enhanced: 'CRON_BLOG_ENHANCED_ENABLED',
};

function envBool(name: string, defaultValue: boolean): boolean {
  const raw = process.env[name];
  if (!raw || raw === '') {
    return defaultValue;
  }
  return raw === 'true' || raw === '1';
}

function envInt(name: string, defaultValue: number): number {
  const raw = process.env[name];
  if (!raw || raw === '') {
    return defaultValue;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

function envString(name: string): string | null {
  const raw = process.env[name]?.trim();
  return raw || null;
}

function mapDocument(doc: CronJobDocument): BlogCronJobConfig | null {
  if (!doc.jobKey) {
    return null;
  }
  return {
    jobKey: doc.jobKey,
    enabled: doc.enabled === true,
    cronRule: doc.cronRule?.trim() || null,
    timezone: doc.timezone?.trim() || null,
    topic: doc.topic?.trim() || null,
    publishImmediately: doc.publishImmediately === true,
    delayHours:
      typeof doc.delayHours === 'number' && !Number.isNaN(doc.delayHours)
        ? doc.delayHours
        : 0,
    minIntervalHours:
      typeof doc.minIntervalHours === 'number' &&
      !Number.isNaN(doc.minIntervalHours)
        ? doc.minIntervalHours
        : 72,
    blogAuthorSlug: doc.blogAuthorSlug?.trim() || null,
    breadcrumbName: doc.breadcrumbName?.trim() || null,
    categoryName: doc.categoryName?.trim() || null,
  };
}

export async function getJobConfig(
  strapi: Core.Strapi,
  jobKey: BlogCronJobKey
): Promise<BlogCronJobConfig | null> {
  const rows = await strapi.documents(CRON_JOB_UID).findMany({
    filters: { jobKey: { $eq: jobKey } },
    limit: 1,
  });
  const doc = Array.isArray(rows) ? rows[0] : null;
  if (!doc) {
    return null;
  }
  return mapDocument(doc as CronJobDocument);
}

export function applyEnvFallback(
  jobKey: BlogCronJobKey,
  config: BlogCronJobConfig | null
): BlogCronJobConfig {
  const enabledEnv = ENV_ENABLED[jobKey];
  const base: BlogCronJobConfig = config ?? {
    jobKey,
    enabled: false,
    cronRule: null,
    timezone: null,
    topic: null,
    publishImmediately: false,
    delayHours: 0,
    minIntervalHours: 72,
    blogAuthorSlug: null,
    breadcrumbName: null,
    categoryName: null,
  };

  if (!config && enabledEnv) {
    base.enabled = envBool(enabledEnv, false);
  }

  if (!base.cronRule) {
    const ruleEnv = ENV_CRON_RULE[jobKey];
    base.cronRule = envString(ruleEnv);
  }

  if (!base.timezone) {
    base.timezone = envString('CRON_TZ');
  }

  if (jobKey === 'generate_basic') {
    if (!base.topic) {
      base.topic = envString('CRON_BLOG_GENERATE_TOPIC');
    }
    if (!config) {
      base.publishImmediately = envBool('CRON_BLOG_GENERATE_PUBLISH', false);
      base.delayHours = envInt('CRON_BLOG_GENERATE_DELAY_HOURS', 0);
      base.blogAuthorSlug = envString('CRON_BLOG_GENERATE_AUTHOR_SLUG');
      base.breadcrumbName = envString('CRON_BLOG_GENERATE_BREADCRUMB');
    }
  }

  if (jobKey === 'generate_enhanced') {
    if (!config) {
      base.publishImmediately = envBool('CRON_BLOG_ENHANCED_PUBLISH', false);
      base.delayHours = envInt('CRON_BLOG_ENHANCED_DELAY_HOURS', 24);
      base.minIntervalHours = envInt('CRON_BLOG_ENHANCED_MIN_INTERVAL_HOURS', 72);
      base.blogAuthorSlug = envString('CRON_BLOG_ENHANCED_AUTHOR_SLUG');
      base.breadcrumbName = envString('CRON_BLOG_ENHANCED_BREADCRUMB');
      base.categoryName = envString('CRON_BLOG_ENHANCED_CATEGORY');
    }
  }

  return base;
}

export async function getJobConfigWithEnvFallback(
  strapi: Core.Strapi,
  jobKey: BlogCronJobKey
): Promise<BlogCronJobConfig> {
  const fromDb = await getJobConfig(strapi, jobKey);
  return applyEnvFallback(jobKey, fromDb);
}

export function isCronGloballyEnabled(): boolean {
  return envBool('CRON_ENABLED', true);
}

export default factories.createCoreService(CRON_JOB_UID, ({ strapi }) => ({
  getJobConfig: (jobKey: BlogCronJobKey) => getJobConfig(strapi, jobKey),
  getJobConfigWithEnvFallback: (jobKey: BlogCronJobKey) =>
    getJobConfigWithEnvFallback(strapi, jobKey),
}));
