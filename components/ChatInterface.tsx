'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, AlertTriangle, CheckCircle2, User, Sparkles } from 'lucide-react';
import ProgressTracker from './ProgressTracker';
import ReportPreview from './ReportPreview';
import type { DiscordConfig, ResearchResult, StepStatus, ResearchWarning } from '@/lib/types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  input?: string;
  steps?: StepStatus[];
  result?: ResearchResult;
  warnings?: ResearchWarning[];
  discordSent?: boolean;
  error?: string;
}

const BASE_STEPS: StepStatus[] = [
  { id: 'resolve', label: 'Resolving official website via Serper...', status: 'pending' },
  { id: 'search', label: 'Gathering background & competitor context...', status: 'pending' },
  { id: 'crawl', label: 'Crawling website pages...', status: 'pending' },
  { id: 'ai', label: 'Analyzing with OpenRouter AI...', status: 'pending' },
  { id: 'pdf', label: 'Preparing PDF report...', status: 'pending' },
  { id: 'discord', label: 'Sending to Discord...', status: 'pending' }
];

export default function ChatInterface({
  model,
  discordEnabled,
  discordConfig
}: {
  model: string;
  discordEnabled: boolean;
  discordConfig: DiscordConfig;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  function updateAssistantMsg(id: string, patch: Partial<ChatMessage>) {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }

  function setStep(id: string, stepId: string, status: StepStatus['status'], detail?: string) {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== id || !m.steps) return m;
        return {
          ...m,
          steps: m.steps.map((s) => (s.id === stepId ? { ...s, status, detail } : s))
        };
      })
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || busy) return;

    const userMsgId = crypto.randomUUID();
    const assistantMsgId = crypto.randomUUID();

    const steps = BASE_STEPS.map((s) => ({ ...s }));
    if (!discordEnabled) {
      const d = steps.find((s) => s.id === 'discord');
      if (d) d.status = 'skipped';
    }

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: 'user', input: trimmed },
      { id: assistantMsgId, role: 'assistant', steps }
    ]);
    setInput('');
    setBusy(true);

    // Drive a lightweight simulated progression for UX while the single
    // orchestration request runs server-side (the real work is server-side,
    // this just gives the user visible motion through the pipeline stages).
    setStep(assistantMsgId, 'resolve', 'active');

    const progressTimers: NodeJS.Timeout[] = [];
    const schedule = (ms: number, fn: () => void) => progressTimers.push(setTimeout(fn, ms));

    schedule(600, () => {
      setStep(assistantMsgId, 'resolve', 'done');
      setStep(assistantMsgId, 'search', 'active');
    });
    schedule(1800, () => {
      setStep(assistantMsgId, 'search', 'done');
      setStep(assistantMsgId, 'crawl', 'active');
    });
    schedule(3500, () => {
      setStep(assistantMsgId, 'crawl', 'done');
      setStep(assistantMsgId, 'ai', 'active');
    });

    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: trimmed,
          model,
          discord: discordEnabled ? discordConfig : undefined
        })
      });

      progressTimers.forEach(clearTimeout);

      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  steps: (m.steps || []).map((s) =>
                    s.status === 'active' || s.status === 'pending'
                      ? { ...s, status: 'error' as const }
                      : s
                  ),
                  error: data.error || 'Something went wrong.'
                }
              : m
          )
        );
        setBusy(false);
        return;
      }

      setStep(assistantMsgId, 'resolve', 'done');
      setStep(assistantMsgId, 'search', 'done');
      setStep(
        assistantMsgId,
        'crawl',
        'done',
        `${data.crawledPages || 0} page${data.crawledPages === 1 ? '' : 's'} crawled`
      );
      setStep(assistantMsgId, 'ai', 'done');
      setStep(assistantMsgId, 'pdf', 'done');
      if (discordEnabled) {
        setStep(assistantMsgId, 'discord', data.discordSent ? 'done' : 'error');
      }

      updateAssistantMsg(assistantMsgId, {
        result: data.result,
        warnings: data.warnings || [],
        discordSent: data.discordSent
      });
    } catch (err: any) {
      progressTimers.forEach(clearTimeout);
      updateAssistantMsg(assistantMsgId, { error: 'Network error. Please try again.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-6 md:px-8">
        {messages.length === 0 && (
          <div className="mx-auto max-w-xl pt-16 text-center text-slate-400">
            <Sparkles className="mx-auto mb-3 text-brand-500" size={28} />
            <p className="text-sm">
              Enter a company name (e.g. <span className="font-medium text-slate-500">Stripe</span>) or a website
              URL to generate a full research report.
            </p>
          </div>
        )}

        {messages.map((m) =>
          m.role === 'user' ? (
            <div key={m.id} className="flex justify-end">
              <div className="flex max-w-lg items-start gap-2 rounded-2xl rounded-tr-sm bg-brand-600 px-4 py-2.5 text-sm text-white">
                <span>{m.input}</span>
              </div>
            </div>
          ) : (
            <div key={m.id} className="flex justify-start">
              <div className="w-full max-w-2xl space-y-3">
                {m.steps && <ProgressTracker steps={m.steps} />}

                {m.error && (
                  <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    <span>{m.error}</span>
                  </div>
                )}

                {m.warnings && m.warnings.length > 0 && (
                  <div className="space-y-1.5">
                    {m.warnings.map((w, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800"
                      >
                        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                        <span>{w.message}</span>
                      </div>
                    ))}
                  </div>
                )}

                {discordEnabled && m.discordSent && (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-700">
                    <CheckCircle2 size={14} /> Report sent to Discord successfully.
                  </div>
                )}

                {m.result && <ReportPreview result={m.result} />}
              </div>
            </div>
          )
        )}
      </div>

      <form onSubmit={handleSubmit} className="border-t border-slate-200 bg-white p-4 md:px-8">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter a company name or website URL..."
            disabled={busy}
            className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none disabled:bg-slate-50"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            <Send size={16} />
            {busy ? 'Researching...' : 'Research'}
          </button>
        </div>
      </form>
    </div>
  );
}
