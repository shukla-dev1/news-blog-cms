import {
  buildEnhancedUserPrompt,
  ENHANCED_SYSTEM_PROMPT,
  type EnhancedPromptInput,
} from '../prompts/blog-generate-enhanced-prompts';
import type { GeneratedBlogPayload } from './blog-generate';
import {
  createDeepSeekClient,
  isInsufficientBalanceError,
  parseJsonFromModelResponse,
  resolveDeepSeekBaseUrl,
  resolveDeepSeekMaxTokens,
  resolveDeepSeekModel,
  resolveDeepSeekApiKey,
} from './deepseek-client';

export interface GeneratedBlogEnhancedPayload extends GeneratedBlogPayload {
  excerpt?: string;
  bannerImageUrl?: string;
  suggestedCategory?: string;
  keywords?: string[];
}

function validateEnhancedPayload(data: unknown): GeneratedBlogEnhancedPayload {
  if (!data || typeof data !== 'object') {
    throw new Error('DeepSeek returned invalid JSON: expected an object');
  }
  const obj = data as Record<string, unknown>;
  const required = ['title', 'fullPath', 'content', 'meteData'] as const;
  for (const key of required) {
    if (typeof obj[key] !== 'string' && key !== 'meteData') {
      throw new Error(`DeepSeek JSON missing or invalid field: ${key}`);
    }
    if (key === 'meteData' && (obj.meteData == null || typeof obj.meteData !== 'object')) {
      throw new Error('DeepSeek JSON missing or invalid field: meteData');
    }
  }
  return obj as unknown as GeneratedBlogEnhancedPayload;
}

export default ({ strapi }) => ({
  async generateEnhanced(
    input: EnhancedPromptInput
  ): Promise<GeneratedBlogEnhancedPayload> {
    const apiKey = resolveDeepSeekApiKey();
    const baseURL = resolveDeepSeekBaseUrl();
    const model = resolveDeepSeekModel(true);
    const maxTokens = resolveDeepSeekMaxTokens(true);

    if (!apiKey) {
      throw new Error(
        'DEEPSEEK_API_KEY is missing. Add it to .env and restart Strapi.'
      );
    }

    strapi.log.info(
      `[blog-generate-enhanced] DeepSeek baseURL=${baseURL}, model=${model}, max_tokens=${maxTokens}, API key length=${apiKey.length}`
    );

    const client = createDeepSeekClient();

    try {
      const response = await client.chat.completions.create({
        model,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: ENHANCED_SYSTEM_PROMPT },
          { role: 'user', content: buildEnhancedUserPrompt(input) },
        ],
      });

      const raw = response.choices[0]?.message?.content ?? '';
      const parsed = parseJsonFromModelResponse(raw);
      return validateEnhancedPayload(parsed);
    } catch (err: unknown) {
      if (isInsufficientBalanceError(err)) {
        throw new Error(
          'DeepSeek account has insufficient balance (402). Top up at https://platform.deepseek.com/ and retry.'
        );
      }
      throw err;
    }
  },
});
