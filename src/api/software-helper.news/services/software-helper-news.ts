import { findPublishedBlogsByCategory } from '../../../utils/blog-documents';
import { TECHNOLOGY_CATEGORY } from '../constants';

export default ({ strapi }: { strapi: any }) => ({
  findTechnologyBlogs(pagination: { page: number; pageSize: number }) {
    return findPublishedBlogsByCategory(strapi, TECHNOLOGY_CATEGORY, pagination);
  },
});
