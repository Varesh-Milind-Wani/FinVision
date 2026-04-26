import React, { useMemo } from 'react';
import { useAmountsVisibility } from '../../contexts/AmountsVisibilityContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { formatCurrency } from '../../utils/formatUtils';
import { cx } from './ui';

const Spark = ({ tone = 'indigo' }) => {
  const gradId = `spark-${tone}`;
  const toneStops =
    tone === 'emerald'
      ? ['rgba(16,185,129,1)', 'rgba(56,189,248,1)']
      : tone === 'amber'
        ? ['rgba(245,158,11,1)', 'rgba(236,72,153,1)']
        : ['rgba(99,102,241,1)', 'rgba(59,130,246,1)'];

  return (
    <svg viewBox="0 0 120 36" className="h-9 w-auto" aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={toneStops[0]} />
          <stop offset="1" stopColor={toneStops[1]} />
        </linearGradient>
      </defs>
      <path
        d="M2 26 C 18 24, 26 12, 40 16 C 56 22, 64 10, 76 12 C 90 14, 96 6, 118 8"
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M2 26 C 18 24, 26 12, 40 16 C 56 22, 64 10, 76 12 C 90 14, 96 6, 118 8 L 118 34 L 2 34 Z"
        fill="rgba(99,102,241,0.12)"
      />
    </svg>
  );
};

const Progress = ({ label, value, tone = 'indigo' }) => {
  const barTone =
    tone === 'emerald'
      ? 'from-emerald-400 to-cyan-400'
      : tone === 'amber'
        ? 'from-amber-400 to-rose-400'
        : 'from-indigo-400 to-sky-400';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-300/80">
        <span className="truncate">{label}</span>
        <span className="tabular-nums">{Math.min(100, Math.max(0, value))}%</span>
      </div>
      <div className="h-2 rounded-full bg-white/10 ring-1 ring-white/10 overflow-hidden">
        <div className={cx('h-full rounded-full bg-gradient-to-r', barTone)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
    </div>
  );
};

const kpisByVariant = {
  dashboard: [
    { k: 'This month', v: 1284, kind: 'money', s: 'Pace: -8% vs last month' },
    { k: 'Budget health', v: '82%', s: '3 categories near limit' },
    { k: 'Net worth', v: 42910, kind: 'money', s: '+520 this month' },
  ],
  insights: [
    { k: 'Recurring', v: '6 items', s: '2 increased since last month' },
    { k: 'Volatility', v: 'Low', s: 'Stable spend pattern' },
    { k: 'Projection', v: 1430, kind: 'money', s: 'Month-end estimate' },
  ],
  budgets: [
    { k: 'Food', v: 210, kind: 'money', s: '70% of budget' },
    { k: 'Transport', v: 86, kind: 'money', s: '43% of budget' },
    { k: 'Subscriptions', v: 39, kind: 'money', s: '92% of budget' },
  ],
  networth: [
    { k: 'Assets', v: 58200, kind: 'money', s: 'Cash + investments' },
    { k: 'Liabilities', v: 15290, kind: 'money', s: 'Loans + cards' },
    { k: 'Delta', v: 520, kind: 'money', s: '30-day change' },
  ],
  privacy: [
    { k: 'Security', v: 'PIN', s: 'Protect sensitive actions' },
    { k: 'Mask', v: 'Hotkey', s: 'Hide amounts instantly' },
    { k: 'Alerts', v: 'Email', s: 'Monthly summaries' },
  ],
};

const txByVariant = {
  dashboard: [
    { m: 'Groceries', c: 'Food', a: -38.2, kind: 'money' },
    { m: 'Fuel', c: 'Transport', a: -22, kind: 'money' },
    { m: 'Salary', c: 'Income', a: 2400, kind: 'money' },
  ],
  insights: [
    { m: 'Streaming', c: 'Recurring', a: -12.99, kind: 'money' },
    { m: 'Gym', c: 'Recurring', a: -29, kind: 'money' },
    { m: 'Coffee', c: 'Spike', a: -18.5, kind: 'money' },
  ],
  budgets: [
    { m: 'Dining out', c: 'Food', a: -24.1, kind: 'money' },
    { m: 'Bus pass', c: 'Transport', a: -15, kind: 'money' },
    { m: 'Tools', c: 'Work', a: -19, kind: 'money' },
  ],
  networth: [
    { m: 'Index fund', c: 'Investments', a: 120, kind: 'money' },
    { m: 'Credit card', c: 'Liability', a: -64, kind: 'money' },
    { m: 'Savings', c: 'Cash', a: 80, kind: 'money' },
  ],
  privacy: [
    { m: 'Email alert', c: 'Reports', a: 'On', kind: 'text' },
    { m: 'Monthly report', c: 'Reports', a: 'Scheduled', kind: 'text' },
    { m: 'Secure export', c: 'Control', a: 'CSV / JSON', kind: 'text' },
  ],
};

