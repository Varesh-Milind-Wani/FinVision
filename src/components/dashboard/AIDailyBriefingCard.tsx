import React from 'react';
import { useExpenseContext } from '../../contexts/ExpenseContext';
import { useCurrency } from '../../contexts/CurrencyContext';

type Tone = 'positive' | 'warning' | 'neutral';

const iconTone = {
  positive: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  warning: 'bg-amber-50 text-amber-800 ring-amber-100',
  neutral: 'bg-slate-50 text-slate-700 ring-slate-200',
} as const;

const chipTone = {
  good: 'chip chip-good',
  warn: 'chip chip-warn',
  bad: 'chip chip-bad',
  neutral: 'chip',
} as const;

function SavingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 11.5V8.7c0-1.12 0-1.68.218-2.108.192-.377.499-.684.876-.876C5.52 5.5 6.08 5.5 7.2 5.5h9.6c1.12 0 1.68 0 2.106.216.377.192.684.499.876.876.218.428.218.988.218 2.108v6.6c0 1.12 0 1.68-.218 2.108-.192.377-.499.684-.876.876-.426.216-.986.216-2.106.216H12.6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path d="M16 9.5h.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path
        d="M8.2 19.5c2.32 0 4.2-1.88 4.2-4.2 0-2.32-1.88-4.2-4.2-4.2S4 12.98 4 15.3c0 2.32 1.88 4.2 4.2 4.2Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M8.2 13.4v3.8m-1.9-1.9H10.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function TrendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 17l6-6 4 4 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 8v4h-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 21s7-3.6 7-10.2V6.3l-7-3-7 3v4.5C5 17.4 12 21 12 21Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M9.2 12.2l1.9 1.9 3.7-3.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 13l-7.586 7.586a2 2 0 0 1-2.828 0L3 14.999V4h10.999L20 10.001V13Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M7.5 8.5h.01" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

function ReceiptIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 3h10v18l-2-1-2 1-2-1-2 1-2-1-2 1V3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9 8h6M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function PulseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 12h4l2-6 6 14 2-8h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const parseTransactionDate = (raw: unknown): Date | null => {
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : raw;
  if (typeof raw === 'number') {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const s = String(raw || '').trim();
  // If the string starts with YYYY-MM-DD (optionally followed by time), treat it as a local calendar date.
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:$|[T\\s])/.exec(s);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
    return new Date(y, mo - 1, d);
  }

  const parsed = new Date(s);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

type Insight = {
  tone: Tone;
  icon: React.ReactNode;
  title: string;
  value: string;
  meta: string;
  chip?: { cls: string; text: string };
  meter?: { value01: number; tone: Tone; label?: string };
  tooltip?: string;
};

function Meter({ value01, tone, label }: { value01: number; tone: Tone; label?: string }) {
  const v = clamp01(value01);
  const bar =
    tone === 'positive'
      ? 'from-emerald-500/25 to-emerald-500/60'
      : tone === 'warning'
        ? 'from-amber-500/25 to-amber-500/60'
        : 'from-indigo-500/20 to-indigo-500/55';
  const ring =
    tone === 'positive'
      ? 'ring-emerald-500/15'
      : tone === 'warning'
        ? 'ring-amber-500/15'
        : 'ring-indigo-500/15';

  return (
    <div className="mt-2">
      {label ? <div className="text-[10px] font-semibold text-slate-500">{label}</div> : null}
      <div className={`mt-1 h-2 w-full rounded-full bg-slate-200/60 dark:bg-white/10 ring-1 ${ring} overflow-hidden`}>
        <div className={`h-full rounded-full bg-gradient-to-r ${bar}`} style={{ width: `${Math.round(v * 100)}%` }} aria-hidden="true" />
      </div>
    </div>
  );
}

