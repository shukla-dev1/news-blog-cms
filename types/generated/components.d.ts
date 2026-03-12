import type { Schema, Struct } from '@strapi/strapi';

export interface MetaSeo extends Struct.ComponentSchema {
  collectionName: 'components_meta_seos';
  info: {
    displayName: 'seo';
    icon: 'command';
  };
  attributes: {
    canonicalUrl: Schema.Attribute.String;
    metaDescription: Schema.Attribute.Text;
    metaImage: Schema.Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    metaTitle: Schema.Attribute.String;
    ogDescription: Schema.Attribute.Text;
    ogImage: Schema.Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    ogTitle: Schema.Attribute.String;
    scriptApplicationJson: Schema.Attribute.JSON;
  };
}

export interface SharedAllSocialLinks extends Struct.ComponentSchema {
  collectionName: 'components_shared_all_social_links';
  info: {
    displayName: 'allSocialLinks';
    icon: 'attachment';
  };
  attributes: {
    github: Schema.Attribute.String;
    linkedIn: Schema.Attribute.String;
    twitter: Schema.Attribute.String;
    website: Schema.Attribute.String;
  };
}

export interface SharedBreadcrumbItems extends Struct.ComponentSchema {
  collectionName: 'components_shared_breadcrumb_items';
  info: {
    displayName: 'breadcrumbItems';
    icon: 'bulletList';
  };
  attributes: {
    label: Schema.Attribute.String & Schema.Attribute.Required;
    order: Schema.Attribute.Integer;
    url: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'meta.seo': MetaSeo;
      'shared.all-social-links': SharedAllSocialLinks;
      'shared.breadcrumb-items': SharedBreadcrumbItems;
    }
  }
}
