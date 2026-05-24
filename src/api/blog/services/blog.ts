/**
 * blog service
 */

import { factories } from '@strapi/strapi';
import {
  findPublishedBlogsExcludingCategory,
  TECHNOLOGY_CATEGORY,
} from '../../../utils/blog-documents';
import type { PaginationParams } from '../../../utils/pagination';

export default factories.createCoreService('api::blog.blog', ({ strapi }) => ({
  findNonTechnologyBlogs(pagination: PaginationParams) {
    return findPublishedBlogsExcludingCategory(strapi, TECHNOLOGY_CATEGORY, pagination);
  },
}));
