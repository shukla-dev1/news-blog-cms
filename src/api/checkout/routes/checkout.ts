export default {
  routes: [
    {
      method: 'POST',
      path: '/checkout',
      handler: 'checkout.create',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};