export default function AIDailyBriefingCard() {
  const { transactions, categories } = useExpenseContext();
  const { formatFromBase } = useCurrency();

  const [now, setNow] = React.useState(() => new Date());
  const [showDetails, setShowDetails] = React.useState(false);
  React.useEffect(() => {
    // Refresh periodically so "last 7 days / MTD" updates even without new transactions.
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    const onVis = () => {
      if (document.visibilityState === 'visible') setNow(new Date());
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);
  const todayLabel = React.useMemo(() => {
    try {
      return `Today · ${new Intl.DateTimeFormat(undefined, { month: 'short', day: '2-digit' }).format(now)}`;
    } catch {
      return 'Today';
    }
  }, [now]);

  const briefing = React.useMemo(() => {
    const catById = new Map<string, string>();
    for (const c of (categories as any[]) || []) {
      if (!c) continue;
      const id = String((c as any).id || '');
      const name = String((c as any).name || '');
      if (id) catById.set(id, name || id);
    }

    const expenseTx: Array<{ amount: number; date: Date; category: string; description: string }> = [];
    const incomeTx: Array<{ amount: number; date: Date }> = [];

    for (const t of (transactions as any[]) || []) {
      if (!t) continue;
      const dt = parseTransactionDate((t as any).date);
      if (!dt) continue;

      const amount = Math.abs(Number((t as any).amount) || 0);
      if (!Number.isFinite(amount) || amount <= 0) continue;

      const type = String((t as any).type || '');
      if (type === 'expense') {
        expenseTx.push({
          amount,
          date: dt,
          category: String((t as any).category || 'other'),
          description: String((t as any).description || '').trim(),
        });
      } else if (type === 'income') {
        incomeTx.push({ amount, date: dt });
      }
    }

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const daysInMonth = Math.max(28, endOfMonth.getDate());
    const daysElapsed = Math.max(1, now.getDate());

    const inRange = (d: Date, a: Date, b: Date) => d.getTime() >= a.getTime() && d.getTime() <= b.getTime();

    let incomeMtd = 0;
    let expenseMtd = 0;
    for (const t of incomeTx) {
      if (inRange(t.date, startOfMonth, now)) incomeMtd += t.amount;
    }
    for (const t of expenseTx) {
      if (inRange(t.date, startOfMonth, now)) expenseMtd += t.amount;
    }

    const netMtd = incomeMtd - expenseMtd;
    const projectedNet = Math.round((netMtd / daysElapsed) * daysInMonth);
    const projectedSpend = Math.round((expenseMtd / daysElapsed) * daysInMonth);

    const start7 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    const startPrev7 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 13);
    const endPrev7 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);

    let spend7 = 0;
    let spendPrev7 = 0;
    let max7: { amount: number; description: string; category: string } | null = null;
    for (const t of expenseTx) {
      if (inRange(t.date, start7, now)) {
        spend7 += t.amount;
        if (!max7 || t.amount > max7.amount) max7 = { amount: t.amount, description: t.description, category: t.category };
      } else if (inRange(t.date, startPrev7, endPrev7)) {
        spendPrev7 += t.amount;
      }
    }

    const hasWowBaseline = spendPrev7 > 0;
    const wowPct = hasWowBaseline ? ((spend7 - spendPrev7) / spendPrev7) * 100 : 0;

    const start30 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
    const byCat = new Map<string, number>();
    let spend30 = 0;
    const last30Amounts: number[] = [];

    for (const t of expenseTx) {
      if (!inRange(t.date, start30, now)) continue;
      spend30 += t.amount;
      byCat.set(t.category, (byCat.get(t.category) || 0) + t.amount);
      last30Amounts.push(t.amount);
    }

    let topCatId = 'other';
    let topCatAmount = 0;
    for (const [k, v] of byCat.entries()) {
      if (v > topCatAmount) {
        topCatAmount = v;
        topCatId = k;
      }
    }

    const topCatName = catById.get(topCatId) || (topCatId === 'other' ? 'Other' : topCatId);
    const topCatPct = spend30 > 0 ? (topCatAmount / spend30) * 100 : 0;

    const mean = last30Amounts.length ? last30Amounts.reduce((a, b) => a + b, 0) / last30Amounts.length : 0;
    const variance =
      last30Amounts.length > 1 ? last30Amounts.reduce((acc, x) => acc + Math.pow(x - mean, 2), 0) / (last30Amounts.length - 1) : 0;
    const sd = Math.sqrt(Math.max(0, variance));
    const hasAnomalyModel = last30Amounts.length >= 8 && sd > 0;
    const threshold = hasAnomalyModel ? Math.max(0, mean + 2.25 * sd) : 0;

    let flagged7 = 0;
    if (hasAnomalyModel) {
      for (const t of expenseTx) {
        if (!inRange(t.date, start7, now)) continue;
        if (t.amount >= threshold && t.amount >= mean * 1.4) flagged7 += 1;
      }
    }

    const spendPace = incomeMtd > 0 ? expenseMtd / incomeMtd : 0;

    const fmt = (n: number) => formatFromBase(Math.round(Number(n) || 0));
    const pct = (n: number) => `${Math.abs(n).toFixed(0)}%`;

    const insights: Insight[] = [
      {
        tone: projectedNet >= 0 ? 'positive' : 'warning',
        icon: <SavingsIcon />,
        title: 'Projected savings (month-end)',
        value: fmt(projectedNet),
        meta: `MTD net: ${fmt(netMtd)} · Based on ${daysElapsed}/${daysInMonth} days`,
        meter: { value01: clamp01(daysElapsed / Math.max(1, daysInMonth)), tone: 'neutral', label: 'Month progress' },
        tooltip: 'Projection = (month-to-date net ÷ days elapsed) × days in month',
      },
      {
        tone: hasWowBaseline ? (wowPct <= 0 ? 'positive' : 'warning') : 'neutral',
        icon: <TrendIcon />,
        title: 'Weekly spend (last 7 days)',
        value: fmt(spend7),
        meta: hasWowBaseline ? `WoW: ${wowPct < 0 ? 'down' : 'up'} ${pct(wowPct)} vs previous week` : 'WoW: add more data to compare',
        chip: hasWowBaseline
          ? { cls: wowPct <= 0 ? chipTone.good : chipTone.warn, text: `${wowPct <= 0 ? 'Down' : 'Up'} ${pct(wowPct)}` }
          : { cls: chipTone.neutral, text: 'No baseline' },
        tooltip: 'Compares total spend from the last 7 days vs the previous 7 days.',
      },
      {
        tone: topCatPct >= 45 ? 'warning' : 'neutral',
        icon: <TagIcon />,
        title: 'Top category (last 30 days)',
        value: topCatName,
        meta: spend30 > 0 ? `${fmt(topCatAmount)} · ${topCatPct.toFixed(0)}% of spend` : 'Add expenses to unlock category insights',
        meter: spend30 > 0 ? { value01: clamp01(topCatPct / 100), tone: topCatPct >= 45 ? 'warning' : 'neutral', label: 'Category share' } : undefined,
        tooltip: 'Looks at the last 30 days of expenses and finds the highest-spend category.',
      },
      {
        tone: max7 && sd > 0 && max7.amount >= threshold ? 'warning' : 'neutral',
        icon: <ReceiptIcon />,
        title: 'Largest expense (last 7 days)',
        value: max7 ? fmt(max7.amount) : '—',
        meta: max7 ? `${(max7.description || topCatName || 'Expense').slice(0, 46)}${(max7.description || '').length > 46 ? '…' : ''}` : 'No recent expenses found',
        tooltip: 'Highest single expense in the last 7 days.',
      },
      {
        tone: flagged7 === 0 ? 'neutral' : 'warning',
        icon: <ShieldIcon />,
        title: 'Unusual spend signals',
        value: flagged7 === 0 ? 'None' : `${flagged7} flagged`,
        meta: threshold > 0 ? `Auto threshold: ~${fmt(threshold)} · Local-only check` : 'Build history to enable anomaly detection',
        chip: flagged7 === 0 ? { cls: chipTone.neutral, text: 'Stable' } : { cls: chipTone.warn, text: 'Review' },
        tooltip: 'Flags unusually large expenses based on your last 30 days (simple on-device statistics).',
      },
      {
        tone: spendPace <= 0.75 ? 'positive' : spendPace <= 0.95 ? 'warning' : 'warning',
        icon: <PulseIcon />,
        title: 'Spending pace (MTD)',
        value: fmt(expenseMtd),
        meta: incomeMtd > 0 ? `${Math.round(clamp01(spendPace) * 100)}% of income used · Proj spend: ${fmt(projectedSpend)}` : `Proj spend: ${fmt(projectedSpend)} · Add income for pace %`,
        meter: incomeMtd > 0 ? { value01: clamp01(spendPace), tone: spendPace <= 0.75 ? 'positive' : 'warning', label: 'Used vs income' } : undefined,
        tooltip: 'Spending pace = month-to-date expenses ÷ month-to-date income.',
      },
    ];

    const summary: string[] = [
      projectedNet >= 0 ? `Month-end projection: save ~${fmt(projectedNet)}.` : `Month-end projection: short by ~${fmt(Math.abs(projectedNet))}.`,
      hasWowBaseline
        ? `Last 7 days vs previous 7: ${wowPct <= 0 ? 'down' : 'up'} ${pct(wowPct)} (${fmt(spend7)}).`
        : `Add more expenses to unlock week-over-week comparisons.`,
      spend30 > 0 ? `Biggest category: ${topCatName} (~${topCatPct.toFixed(0)}%).` : `Track expenses to unlock category insights.`,
      incomeMtd > 0 ? `Spending pace: ${Math.round(clamp01(spendPace) * 100)}% of income used so far.` : `Add income to show spending pace vs income.`,
    ];

    const debug = `Calculations are done locally using your saved transactions (last 7/30 days + month-to-date).`;

    return { insights, summary, debug };
  }, [categories, formatFromBase, now, transactions]);

  return (
    <div className="surface surface-pad-sm surface-pressable relative overflow-hidden">
      <div className="flex items-start justify-between gap-3 relative">
        <div>
          <div className="flex items-center gap-2">
            <div className="text-[13px] font-semibold text-slate-950">FinVision Daily Briefing</div>
            <span className="chip bg-gradient-to-r from-indigo-500/15 to-sky-500/15 text-slate-800 ring-indigo-500/20 dark:text-slate-100">
              AI
            </span>
          </div>
          <div className="mt-1 text-[12px] text-slate-600">Deep, on-device insights from your recent activity</div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="chip">Private</span>
            <span className="chip">Local-only</span>
            <span className="chip">No cloud required</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="chip">{todayLabel}</div>
          <button type="button" className="btn-chip" onClick={() => setShowDetails((v) => !v)} aria-expanded={showDetails}>
            {showDetails ? 'Hide details' : 'Details'}
          </button>
        </div>
      </div>

      {showDetails ? (
        <div className="mt-3 tile tile-pad relative">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[12px] font-semibold text-slate-800 dark:text-slate-100">What this means</div>
              <div className="mt-1 text-[11px] text-slate-500 leading-5">{briefing.debug}</div>
            </div>
            <div className="chip">Methodology</div>
          </div>
          <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px] text-slate-700 dark:text-slate-200">
            {briefing.summary.map((s) => (
              <li key={s} className="flex gap-2">
                <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-indigo-500/60 shrink-0" aria-hidden="true" />
                <span className="leading-5">{s}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {briefing.insights.map((i) => (
          <div
            key={i.title}
            className="group tile tile-pad flex items-start gap-3 transition-[transform,box-shadow,background-color] duration-150 hover:-translate-y-0.5 hover:shadow-soft hover:bg-white/60 dark:hover:bg-slate-950/40"
            title={i.tooltip || i.title}
          >
            <div
              className={`h-9 w-9 rounded-2xl ring-1 grid place-items-center shrink-0 ${iconTone[i.tone as keyof typeof iconTone]} group-hover:scale-[1.02] transition-transform`}
            >
              <span className="text-sm" aria-hidden="true">
                {i.icon}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">{i.title}</div>
                {i.chip ? <div className={i.chip.cls}>{i.chip.text}</div> : null}
              </div>
              <div className="mt-1 text-[16px] font-extrabold text-slate-950 dark:text-white tracking-tight">{i.value}</div>
              <div className="mt-1 text-[11px] text-slate-500 leading-5">{i.meta}</div>
              {i.meter ? <Meter value01={i.meter.value01} tone={i.meter.tone} label={i.meter.label} /> : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
