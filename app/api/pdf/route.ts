import { NextRequest, NextResponse } from 'next/server';
import { generateReportPdf } from '@/lib/pdf';
import type { ResearchResult } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const result = (await req.json()) as ResearchResult;

    if (!result || !result.companyName) {
      return NextResponse.json({ error: 'Missing research result data.' }, { status: 400 });
    }

    const pdfBuffer = await generateReportPdf(result);
    const fileName = `${result.companyName.replace(/[^a-z0-9]+/gi, '_')}_report.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to generate PDF.' }, { status: 500 });
  }
}
