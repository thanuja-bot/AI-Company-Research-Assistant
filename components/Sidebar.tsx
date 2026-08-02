'use client';

import { X, Settings2, Bot, Sparkles } from 'lucide-react';
import { AVAILABLE_MODELS } from '@/lib/types';
import type { DiscordConfig, ModelId } from '@/lib/types';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  model: ModelId;
  onModelChange: (m: ModelId) => void;
  discordConfig: DiscordConfig;
  onDiscordConfigChange: (c: DiscordConfig) => void;
  discordEnabled: boolean;
  onDiscordEnabledChange: (enabled: boolean) => void;
}

export default function Sidebar({
  open,
  onClose,
  model,
  onModelChange,
  discordConfig,
  onDiscordConfigChange,
  discordEnabled,
  onDiscordEnabledChange
}: SidebarProps) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/30 md:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed z-30 h-full w-80 shrink-0 transform border-r border-slate-200 bg-white p-5 transition-transform duration-200 md:relative md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="text-brand-600" size={22} />
            <h1 className="text-lg font-semibold leading-tight">
              AI Company
              <br />
              Research Assistant
            </h1>
          </div>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-slate-100 md:hidden">
            <X size={18} />
          </button>
        </div>

        <section className="mb-6">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Bot size={16} /> AI Model
          </h2>
          <select
            value={model}
            onChange={(e) => onModelChange(e.target.value as ModelId)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          >
            {AVAILABLE_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">Routed through OpenRouter.</p>
        </section>

        <section className="rounded-lg border border-slate-200 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Settings2 size={16} /> Discord Integration
            </h2>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={discordEnabled}
                onChange={(e) => onDiscordEnabledChange(e.target.checked)}
                className="peer sr-only"
              />
              <div className="h-5 w-9 rounded-full bg-slate-300 peer-checked:bg-brand-600 transition-colors" />
              <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-4" />
            </label>
          </div>

          <p className="mb-3 text-xs text-slate-500">
            When enabled, a generated report is automatically posted with the PDF attached.
          </p>

          <div className={`space-y-2 ${discordEnabled ? '' : 'pointer-events-none opacity-50'}`}>
            <input
              type="text"
              placeholder="Applicant Name"
              value={discordConfig.applicantName}
              onChange={(e) => onDiscordConfigChange({ ...discordConfig, applicantName: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
            <input
              type="email"
              placeholder="Applicant Email Address"
              value={discordConfig.applicantEmail}
              onChange={(e) => onDiscordConfigChange({ ...discordConfig, applicantEmail: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
            <input
              type="password"
              placeholder="Discord Bot Token"
              value={discordConfig.botToken}
              onChange={(e) => onDiscordConfigChange({ ...discordConfig, botToken: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
            <input
              type="text"
              placeholder="Discord Channel ID"
              value={discordConfig.channelId}
              onChange={(e) => onDiscordConfigChange({ ...discordConfig, channelId: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>
        </section>

        <p className="mt-6 text-xs text-slate-400">
          No accounts, no history — everything stays in this session only.
        </p>
      </aside>
    </>
  );
}
