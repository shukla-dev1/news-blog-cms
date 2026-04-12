import type { Context } from "koa";
const service = require("../services/order");

module.exports = {

  async find(ctx: Context) {
    const data = await service.findAll();
    ctx.send(data);
  },

  async findOne(ctx: Context) {
    const { id } = ctx.params;
    const data = await service.findOne(id);
    ctx.send(data);
  },

  async create(ctx: Context) {
    const user = ctx.state.user; // now will work
    const body = ctx.request.body;

    const data = await service.create({
      ...body,
      user: user?.id,
    });

    ctx.send(data);
  },

  async update(ctx: Context) {
    const { id } = ctx.params;
    const body = ctx.request.body;

    const data = await service.update(id, body);
    ctx.send(data);
  },

  async delete(ctx: Context) {
    const { id } = ctx.params;
    const data = await service.delete(id);
    ctx.send(data);
  },

};