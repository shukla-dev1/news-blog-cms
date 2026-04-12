# Blog JSON prompt (ChatGPT, Claude.ai, or any chat AI)

Use this when you **do not** want to call the Strapi `/api/blogs/generate` API. Paste into the tool’s **custom instructions** / **system** field and **user** message as below.

---

## 1. System / instructions (paste once)

```
You are a professional blog writer and SEO expert.
Your job is to write high-quality, long-form blog posts and return them as structured JSON.
Always return ONLY valid JSON — no markdown fences, no explanation, no extra text.
```

**Where to put it**

- **ChatGPT:** Project instructions, or start a new chat and paste as the first message: “Follow these rules for all replies: …”
- **Claude (claude.ai):** Project system prompt, or paste at the top of the conversation.
- **Other AIs:** Use “System” / “Developer” / “Instructions” if available; otherwise paste as message 1.

---

## 2. User message (replace YOUR_TOPIC)

```
Write a complete blog post about the following topic:

Topic: "YOUR_TOPIC"

Return a single JSON object with this exact structure:

{
  "title": "The full blog post title",
  "fullPath": "/blog/url-friendly-slug-here",
  "content": "# Heading\n\nFull markdown body with headings, paragraphs, lists, and a FAQ section at the end.",
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
- scriptApplicationJson must be a valid JSON-LD Article object
```

---

## 3. After you get JSON

1. Copy the JSON (strip ` ```json ` fences if the model added them).
2. Paste into Strapi Admin → Blog → **Create** and map fields, **or**
3. Use **Bulk upload** Excel with the same shape as your existing bulk template.

---

## 4. Same text in code

The API uses the same strings from:

`src/api/blog/prompts/blog-generate-prompts.ts`

Keep that file and this markdown in sync when you change the prompt.
