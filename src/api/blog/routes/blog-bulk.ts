export default {
  routes: [
    {
      method: 'POST',
      path: '/blogs/bulk-upload',
      handler: 'blog.bulkUpload',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/blogs/bulk-template',
      handler: 'blog.downloadTemplate',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/blogs/generate',
      handler: 'blog.generate',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};

