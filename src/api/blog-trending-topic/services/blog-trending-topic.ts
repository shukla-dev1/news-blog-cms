import { factories } from '@strapi/strapi';
import type { Core } from '@strapi/strapi';
import type { IndiaTrendingTopic } from '../../blog/prompts/blog-generate-enhanced-prompts';

const TRENDING_TOPIC_UID = 'api::blog-trending-topic.blog-trending-topic';

type TrendingTopicDocument = {
  topicId?: string;
  title?: string;
  keyDetails?: string;
  whyHot?: string;
  suggestedAngles?: Array<{ angle?: string }>;
  isActive?: boolean;
  region?: string;
  sortOrder?: number;
};

export function mapDocumentToIndiaTrendingTopic(
  doc: TrendingTopicDocument
): IndiaTrendingTopic | null {
  if (!doc.topicId || !doc.title || !doc.keyDetails || !doc.whyHot) {
    return null;
  }
  const angles = (doc.suggestedAngles ?? [])
    .map((item) => (typeof item?.angle === 'string' ? item.angle.trim() : ''))
    .filter((angle) => angle.length > 0);

  return {
    id: doc.topicId,
    title: doc.title,
    keyDetails: doc.keyDetails,
    whyHot: doc.whyHot,
    suggestedAngles: angles,
  };
}

export async function listActiveTopics(
  strapi: Core.Strapi
): Promise<IndiaTrendingTopic[]> {
  const rows = await strapi.documents(TRENDING_TOPIC_UID).findMany({
    status: 'published',
    filters: { isActive: { $eq: true } },
    sort: { sortOrder: 'asc' },
    limit: 100,
  });

  const docs = Array.isArray(rows) ? rows : [];
  return docs
    .map((doc) => mapDocumentToIndiaTrendingTopic(doc as TrendingTopicDocument))
    .filter((topic): topic is IndiaTrendingTopic => topic !== null);
}

export async function findByTopicId(
  strapi: Core.Strapi,
  topicId: string
): Promise<IndiaTrendingTopic | null> {
  const rows = await strapi.documents(TRENDING_TOPIC_UID).findMany({
    status: 'published',
    filters: {
      topicId: { $eq: topicId },
      isActive: { $eq: true },
    },
    limit: 1,
  });

  const doc = Array.isArray(rows) ? rows[0] : null;
  if (!doc) {
    return null;
  }
  return mapDocumentToIndiaTrendingTopic(doc as TrendingTopicDocument);
}

export async function pickTopicForRotation(
  strapi: Core.Strapi
): Promise<IndiaTrendingTopic | null> {
  const topics = await listActiveTopics(strapi);
  if (topics.length === 0) {
    return null;
  }
  const weekIndex = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  return topics[weekIndex % topics.length];
}

export async function listActiveTopicIds(strapi: Core.Strapi): Promise<string[]> {
  const topics = await listActiveTopics(strapi);
  return topics.map((t) => t.id);
}

export default factories.createCoreService(
  TRENDING_TOPIC_UID,
  ({ strapi }) => ({
    listActiveTopics: () => listActiveTopics(strapi),
    findByTopicId: (topicId: string) => findByTopicId(strapi, topicId),
    pickTopicForRotation: () => pickTopicForRotation(strapi),
    listActiveTopicIds: () => listActiveTopicIds(strapi),
  })
);
