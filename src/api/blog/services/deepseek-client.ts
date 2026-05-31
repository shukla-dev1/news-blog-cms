import OpenAI from 'openai';

const DEFAULT_DEEPSEEK_BASE_URL = 'https://api.deepseek.com';
const DEFAULT_DEEPSEEK_MODEL = 'deepseek-chat';

export function sanitizeApiKey(raw: string | undefined | null): string {
  if (raw == null || raw === '') {
    return '';
  }
  return String(raw)
    .replace(/^\uFEFF/, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/^["']|["']$/g, '')
    .replace(/\r?\n/g, '')
    .trim();
}

export function resolveDeepSeekApiKey(): string {
  return sanitizeApiKey(process.env.DEEPSEEK_API_KEY);
}

export function resolveDeepSeekBaseUrl(): string {
  const raw = process.env.DEEPSEEK_BASE_URL?.trim();
  if (!raw) {
    return DEFAULT_DEEPSEEK_BASE_URL;
  }
  return raw.replace(/\/$/, '');
}

export function resolveDeepSeekModel(enhanced = false): string {
  if (enhanced) {
    const enhancedModel = process.env.DEEPSEEK_ENHANCED_MODEL?.trim();
    if (enhancedModel) {
      return enhancedModel;
    }
  }
  return process.env.DEEPSEEK_MODEL?.trim() || DEFAULT_DEEPSEEK_MODEL;
}

const DEFAULT_ENHANCED_MAX_TOKENS = 8192;

export function resolveDeepSeekMaxTokens(enhanced = false): number {
  if (enhanced) {
    const raw = process.env.DEEPSEEK_ENHANCED_MAX_TOKENS || String(DEFAULT_ENHANCED_MAX_TOKENS);
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed;
    }
    return DEFAULT_ENHANCED_MAX_TOKENS;
  }
  return 4000;
}

const DEEPSEEK_REQUEST_TIMEOUT_MS = 180_000;

export function createDeepSeekClient(): OpenAI {
  const apiKey = resolveDeepSeekApiKey();
  if (!apiKey) {
    throw new Error(
      'DEEPSEEK_API_KEY is missing. Add it to .env and restart Strapi.'
    );
  }
  return new OpenAI({
    apiKey,
    baseURL: resolveDeepSeekBaseUrl(),
    timeout: DEEPSEEK_REQUEST_TIMEOUT_MS,
    maxRetries: 2,
  });
}

export function buildDeepSeekJsonChatParams(options: {
  enhanced?: boolean;
  messages: OpenAI.Chat.ChatCompletionMessageParam[];
}): OpenAI.Chat.ChatCompletionCreateParamsNonStreaming {
  const enhanced = options.enhanced ?? false;
  return {
    model: resolveDeepSeekModel(enhanced),
    max_tokens: resolveDeepSeekMaxTokens(enhanced),
    messages: options.messages,
    response_format: { type: 'json_object' },
    temperature: 0.4,
  };
}

function extractJsonPayload(raw: string): string {
  let cleaned = raw
    .replace(/^```(?:json)?\s*/im, '')
    .replace(/\s*```$/g, '')
    .trim();

  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start >= 0 && end > start) {
    cleaned = cleaned.slice(start, end + 1);
  }
  return cleaned;
}

/** Best-effort repair when the model truncates mid-JSON (finish_reason=length). */
function closeTruncatedJsonObject(json: string): string {
  let repaired = json.trimEnd();
  if (repaired.endsWith(',')) {
    repaired = repaired.slice(0, -1);
  }

  const openBraces =
    (repaired.match(/\{/g) ?? []).length - (repaired.match(/\}/g) ?? []).length;
  const openBrackets =
    (repaired.match(/\[/g) ?? []).length - (repaired.match(/\]/g) ?? []).length;

  if (openBraces > 0 || openBrackets > 0) {
    const lastChar = repaired.at(-1);
    if (lastChar && lastChar !== '"' && lastChar !== '}' && lastChar !== ']') {
      repaired += '"';
    }
    repaired += ']'.repeat(Math.max(0, openBrackets));
    repaired += '}'.repeat(Math.max(0, openBraces));
  }

  return repaired;
}

export function isJsonParseError(err: unknown): boolean {
  if (err instanceof SyntaxError) {
    return true;
  }
  const message = err instanceof Error ? err.message : String(err ?? '');
  return message.includes('JSON') || message.includes('Unexpected token');
}

export function parseJsonFromModelResponse(raw: string): unknown {
  if (!raw.trim()) {
    throw new Error('DeepSeek returned an empty response');
  }

  const payload = extractJsonPayload(raw);
  const attempts = [payload, closeTruncatedJsonObject(payload)];
  let lastError: unknown;

  for (const candidate of attempts) {
    if (!candidate) {
      continue;
    }
    try {
      return JSON.parse(candidate);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Failed to parse DeepSeek JSON response');
}

/** Normalize AI JSON to Strapi field `metaData` (legacy typo `meteData` still accepted). */
export function normalizeGeneratedBlogMetadata(
  data: Record<string, unknown>
): void {
  if (data.metaData != null && typeof data.metaData === 'object') {
    return;
  }
  const legacy = data.meteData ?? data.metadata;
  if (legacy != null && typeof legacy === 'object') {
    data.metaData = legacy;
  }
}

export function buildFallbackMetaData(
  title: string,
  fullPath: string
): Record<string, unknown> {
  const metaTitle = title.length > 60 ? `${title.slice(0, 57)}...` : title;
  const metaDescription =
    title.length > 160 ? `${title.slice(0, 157)}...` : title;
  return {
    metaTitle,
    metaDescription,
    canonicalUrl: fullPath,
    ogTitle: title,
    ogDescription: metaDescription,
    scriptApplicationJson: {
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: title,
      description: metaDescription,
      inLanguage: 'en-IN',
    },
  };
}

export function isInsufficientBalanceError(err: unknown): boolean {
  const message =
    err instanceof Error ? err.message : String(err ?? '');
  const status =
    err && typeof err === 'object' && 'status' in err
      ? (err as { status?: number }).status
      : err && typeof err === 'object' && 'statusCode' in err
        ? (err as { statusCode?: number }).statusCode
        : undefined;
  return (
    status === 402 ||
    message.includes('402') ||
    message.toLowerCase().includes('insufficient balance')
  );
}
