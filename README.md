# Blog CMS

## Step-by-step: Test AI APIs

Follow these steps in order. Steps 1–4 do not call DeepSeek; steps 5–6 do.

### Prerequisites

1. Copy `.env.example` to `.env` if you have not already.
2. Set your DeepSeek key:
   ```env
   DEEPSEEK_API_KEY=your-key-here
   DEEPSEEK_ENHANCED_MAX_TOKENS=8192
   ```
3. Start Strapi:
   ```bash
   npm run dev
   ```
4. Wait until the terminal shows `Strapi started successfully` and admin is at `http://localhost:1337/admin`.
5. On first boot, bootstrap seeds **Blog Trending Topic** and **Blog Cron Job** entries (if collections were empty).

### Step 1 — Check Strapi is up

```bash
curl -s "http://localhost:1337/api/blogs/generate-options"
```

**Expected:** JSON response (not connection refused). First line should include `"categories"` or `"data"`.

**Windows (status code only):**

```powershell
curl.exe -s -o NUL -w "%{http_code}" "http://localhost:1337/api/blogs/generate-options"
```

**Expected:** `200`

---

### Step 2 — Load valid field values (no AI)

```bash
curl -s "http://localhost:1337/api/blogs/generate-options"
```

**Expected:** JSON with `data.categories`, `data.authors`, `data.breadcrumbs`, `data.trendingTopics`.

**Action:** Pick from the response:

- One `categoryName` from `categories` (required for a reliable enhanced test if you send `categoryName`)
- Optional: `authors[].slug`, `breadcrumbs[]`, `trendingTopics[].id`

If `categories` is empty, create at least one **Blog Category** in the admin UI, then run this step again.

---

### Step 3 — List trending topics (no AI)

```bash
curl -s "http://localhost:1337/api/blogs/trending-topics"
```

**Expected:** `data` array of topics with `id`, `title`, `keyDetails`, `whyHot`, `suggestedAngles`.

**Action:** Copy one `id` (e.g. `heatwave-power-2026`) for Step 6.

---

### Step 4 — Quick validation check (no AI, should fail fast)

Send a bad category to confirm validation runs **before** DeepSeek (response in under a second, no long wait):

```bash
curl -s -X POST "http://localhost:1337/api/blogs/generate-enhanced" \
  -H "Content-Type: application/json" \
  -d "{\"topic\": \"Test topic\", \"categoryName\": \"NonExistentCategory\"}"
```

**Expected:** HTTP `400` with `error.code` = `CATEGORY_NOT_FOUND` and `error.details.allowedValues` listing real categories.

---

### Step 5 — Test basic AI generate (`POST /api/blogs/generate`)

Calls DeepSeek and saves a **draft** blog.

```bash
curl -X POST "http://localhost:1337/api/blogs/generate" \
  -H "Content-Type: application/json" \
  -d "{\"topic\": \"Benefits of remote work for Indian startups\"}"
```

**Expected:** HTTP `200` after ~15–40s, body like:

```json
{
  "documentId": "...",
  "title": "...",
  "slug": "...",
  "fullPath": "/blog/..."
}
```

**Verify:** Open Strapi admin → **Content Manager → Blog** → find the new draft by `documentId` or title.

**Optional:** Add `blogAuthorSlug` / `breadcrumbName` from Step 2 (must exist or you get `400`).

---

### Step 6 — Test enhanced AI generate (`POST /api/blogs/generate-enhanced`)

Calls DeepSeek with trending/SEO context. Use values from Steps 2 and 3.

Replace placeholders in the body:

- `REPLACE_CATEGORY` → a name from `categories`
- `REPLACE_TRENDING_ID` → an `id` from `trendingTopics` (optional but recommended)
- `REPLACE_AUTHOR_SLUG` / `REPLACE_BREADCRUMB` → only if you have them in Strapi

```bash
curl -X POST "http://localhost:1337/api/blogs/generate-enhanced" \
  -H "Content-Type: application/json" \
  -d "{
    \"topic\": \"Severe heatwave and power crisis\",
    \"trendingTopicId\": \"REPLACE_TRENDING_ID\",
    \"angle\": \"Public health risks and heatstroke prevention\",
    \"categoryName\": \"REPLACE_CATEGORY\",
    \"publish\": false
  }"
```

