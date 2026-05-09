import React from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, YAxis } from 'recharts';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useDelayedCountUp } from '../../hooks/useDelayedCountUp';

type Point = { v: number; idx: number };

type Props = {
  title?: string;
  total: number;
  investAmount: number;
  series: number[];
};

function EmptyTooltip() {
  return null;
}

function KebabIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 6.5h.01M12 12h.01M12 17.5h.01" stroke="#9CA3AF" strokeWidth="3.2" strokeLinecap="round" />
    </svg>
  );
}

function TrendUpIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 16l4.2-4.2 3 3L21 8"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M17 8h4v4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function InvestmentSummaryCard({ title = 'Total Investment', total, investAmount, series }: Props) {
  const { formatFromBase } = useCurrency();
  const delayMs = 1000;
  const durationMs = 7000;
  const { value: invV, phase, isDone } = useDelayedCountUp(Number(total) || 0, { delayMs, durationMs, startValue: 0 });
  const [showDot, setShowDot] = React.useState(false);
  const chartAnimationMs = durationMs;
  const chartKey = phase === 'loading' ? 'loading' : 'counting';
  const fillId = React.useId();

  const data = React.useMemo(() => {
    const clean = (series || []).map((n) => (Number.isFinite(Number(n)) ? Number(n) : 0));
    const trimmed = clean.length ? clean.slice(-18) : [0, 0, 0, 0];
    const lastIdx = Math.max(0, trimmed.length - 1);
    return trimmed.map((v, idx) => ({ v, idx, lastIdx })) as Array<Point & { lastIdx: number }>;
  }, [series]);

  const { domain, isUp } = React.useMemo(() => {
    const vals = data.map((p) => Number(p?.v) || 0);
    const min = vals.length ? Math.min(...vals) : 0;
    const max = vals.length ? Math.max(...vals) : 0;
    const span = Math.max(0, max - min);

    // Add extra padding so small moves still look like moves.
    const pad = Math.max(span * 0.28, Math.max(1, Math.abs(max) * 0.02));
    const lo = min - pad;
    const hi = max + pad;

    const first = vals[0] ?? 0;
    const last = vals[vals.length - 1] ?? 0;
    return { domain: [lo, hi] as [number, number], isUp: last >= first };
  }, [data]);

  const stroke = isUp ? '#7C3AED' : '#F97316';
  const gridStroke = 'rgba(15,23,42,0.08)';

  React.useEffect(() => {
    setShowDot(false);
    if (!isDone) return;
    const t = window.setTimeout(() => setShowDot(true), 150);
    return () => window.clearTimeout(t);
  }, [isDone]);

  return (
    <div className="min-w-0 min-h-[176px] sm:h-[184px] overflow-hidden rounded-2xl bg-white shadow-[0_6px_16px_rgba(0,0,0,0.06)] p-4 sm:p-5 transition-all duration-200 ease-out hover:-translate-y-0.5 flex flex-col">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`h-8 w-8 rounded-xl grid place-items-center shrink-0 ${phase === 'loading' ? 'bg-slate-100' : 'bg-[#EDE9FE]'}`}>
            <div className={`h-3.5 w-3.5 rounded ${phase === 'loading' ? 'bg-slate-400/60' : 'bg-[#7C3AED]'}`} />
          </div>
          <div className="min-w-0 text-[14px] font-semibold text-[#374151] truncate">{title}</div>
        </div>
        <button type="button" className="shrink-0 h-8 w-8 grid place-items-center rounded-xl hover:bg-slate-50" aria-label="Menu">
          <KebabIcon />
        </button>
      </div>

      {phase === 'loading' ? (
        <div className="flex-1 grid place-items-center">
          <span className="kpi-loader" aria-label="Loading" />
        </div>
      ) : (
        <>
          {/* Chart section (full width, top) */}
          <div className="mt-3">
            <div className="h-[76px] w-full rounded-xl overflow-hidden ring-1 ring-black/5 bg-white">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart key={chartKey} data={data} margin={{ top: 10, right: 6, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={stroke} stopOpacity={0.18} />
                      <stop offset="80%" stopColor={stroke} stopOpacity={0.06} />
                      <stop offset="100%" stopColor={stroke} stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <Tooltip content={<EmptyTooltip />} />
                  <CartesianGrid vertical={false} stroke={gridStroke} strokeDasharray="3 4" />
                  <YAxis hide domain={domain} />
                  <Area
                    type="monotone"
                    dataKey="v"
                    stroke={stroke}
                    strokeWidth={2.25}
                    fill={`url(#${fillId})`}
                    fillOpacity={1}
                    isAnimationActive
                    animationDuration={chartAnimationMs}
                    animationBegin={0}
                    animationEasing="linear"
                    dot={(p: any) => {
                      if (!p?.payload || p.payload.idx !== p.payload.lastIdx) return null;
                      if (!showDot) return null;
                      return <circle cx={p.cx} cy={p.cy} r="3.6" fill={stroke} stroke="#FFFFFF" strokeWidth="2" />;
                    }}
                    activeDot={false as any}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Value section (below chart, never wrap) */}
          <div className="mt-auto pt-2.5 pb-2.5 sm:pb-3 flex items-center gap-2.5 whitespace-nowrap -translate-y-[5px]">
            <div className="h-6 w-6 rounded-lg bg-[#DCFCE7] text-[#16A34A] grid place-items-center shrink-0">
              <TrendUpIcon />
            </div>
            <div className="text-[26px] leading-[32px] font-semibold tracking-[-0.03em] text-slate-950 tabular-nums min-h-[40px] flex items-center w-full">
              {formatFromBase(invV)}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
