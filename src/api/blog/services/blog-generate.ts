import path from 'path';
import { config as loadDotenv } from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';

const DEFAULT_ANTHROPIC_BASE_URL = 'https://api.anthropic.com';

/** Strip quotes, BOM, zero-width chars, and line breaks (common copy/paste issues). */
function sanitizeApiKey(raw: string | undefined | null): string {
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

/**
 * Load `.env` from the project root with `override: true`.
 * Default dotenv does not overwrite keys already on `process.env` (e.g. empty Windows user env).
 */
function resolveApiKeyFromEnv(): string {
  // loadDotenv({ path: path.join(process.cwd(), '.env'), override: true });
  // return sanitizeApiKey(process.env.ANTHROPIC_API_KEY);
  const result = sanitizeApiKey(process.env.ANTHROPIC_API_KEY);
  strapi.log.info(`[blog-generate] API key: "${result}"`);
  return result;
}

function resolveBaseUrl(): string {
  const raw = process.env.ANTHROPIC_BASE_URL?.trim();
  if (!raw) {
    return DEFAULT_ANTHROPIC_BASE_URL;
  }
  return raw.replace(/\/$/, '');
}

const SYSTEM_PROMPT = `You are a professional blog writer and SEO expert.
Your job is to write high-quality, long-form blog posts and return them as structured JSON.
Always return ONLY valid JSON — no markdown fences, no explanation, no extra text.`;

function buildUserPrompt(topic: string): string {
  return `Write a complete blog post about the following topic:

Topic: "${topic}"

Return a single JSON object with this exact structure:

{
  "title": "The full blog post title",
  "fullPath": "/blog/url-friendly-slug-here",
  "content": "# Heading\\n\\nFull markdown body with headings, paragraphs, lists, and a FAQ section at the end.",
  "meteData": {
    "metaTitle": "SEO-optimized page title (50-60 chars)",
    "metaDescription": "Compelling meta description that summarizes the post (120-160 chars)",
    "canonicalUrl": "/blog/url-friendly-slug-here",
    "ogTitle": "Social share title for Open Graph",
    "ogDescription": "Social share description for Open Graph (1-2 sentences)",
    "scriptApplicationJson": {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Same as title",
      "description": "Same as metaDescription"
    }
  }
}

Rules:
- fullPath and canonicalUrl must use the same slug, starting with /blog/
- content must be real Markdown with at least 5 headings and a FAQ section
- metaDescription must be between 120-160 characters
- scriptApplicationJson must be a valid JSON-LD Article object`;
}

export default ({ strapi }) => ({
  async generate(topic: string) {
    const apiKey = resolveApiKeyFromEnv();
    const baseURL = resolveBaseUrl();

    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY is missing. Add it to .env and restart Strapi. ' +
          'If ANTHROPIC_API_KEY exists in Windows (even empty), remove it or the app cannot override it without dotenv override.'
      );
    }

    strapi.log.info(
      `[blog-generate] Anthropic baseURL=${baseURL}, API key length=${apiKey.length} (never log the full key)`
    );

    const anthropic = new Anthropic({ apiKey, baseURL });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt(topic) }],
    });

    const raw = response.content[0].type === 'text' ? response.content[0].text : '';
    const json = raw.replace(/^```json\n?|```$/gm, '').trim();
    return JSON.parse(json);
  },
});
