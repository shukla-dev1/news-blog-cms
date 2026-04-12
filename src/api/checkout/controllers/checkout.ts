'use strict';

import {
  getProductById,
  createOrder,
  createOrderItem,
} from '../services/checkout';

export default {
  async create(ctx) {
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized('Login required');
    }

    const { items, address, phone, paymentMethod } = ctx.request.body;

    if (!items || items.length === 0) {
      return ctx.badRequest('Cart is empty');
    }

    try {
      let totalAmount = 0;

      // 🔹 Step 1: Validate products + calculate total
      const orderItemsData = [];

      for (const item of items) {
        const product = await getProductById(item.productId);

        if (!product) {
          return ctx.badRequest(`Product not found: ${item.productId}`);
        }

        const price = product.price;
        totalAmount += price * item.quantity;

        orderItemsData.push({
          product: product.id,
          quantity: item.quantity,
          price: price,
        });
      }

      // 🔹 Step 2: Create Order
      const order = await createOrder({
        data: {
          user: user.id,
          totalAmount,
          orderStatus: 'pending',
          paymentMethod,
          paymentStatus: 'pending',
          address,
          phone,
        },
      });

      // 🔹 Step 3: Create OrderItems
      for (const item of orderItemsData) {
        await createOrderItem({
          data: {
            ...item,
            order: order.id,
          },
        });
      }

      ctx.send({
        message: 'Order placed successfully',
        orderId: order.id,
      });
    } catch (error) {
      console.error(error);
      return ctx.internalServerError('Something went wrong');
    }
  },
};