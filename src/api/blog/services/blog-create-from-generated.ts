import type { Core } from '@strapi/strapi';
import { BLOG_UID } from '../../../utils/blog-documents';
import type { GeneratedBlogPayload } from './blog-generate';

export interface CreateBlogFromGeneratedOptions {
  blogAuthorSlug?: string;
  breadcrumbName?: string;
  scheduledPublishAt?: string | Date | null;
  status?: 'draft' | 'published';
}

export class BlogCreateFromGeneratedError extends Error {
  constructor(
    message: string,
    readonly code: 'AUTHOR_NOT_FOUND' | 'BREADCRUMB_NOT_FOUND' | 'VALIDATION'
  ) {
    super(message);
    this.name = 'BlogCreateFromGeneratedError';
  }
}

function buildBlogData(generated: GeneratedBlogPayload): Record<string, unknown> {
  return {
    title: generated.title,
    fullPath: generated.fullPath,
    content: generated.content,
    meteData: {
      metaTitle: generated.meteData?.metaTitle ?? null,
      metaDescription: generated.meteData?.metaDescription ?? null,
      canonicalUrl: generated.meteData?.canonicalUrl ?? null,
      ogTitle: generated.meteData?.ogTitle ?? null,
      ogDescription: generated.meteData?.ogDescription ?? null,
      scriptApplicationJson: generated.meteData?.scriptApplicationJson ?? null,
    },
  };
}

async function resolveAuthorDocumentId(
  strapi: Core.Strapi,
  slug: string
): Promise<string> {
  const authors = await strapi.documents('api::blog-author.blog-author').findMany({
    filters: { slug: { $eq: slug } },
    limit: 1,
  });

  const author = Array.isArray(authors) ? authors[0] : null;
  if (!author?.documentId) {
    throw new BlogCreateFromGeneratedError(
      `Author with slug "${slug}" not found`,
      'AUTHOR_NOT_FOUND'
    );
  }
  return author.documentId;
}

async function resolveBreadcrumbDocumentId(
  strapi: Core.Strapi,
  name: string
): Promise<string> {
  const breadcrumbs = await strapi
    .documents('api::breadcrumb-initial.breadcrumb-initial')
    .findMany({
      filters: { name: { $eq: name } },
      limit: 1,
    });

  const breadcrumb = Array.isArray(breadcrumbs) ? breadcrumbs[0] : null;
  if (!breadcrumb?.documentId) {
    throw new BlogCreateFromGeneratedError(
      `Breadcrumb with name "${name}" not found`,
      'BREADCRUMB_NOT_FOUND'
    );
  }
  return breadcrumb.documentId;
}

export async function createBlogFromGenerated(
  strapi: Core.Strapi,
  generated: GeneratedBlogPayload,
  options: CreateBlogFromGeneratedOptions = {}
) {
  const data = buildBlogData(generated);

  if (options.blogAuthorSlug) {
    const authorDocumentId = await resolveAuthorDocumentId(
      strapi,
      options.blogAuthorSlug
    );
    data.blogAuthor = { documentId: authorDocumentId };
  }

  if (options.breadcrumbName) {
    const breadcrumbDocumentId = await resolveBreadcrumbDocumentId(
      strapi,
      options.breadcrumbName
    );
    data.breadcrumb = { documentId: breadcrumbDocumentId };
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
