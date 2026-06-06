/**
 * Enhanced blog generation prompts and trending topic types.
 */

export interface IndiaTrendingTopic {
  id: string;
  title: string;
  keyDetails: string;
  whyHot: string;
  suggestedAngles: string[];
}

export const ENHANCED_SYSTEM_PROMPT = `You are a senior Indian news editor and an elite SEO strategist specializing in human-centric search intent.
Write high-quality, long-form blog posts for an Indian audience and return them as structured JSON only.

Rules:
- Return ONLY valid JSON. No markdown code fences, no preamble, no explanation.
- All string values must be valid JSON strings: escape double quotes as \\" and newlines as \\n inside "content" and other fields.
- Tone: factual, empathetic, non-sensational. Do not invent statistics or quote named officials unless provided in context.
- Content: 900–1,200 words in Markdown; 6+ sections using ## headings; include TL;DR, key takeaways (bullets), FAQ (4+ Q&As), and "Sources & further reading" (generic reputable outlets only — no fake URLs).
- India context: use en-IN framing, rupee where relevant, city/state examples when appropriate.

CRITICAL SEO & METADATA RULES:
- Keywords must reflect how ordinary, non-technical everyday Indians search Google (e.g., "why power cuts in delhi" rather than "urban grid failure analysis"). Include long-tail query questions.
- metaTitle (50-60 chars): Avoid robotic titles. Front-load target keywords. Make it high click-through rate (CTR), answering what the user gets by clicking.
- metaDescription (120-160 chars): Start with an active, compelling hook that aligns perfectly with a user's problem or query. Do not summarize the whole article vaguely; give a definitive reason to click.`;

export interface EnhancedPromptInput {
  topic: string;
  angle?: string;
  researchContext?: string;
  trendingTopicId?: string;
  trendingTopic?: IndiaTrendingTopic;
  allowedCategories: string[];
  categoryName?: string;
}

export function buildEnhancedUserPrompt(input: EnhancedPromptInput): string {
  const {
    topic,
    angle,
    researchContext,
    trendingTopic,
    allowedCategories,
    categoryName,
  } = input;

  const categoryInstruction = categoryName
    ? `Set "suggestedCategory" to exactly "${categoryName}" (required).`
    : `Set "suggestedCategory" to exactly one of these values (copy verbatim): ${allowedCategories.map((c) => `"${c}"`).join(', ')}. Do not invent other category names.`;

  const suggestedCategoryExample = categoryName ?? allowedCategories[0] ?? 'Category';

  let trendingBlock = '';
  if (trendingTopic) {
    trendingBlock = `
Curated trending context (use for grounding, do not copy verbatim):
- Title: ${trendingTopic.title}
- Key details: ${trendingTopic.keyDetails}
- Why it matters: ${trendingTopic.whyHot}
`;
  }

  const angleBlock = angle ? `\nEditorial angle: "${angle}"` : '';
  const researchBlock = researchContext
    ? `\nAdditional research context:\n${researchContext}`
    : '';

  return `Write a complete, publish-ready blog post.

Primary topic: "${topic}"${angleBlock}${trendingBlock}${researchBlock}

Return a single JSON object with this exact structure:

{
  "title": "Compelling headline",
  "excerpt": "2-3 sentence hook, max 280 characters",
  "fullPath": "/blog/url-friendly-slug",
  "bannerImageUrl": "optional https URL for a relevant stock-style image, or empty string",
  "suggestedCategory": "${suggestedCategoryExample}",
  "keywords": ["user search query 1", "casual conversational keyword 2", "how to question 3", "keyword4", "keyword5"],
  "metaData": {
    "metaTitle": "High CTR Title matching human search intent (50-60 chars)",
    "metaDescription": "Actionable snippet answering a real user's query (120-160 chars)",
    "canonicalUrl": "/blog/same-slug-as-fullPath",
    "ogTitle": "Social share title",
    "ogDescription": "1-2 sentences for social",
    "scriptApplicationJson": {
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      "headline": "Same as title",
      "description": "Same as metaDescription",
      "inLanguage": "en-IN",
      "keywords": "comma-separated conversational keywords",
      "articleSection": "suggestedCategory value",
      "about": { "@type": "Thing", "name": "primary topic subject" }
    }
  },
  "content": "# Title\\n\\n**TL;DR:** ...\\n\\n## Section...\\n\\n(Full markdown: 6+ ## sections, takeaways, FAQ, Sources & further reading — put this field last)"
}

Strict SEO Alignment Rules for Metadata:
1. Think like a layman: Do not use industry jargon in meta titles/descriptions. If a user wants to know why power is tripping during a heatwave, use keywords like "power cuts", "load shedding", or "electricity outage".
2. Match Search Intent: Ensure keywords include conversational patterns (e.g., "is it safe to...", "why is...", "how to stop...").
3. Format Precision: use the key name "metaData" exactly (required by the CMS). Keep length constraints strict (metaTitle: 50-60 chars, metaDescription: 120-160 chars).
4. No fabrication of specific legal codes, statistics, or quotes.

Category rule: ${categoryInstruction}`;
}
