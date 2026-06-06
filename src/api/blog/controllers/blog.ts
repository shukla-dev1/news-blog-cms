/**
 * blog controller
 */

import { factories } from '@strapi/strapi';
import * as XLSX from 'xlsx';
import { parsePaginationFromQuery } from '../../../utils/pagination';
import { listActiveTopics } from '../../blog-trending-topic/services/blog-trending-topic';
import {
  createBlogFromGenerated,
} from '../services/blog-create-from-generated';
import type { GeneratedBlogPayload } from '../services/blog-generate';
import type { GeneratedBlogEnhancedPayload } from '../services/blog-generate-enhanced';
import {
  validateGenerateEnhancedRequest,
  validateGenerateRequest,
  assertAiSuggestedCategoryAllowed,
} from '../services/blog-generate-request-validator';
import {
  listAuthorsForGenerateOptions,
  listBreadcrumbNames,
  listCategoryNames,
} from '../services/blog-relation-resolvers';
import {
  formatDeepSeekErrorResponse,
  mapCreateBlogError,
} from '../utils/deepseek-errors';
import {
  formatValidationErrorResponse,
  isBlogGenerateValidationError,
} from '../utils/validation-errors';

type BulkRow = {
  id?: number;
  title?: string;
  content?: string;
  fullPath?: string;
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  blogAuthorSlug?: string;
  breadcrumbName?: string;
  [key: string]: unknown;
};

