import OpenAI from 'openai';

const DEFAULT_DEEPSEEK_BASE_URL = 'https://api.deepseek.com';
const DEFAULT_DEEPSEEK_MODEL = 'deepseek-chat';

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

function resolveApiKeyFromEnv(): string {
  return sanitizeApiKey(process.env.DEEPSEEK_API_KEY);
}

function resolveBaseUrl(): string {
  const raw = process.env.DEEPSEEK_BASE_URL?.trim();
  if (!raw) {
    return DEFAULT_DEEPSEEK_BASE_URL;
  }
  return raw.replace(/\/$/, '');
}

function resolveModel(): string {
  return process.env.DEEPSEEK_MODEL?.trim() || DEFAULT_DEEPSEEK_MODEL;
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

export interface GeneratedBlogPayload {
  title: string;
  fullPath: string;
  content: string;
  meteData?: {
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
    const apiKey = resolveApiKeyFromEnv();
    const baseURL = resolveBaseUrl();
    const model = resolveModel();

    if (!apiKey) {
      throw new Error(
        'DEEPSEEK_API_KEY is missing. Add it to .env and restart Strapi.'
      );
    }

    strapi.log.info(
      `[blog-generate] DeepSeek baseURL=${baseURL}, model=${model}, API key length=${apiKey.length}`
    );

    const client = new OpenAI({ apiKey, baseURL });

    const response = await client.chat.completions.create({
      model,
      max_tokens: 4000,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(topic) },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? '';
    const json = raw.replace(/^```json\n?|```$/gm, '').trim();
    return JSON.parse(json) as GeneratedBlogPayload;
  },
});
