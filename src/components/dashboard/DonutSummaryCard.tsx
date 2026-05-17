import React, { useMemo } from 'react';
import DonutChart from './DonutChart';
import { useExpenseContext } from '../../contexts/ExpenseContext';
import { useCurrency } from '../../contexts/CurrencyContext';

function PieIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2a10 10 0 1010 10h-9a1 1 0 01-1-1V2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M13 2.05A10 10 0 0121.95 11H13V2.05z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" opacity="0.7" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <circle cx="7" cy="12" r="2" fill="currentColor" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
      <circle cx="17" cy="12" r="2" fill="currentColor" />
    </svg>
  );
}

function TrendBadge({ pct, tone }: { pct: number; tone: 'up' | 'down' | 'flat' }) {
  const label = Number.isFinite(pct) ? `${pct >= 0 ? '+' : '-'}${Math.abs(pct).toFixed(1)}%` : '—';
  const isUp = tone === 'up';
  const isDown = tone === 'down';

  const cls = isUp
    ? 'bg-rose-50 text-rose-600 ring-rose-200/70'
    : isDown
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200/70'
      : 'bg-slate-50 text-slate-500 ring-slate-200/70';

  return (
    <span className={['inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-extrabold ring-1 tabular-nums', cls].join(' ')}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d={isUp ? 'M6 15l5-5 3 3 4-4' : isDown ? 'M6 9l5 5 3-3 4 4' : 'M6 12h12'}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {label}
    </span>
  );
}

