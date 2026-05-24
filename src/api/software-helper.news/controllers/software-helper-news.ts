import { parsePaginationFromQuery } from '../../../utils/pagination';
import { SOFTWARE_HELPER_NEWS_SERVICE_UID } from '../constants';

export default ({ strapi }: { strapi: any }) => ({
  async findTechnologyBlogs(ctx: any) {
    const parsed = parsePaginationFromQuery(ctx.query);
    if (parsed.ok === false) {
      return ctx.badRequest(parsed.message);
    }

    ctx.body = await strapi
      .service(SOFTWARE_HELPER_NEWS_SERVICE_UID)
      .findTechnologyBlogs({ page: parsed.page, pageSize: parsed.pageSize });
  },
});