export default factories.createCoreController('api::blog.blog', ({ strapi }) => ({
  async bulkUpload(ctx) {
    const { files } = ctx.request as any;

    if (!files || !files.file) {
      return ctx.badRequest('File is required under "file" field');
    }

    const uploadFile = Array.isArray(files.file) ? files.file[0] : files.file;
    // Strapi 5 / formidable v2 uses filepath; older uses path
    const filePath = uploadFile?.filepath ?? uploadFile?.path;

    if (!filePath) {
      return ctx.badRequest('Uploaded file is invalid');
    }

    let workbook: XLSX.WorkBook;

    try {
      workbook = XLSX.readFile(filePath);
    } catch (error) {
      return ctx.badRequest('Unable to read Excel file');
    }

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    if (!sheet) {
      return ctx.badRequest('Excel file is empty');
    }

    const rows = XLSX.utils.sheet_to_json<BulkRow>(sheet, { defval: null });

    const created: Array<{ row: number; id: number }> = [];
    const updated: Array<{ row: number; id: number }> = [];
    const errors: Array<{ row: number; message: string }> = [];

    for (let index = 0; index < rows.length; index += 1) {
      const rowNumber = index + 2; // account for header row
      const row = rows[index];

      try {
        if (!row.title || typeof row.title !== 'string') {
          throw new Error('Missing or invalid "title"');
        }

        const data: any = {
          title: row.title,
          content: row.content ?? '',
          fullPath: row.fullPath ?? null,
        };

        if (
          row.metaTitle ||
          row.metaDescription ||
          row.canonicalUrl ||
          row.ogTitle ||
          row.ogDescription
        ) {
          data.metaData = {
            metaTitle: row.metaTitle ?? null,
            metaDescription: row.metaDescription ?? null,
            canonicalUrl: row.canonicalUrl ?? null,
            ogTitle: row.ogTitle ?? null,
            ogDescription: row.ogDescription ?? null,
          };
        }

        if (row.blogAuthorSlug && typeof row.blogAuthorSlug === 'string') {
          const authors = await strapi.entityService.findMany('api::blog-author.blog-author', {
            filters: { slug: row.blogAuthorSlug },
            limit: 1,
          });

          if (Array.isArray(authors) && authors[0]?.id) {
            data.blogAuthor = authors[0].id;
          } else {
            throw new Error(`Author with slug "${row.blogAuthorSlug}" not found`);
          }
        }

        if (row.breadcrumbName && typeof row.breadcrumbName === 'string') {
          const breadcrumbs = await strapi.entityService.findMany(
            'api::breadcrumb-initial.breadcrumb-initial',
            {
              filters: { name: row.breadcrumbName },
              limit: 1,
            }
          );

          if (Array.isArray(breadcrumbs) && breadcrumbs[0]?.id) {
            data.breadcrumb = breadcrumbs[0].id;
          } else {
            throw new Error(`Breadcrumb with name "${row.breadcrumbName}" not found`);
          }
        }

        let entity;

        if (row.id) {
          entity = await strapi.entityService.update('api::blog.blog', Number(row.id), { data });
          updated.push({ row: rowNumber, id: entity.id });
        } else {
          entity = await strapi.entityService.create('api::blog.blog', { data });
          created.push({ row: rowNumber, id: entity.id });
        }
      } catch (error: any) {
        errors.push({
          row: rowNumber,
          message: error?.message ?? 'Unknown error',
        });
      }
    }

    ctx.body = {
      createdCount: created.length,
      updatedCount: updated.length,
      errorCount: errors.length,
      created,
      updated,
      errors,
    };
  },

  async generate(ctx) {
    const body = (ctx.request.body ?? {}) as Record<string, unknown>;

    let validated;
    try {
      validated = await validateGenerateRequest(strapi, body);
    } catch (err: unknown) {
      if (isBlogGenerateValidationError(err)) {
        ctx.status = 400;
        ctx.body = { data: null, error: formatValidationErrorResponse(err) };
        return;
      }
      throw err;
    }

    const { topic, blogAuthorSlug, breadcrumbName } = validated;
    strapi.log.info(
      `[generate] Request validated — topic: "${topic}", blogAuthorSlug: "${blogAuthorSlug ?? ''}", breadcrumbName: "${breadcrumbName ?? ''}"`
    );

    let generated: GeneratedBlogPayload;
    try {
      strapi.log.info(`[generate] Calling DeepSeek for topic: "${topic}"`);
      generated = await strapi.service('api::blog.blog-generate').generate(topic);
      strapi.log.info(`[generate] DeepSeek responded — title: "${generated?.title}"`);
    } catch (err: unknown) {
      strapi.log.error('[generate] DeepSeek API call failed:', err);
      const { status, body } = formatDeepSeekErrorResponse(err);
      if (status === 402) {
        ctx.status = 402;
        ctx.body = { error: body };
        return;
      }
      return ctx.internalServerError(body);
    }

    try {
      strapi.log.info('[generate] Saving blog entry to database');
      const entry = await createBlogFromGenerated(strapi, generated, {
        blogAuthorSlug,
        breadcrumbName,
        status: 'draft',
      });
      strapi.log.info(
        `[generate] Blog created — documentId: ${entry.documentId}, slug: "${entry.slug}"`
      );

      ctx.body = {
        documentId: entry.documentId,
        title: entry.title,
        slug: entry.slug,
        fullPath: entry.fullPath,
      };
    } catch (err: unknown) {
      const mapped = mapCreateBlogError(err);
      if (mapped.badRequest) {
        return ctx.badRequest(mapped.message);
      }
      strapi.log.error('[generate] Failed to save blog entry:', err);
      return ctx.internalServerError(`Failed to save blog: ${mapped.message}`);
    }
  },

  async listTrendingTopics(ctx) {
    const topics = await listActiveTopics(strapi);
    ctx.body = {
      data: topics,
      meta: {
        region: 'IN',
        updatedAt: new Date().toISOString(),
        count: topics.length,
      },
    };
  },

  async listGenerateOptions(ctx) {
    const [categories, authors, breadcrumbs, trendingTopics] = await Promise.all([
      listCategoryNames(strapi),
      listAuthorsForGenerateOptions(strapi),
      listBreadcrumbNames(strapi),
      listActiveTopics(strapi),
    ]);

    ctx.body = {
      data: {
        categories,
        authors,
        breadcrumbs,
        trendingTopics,
      },
      meta: {
        updatedAt: new Date().toISOString(),
      },
    };
  },

  async generateEnhanced(ctx) {
    const body = (ctx.request.body ?? {}) as Record<string, unknown>;

    let validated;
    try {
      validated = await validateGenerateEnhancedRequest(strapi, body);
    } catch (err: unknown) {
      if (isBlogGenerateValidationError(err)) {
        strapi.log.warn(`[generate-enhanced] Validation failed: ${err.message}`);
        ctx.status = 400;
        ctx.body = { data: null, error: formatValidationErrorResponse(err) };
        return;
      }
      throw err;
    }

    strapi.log.info(
      `[generate-enhanced] Validated — topic="${validated.topic}" trendingTopicId="${validated.trendingTopicId ?? ''}" categoryName="${validated.categoryName ?? ''}"`
    );

    let generated: GeneratedBlogEnhancedPayload;
    try {
      generated = await strapi
        .service('api::blog.blog-generate-enhanced')
        .generateEnhanced({
          topic: validated.topic,
          angle: validated.angle,
          researchContext: validated.researchContext,
          trendingTopicId: validated.trendingTopicId,
          trendingTopic: validated.trendingTopic,
          allowedCategories: validated.allowedCategories,
          categoryName: validated.categoryName,
        });
      strapi.log.info(
        `[generate-enhanced] DeepSeek responded — title: "${generated.title}"`
      );
    } catch (err: unknown) {
      if (isBlogGenerateValidationError(err)) {
        ctx.status = 400;
        ctx.body = { data: null, error: formatValidationErrorResponse(err) };
        return;
      }
      strapi.log.error('[generate-enhanced] DeepSeek API call failed:', err);
      const { status, body: errorBody } = formatDeepSeekErrorResponse(err);
      if (status === 402) {
        ctx.status = 402;
        ctx.body = { error: errorBody };
        return;
      }
      return ctx.internalServerError(errorBody);
    }

    try {
      assertAiSuggestedCategoryAllowed(
        generated.suggestedCategory,
        validated.allowedCategories,
        validated.categoryName
      );

      const entry = await createBlogFromGenerated(strapi, generated, {
        blogAuthorSlug: validated.blogAuthorSlug,
        breadcrumbName: validated.breadcrumbName,
        categoryName: validated.categoryName,
        status: validated.publish ? 'published' : 'draft',
      });

      ctx.body = {
        documentId: entry.documentId,
        title: entry.title,
        slug: entry.slug,
        fullPath: entry.fullPath,
        excerpt: generated.excerpt ?? null,
        keywords: generated.keywords ?? [],
        suggestedCategory: generated.suggestedCategory ?? null,
      };
    } catch (err: unknown) {
      if (isBlogGenerateValidationError(err)) {
        ctx.status = 400;
        ctx.body = { data: null, error: formatValidationErrorResponse(err) };
        return;
      }
      const mapped = mapCreateBlogError(err);
      if (mapped.badRequest) {
        strapi.log.warn(`[generate-enhanced] Save rejected: ${mapped.message}`);
        return ctx.badRequest(mapped.message);
      }
      strapi.log.error('[generate-enhanced] Failed to save blog:', err);
      return ctx.internalServerError(`Failed to save blog: ${mapped.message}`);
    }
  },

  async downloadTemplate(ctx) {
    const headerRow = [
      'id',
      'title',
      'content',
      'fullPath',
      'metaTitle',
      'metaDescription',
      'canonicalUrl',
      'ogTitle',
      'ogDescription',
      'blogAuthorSlug',
      'breadcrumbName',
    ];

    const sampleRow1 = [
      '',
      'Getting started with our Blog CMS',
      'Welcome to our new blog CMS. In this post, we’ll walk through how to create, edit, and publish your first article...',
      '/blog/getting-started-blog-cms',
      'Getting Started with Our Blog CMS',
      'Learn how to publish your first article in our new blog CMS.',
      '/blog/getting-started-blog-cms',
      'admin',
      'Getting Started',
      'admin',
      'Blog',
    ];

    const sampleRow2 = [
      '',
      'How to bulk upload blog posts',
      'In this guide, we’ll show you how to prepare an Excel sheet and upload multiple posts at once using the Bulk upload feature...',
      '/blog/bulk-upload-blog-posts',
      'Bulk Upload Blog Posts via Excel',
      'Step-by-step instructions for uploading multiple blog posts using an Excel template.',
      '/blog/bulk-upload-blog-posts',
      'content-team',
      'Bulk Upload Guide',
      'content-team',
      'Blog',
    ];

    const worksheet = XLSX.utils.aoa_to_sheet([headerRow, sampleRow1, sampleRow2]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Blogs');

    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    ctx.set(
      'Content-Disposition',
      'attachment; filename="blog-bulk-upload-template.xlsx"'
    );
    ctx.set(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    ctx.body = buffer;
  },

  async findNonTechnologyBlogs(ctx) {
    const parsed = parsePaginationFromQuery(ctx.query);
    if (parsed.ok === false) {
      return ctx.badRequest(parsed.message);
    }

    ctx.body = await strapi
      .service('api::blog.blog')
      .findNonTechnologyBlogs({ page: parsed.page, pageSize: parsed.pageSize });
  },
}));
