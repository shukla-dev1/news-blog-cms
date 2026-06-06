import type { Core } from '@strapi/strapi';

const BLOG_AUTHOR_UID = 'api::blog-author.blog-author';
const BREADCRUMB_UID = 'api::breadcrumb-initial.breadcrumb-initial';
const BLOG_CATEGORY_UID = 'api::blog-category.blog-category';

export async function findAuthorBySlug(strapi: Core.Strapi, slug: string) {
  const authors = await strapi.documents(BLOG_AUTHOR_UID).findMany({
    filters: { slug: { $eq: slug } },
    limit: 1,
    fields: ['documentId', 'slug', 'name'],
  });
  return Array.isArray(authors) ? authors[0] : null;
}

export async function findBreadcrumbByName(strapi: Core.Strapi, name: string) {
  const breadcrumbs = await strapi.documents(BREADCRUMB_UID).findMany({
    filters: { name: { $eq: name } },
    limit: 1,
    fields: ['documentId', 'name'],
  });
  return Array.isArray(breadcrumbs) ? breadcrumbs[0] : null;
}

export async function findCategoryByName(strapi: Core.Strapi, categoryName: string) {
  const categories = await strapi.documents(BLOG_CATEGORY_UID).findMany({
    filters: { categoryName: { $eq: categoryName } },
    limit: 1,
    fields: ['documentId', 'categoryName'],
  });
  return Array.isArray(categories) ? categories[0] : null;
}

export async function listCategoryNames(strapi: Core.Strapi): Promise<string[]> {
  const categories = await strapi.documents(BLOG_CATEGORY_UID).findMany({
    fields: ['categoryName'],
    limit: 100,
  });
  const rows = Array.isArray(categories) ? categories : [];
  return rows
    .map((row) =>
      typeof row?.categoryName === 'string' ? row.categoryName.trim() : ''
    )
    .filter((name) => name.length > 0);
}

export async function listAuthorsForGenerateOptions(strapi: Core.Strapi) {
  const authors = await strapi.documents(BLOG_AUTHOR_UID).findMany({
    fields: ['slug', 'name'],
    limit: 100,
  });
  const rows = Array.isArray(authors) ? authors : [];
  return rows
    .filter((row) => typeof row?.slug === 'string' && row.slug.length > 0)
    .map((row) => ({
      slug: row.slug as string,
      name: typeof row.name === 'string' ? row.name : null,
    }));
}

export async function listBreadcrumbNames(strapi: Core.Strapi): Promise<string[]> {
  const breadcrumbs = await strapi.documents(BREADCRUMB_UID).findMany({
    fields: ['name'],
    limit: 100,
  });
  const rows = Array.isArray(breadcrumbs) ? breadcrumbs : [];
  return rows
    .map((row) => (typeof row?.name === 'string' ? row.name.trim() : ''))
    .filter((name) => name.length > 0);
}

export async function resolveAuthorDocumentId(
  strapi: Core.Strapi,
  slug: string
): Promise<string> {
  const author = await findAuthorBySlug(strapi, slug);
  if (!author?.documentId) {
    throw new Error(`Author with slug "${slug}" not found`);
  }
  return author.documentId;
}

export async function resolveBreadcrumbDocumentId(
  strapi: Core.Strapi,
  name: string
): Promise<string> {
  const breadcrumb = await findBreadcrumbByName(strapi, name);
  if (!breadcrumb?.documentId) {
    throw new Error(`Breadcrumb with name "${name}" not found`);
  }
  return breadcrumb.documentId;
}

export async function resolveCategoryDocumentId(
  strapi: Core.Strapi,
  categoryName: string
): Promise<string> {
  const category = await findCategoryByName(strapi, categoryName);
  if (!category?.documentId) {
    throw new Error(`Category with name "${categoryName}" not found`);
  }
  return category.documentId;
}
