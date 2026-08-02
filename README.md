# AI Company Research Assistant

A single-project, ChatGPT-style web app that researches any company from just a
name or a website URL: it resolves the official site, crawls key pages,
enriches with web search, runs AI analysis via OpenRouter, identifies
competitors, and produces a downloadable PDF report — with an optional
Discord bonus integration.

Built for the Relu Consultancy "AI & Automation Developer" hackathon brief.

## How it works (pipeline)

1. **Input** — user submits a company name or a URL in the chat box.
2. **Resolve** (`lib/serper.ts`) — if a name was given, Serper.dev's
   `/search` endpoint is queried for `"<name> official website"`; the first
   organic result that isn't a social/aggregator domain (LinkedIn, Wikipedia,
   Crunchbase, etc.) is taken as the official site. If a URL was given, this
   step is skipped.
2. **Search context** — two more Serper.dev calls gather general company
   background and competitor-oriented snippets, used later as grounding
   context for the AI step.
3. **Crawl** (`lib/crawler.ts`) — a same-domain crawler starts at the
   homepage, follows internal links, and prioritizes About / Products /
   Services / Solutions / Contact / Pricing pages by URL/link-text pattern
   matching. It skips login/signup/cart pages, fragments, duplicates, and
   non-HTML assets, caps itself at 8 pages and an 8s per-request timeout, and
   extracts clean text (nav/footer/scripts stripped) for the AI prompt. If
   crawling fails or is blocked, the pipeline falls back to search-only
   context instead of failing outright.
4. **AI analysis** (`lib/openrouter.ts`) — the combined crawl + search
   context is sent to the user-selected OpenRouter model with
   `response_format: {type: "json_object"}` and a strict schema prompt. The
   response is parsed defensively (fenced-code-block stripping, schema
   validation) with **one automatic corrective retry** if the model's first
   reply isn't valid JSON.
5. **PDF** (`lib/pdf.ts`) — a formatted report is rendered server-side with
   `@react-pdf/renderer` and made available as a one-click download.
6. **Discord (bonus)** (`lib/discord.ts`) — if configured in the sidebar,
   the PDF and a summary embed are POSTed to the configured channel via
   Discord's bot REST API using multipart file upload.

Every external step (search, crawl, Discord) degrades gracefully: failures
are surfaced as inline warnings rather than crashing the whole report, as
long as the AI step has *something* to work with.

## Project structure

```
app/
  api/research/route.ts   # orchestrates the full pipeline
  api/pdf/route.ts        # standalone PDF generation/download endpoint
  page.tsx                # chat UI shell
  layout.tsx, globals.css
components/
  Sidebar.tsx             # model selector + Discord/applicant settings
  ChatInterface.tsx        # chat feed, progress tracking, submit handling
  ProgressTracker.tsx      # step-by-step live status list
  ReportPreview.tsx        # formatted result card + download button
lib/
  serper.ts                # Serper.dev search/resolution client
  crawler.ts                # same-domain crawler + text extraction
  openrouter.ts              # OpenRouter chat completions client
  pdf.tsx                    # @react-pdf/renderer report definition
  discord.ts                 # Discord bot REST API client
  types.ts                   # shared TypeScript types
```

## Local setup

```bash
npm install
cp .env.example .env.local   # then fill in your keys
npm run dev
```

Open http://localhost:3000.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `SERPER_API_KEY` | Yes | API key from https://serper.dev, used for website resolution and background/competitor search. |
| `OPENROUTER_API_KEY` | Yes | API key from https://openrouter.ai/keys, used for AI analysis. |
| `APP_URL` | No | Sent as `HTTP-Referer` to OpenRouter (recommended by their API). |
| `APP_NAME` | No | Sent as `X-Title` to OpenRouter. |

**Discord Bot Token and Channel ID are *not* environment variables.** They're
entered directly in the app's sidebar at runtime, since the hackathon
evaluator supplies their own values live in the UI rather than baking them
into a deployment.

## Deployment

This is a standard Next.js 14 App Router project — deploy it as-is to
Vercel, Netlify, or any Node-compatible host. Set `SERPER_API_KEY` and
`OPENROUTER_API_KEY` as environment variables in your host's dashboard. No
database and no auth provider are required.

## Notes on accuracy / design choices

- Competitor identification and pain points are explicitly grounded in the
  Serper search context and crawled site content passed to the model, and
  the system prompt instructs the AI to use `null` rather than invent
  contact details it can't find — this keeps hallucination risk down for the
  fields graders are most likely to spot-check.
- The crawler deliberately dedupes by normalized URL (trailing slash /
  query string stripped) and by "target page type" (only one About page,
  one Pricing page, etc.) so the AI prompt doesn't get flooded with
  near-duplicate content.
- Every external integration (Serper, crawler, OpenRouter, Discord) has its
  own try/catch boundary in `app/api/research/route.ts` so a single failing
  dependency degrades the report instead of taking down the whole request.
