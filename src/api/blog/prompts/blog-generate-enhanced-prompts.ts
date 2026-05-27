/**
 * Enhanced blog generation prompts and curated India trending topics.
 */

export interface IndiaTrendingTopic {
  id: string;
  title: string;
  keyDetails: string;
  whyHot: string;
  suggestedAngles: string[];
}

export const CURATED_INDIA_TRENDING_TOPICS: IndiaTrendingTopic[] = [
  {
    id: 'heatwave-power-2026',
    title: 'Severe heatwave and power crisis',
    keyDetails:
      'Temperatures hit 45–48°C in North and Central India, record power demand, widespread outages and water shortages.',
    whyHot: 'Immediate national crisis affecting daily life, economy, and public health.',
    suggestedAngles: [
      'Impact on informal workers in urban areas',
      'Failing urban infrastructure and grid capacity',
      'Public health risks and heatstroke prevention',
    ],
  },
  {
    id: 'cockroach-janta-party',
    title: 'The Cockroach Janta Party movement',
    keyDetails:
      'Satirical online movement with 22M+ Instagram followers; debates on free speech and youth political dissent.',
    whyHot: 'Unique digital-age expression of frustration among India\'s youth on unemployment and governance.',
    suggestedAngles: [
      'Gen Z satire as political commentary',
      'Free speech vs platform moderation in India',
      'Youth unemployment and economic anxiety',
    ],
  },
  {
    id: 'ipl-2026-playoffs',
    title: 'IPL 2026 playoffs fever',
    keyDetails:
      'IPL at peak; Royal Challengers Bengaluru in the final; Vaibhav Sooryavanshi breakout sensation.',
    whyHot: 'India\'s biggest sporting event dominates entertainment and social media.',
    suggestedAngles: [
      'Vaibhav Sooryavanshi and the next generation of stars',
      'RCB\'s road to the final — fan culture and narrative',
      'What IPL 2026 means for Indian cricket economics',
    ],
  },
  {
    id: 'stray-dog-debate',
    title: 'Stray dog menace and public safety debate',
    keyDetails:
      'Hyderabad airport dog video reignited debate; ~52 million stray dogs nationally; Supreme Court involvement.',
    whyHot: 'Persistent public safety vs animal rights dilemma involving municipalities and courts.',
    suggestedAngles: [
      'Municipal policy and sterilization programmes',
      'Legal mandates and Supreme Court stance explained',
      'Community safety vs humane animal management',
    ],
  },
];

export const ENHANCED_SYSTEM_PROMPT = `You are a senior Indian news and features writer plus SEO strategist.
Write high-quality, long-form blog posts for an Indian audience and return them as structured JSON only.
Rules:
- Return ONLY valid JSON. No markdown code fences, no preamble, no explanation.
- Tone: factual, empathetic, non-sensational. Do not invent statistics or quote named officials unless provided in context.
- Content: 1,800–2,500 words in Markdown; 8+ sections using ## headings; include TL;DR, key takeaways (bullets), FAQ (5+ Q&As), and "Sources & further reading" (generic reputable outlets only — no fake URLs).
- India context: use en-IN framing, rupee where relevant, city/state examples when appropriate.
- SEO: strong metaTitle (50–60 chars), metaDescription (120–160 chars), coherent keywords.`;

export interface EnhancedPromptInput {
  topic: string;
  angle?: string;
  researchContext?: string;
  trendingTopicId?: string;
}

export function findTrendingTopicById(id: string): IndiaTrendingTopic | undefined {
  return CURATED_INDIA_TRENDING_TOPICS.find((t) => t.id === id);
}

export function buildEnhancedUserPrompt(input: EnhancedPromptInput): string {
  const { topic, angle, researchContext, trendingTopicId } = input;

  let trendingBlock = '';
  if (trendingTopicId) {
    const trending = findTrendingTopicById(trendingTopicId);
    if (trending) {
      trendingBlock = `
Curated trending context (use for grounding, do not copy verbatim):
- Title: ${trending.title}
- Key details: ${trending.keyDetails}
- Why it matters: ${trending.whyHot}
`;
    }
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
  "suggestedCategory": "One of: News, Sports, Society, Environment",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "content": "# Title\\n\\n**TL;DR:** ...\\n\\n## Section...\\n\\n(Full markdown: 8+ ## sections, takeaways, FAQ, Sources & further reading)",
  "meteData": {
    "metaTitle": "SEO title 50-60 chars",
    "metaDescription": "120-160 chars",
    "canonicalUrl": "/blog/same-slug-as-fullPath",
    "ogTitle": "Social share title",
    "ogDescription": "1-2 sentences for social",
    "scriptApplicationJson": {
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      "headline": "Same as title",
      "description": "Same as metaDescription",
      "inLanguage": "en-IN",
      "keywords": "comma-separated keywords",
      "articleSection": "suggestedCategory value",
      "about": { "@type": "Thing", "name": "primary topic subject" }
    }
  }
}

Strict rules:
- fullPath and canonicalUrl must match and start with /blog/
- suggestedCategory must be exactly one of: News, Sports, Society, Environment
- metaDescription length 120-160 characters
- Do not fabricate specific quotes, poll numbers, or court order text`;
}