**Expected:** HTTP `200` after ~20–90s, body includes `documentId`, `title`, `excerpt`, `keywords`, `suggestedCategory`.

**Verify:** Same as Step 5 in **Content Manager → Blog**. Check `metaData` and category relation if you sent `categoryName`.

**Publish test:** Run again with `"publish": true` to create a published entry (only if you intend to publish immediately).

---

### Step 7 — Troubleshooting

| Symptom | What to check |
|--------|----------------|
| `500` + JSON parse error | Raise `DEEPSEEK_ENHANCED_MAX_TOKENS=8192`, retry |
| `402` | DeepSeek balance; top up at https://platform.deepseek.com/ |
| `400` category / author / breadcrumb | Re-run Step 2; use exact strings from `allowedValues` |
| `400` trending topic | Re-run Step 3; use exact `id` from `data` |
| Request hangs then fails | Confirm `DEEPSEEK_API_KEY` in `.env` and Strapi was restarted |
| Empty `categories` | Add **Blog Category** in admin, restart not required |

---

## Blog AI API reference (curl)

Base URL (local dev): `http://localhost:1337`

All custom blog routes are under `/api`.

On Windows PowerShell, use `curl.exe` if `curl` is aliased to `Invoke-WebRequest`.

---

### 1. List valid options (no AI — use before generate)

Categories, authors, breadcrumbs, and trending topics from Strapi (not from DeepSeek).

```bash
curl -s "http://localhost:1337/api/blogs/generate-options"
```

---

### 2. List trending topics (no AI — from Strapi DB)

Active topics from **Blog Trending Topic** in the admin UI.

```bash
curl -s "http://localhost:1337/api/blogs/trending-topics"
```

---

### 3. Basic generate (DeepSeek → draft blog)

Calls DeepSeek with a topic, saves a **draft** blog in Strapi.

**Minimal body (only `topic` required):**

```bash
curl -X POST "http://localhost:1337/api/blogs/generate" \
  -H "Content-Type: application/json" \
  -d "{\"topic\": \"Benefits of remote work for Indian startups\"}"
```

**With optional author and breadcrumb (must exist in Strapi):**

```bash
curl -X POST "http://localhost:1337/api/blogs/generate" \
  -H "Content-Type: application/json" \
  -d "{
    \"topic\": \"Benefits of remote work for Indian startups\",
    \"blogAuthorSlug\": \"your-author-slug\",
    \"breadcrumbName\": \"your-breadcrumb-name\"
  }"
```

**Typical success response:**

```json
{
  "documentId": "...",
  "title": "...",
  "slug": "...",
  "fullPath": "/blog/..."
}
```

---

### 4. Enhanced generate (DeepSeek → draft or published)

Uses trending context, SEO fields, and categories from Strapi. Validates request **before** DeepSeek (invalid author/category/topic id → `400` without calling AI).

**Minimal body:**

```bash
curl -X POST "http://localhost:1337/api/blogs/generate-enhanced" \
  -H "Content-Type: application/json" \
  -d "{\"topic\": \"Severe heatwave and power crisis\"}"
```

**Full example (recommended):**

```bash
curl -X POST "http://localhost:1337/api/blogs/generate-enhanced" \
  -H "Content-Type: application/json" \
  -d "{
    \"topic\": \"Severe heatwave and power crisis\",
    \"trendingTopicId\": \"heatwave-power-2026\",
    \"angle\": \"Public health risks and heatstroke prevention\",
    \"researchContext\": \"Temperatures hit 45-48C in North and Central India, record power demand, widespread outages and water shortages.\",
    \"categoryName\": \"Technology\",
    \"blogAuthorSlug\": \"your-author-slug\",
    \"breadcrumbName\": \"your-breadcrumb-name\",
    \"publish\": false
  }"
```

