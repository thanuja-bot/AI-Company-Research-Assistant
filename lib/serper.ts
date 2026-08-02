const SERPER_URL = 'https://google.serper.dev/search';

export interface SerperOrganicResult {
  title: string;
  link: string;
  snippet?: string;
  position?: number;
}

export interface SerperSearchResponse {
  organic?: SerperOrganicResult[];
  knowledgeGraph?: {
    title?: string;
    website?: string;
    description?: string;
    attributes?: Record<string, string>;
  };
}

const BLOCKED_DOMAINS = [
  'wikipedia.org',
  'linkedin.com',
  'facebook.com',
  'twitter.com',
  'x.com',
  'instagram.com',
  'youtube.com',
  'crunchbase.com',
  'bloomberg.com',
  'glassdoor.com',
  'indeed.com',
  'g2.com',
  'trustpilot.com',
  'reddit.com',
  'medium.com'
];

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

async function serperSearch(query: string): Promise<SerperSearchResponse> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    throw new Error('SERPER_API_KEY is not configured on the server.');
  }

  const res = await fetch(SERPER_URL, {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ q: query }),
    // Serper can be slow on cold queries; keep a sane timeout via AbortSignal
    signal: AbortSignal.timeout(15000)
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error('Serper.dev rejected the API key. Check SERPER_API_KEY.');
  }
  if (res.status === 429) {
    throw new Error('Serper.dev rate limit reached. Try again shortly.');
  }
  if (!res.ok) {
    throw new Error(`Serper.dev request failed with status ${res.status}.`);
  }

  return (await res.json()) as SerperSearchResponse;
}

/**
 * Resolves a company name to its most likely official website using
 * Serper's organic search results, filtering out social/aggregator domains.
 */
export async function resolveOfficialWebsite(companyName: string): Promise<{
  url: string;
  context: SerperSearchResponse;
}> {
  const data = await serperSearch(`${companyName} official website`);

  if (data.knowledgeGraph?.website) {
    return { url: data.knowledgeGraph.website, context: data };
  }

  const candidate = (data.organic || []).find((r) => {
    const domain = getDomain(r.link);
    if (!domain) return false;
    return !BLOCKED_DOMAINS.some((blocked) => domain.endsWith(blocked));
  });

  if (!candidate) {
    throw new Error(`Could not resolve an official website for "${companyName}" from search results.`);
  }

  return { url: candidate.link, context: data };
}

export async function searchCompanyBackground(query: string): Promise<SerperSearchResponse> {
  return serperSearch(`${query} company overview industry headquarters`);
}

export async function searchCompetitorContext(query: string): Promise<SerperSearchResponse> {
  return serperSearch(`${query} competitors alternatives`);
}

/** Flattens Serper organic results + knowledge graph into short text for the AI prompt. */
export function summarizeSerperContext(label: string, data: SerperSearchResponse): string {
  const lines: string[] = [`--- ${label} ---`];
  if (data.knowledgeGraph) {
    const kg = data.knowledgeGraph;
    lines.push(
      `Knowledge graph: ${kg.title ?? ''} ${kg.description ?? ''} ${kg.website ?? ''}`.trim()
    );
  }
  for (const r of (data.organic || []).slice(0, 6)) {
    lines.push(`- ${r.title}: ${r.snippet ?? ''} (${r.link})`);
  }
  return lines.join('\n');
}
