'use client';

import { Check, Loader2, AlertTriangle, Circle } from 'lucide-react';
import type { StepStatus } from '@/lib/types';

export default function ProgressTracker({ steps }: { steps: StepStatus[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <ul className="space-y-2.5">
        {steps.map((step) => (
          <li key={step.id} className="flex items-start gap-2.5 text-sm">
            <span className="mt-0.5 shrink-0">
              {step.status === 'done' && <Check size={16} className="text-emerald-600" />}
              {step.status === 'active' && (
                <Loader2 size={16} className="animate-spin text-brand-600" />
              )}
              {step.status === 'error' && <AlertTriangle size={16} className="text-amber-500" />}
              {(step.status === 'pending' || step.status === 'skipped') && (
                <Circle size={14} className="text-slate-300" />
              )}
            </span>
            <div>
              <span
                className={
                  step.status === 'pending'
                    ? 'text-slate-400'
                    : step.status === 'error'
                    ? 'text-amber-700'
                    : 'text-slate-800'
                }
              >
                {step.label}
              </span>
              {step.detail && <p className="text-xs text-slate-500">{step.detail}</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
