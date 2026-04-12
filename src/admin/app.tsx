import type { StrapiApp } from '@strapi/strapi/admin';

export default {
  config: {
    locales: [
      // 'ar',
      // 'fr',
      // 'cs',
      // 'de',
      // 'dk',
      // 'es',
      // 'he',
      // 'id',
      // 'it',
      // 'ja',
      // 'ko',
      // 'ms',
      // 'nl',
      // 'no',
      // 'pl',
      // 'pt-BR',
      // 'pt',
      // 'ru',
      // 'sk',
      // 'sv',
      // 'th',
      // 'tr',
      // 'uk',
      // 'vi',
      // 'zh-Hans',
      // 'zh',
    ],
  },
  bootstrap(app: StrapiApp) {
    app.addMenuLink({
      to: '/bulk-upload',
      icon: ()=> '🚀',
      intlLabel: {
        id: 'bulk-upload.menu.label',
        defaultMessage: 'Bulk upload',
      },
      Component: async () => {
        const component = await import('./pages/BulkBlogUpload');
        return component;
      },
      permissions: [],
    });
    app.addMenuLink({
      to: '/bulk-json-import',
      icon: () => '📋',
      intlLabel: {
        id: 'bulk-json-import.menu.label',
        defaultMessage: 'Bulk JSON import',
      },
      Component: async () => {
        const component = await import('./pages/BulkJsonImport');
        return component;
      },
      permissions: [],
    });
  },
};

