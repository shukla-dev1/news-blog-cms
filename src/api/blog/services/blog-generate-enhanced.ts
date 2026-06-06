import {
  buildEnhancedUserPrompt,
  ENHANCED_SYSTEM_PROMPT,
  type EnhancedPromptInput,
} from '../prompts/blog-generate-enhanced-prompts';
import type { GeneratedBlogPayload } from './blog-generate';
import {
  buildDeepSeekJsonChatParams,
  buildFallbackMetaData,
  createDeepSeekClient,
  isInsufficientBalanceError,
  isJsonParseError,
  normalizeGeneratedBlogMetadata,
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

function validateEnhancedPayload(
  data: unknown,
  options?: { finishReason?: string | null; maxTokens: number }
): GeneratedBlogEnhancedPayload {
  if (!data || typeof data !== 'object') {
    throw new Error('DeepSeek returned invalid JSON: expected an object');
  }
  const obj = data as Record<string, unknown>;
  normalizeGeneratedBlogMetadata(obj);

  for (const key of ['title', 'fullPath', 'content'] as const) {
    if (typeof obj[key] !== 'string' || !obj[key]) {
      throw new Error(`DeepSeek JSON missing or invalid field: ${key}`);
    }
  }

  if (obj.metaData == null || typeof obj.metaData !== 'object') {
    if (options?.finishReason === 'length') {
      throw new Error(
        `DeepSeek response truncated at ${options.maxTokens} tokens before metaData was returned. ` +
          'Increase DEEPSEEK_ENHANCED_MAX_TOKENS in .env (try 8192) and restart Strapi.'
      );
    }
    const title = String(obj.title);
    const fullPath = String(obj.fullPath);
    obj.metaData = buildFallbackMetaData(title, fullPath);
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
    const messages = [
      { role: 'system' as const, content: ENHANCED_SYSTEM_PROMPT },
      { role: 'user' as const, content: buildEnhancedUserPrompt(input) },
    ];
    const chatParams = buildDeepSeekJsonChatParams({ enhanced: true, messages });

    try {
      let lastParseError: unknown;

      for (let attempt = 1; attempt <= 2; attempt += 1) {
        try {
          const response = await client.chat.completions.create(chatParams);
          const choice = response.choices[0];
          const raw = choice?.message?.content ?? '';
          const finishReason = choice?.finish_reason ?? null;

          if (finishReason === 'length') {
            strapi.log.warn(
              `[blog-generate-enhanced] DeepSeek hit max_tokens=${maxTokens} (response truncated)`
            );
          }

          const parsed = parseJsonFromModelResponse(raw);
          return validateEnhancedPayload(parsed, { finishReason, maxTokens });
        } catch (err: unknown) {
          if (isInsufficientBalanceError(err)) {
            throw new Error(
              'DeepSeek account has insufficient balance (402). Top up at https://platform.deepseek.com/ and retry.'
            );
          }
          if (isJsonParseError(err) && attempt < 2) {
            lastParseError = err;
            strapi.log.warn(
              '[blog-generate-enhanced] Invalid JSON from DeepSeek, retrying once...'
            );
            continue;
          }
          throw err;
        }
      }

      throw lastParseError instanceof Error
        ? lastParseError
        : new Error('Failed to parse DeepSeek JSON after retry');
    } catch (err: unknown) {
      if (isInsufficientBalanceError(err)) {
        throw new Error(
          'DeepSeek account has insufficient balance (402). Top up at https://platform.deepseek.com/ and retry.'
        );
      }
      if (isJsonParseError(err)) {
        throw new Error(
          'DeepSeek returned malformed JSON (often unescaped quotes in content). Retry the request or lower article length in the prompt.'
        );
      }
      throw err;
    }
  },
});
