module.exports = {

  async findAll() {
    return await strapi.entityService.findMany("api::order.order");
  },

  async findOne(id) {
    return await strapi.entityService.findOne("api::order.order", id);
  },

  async create(data) {
    return await strapi.entityService.create("api::order.order", {
      data,
    });
  },

  async update(id, data) {
    return await strapi.entityService.update("api::order.order", id, {
      data,
    });
  },

  async delete(id) {
    return await strapi.entityService.delete("api::order.order", id);
  },

  async getCustomData() {
    return { message: "From service layer" };
  },

};  