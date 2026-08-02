import type { ResearchResult } from './types';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const SYSTEM_PROMPT = `You are a meticulous company research analyst. You will be given raw crawled website text and web-search snippets about ONE company. Your job is to return ONLY a single JSON object (no markdown fences, no commentary) with exactly this shape:

{
  "companyName": string,
  "website": string,
  "phone": string | null,
  "address": string | null,
  "productsServices": string[],
  "painPoints": string[],
  "competitors": [{ "name": string, "website": string }]
}

Rules:
- Base every fact ONLY on the provided content. If phone or address is not present anywhere in the content, use null. Do not invent contact details.
- "productsServices" should be a concise bulleted list (as an array of short strings) of what the company actually sells or offers, drawn from the crawled pages.
- "painPoints" should be your expert inference of 3-6 real business pain points this company likely faces or addresses for customers, reasoned from their products/market/positioning as described in the content — not generic filler.
- "competitors" should be 3-6 real companies operating in the same country and industry with similar products or services, grounded in the competitor-research context provided. Each needs a plausible official website. Do not repeat the company itself as a competitor.
- Return raw JSON only. Do not wrap it in \`\`\`json or any other text.`;

function extractJsonBlock(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return raw.slice(firstBrace, lastBrace + 1);
  }
  return raw.trim();
}

function validateResult(obj: any): obj is ResearchResult {
  return (
    obj &&
    typeof obj.companyName === 'string' &&
    typeof obj.website === 'string' &&
    Array.isArray(obj.productsServices) &&
    Array.isArray(obj.painPoints) &&
    Array.isArray(obj.competitors) &&
    obj.competitors.every(
      (c: any) => c && typeof c.name === 'string' && typeof c.website === 'string'
    )
  );
}

function normalizeResult(obj: any): ResearchResult {
  return {
    companyName: String(obj.companyName ?? '').trim() || 'Unknown Company',
    website: String(obj.website ?? '').trim(),
    phone: obj.phone ? String(obj.phone).trim() : null,
    address: obj.address ? String(obj.address).trim() : null,
    productsServices: (obj.productsServices ?? []).map((s: any) => String(s)).filter(Boolean),
    painPoints: (obj.painPoints ?? []).map((s: any) => String(s)).filter(Boolean),
    competitors: (obj.competitors ?? [])
      .filter((c: any) => c && c.name && c.website)
      .map((c: any) => ({ name: String(c.name), website: String(c.website) }))
  };
}

async function callOpenRouter(model: string, messages: { role: string; content: string }[]) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured on the server.');
  }

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
      'X-Title': process.env.APP_NAME || 'AI Company Research Assistant'
    },
    body: JSON.stringify({
      model,
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.3
    }),
    signal: AbortSignal.timeout(45000)
  });

  if (res.status === 401) {
    throw new Error('OpenRouter rejected the API key. Check OPENROUTER_API_KEY.');
  }
  if (res.status === 429) {
    throw new Error('OpenRouter rate limit reached. Try again shortly, or pick a different model.');
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`OpenRouter request failed with status ${res.status}. ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new Error('OpenRouter returned an unexpected response shape.');
  }
  return content;
}

/**
 * Analyzes crawled/search content with the chosen OpenRouter model and
 * returns a validated ResearchResult. Retries once with a corrective
 * message if the model's first response isn't valid JSON matching the schema.
 */
export async function analyzeCompany(
  model: string,
  contextText: string
): Promise<ResearchResult> {
  const userMessage = `Here is the research content gathered about the company:\n\n${contextText}\n\nReturn the JSON object now.`;

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userMessage }
  ];

  let raw = await callOpenRouter(model, messages);
  let jsonText = extractJsonBlock(raw);

  try {
    const parsed = JSON.parse(jsonText);
    if (validateResult(parsed)) return normalizeResult(parsed);
    throw new Error('Schema validation failed');
  } catch {
    // One corrective retry: tell the model exactly what went wrong.
    const retryMessages = [
      ...messages,
      { role: 'assistant', content: raw },
      {
        role: 'user',
        content:
          'That response was not valid JSON matching the required schema. Reply again with ONLY the raw JSON object, no markdown fences, matching the exact schema described in the system prompt.'
      }
    ];
    raw = await callOpenRouter(model, retryMessages);
    jsonText = extractJsonBlock(raw);
    const parsed = JSON.parse(jsonText); // let this throw if it fails again — caller handles the error
    if (!validateResult(parsed)) {
      throw new Error('AI response did not match the required schema after retry.');
    }
    return normalizeResult(parsed);
  }
}
