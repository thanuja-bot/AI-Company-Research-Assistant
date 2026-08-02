import * as cheerio from 'cheerio';
import type { CrawledPage } from './types';

const MAX_PAGES = 8;
const PER_REQUEST_TIMEOUT_MS = 8000;
const TARGET_PATH_HINTS = [
  { key: 'about', patterns: ['/about', 'about-us', 'who-we-are'] },
  { key: 'products', patterns: ['/product', '/features'] },
  { key: 'services', patterns: ['/service'] },
  { key: 'solutions', patterns: ['/solution'] },
  { key: 'contact', patterns: ['/contact'] },
  { key: 'pricing', patterns: ['/pricing', '/plans'] }
];

const SKIP_PATTERNS = [
  '/login',
  '/signin',
  '/sign-in',
  '/signup',
  '/sign-up',
  '/register',
  '/cart',
  '/checkout',
  '/account',
  '/logout',
  'javascript:',
  'mailto:',
  'tel:'
];

const NON_HTML_EXT = /\.(png|jpe?g|gif|svg|webp|ico|css|js|json|pdf|zip|mp4|mp3|woff2?|ttf)$/i;

function normalizeUrl(raw: string, base: string): string | null {
  try {
    const u = new URL(raw, base);
    u.hash = '';
    // normalize trailing slash for dedup purposes (keep root as-is)
    if (u.pathname.length > 1 && u.pathname.endsWith('/')) {
      u.pathname = u.pathname.slice(0, -1);
    }
    u.search = '';
    return u.toString();
  } catch {
    return null;
  }
}

function isSameDomain(url: string, rootDomain: string): boolean {
  try {
    return new URL(url).hostname.replace(/^www\./, '') === rootDomain;
  } catch {
    return false;
  }
}

function shouldSkip(url: string): boolean {
  const lower = url.toLowerCase();
  if (NON_HTML_EXT.test(lower)) return true;
  return SKIP_PATTERNS.some((p) => lower.includes(p));
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; AICompanyResearchBot/1.0; +https://example.com/bot)'
      },
      signal: AbortSignal.timeout(PER_REQUEST_TIMEOUT_MS)
    });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function extractCleanText($: cheerio.CheerioAPI): string {
  $('script, style, noscript, nav, footer, svg, iframe').remove();
  const text = $('body').text();
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 6000); // cap per-page to keep the AI prompt bounded
}

function scoreLinkForTarget(url: string, linkText: string): string | null {
  const haystack = `${url.toLowerCase()} ${linkText.toLowerCase()}`;
  for (const target of TARGET_PATH_HINTS) {
    if (target.patterns.some((p) => haystack.includes(p))) {
      return target.key;
    }
  }
  return null;
}

/**
 * Crawls a same-domain site starting at rootUrl, discovering Home/About/
 * Products/Services/Solutions/Contact/Pricing pages, skipping auth/cart
 * pages, duplicates, fragments, and non-HTML assets.
 */
export async function crawlWebsite(rootUrl: string): Promise<{
  pages: CrawledPage[];
  blocked: boolean;
}> {
  const normalizedRoot = normalizeUrl(rootUrl, rootUrl);
  if (!normalizedRoot) {
    return { pages: [], blocked: true };
  }
  const rootDomain = new URL(normalizedRoot).hostname.replace(/^www\./, '');

  const homeHtml = await fetchHtml(normalizedRoot);
  if (!homeHtml) {
    return { pages: [], blocked: true };
  }

  const visited = new Set<string>([normalizedRoot]);
  const pages: CrawledPage[] = [];

  const $home = cheerio.load(homeHtml);
  pages.push({
    url: normalizedRoot,
    title: $home('title').first().text().trim() || 'Home',
    text: extractCleanText($home)
  });

  // Collect candidate internal links, scored by how well they match target pages.
  const candidates: { url: string; score: string | null }[] = [];
  $home('a[href]').each((_, el) => {
    const href = $home(el).attr('href');
    if (!href) return;
    const normalized = normalizeUrl(href, normalizedRoot);
    if (!normalized) return;
    if (shouldSkip(normalized)) return;
    if (!isSameDomain(normalized, rootDomain)) return;
    if (visited.has(normalized)) return;

    const linkText = $home(el).text() || '';
    candidates.push({ url: normalized, score: scoreLinkForTarget(normalized, linkText) });
  });

  // Prioritize scored (target) links first, then fill remaining budget with others.
  const scored = candidates.filter((c) => c.score !== null);
  const unscored = candidates.filter((c) => c.score === null);
  const orderedCandidates = [...scored, ...unscored];

  const seenTargets = new Set<string>();
  for (const candidate of orderedCandidates) {
    if (pages.length >= MAX_PAGES) break;
    if (visited.has(candidate.url)) continue;
    if (candidate.score && seenTargets.has(candidate.score)) continue; // avoid duplicate page types

    visited.add(candidate.url);
    const html = await fetchHtml(candidate.url);
    if (!html) continue;

    const $page = cheerio.load(html);
    const text = extractCleanText($page);
    if (!text) continue;

    pages.push({
      url: candidate.url,
      title: $page('title').first().text().trim() || candidate.url,
      text
    });

    if (candidate.score) seenTargets.add(candidate.score);
  }

  return { pages, blocked: false };
}
