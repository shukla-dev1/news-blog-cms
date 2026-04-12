/**
 * bulk-json controller — generic JSON array import for api:: collection types
 */

const MAX_BATCH = 500;

function isAllowedCollectionUid(strapi: any, uid: string): boolean {
  if (!uid || typeof uid !== 'string') {
    return false;
  }
  if (!uid.startsWith('api::')) {
    return false;
  }
  const schema = strapi.contentTypes[uid];
  if (!schema || schema.kind !== 'collectionType') {
    return false;
  }
  return true;
}

export default ({ strapi }: { strapi: any }) => ({
  async collections(ctx: any) {
    const list: Array<{ uid: string; displayName: string }> = [];

    for (const uid of Object.keys(strapi.contentTypes)) {
      if (!isAllowedCollectionUid(strapi, uid)) {
        continue;
      }
      const schema = strapi.contentTypes[uid];
      const displayName =
        (schema.info as { displayName?: string })?.displayName ?? uid;
      list.push({ uid, displayName });
    }

    list.sort((a, b) => a.displayName.localeCompare(b.displayName));
    ctx.body = { collections: list };
  },

  async bulkImport(ctx: any) {
    const body = ctx.request.body as { uid?: unknown; items?: unknown };

    const uid = body?.uid;
    if (typeof uid !== 'string' || !uid) {
      return ctx.badRequest('uid is required and must be a string');
    }

    if (!isAllowedCollectionUid(strapi, uid)) {
      return ctx.badRequest('Invalid or disallowed collection uid');
    }

    if (!Array.isArray(body.items)) {
      return ctx.badRequest('items must be an array');
    }

    if (body.items.length > MAX_BATCH) {
      return ctx.badRequest(`At most ${MAX_BATCH} items per request`);
    }

    const created: Array<{ index: number; id: number }> = [];
    const errors: Array<{ index: number; message: string }> = [];

    for (let index = 0; index < body.items.length; index += 1) {
      const item = body.items[index];
      if (item === null || typeof item !== 'object' || Array.isArray(item)) {
        errors.push({
          index,
          message: 'Each item must be a plain object',
        });
        continue;
      }

      try {
        const entity = await strapi.entityService.create(uid, {
          data: item as Record<string, unknown>,
        });
        const id = (entity as { id?: number })?.id;
        if (typeof id !== 'number') {
          errors.push({
            index,
            message: 'Create succeeded but entry has no numeric id',
          });
        } else {
          created.push({ index, id });
        }
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : String(error);
        errors.push({ index, message });
      }
    }

    ctx.body = {
      createdCount: created.length,
      errorCount: errors.length,
      created,
      errors,
    };
  },
});
