import type { Core } from '@strapi/strapi';
import {
  CURATED_INDIA_TRENDING_TOPICS,
  findTrendingTopicById,
} from '../prompts/blog-generate-enhanced-prompts';
import {
  findAuthorBySlug,
  findBreadcrumbByName,
  findCategoryByName,
  listCategoryNames,
} from './blog-relation-resolvers';

export type BlogGenerateValidationCode =
  | 'TOPIC_REQUIRED'
  | 'INVALID_FIELD'
  | 'AUTHOR_NOT_FOUND'
  | 'BREADCRUMB_NOT_FOUND'
  | 'CATEGORY_NOT_FOUND'
  | 'TRENDING_TOPIC_NOT_FOUND'
  | 'NO_CATEGORIES_CONFIGURED'
  | 'AI_CATEGORY_NOT_ALLOWED';

export interface BlogGenerateValidationDetails {
  field?: string;
  allowedValues?: string[];
}

export class BlogGenerateValidationError extends Error {
  constructor(
    message: string,
    readonly code: BlogGenerateValidationCode,
    readonly details?: BlogGenerateValidationDetails
  ) {
    super(message);
    this.name = 'BlogGenerateValidationError';
  }
}

export interface ValidatedGenerateRequest {
  topic: string;
  blogAuthorSlug?: string;
  breadcrumbName?: string;
}

export interface ValidatedGenerateEnhancedRequest extends ValidatedGenerateRequest {
  angle?: string;
  researchContext?: string;
  trendingTopicId?: string;
  publish: boolean;
  categoryName?: string;
  allowedCategories: string[];
}

function requireNonEmptyString(
  value: unknown,
  field: string
): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value !== 'string' || !value.trim()) {
    throw new BlogGenerateValidationError(
      `"${field}" must be a non-empty string`,
      'INVALID_FIELD',
      { field }
    );
  }
  return value.trim();
}

function parseTopic(body: Record<string, unknown>): string {
  const topic = requireNonEmptyString(body.topic, 'topic');
  if (!topic) {
    throw new BlogGenerateValidationError(
      '"topic" is required',
      'TOPIC_REQUIRED',
      { field: 'topic' }
    );
  }
  return topic;
}

async function validateOptionalRelations(
  strapi: Core.Strapi,
  blogAuthorSlug?: string,
  breadcrumbName?: string
): Promise<void> {
  if (blogAuthorSlug) {
    const author = await findAuthorBySlug(strapi, blogAuthorSlug);
    if (!author) {
      throw new BlogGenerateValidationError(
        `Author with slug "${blogAuthorSlug}" not found`,
        'AUTHOR_NOT_FOUND',
        { field: 'blogAuthorSlug' }
      );
    }
  }

  if (breadcrumbName) {
    const breadcrumb = await findBreadcrumbByName(strapi, breadcrumbName);
    if (!breadcrumb) {
      throw new BlogGenerateValidationError(
        `Breadcrumb with name "${breadcrumbName}" not found`,
        'BREADCRUMB_NOT_FOUND',
        { field: 'breadcrumbName' }
      );
    }
  }
}

export async function validateGenerateRequest(
  strapi: Core.Strapi,
  body: Record<string, unknown>
): Promise<ValidatedGenerateRequest> {
  const topic = parseTopic(body);
  const blogAuthorSlug = requireNonEmptyString(body.blogAuthorSlug, 'blogAuthorSlug');
  const breadcrumbName = requireNonEmptyString(body.breadcrumbName, 'breadcrumbName');

  await validateOptionalRelations(strapi, blogAuthorSlug, breadcrumbName);

  return { topic, blogAuthorSlug, breadcrumbName };
}

export async function validateGenerateEnhancedRequest(
  strapi: Core.Strapi,
  body: Record<string, unknown>
): Promise<ValidatedGenerateEnhancedRequest> {
  const topic = parseTopic(body);
  const blogAuthorSlug = requireNonEmptyString(body.blogAuthorSlug, 'blogAuthorSlug');
  const breadcrumbName = requireNonEmptyString(body.breadcrumbName, 'breadcrumbName');
  const categoryName = requireNonEmptyString(body.categoryName, 'categoryName');
  const angle = requireNonEmptyString(body.angle, 'angle');
  const researchContext = requireNonEmptyString(
    body.researchContext,
    'researchContext'
  );

  const trendingTopicIdRaw = body.trendingTopicId;
  let trendingTopicId: string | undefined;
  if (
    trendingTopicIdRaw !== undefined &&
    trendingTopicIdRaw !== null &&
    trendingTopicIdRaw !== ''
  ) {
    if (typeof trendingTopicIdRaw !== 'string') {
      throw new BlogGenerateValidationError(
        '"trendingTopicId" must be a string',
        'INVALID_FIELD',
        { field: 'trendingTopicId' }
      );
    }
    trendingTopicId = trendingTopicIdRaw.trim();
    if (!findTrendingTopicById(trendingTopicId)) {
      throw new BlogGenerateValidationError(
        `Trending topic id "${trendingTopicId}" not found`,
        'TRENDING_TOPIC_NOT_FOUND',
        {
          field: 'trendingTopicId',
          allowedValues: CURATED_INDIA_TRENDING_TOPICS.map((t) => t.id),
        }
      );
    }
  }

  const allowedCategories = await listCategoryNames(strapi);
  if (allowedCategories.length === 0) {
    throw new BlogGenerateValidationError(
      'No blog categories configured in Strapi. Add at least one Blog Category before generating.',
      'NO_CATEGORIES_CONFIGURED',
      { field: 'categoryName' }
    );
  }

  if (categoryName) {
    const category = await findCategoryByName(strapi, categoryName);
    if (!category) {
      throw new BlogGenerateValidationError(
        `Category with name "${categoryName}" not found`,
        'CATEGORY_NOT_FOUND',
        { field: 'categoryName', allowedValues: allowedCategories }
      );
    }
  }

  await validateOptionalRelations(strapi, blogAuthorSlug, breadcrumbName);

  const publish = body.publish === true;

  return {
    topic,
    blogAuthorSlug,
    breadcrumbName,
    angle,
    researchContext,
    trendingTopicId,
    publish,
    categoryName,
    allowedCategories,
  };
}

export function assertAiSuggestedCategoryAllowed(
  suggestedCategory: string | undefined,
  allowedCategories: string[],
  requestCategoryName?: string
): void {
  if (requestCategoryName) {
    return;
  }
  if (!suggestedCategory?.trim()) {
    return;
  }
  const normalized = suggestedCategory.trim();
  if (!allowedCategories.includes(normalized)) {
    throw new BlogGenerateValidationError(
      `DeepSeek returned category "${normalized}" which is not allowed. Use one of: ${allowedCategories.join(', ')}`,
      'AI_CATEGORY_NOT_ALLOWED',
      { field: 'suggestedCategory', allowedValues: allowedCategories }
    );
  }
}