function Sparkline({ values, tone = 'rose' }: { values: number[]; tone?: 'rose' | 'emerald' }) {
  const clean = (Array.isArray(values) ? values : []).map((n) => (Number.isFinite(Number(n)) ? Number(n) : 0));
  const n = clean.length;
  const w = 140;
  const h = 56;
  const pad = 6;
  if (n <= 1) {
    return <div className="h-14 rounded-xl bg-slate-50 ring-1 ring-black/5" aria-hidden="true" />;
  }

  const min = Math.min(...clean);
  const max = Math.max(...clean);
  const span = Math.max(1e-6, max - min);

  const xStep = (w - pad * 2) / (n - 1);
  const points = clean.map((v, i) => {
    const x = pad + i * xStep;
    const y = pad + (h - pad * 2) * (1 - (v - min) / span);
    return { x, y };
  });

  const smoothPath = () => {
    const p = points;
    let d = `M ${p[0].x.toFixed(2)} ${p[0].y.toFixed(2)}`;
    for (let i = 0; i < p.length - 1; i += 1) {
      const p0 = p[i - 1] || p[i];
      const p1 = p[i];
      const p2 = p[i + 1];
      const p3 = p[i + 2] || p2;
      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    }
    return d;
  };

  const id = React.useId();
  const stroke = tone === 'emerald' ? '#10b981' : '#ff5a5f';
  const end = points[points.length - 1];

  return (
    <div className="relative h-14 w-full rounded-2xl bg-white/70 ring-1 ring-black/[0.06] shadow-[0_14px_30px_-26px_rgba(15,23,42,0.55)] overflow-hidden">
      <svg viewBox={`0 0 ${w} ${h}`} className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id={`${id}-stroke`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.25" />
            <stop offset="45%" stopColor={stroke} stopOpacity="0.95" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0.75" />
          </linearGradient>
          <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.16" />
            <stop offset="85%" stopColor={stroke} stopOpacity="0.03" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>

        <path d={smoothPath()} fill="none" stroke={`url(#${id}-stroke)`} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d={`${smoothPath()} L ${w - pad} ${h - pad} L ${pad} ${h - pad} Z`} fill={`url(#${id}-fill)`} />

        <circle cx={end.x} cy={end.y} r="5.8" fill={stroke} opacity="0.14" />
        <circle cx={end.x} cy={end.y} r="3.1" fill={stroke} stroke="#fff" strokeWidth="2" />
      </svg>
    </div>
  );
}

const DonutSummaryCard = () => {
  const { transactions, categories, dataStatus } = useExpenseContext() as any;
  const { formatFromBase } = useCurrency();
  const [range, setRange] = React.useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [now, setNow] = React.useState(() => new Date());

  React.useEffect(() => {
    // Keep the "Today / Last 7 days / This month" calculations correct even if no new transactions are added.
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

  const isLoading = dataStatus === 'loading';
  const isError = dataStatus === 'error';

  const { byRange, daily, weekly, monthly, expenseCount, sparkByRange, trendByRange } = useMemo(() => {
    const catById = new Map<string, any>();
    for (const c of categories || []) catById.set(c.id, c);

    const parseTransactionDate = (raw: any): Date | null => {
      if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : raw;
      if (typeof raw === 'number') {
        const d = new Date(raw);
        return Number.isNaN(d.getTime()) ? null : d;
      }

      const s = String(raw || '').trim();
      // If the string starts with YYYY-MM-DD (optionally followed by time), treat it as a local calendar date.
      const m = /^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/.exec(s);
      if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));

      const parsed = new Date(s);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

    const parseAmount = (raw: any) => {
      if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0;
      const n = Number(String(raw ?? '').replace(/,/g, '').trim());
      return Number.isFinite(n) ? n : 0;
    };

    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfDay.getDate() - 6);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const startOfYesterday = new Date(startOfDay);
    startOfYesterday.setDate(startOfDay.getDate() - 1);

    const startOfPrevWeek = new Date(startOfWeek);
    startOfPrevWeek.setDate(startOfWeek.getDate() - 7);

    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    let dailySum = 0;
    let weeklySum = 0;
    let monthlySum = 0;
    let yesterdaySum = 0;
    let prevWeekSum = 0;
    let prevMonthSum = 0;

    const dailyByCat = new Map<string, number>();
    const weeklyByCat = new Map<string, number>();
    const monthlyByCat = new Map<string, number>();
    let expCount = 0;

    const sparkDaily = new Array<number>(12).fill(0);
    const sparkWeekly = new Array<number>(7).fill(0);
    const sparkMonthly = new Array<number>(14).fill(0);

    const start12h = new Date(now);
    start12h.setHours(now.getHours() - 11, 0, 0, 0);

    const start7 = new Date(startOfDay);
    start7.setDate(startOfDay.getDate() - 6);

    const start14 = new Date(startOfDay);
    start14.setDate(startOfDay.getDate() - 13);

    for (const t of transactions || []) {
      const type = String(t?.type || '').toLowerCase();
      if (type !== 'expense') continue;
      const dt = parseTransactionDate(t?.date);
      if (!dt) continue;
      const amt = Math.abs(parseAmount(t?.amount));
      if (!(amt > 0)) continue;
      const cat = String(t?.category || 'other');
      expCount += 1;

      if (dt >= startOfYesterday && dt < startOfDay) {
        yesterdaySum += amt;
      }
      if (dt >= startOfPrevWeek && dt < startOfWeek) {
        prevWeekSum += amt;
      }
      if (dt >= startOfPrevMonth && dt <= endOfPrevMonth) {
        prevMonthSum += amt;
      }

      if (dt >= startOfMonth) {
        monthlySum += amt;
        monthlyByCat.set(cat, (monthlyByCat.get(cat) || 0) + amt);
      }
      if (dt >= startOfWeek) {
        weeklySum += amt;
        weeklyByCat.set(cat, (weeklyByCat.get(cat) || 0) + amt);
      }
      if (dt >= startOfDay) {
        dailySum += amt;
        dailyByCat.set(cat, (dailyByCat.get(cat) || 0) + amt);
      }

      if (dt >= start12h) {
        const hourIdx = Math.floor((dt.getTime() - start12h.getTime()) / (60 * 60 * 1000));
        if (hourIdx >= 0 && hourIdx < sparkDaily.length) sparkDaily[hourIdx] += amt;
      }
      if (dt >= start7) {
        const dayIdx = Math.floor((dt.getTime() - start7.getTime()) / (24 * 60 * 60 * 1000));
        if (dayIdx >= 0 && dayIdx < sparkWeekly.length) sparkWeekly[dayIdx] += amt;
      }
      if (dt >= start14) {
        const dayIdx = Math.floor((dt.getTime() - start14.getTime()) / (24 * 60 * 60 * 1000));
        if (dayIdx >= 0 && dayIdx < sparkMonthly.length) sparkMonthly[dayIdx] += amt;
      }
    }

    const palette = ['#ef4444', '#22c55e', '#0ea5e9', '#f59e0b'];

    const toChart = (byCat: Map<string, number>, total: number) => {
      if (!(total > 0)) {
        return {
          data: [{ name: '', value: 1, color: '#CBD5E1', amount: 0 }],
          center: { name: '', amount: 0 },
        };
      }

      const top = Array.from(byCat.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4);
      const chart = top.map(([id, amt], idx) => {
        const name = catById.get(id)?.name || id;
        const pct = total > 0 ? (amt / total) * 100 : 0;
        return {
          name,
          value: amt > 0 ? amt : 1,
          pct,
          color: catById.get(id)?.color || palette[idx] || '#94a3b8',
          amount: amt,
        };
      });
      const first = chart[0];
      return {
        data: chart.length ? chart : [{ name: 'No data', value: 100, color: '#cbd5e1', amount: 0 }],
        center: first ? { name: first.name, amount: first.amount } : { name: 'No data', amount: 0 },
      };
    };

    return {
      byRange: {
        daily: toChart(dailyByCat, dailySum),
        weekly: toChart(weeklyByCat, weeklySum),
        monthly: toChart(monthlyByCat, monthlySum),
      },
      daily: dailySum,
      weekly: weeklySum,
      monthly: monthlySum,
      expenseCount: expCount,
      sparkByRange: {
        daily: sparkDaily,
        weekly: sparkWeekly,
        monthly: sparkMonthly,
      },
      trendByRange: {
        daily: { current: dailySum, prev: yesterdaySum },
        weekly: { current: weeklySum, prev: prevWeekSum },
        monthly: { current: monthlySum, prev: prevMonthSum },
      },
    };
  }, [categories, now, transactions]);

  const active = byRange[range];
  const currentTotal = range === 'daily' ? daily : range === 'weekly' ? weekly : monthly;
  const periodLabel = range === 'daily' ? 'Today' : range === 'weekly' ? 'Last 7 days' : 'This month';
  const isEmpty = !isLoading && !isError && expenseCount === 0;
  const isRangeEmpty = !isLoading && !isError && !isEmpty && currentTotal === 0;
  const showChart = !isLoading && !isError && !isEmpty && !isRangeEmpty;

  const trend = trendByRange[range];
  const trendPct = trend?.prev > 0 ? ((trend.current - trend.prev) / trend.prev) * 100 : trend?.current > 0 ? 100 : 0;
  const trendTone: 'up' | 'down' | 'flat' = Math.abs(trendPct) < 0.05 ? 'flat' : trendPct > 0 ? 'up' : 'down';
  const topCategory = active?.center?.name || '—';

  return (
    <div className="kpi-card overflow-hidden relative flex flex-col bg-white shadow-[0_10px_26px_-18px_rgba(15,23,42,0.14)] ring-1 ring-black/[0.04]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-2xl bg-rose-50 text-rose-600 grid place-items-center ring-1 ring-rose-100">
            <PieIcon />
          </div>
          <div>
            <div className="text-[13px] md:text-[14px] font-semibold text-slate-800">All expenses</div>
            <div className="mt-0.5 text-[11px] md:text-[12px] text-slate-400 font-semibold">{periodLabel}</div>
          </div>
        </div>

        <button
          type="button"
          className="h-9 w-9 rounded-2xl grid place-items-center text-slate-500 bg-white/70 hover:bg-white ring-1 ring-black/[0.06] shadow-[0_12px_28px_-24px_rgba(15,23,42,0.55)] transition-colors active:scale-[0.98]"
          aria-label="More"
        >
          <MoreIcon />
        </button>
      </div>

      <div className="mt-3 w-full flex items-center gap-1 rounded-2xl bg-white/70 backdrop-blur ring-1 ring-black/[0.06] shadow-[0_10px_26px_-22px_rgba(15,23,42,0.45)] p-0.5">
        {(
          [
            ['daily', 'Daily'],
            ['weekly', 'Weekly'],
            ['monthly', 'Monthly'],
          ] as const
        ).map(([id, label]) => {
          const activeTab = range === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setRange(id)}
              disabled={isLoading || isError}
              className={[
                'flex-1 px-2.5 py-1 rounded-2xl text-[11px] leading-4 font-semibold transition-all whitespace-nowrap text-center',
                activeTab
                  ? 'bg-white text-slate-950 shadow-sm ring-1 ring-black/[0.06] translate-y-[-0.5px]'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/60',
                isLoading || isError ? 'opacity-60 cursor-not-allowed hover:bg-transparent hover:text-slate-500' : '',
              ].join(' ')}
              aria-pressed={activeTab}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 items-stretch">
        <div className="rounded-2xl bg-white ring-1 ring-black/[0.06] shadow-[0_16px_34px_-26px_rgba(15,23,42,0.55)] p-3 flex flex-col min-w-0">
          <div className="text-[10px] font-extrabold tracking-wide text-slate-400">TOTAL</div>
          <div className="mt-1 text-[22px] md:text-[24px] leading-[28px] font-semibold text-slate-950 tabular-nums tracking-[-0.03em] truncate">
            {isLoading ? (
              <span className="inline-flex items-center"><span className="kpi-loader" aria-label="Loading" /></span>
            ) : isError ? (
              <span className="text-rose-600">Unable to load</span>
            ) : isEmpty ? (
              <span className="text-slate-500">No data</span>
            ) : (
              formatFromBase(currentTotal)
            )}
          </div>

          {!isLoading && !isError && !isEmpty ? (
            <div className="mt-2">
              <TrendBadge pct={trendPct} tone={trendTone} />
            </div>
          ) : null}

          <div className="mt-auto pt-3">
            <Sparkline values={sparkByRange[range]} tone={trendTone === 'down' ? 'emerald' : 'rose'} />
          </div>
        </div>

        <div className="rounded-2xl bg-white ring-1 ring-black/[0.06] shadow-[0_16px_34px_-26px_rgba(15,23,42,0.55)] p-3 flex flex-col items-center justify-center min-w-0">
          <div className="w-full aspect-square max-w-[140px] min-w-0">
            <DonutChart
              data={active.data}
              centerLabelTop={isEmpty ? 'No data' : isRangeEmpty ? '' : topCategory}
              centerLabelBottom={isEmpty ? '—' : formatFromBase(isRangeEmpty ? 0 : active.center.amount)}
            />
          </div>
          <div className="mt-1 text-[12px] font-semibold text-slate-800 truncate">{topCategory || '—'}</div>
          <div className="mt-0.5 text-[11px] text-slate-400 font-semibold">Largest category</div>
        </div>
      </div>
    </div>
  );
};

export default DonutSummaryCard;
