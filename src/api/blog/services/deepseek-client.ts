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

export function resolveDeepSeekMaxTokens(enhanced = false): number {
  if (enhanced) {
    const raw = process.env.DEEPSEEK_ENHANCED_MAX_TOKENS;
    if (raw) {
      const parsed = Number.parseInt(raw, 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
    return 8000;
  }
  return 4000;
}

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
  });
}

export function parseJsonFromModelResponse(raw: string): unknown {
  const cleaned = raw.replace(/^```json\n?|```$/gm, '').trim();
  return JSON.parse(cleaned);
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
