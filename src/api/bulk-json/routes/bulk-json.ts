export default {
  routes: [
    {
      method: 'GET',
      path: '/bulk-json/collections',
      handler: 'bulk-json.collections',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/bulk-json/import',
      handler: 'bulk-json.bulkImport',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};
