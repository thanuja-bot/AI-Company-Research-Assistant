'use client';

import { Download, Building2, Phone, MapPin, Package, AlertCircle, Users } from 'lucide-react';
import type { ResearchResult } from '@/lib/types';

export default function ReportPreview({ result }: { result: ResearchResult }) {
  async function handleDownload() {
    const res = await fetch('/api/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result)
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.companyName.replace(/[^a-z0-9]+/gi, '_')}_report.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="text-brand-600" size={20} />
          <h3 className="text-lg font-semibold">{result.companyName}</h3>
        </div>
        <button
          onClick={handleDownload}
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Download size={15} /> Download PDF
        </button>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <div className="flex items-center gap-2 text-slate-600">
          <Building2 size={14} />
          <a href={result.website} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
            {result.website}
          </a>
        </div>
        <div className="flex items-center gap-2 text-slate-600">
          <Phone size={14} /> {result.phone || 'Not available'}
        </div>
        <div className="flex items-center gap-2 text-slate-600 sm:col-span-2">
          <MapPin size={14} /> {result.address || 'Not available'}
        </div>
      </div>

      <div className="mb-4">
        <h4 className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
          <Package size={15} /> Products / Services
        </h4>
        <ul className="list-inside list-disc space-y-0.5 text-sm text-slate-600">
          {result.productsServices.length === 0 && <li>No products/services identified.</li>}
          {result.productsServices.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      </div>

      <div className="mb-4">
        <h4 className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
          <AlertCircle size={15} /> AI-Generated Pain Points
        </h4>
        <ul className="list-inside list-disc space-y-0.5 text-sm text-slate-600">
          {result.painPoints.length === 0 && <li>No pain points identified.</li>}
          {result.painPoints.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      </div>

      <div>
        <h4 className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
          <Users size={15} /> Competitors
        </h4>
        {result.competitors.length === 0 ? (
          <p className="text-sm text-slate-600">No competitors identified.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Website</th>
                </tr>
              </thead>
              <tbody>
                {result.competitors.map((c, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="px-3 py-2">{c.name}</td>
                    <td className="px-3 py-2">
                      <a href={c.website} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
                        {c.website}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
