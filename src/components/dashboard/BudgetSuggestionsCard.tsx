import React, { useMemo, useState } from 'react';
import { useCurrency } from '../../contexts/CurrencyContext';

type Suggestion = {
  id: string;
  title: string;
  detail: string;
  savings: number;
};

export default function BudgetSuggestionsCard() {
  const { formatFromBase } = useCurrency();
  const [applied, setApplied] = useState<Record<string, boolean>>({});

  const suggestions = useMemo<Suggestion[]>(
    () => [
      { id: 'subs', title: 'Reduce subscriptions', detail: 'Trim unused renewals and bundle plans.', savings: 1200 },
      { id: 'dining', title: 'Lower dining budget', detail: 'Shift 2 meals/week to home cooking.', savings: 2000 },
      { id: 'rides', title: 'Optimize transport', detail: 'Batch errands on weekdays to avoid surge.', savings: 900 },
    ],
    []
  );

  return (
    <div className="surface surface-pad-sm surface-pressable">
      <div className="text-xs font-semibold text-slate-700">Smart budget suggestions</div>
      <div className="mt-1 text-[11px] text-slate-400">Apply suggestions to update your plan (UI-only)</div>

      <div className="mt-3 space-y-3">
        {suggestions.map((s) => {
          const isApplied = !!applied[s.id];
          return (
            <div key={s.id} className="rounded-2xl bg-slate-50/60 ring-1 ring-black/[0.04] p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold text-slate-800">{s.title}</div>
                  <div className="mt-0.5 text-[11px] text-slate-500 leading-5">{s.detail}</div>
                </div>
                <div className="shrink-0 text-[11px] font-semibold text-emerald-700">
                  Save {formatFromBase(s.savings)}/mo
                </div>
              </div>
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setApplied((p) => ({ ...p, [s.id]: !p[s.id] }))}
                  className={[
                    'h-9 px-3 rounded-xl text-[12px] font-semibold ring-1 transition-colors',
                    isApplied
                      ? 'bg-emerald-600 text-white ring-emerald-500/30 hover:bg-emerald-700'
                      : 'bg-white text-slate-700 ring-black/[0.08] hover:bg-slate-50',
                  ].join(' ')}
                >
                  {isApplied ? 'Applied' : 'Apply suggestion'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
