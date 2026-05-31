import {
  BLOG_GENERATE_SYSTEM_PROMPT,
  buildBlogGenerateUserPrompt,
} from '../prompts/blog-generate-prompts';
import {
  buildDeepSeekJsonChatParams,
  createDeepSeekClient,
  normalizeGeneratedBlogMetadata,
  parseJsonFromModelResponse,
  resolveDeepSeekBaseUrl,
  resolveDeepSeekMaxTokens,
  resolveDeepSeekModel,
  resolveDeepSeekApiKey,
} from './deepseek-client';

export interface GeneratedBlogPayload {
  title: string;
  fullPath: string;
  content: string;
  metaData?: {
    metaTitle?: string | null;
    metaDescription?: string | null;
    canonicalUrl?: string | null;
    ogTitle?: string | null;
    ogDescription?: string | null;
    scriptApplicationJson?: Record<string, unknown> | null;
  };
}

export default ({ strapi }) => ({
  async generate(topic: string): Promise<GeneratedBlogPayload> {
    const apiKey = resolveDeepSeekApiKey();
    const baseURL = resolveDeepSeekBaseUrl();
    const model = resolveDeepSeekModel(false);
    const maxTokens = resolveDeepSeekMaxTokens(false);

    if (!apiKey) {
      throw new Error(
        'DEEPSEEK_API_KEY is missing. Add it to .env and restart Strapi.'
      );
    }

    strapi.log.info(
      `[blog-generate] DeepSeek baseURL=${baseURL}, model=${model}, API key length=${apiKey.length}`
    );

    const client = createDeepSeekClient();

    const response = await client.chat.completions.create(
      buildDeepSeekJsonChatParams({
        enhanced: false,
        messages: [
          { role: 'system', content: BLOG_GENERATE_SYSTEM_PROMPT },
          { role: 'user', content: buildBlogGenerateUserPrompt(topic) },
        ],
      })
    );

    const raw = response.choices[0]?.message?.content ?? '';
    const parsed = parseJsonFromModelResponse(raw);
    if (parsed && typeof parsed === 'object') {
      normalizeGeneratedBlogMetadata(parsed as Record<string, unknown>);
    }
    return parsed as GeneratedBlogPayload;
  },
});
