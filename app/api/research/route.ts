import { NextRequest, NextResponse } from 'next/server';
import {
  resolveOfficialWebsite,
  searchCompanyBackground,
  searchCompetitorContext,
  summarizeSerperContext
} from '@/lib/serper';
import { crawlWebsite } from '@/lib/crawler';
import { analyzeCompany } from '@/lib/openrouter';
import { generateReportPdf } from '@/lib/pdf';
import { sendToDiscord } from '@/lib/discord';
import type { ResearchResponse, ResearchWarning } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

function looksLikeUrl(input: string): boolean {
  return /^https?:\/\//i.test(input.trim()) || /^[\w-]+\.[a-z]{2,}(\/.*)?$/i.test(input.trim());
}

function normalizeToUrl(input: string): string {
  const trimmed = input.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export async function POST(req: NextRequest) {
  const warnings: ResearchWarning[] = [];

  try {
    const body = await req.json();
    const input: string = (body.input || '').trim();
    const model: string = body.model || 'anthropic/claude-3.5-sonnet';
    const discord = body.discord as
      | { botToken: string; channelId: string; applicantName: string; applicantEmail: string }
      | undefined;

    if (!input) {
      return NextResponse.json({ error: 'Please provide a company name or website URL.' }, { status: 400 });
    }

    const isUrl = looksLikeUrl(input);
    let resolvedUrl: string;
    let resolvedFrom: 'url' | 'company_name';
    let backgroundContext = '';
    let competitorContext = '';

    if (isUrl) {
      resolvedUrl = normalizeToUrl(input);
      resolvedFrom = 'url';
    } else {
      resolvedFrom = 'company_name';
      try {
        const resolved = await resolveOfficialWebsite(input);
        resolvedUrl = resolved.url;
      } catch (err: any) {
        return NextResponse.json(
          { error: `Could not resolve an official website: ${err.message}` },
          { status: 422 }
        );
      }
    }

    // Background + competitor search context (best-effort — don't fail the whole run)
    try {
      const bg = await searchCompanyBackground(input);
      backgroundContext = summarizeSerperContext('Company Background (Serper)', bg);
    } catch (err: any) {
      warnings.push({ step: 'serper_background', message: err.message });
    }

    try {
      const comp = await searchCompetitorContext(input);
      competitorContext = summarizeSerperContext('Competitor Context (Serper)', comp);
    } catch (err: any) {
      warnings.push({ step: 'serper_competitors', message: err.message });
    }

    // Crawl the website (best-effort)
    let crawledText = '';
    let crawledPages = 0;
    try {
      const { pages, blocked } = await crawlWebsite(resolvedUrl);
      crawledPages = pages.length;
      if (blocked || pages.length === 0) {
        warnings.push({
          step: 'crawler',
          message: 'The website could not be crawled directly (it may block bots). Falling back to search context only.'
        });
      } else {
        crawledText = pages
          .map((p) => `### Page: ${p.title} (${p.url})\n${p.text}`)
          .join('\n\n');
      }
    } catch (err: any) {
      warnings.push({ step: 'crawler', message: err.message });
    }

    if (!crawledText && !backgroundContext && !competitorContext) {
      return NextResponse.json(
        { error: 'No usable data could be gathered from either crawling or search. Please try a different input.' },
        { status: 422 }
      );
    }

    const combinedContext = [
      `Target website: ${resolvedUrl}`,
      backgroundContext,
      competitorContext,
      crawledText ? `--- Crawled Website Content ---\n${crawledText}` : ''
    ]
      .filter(Boolean)
      .join('\n\n');

    let result;
    try {
      result = await analyzeCompany(model, combinedContext);
    } catch (err: any) {
      return NextResponse.json({ error: `AI analysis failed: ${err.message}` }, { status: 502 });
    }

    if (!result.website) result.website = resolvedUrl;

    let discordSent = false;
    if (discord?.botToken && discord?.channelId) {
      try {
        const pdfBuffer = await generateReportPdf(result);
        await sendToDiscord({
          botToken: discord.botToken,
          channelId: discord.channelId,
          applicantName: discord.applicantName,
          applicantEmail: discord.applicantEmail,
          result,
          pdfBuffer
        });
        discordSent = true;
      } catch (err: any) {
        warnings.push({ step: 'discord', message: err.message });
      }
    }

    const response: ResearchResponse & { discordSent: boolean } = {
      result,
      warnings,
      crawledPages,
      resolvedFrom,
      discordSent
    };

    return NextResponse.json(response);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unexpected server error.' }, { status: 500 });
  }
}
