export default {
  routes: [
    {
      method: 'GET',
      path: '/blogs/non-technology-blogs',
      handler: 'blog.findNonTechnologyBlogs',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};
