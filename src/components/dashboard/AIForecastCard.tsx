import React from 'react';

type TransactionLike = {
  type?: string;
  amount?: number | string;
  date?: string | number | Date;
  category?: string;
};

type Confidence = 'High' | 'Medium' | 'Low';

function TrendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 17l6-6 4 4 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 8v4h-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 3v2M17 3v2M4.5 8.5h15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M6.5 5h11c1.12 0 1.68 0 2.108.218.377.192.684.499.876.876.218.428.218.988.218 2.108v9.6c0 1.12 0 1.68-.218 2.108-.192.377-.499.684-.876.876-.428.218-.988.218-2.108.218h-11c-1.12 0-1.68 0-2.108-.218-.377-.192-.684-.499-.876-.876C4 19.48 4 18.92 4 17.8V8.2c0-1.12 0-1.68.218-2.108.192-.377.499-.684.876-.876C5.52 5 6.08 5 7.2 5z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Sparkline({ series }: { series: number[] }) {
  const max = Math.max(1, ...series);
  return (
    <div className="flex items-end gap-1 h-10">
      {series.map((v, idx) => (
        <div
          key={idx}
          className="w-2 rounded-full bg-gradient-to-t from-indigo-500/30 to-indigo-500/70"
          style={{ height: `${Math.max(3, Math.round((v / max) * 40))}px` }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

function Meter({ value01 }: { value01: number }) {
  const v = clamp01(value01);
  return (
    <div className="mt-2 h-2 rounded-full bg-slate-200/60 dark:bg-white/10 ring-1 ring-black/5 dark:ring-white/10 overflow-hidden">
      <div className="h-full rounded-full bg-gradient-to-r from-indigo-500/25 to-indigo-500/60" style={{ width: `${Math.round(v * 100)}%` }} />
    </div>
  );
}

const titleCase = (raw: string) =>
  raw
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(' ');

export default function AIForecastCard({
  transactions,
  formatAmount,
}: {
  transactions: TransactionLike[] | undefined;
  formatAmount: (amount: number) => string;
}) {
  const forecast = React.useMemo(() => {
    const tx = Array.isArray(transactions) ? transactions : [];
    const now = new Date();
    const start14 = new Date(now);
    start14.setDate(start14.getDate() - 13);
    start14.setHours(0, 0, 0, 0);

    const daily = new Array<number>(14).fill(0);
    const catTotals = new Map<string, number>();

    for (const t of tx) {
      if (t?.type !== 'expense') continue;
      const amount = Number(t?.amount) || 0;
      if (!Number.isFinite(amount) || amount <= 0) continue;
      const dt = t?.date ? new Date(t.date) : null;
      if (!dt || Number.isNaN(dt.getTime())) continue;
      if (dt < start14 || dt > now) continue;

      const dayIdx = Math.floor((dt.getTime() - start14.getTime()) / (24 * 60 * 60 * 1000));
      if (dayIdx < 0 || dayIdx >= 14) continue;
      daily[dayIdx] += amount;

      const cat = (t?.category || 'other').toString();
      catTotals.set(cat, (catTotals.get(cat) || 0) + amount);
    }

    const prev7 = daily.slice(0, 7).reduce((a, b) => a + b, 0);
    const last7 = daily.slice(7).reduce((a, b) => a + b, 0);
    const last14 = prev7 + last7;
    const projectedNext7 = (last14 / 14) * 7;
    const trendPct = prev7 > 0 ? ((last7 - prev7) / prev7) * 100 : 0;

    let topCat: { id: string; amount: number } | null = null;
    for (const [id, amount] of catTotals.entries()) {
      if (!topCat || amount > topCat.amount) topCat = { id, amount };
    }

    const last7Series = daily.slice(7);
    const activeDays14 = daily.filter((v) => v > 0).length;
    const confidence: Confidence = activeDays14 >= 8 ? 'High' : activeDays14 >= 4 ? 'Medium' : 'Low';

    return { last7, projectedNext7, trendPct, topCat, last7Series, confidence, activeDays14 };
  }, [transactions]);

  const trendTone = forecast.trendPct >= 12 ? 'chip-warn' : forecast.trendPct <= -12 ? 'chip-good' : 'chip';
  const confidenceTone = forecast.confidence === 'High' ? 'chip-good' : forecast.confidence === 'Medium' ? 'chip-warn' : 'chip-bad';
  const prettyTopCat = forecast.topCat?.id ? titleCase(String(forecast.topCat.id)) : '—';
  const fmtPct = (n: number) => `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(0)}%`;
  const projectedRounded = Math.max(0, Math.round(forecast.projectedNext7));
  const last7Rounded = Math.max(0, Math.round(forecast.last7));

  return (
    <div className="surface surface-pad-sm surface-pressable">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="text-[13px] font-semibold text-slate-950">AI Forecast</div>
            <span className="chip bg-gradient-to-r from-indigo-500/15 to-sky-500/15 text-slate-800 ring-indigo-500/20 dark:text-slate-100">AI</span>
          </div>
          <div className="mt-1 text-[12px] text-slate-600">Next 7 days estimate based on your last 14 days</div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`chip ${trendTone}`} title="Week-over-week spend direction">
            Trend: {fmtPct(forecast.trendPct)}
          </div>
          <div className={`chip ${confidenceTone}`} title="Confidence increases when there are more active spending days in your last 14 days.">
            Confidence: {forecast.confidence}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="tile tile-pad flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[12px] font-semibold text-slate-700">Projected spend (7d)</div>
            <div className="mt-2 text-[16px] font-extrabold text-slate-950 tracking-tight tabular-nums">{formatAmount(projectedRounded)}</div>
            <div className="mt-1 text-[11px] text-slate-500">Last 7 days: {formatAmount(last7Rounded)}</div>
            <Meter value01={forecast.activeDays14 / 14} />
            <div className="mt-1 text-[10px] font-semibold text-slate-500">Data coverage: {forecast.activeDays14}/14 active days</div>
          </div>
          <div className="h-9 w-9 rounded-2xl ring-1 ring-indigo-100 bg-indigo-50 text-indigo-700 grid place-items-center shrink-0">
            <CalendarIcon />
          </div>
        </div>

        <div className="tile tile-pad flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[12px] font-semibold text-slate-700">Weekly trend</div>
            <div className="mt-2 text-[16px] font-extrabold text-slate-950 tracking-tight tabular-nums">{fmtPct(forecast.trendPct)}</div>
            <div className="mt-1 text-[11px] text-slate-500">Compared to the previous 7 days</div>
            <div className="mt-2 flex items-center gap-2">
              <span className={`chip ${trendTone}`}>WoW</span>
              <span className="chip">Last 7 days</span>
            </div>
          </div>
          <div className="h-9 w-9 rounded-2xl ring-1 ring-sky-100 bg-sky-50 text-sky-700 grid place-items-center shrink-0">
            <TrendIcon />
          </div>
        </div>

        <div className="tile tile-pad">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[12px] font-semibold text-slate-700">Recent activity</div>
              <div className="mt-1 text-[11px] text-slate-500">
                Top category: <span className="font-semibold text-slate-700">{prettyTopCat}</span>
              </div>
            </div>
            <div className="chip">Last 7 days</div>
          </div>
          <div className="mt-3">
            <Sparkline series={forecast.last7Series} />
          </div>
          <div className="mt-2 text-[10px] font-semibold text-slate-500">Bars show spend distribution across the last 7 days</div>
        </div>
      </div>
    </div>
  );
}
