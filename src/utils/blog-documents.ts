import {
  buildPaginationMeta,
  type PaginationParams,
} from './pagination';

export const BLOG_UID = 'api::blog.blog';

export const DEFAULT_BLOG_POPULATE = [
  'blog_category',
  'blogAuthor',
  'breadcrumb',
  'meteData',
] as const;

export function categoryFilter(categoryName: string) {
  return {
    blog_category: {
      categoryName: { $eq: categoryName },
    },
  };
}

export async function findPublishedBlogsByCategory(
  strapi: { documents: (uid: string) => any },
  categoryName: string,
  pagination: PaginationParams,
  populate: readonly string[] = DEFAULT_BLOG_POPULATE,
) {
  const filters = categoryFilter(categoryName);
  const start = (pagination.page - 1) * pagination.pageSize;

  const [data, total] = await Promise.all([
    strapi.documents(BLOG_UID).findMany({
      status: 'published',
      filters,
      populate,
      start,
      limit: pagination.pageSize,
    }),
    strapi.documents(BLOG_UID).count({
      status: 'published',
      filters,
    }),
  ]);

  return {
    data,
    meta: {
      pagination: buildPaginationMeta({ ...pagination, total }),
    },
  };
}
