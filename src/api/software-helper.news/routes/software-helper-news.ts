export default {
  routes: [
    {
      method: 'GET',
      path: '/software-helper-news/technology-blogs',
      handler: 'software-helper-news.findTechnologyBlogs',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};
