import type { Context } from "koa";
import { OrderCreatePayload } from "../../../../types/orders";
import {
  create,
  update,
  findAllByUserId,
  findOne,
  findOneByIdAndUserId,
} from "../services/order";
import { getCreatePayloadOrderData } from "../helper";

module.exports = {

  async find(ctx: Context) {
    const user = ctx.state.user;
    if (!user?.id) {
      return ctx.unauthorized();
    }
    const data = await findAllByUserId(user.id);
    ctx.send(data);
  },

  async findOne(ctx: Context) {
    const { id } = ctx.params;
    const user = ctx.state.user;
    if (!user?.id) {
      return ctx.unauthorized();
    }

    const data = await findOneByIdAndUserId(id, user.id);
    if (!data) {
      return ctx.notFound();
    }
    ctx.send(data);
  },

  async create(ctx: Context) {
    const user = ctx.state.user;
    if (!user?.id) {
      return ctx.unauthorized();
    }
    const bodyData = ctx.request.body.data;
    const payload = getCreatePayloadOrderData(bodyData, user) as OrderCreatePayload;
    const data = await create({...payload, orderStatus: 'pending'});
    ctx.send(data);
  },

  async update(ctx: Context) {
    const { id } = ctx.params;
    const user = ctx.state.user;
    if (!user?.id) {
      return ctx.unauthorized();
    }

    const existing = await findOneByIdAndUserId(id, user.id);
    if (!existing) {
      return ctx.notFound();
    }
    const bodyData = ctx.request.body.data;
    const payload = getCreatePayloadOrderData(bodyData, user);
    const data = await update(id, payload);
    ctx.send(data);
  },


};