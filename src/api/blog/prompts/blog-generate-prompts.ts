/**
 * Single source of truth for blog JSON generation — used by the API and mirrored in
 * /prompts/blog-generate-for-chat.md for ChatGPT / Claude.ai / other tools.
 */

export const BLOG_GENERATE_SYSTEM_PROMPT = `You are a professional blog writer and SEO expert.
Your job is to write high-quality, long-form blog posts and return them as structured JSON.
Always return ONLY valid JSON — no markdown fences, no explanation, no extra text.`;

export function buildBlogGenerateUserPrompt(topic: string): string {
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