const localeForCurrency = (code) => (String(code || '').toUpperCase() === 'INR' ? 'en-IN' : 'en-US');

export default function ProductMock({
  title = 'Dashboard',
  subtitle = 'Spending pace + budget health',
  variant = 'dashboard',
  accent = 'indigo',
  className = '',
}) {
  const { amountsHidden, maskedText } = useAmountsVisibility();
  const { displayCurrencyCode } = useCurrency();
  const locale = localeForCurrency(displayCurrencyCode);

  const kpis = useMemo(() => kpisByVariant[variant] || kpisByVariant.dashboard, [variant]);
  const tx = useMemo(() => txByVariant[variant] || txByVariant.dashboard, [variant]);

  const glowTone =
    accent === 'emerald'
      ? 'from-emerald-400/20 via-cyan-400/15 to-transparent'
      : accent === 'amber'
        ? 'from-amber-400/20 via-rose-400/15 to-transparent'
        : 'from-indigo-400/20 via-sky-400/15 to-transparent';

  return (
    <div className={cx('relative rounded-[28px] bg-slate-950/55 ring-1 ring-white/10 overflow-hidden', className)}>
      <div aria-hidden="true" className={cx('absolute -top-24 -right-20 h-64 w-64 rounded-full blur-3xl opacity-70 bg-gradient-to-br', glowTone)} />

      <div className="relative p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-2 text-[11px] font-extrabold tracking-wider uppercase text-slate-200/70">
                Preview
                <span className={cx('h-1.5 w-1.5 rounded-full', accent === 'emerald' ? 'bg-emerald-400' : accent === 'amber' ? 'bg-amber-400' : 'bg-indigo-400')} />
              </span>
              <span className="text-[11px] text-slate-300/70 truncate">Fast · Private</span>
            </div>
            <div className="mt-3 font-display text-lg font-extrabold text-white truncate">{title}</div>
            <div className="mt-1 text-xs text-slate-200/70 truncate">{subtitle}</div>
          </div>
          <div className="hidden sm:block">
            <Spark tone={accent} />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          {kpis.slice(0, 3).map((k) => (
            <div key={k.k} className="rounded-2xl bg-white/8 ring-1 ring-white/10 p-3">
              <div className="text-[11px] font-semibold text-slate-200/70">{k.k}</div>
              <div className="mt-1 text-sm font-extrabold text-white tabular-nums">
                {amountsHidden && k.kind === 'money'
                  ? maskedText
                  : k.kind === 'money'
                    ? formatCurrency(Number(k.v) || 0, locale, displayCurrencyCode)
                    : String(k.v)}
              </div>
              <div className="mt-1 text-[11px] text-slate-200/70 line-clamp-1">{k.s}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/8 ring-1 ring-white/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[11px] font-semibold text-slate-200/70">Budgets</div>
              <div className="text-[11px] text-slate-200/60">Auto pace</div>
            </div>
            <div className="mt-3 space-y-3">
              <Progress label="Food" value={70} tone={accent} />
              <Progress label="Transport" value={43} tone={accent} />
              <Progress label="Subscriptions" value={92} tone={accent} />
            </div>
          </div>

          <div className="rounded-2xl bg-white/8 ring-1 ring-white/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[11px] font-semibold text-slate-200/70">Recent</div>
              <div className="text-[11px] text-slate-200/60">Auto-categorized</div>
            </div>
            <div className="mt-3 space-y-2">
              {tx.slice(0, 3).map((t) => (
                <div key={`${t.m}-${t.c}`} className="flex items-center justify-between gap-3 rounded-xl bg-white/6 ring-1 ring-white/10 px-3 py-2">
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-white truncate">{t.m}</div>
                    <div className="text-[11px] text-slate-200/65 truncate">{t.c}</div>
                  </div>
                  <div className="text-xs font-extrabold text-slate-100 tabular-nums whitespace-nowrap">
                    {t.kind === 'money'
                      ? amountsHidden
                        ? maskedText
                        : formatCurrency(Number(t.a) || 0, locale, displayCurrencyCode)
                      : String(t.a)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