| Field | Required | Notes |
|--------|----------|--------|
| `topic` | Yes | Main subject for DeepSeek |
| `trendingTopicId` | No | Must match an active topic from `trending-topics` / admin |
| `angle` | No | Editorial angle |
| `researchContext` | No | Extra grounding for the model |
| `categoryName` | No | Must exist in **Blog Category**; overrides AI category |
| `blogAuthorSlug` | No | Must exist in **Blog Author** |
| `breadcrumbName` | No | Must exist in **Breadcrumb Initial** |
| `publish` | No | `true` = published, default `false` = draft |

**Typical success response:**

```json
{
  "documentId": "...",
  "title": "...",
  "slug": "...",
  "fullPath": "/blog/...",
  "excerpt": "...",
  "keywords": ["..."],
  "suggestedCategory": "Technology"
}
```

**Notes:**

- Requests can take 20–90 seconds while DeepSeek runs.
- Set `DEEPSEEK_ENHANCED_MAX_TOKENS=8192` in `.env` for long posts.
- Validation errors return `400` with `error.code` and `error.details.allowedValues` when applicable.

---

### 5. PowerShell (JSON file — avoids quoting issues)

Save as `generate-enhanced.json`:

```json
{
  "topic": "Severe heatwave and power crisis",
  "trendingTopicId": "heatwave-power-2026",
  "angle": "Public health risks and heatstroke prevention",
  "publish": false
}
```

```powershell
curl.exe -X POST "http://localhost:1337/api/blogs/generate-enhanced" `
  -H "Content-Type: application/json" `
  --data-binary "@generate-enhanced.json"
```

---

### Other blog routes (not AI)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/blogs/non-technology-blogs` | Paginated published blogs excluding Technology |
| GET | `/api/blogs/bulk-template` | Download Excel bulk-upload template |
| POST | `/api/blogs/bulk-upload` | Bulk create/update blogs from Excel |

Cron jobs (`publish_scheduled`, `generate_basic`, `generate_enhanced`) are configured in Strapi **Blog Cron Job**, not via these HTTP routes.

---

# Getting started with Strapi

Strapi comes with a full featured [Command Line Interface](https://docs.strapi.io/dev-docs/cli) (CLI) which lets you scaffold and manage your project in seconds.

### `develop`

Start your Strapi application with autoReload enabled. [Learn more](https://docs.strapi.io/dev-docs/cli#strapi-develop)

```
npm run develop
# or
yarn develop
```

### `start`

Start your Strapi application with autoReload disabled. [Learn more](https://docs.strapi.io/dev-docs/cli#strapi-start)

```
npm run start
# or
yarn start
```

### `build`

Build your admin panel. [Learn more](https://docs.strapi.io/dev-docs/cli#strapi-build)

```
npm run build
# or
yarn build
```

## ⚙️ Deployment

Strapi gives you many possible deployment options for your project including [Strapi Cloud](https://cloud.strapi.io). Browse the [deployment section of the documentation](https://docs.strapi.io/dev-docs/deployment) to find the best solution for your use case.

```
yarn strapi deploy
```

## 📚 Learn more

- [Resource center](https://strapi.io/resource-center) - Strapi resource center.
- [Strapi documentation](https://docs.strapi.io) - Official Strapi documentation.
- [Strapi tutorials](https://strapi.io/tutorials) - List of tutorials made by the core team and the community.
- [Strapi blog](https://strapi.io/blog) - Official Strapi blog containing articles made by the Strapi team and the community.
- [Changelog](https://strapi.io/changelog) - Find out about the Strapi product updates, new features and general improvements.

Feel free to check out the [Strapi GitHub repository](https://github.com/strapi/strapi). Your feedback and contributions are welcome!

## ✨ Community

- [Discord](https://discord.strapi.io) - Come chat with the Strapi community including the core team.
- [Forum](https://forum.strapi.io/) - Place to discuss, ask questions and find answers, show your Strapi project and get feedback or just talk with other Community members.
- [Awesome Strapi](https://github.com/strapi/awesome-strapi) - A curated list of awesome things related to Strapi.

---

<sub>🤫 Psst! [Strapi is hiring](https://strapi.io/careers).</sub>
<!-- Git remove url:  https://github.com/shukla-dev1/news-blog-cms-->

<!-- aivon cloud of web developer account -->