import type { Core } from '@strapi/strapi';
import { BLOG_UID } from '../../../utils/blog-documents';
import type { GeneratedBlogPayload } from './blog-generate';
import type { GeneratedBlogEnhancedPayload } from './blog-generate-enhanced';
import {
  resolveAuthorDocumentId,
  resolveBreadcrumbDocumentId,
  resolveCategoryDocumentId,
} from './blog-relation-resolvers';

export interface CreateBlogFromGeneratedOptions {
  blogAuthorSlug?: string;
  breadcrumbName?: string;
  categoryName?: string;
  scheduledPublishAt?: string | Date | null;
  status?: 'draft' | 'published';
}

export class BlogCreateFromGeneratedError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'AUTHOR_NOT_FOUND'
      | 'BREADCRUMB_NOT_FOUND'
      | 'CATEGORY_NOT_FOUND'
      | 'VALIDATION'
  ) {
    super(message);
    this.name = 'BlogCreateFromGeneratedError';
  }
}

function isEnhancedPayload(
  generated: GeneratedBlogPayload
): generated is GeneratedBlogEnhancedPayload {
  return (
    'excerpt' in generated ||
    'keywords' in generated ||
    'suggestedCategory' in generated ||
    'bannerImageUrl' in generated
  );
}

function mergeKeywordsIntoSchema(
  scriptApplicationJson: Record<string, unknown> | null | undefined,
  keywords: string[] | undefined,
  suggestedCategory: string | undefined
): Record<string, unknown> | null {
  const base: Record<string, unknown> =
    scriptApplicationJson && typeof scriptApplicationJson === 'object'
      ? { ...scriptApplicationJson }
      : {
          '@context': 'https://schema.org',
          '@type': 'NewsArticle',
        };

  if (keywords?.length) {
    base.keywords = keywords.join(', ');
  }
  if (suggestedCategory) {
    base.articleSection = suggestedCategory;
  }
  return base;
}

function buildContentWithExcerpt(
  content: string,
  excerpt: string | undefined
): string {
  if (!excerpt?.trim()) {
    return content;
  }
  const trimmedExcerpt = excerpt.trim();
  if (content.includes(trimmedExcerpt)) {
    return content;
  }
  return `**${trimmedExcerpt}**\n\n${content}`;
}

function buildBlogData(generated: GeneratedBlogPayload): Record<string, unknown> {
  const enhanced = isEnhancedPayload(generated) ? generated : null;
  const keywords = enhanced?.keywords;
  const suggestedCategory = enhanced?.suggestedCategory;
  const content = buildContentWithExcerpt(
    generated.content,
    enhanced?.excerpt
  );

  return {
    title: generated.title,
    fullPath: generated.fullPath,
    content,
    ...(enhanced?.bannerImageUrl
      ? { bannerImageUrl: enhanced.bannerImageUrl }
      : {}),
    metaData: {
      metaTitle: generated.metaData?.metaTitle ?? null,
      metaDescription: generated.metaData?.metaDescription ?? null,
      canonicalUrl: generated.metaData?.canonicalUrl ?? null,
      ogTitle: generated.metaData?.ogTitle ?? null,
      ogDescription: generated.metaData?.ogDescription ?? null,
      scriptApplicationJson: mergeKeywordsIntoSchema(
        generated.metaData?.scriptApplicationJson ?? null,
        keywords,
        suggestedCategory
      ),
    },
  };
}

async function resolveAuthorOrThrow(
  strapi: Core.Strapi,
  slug: string
): Promise<string> {
  try {
    return await resolveAuthorDocumentId(strapi, slug);
  } catch {
    throw new BlogCreateFromGeneratedError(
      `Author with slug "${slug}" not found`,
      'AUTHOR_NOT_FOUND'
    );
  }
}

async function resolveBreadcrumbOrThrow(
  strapi: Core.Strapi,
  name: string
): Promise<string> {
  try {
    return await resolveBreadcrumbDocumentId(strapi, name);
  } catch {
    throw new BlogCreateFromGeneratedError(
      `Breadcrumb with name "${name}" not found`,
      'BREADCRUMB_NOT_FOUND'
    );
  }
}

async function resolveCategoryOrThrow(
  strapi: Core.Strapi,
  categoryName: string
): Promise<string> {
  try {
    return await resolveCategoryDocumentId(strapi, categoryName);
  } catch {
    throw new BlogCreateFromGeneratedError(
      `Category with name "${categoryName}" not found`,
      'CATEGORY_NOT_FOUND'
    );
  }
}

export async function createBlogFromGenerated(
  strapi: Core.Strapi,
  generated: GeneratedBlogPayload,
  options: CreateBlogFromGeneratedOptions = {}
) {
  const data = buildBlogData(generated);
  const enhanced = isEnhancedPayload(generated) ? generated : null;

  if (options.blogAuthorSlug) {
    const authorDocumentId = await resolveAuthorOrThrow(
      strapi,
      options.blogAuthorSlug
    );
    data.blogAuthor = { documentId: authorDocumentId };
  }

  if (options.breadcrumbName) {
    const breadcrumbDocumentId = await resolveBreadcrumbOrThrow(
      strapi,
      options.breadcrumbName
    );
    data.breadcrumb = { documentId: breadcrumbDocumentId };
  }

  const categoryToLink =
    options.categoryName?.trim() || enhanced?.suggestedCategory?.trim();

  if (categoryToLink) {
    const categoryDocumentId = await resolveCategoryOrThrow(
      strapi,
      categoryToLink
    );
    data.blog_category = { documentId: categoryDocumentId };
  }

  if (options.scheduledPublishAt) {
    data.scheduledPublishAt =
      options.scheduledPublishAt instanceof Date
        ? options.scheduledPublishAt.toISOString()
        : options.scheduledPublishAt;
  }

  const status = options.status ?? 'draft';

  return strapi.documents(BLOG_UID).create({
    data,
    status,
  });
}
