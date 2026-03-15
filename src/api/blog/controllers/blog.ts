/**
 * blog controller
 */

import { factories } from '@strapi/strapi';
import * as XLSX from 'xlsx';

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
          data.meteData = {
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
}));
