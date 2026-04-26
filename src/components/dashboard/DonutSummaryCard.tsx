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

const DonutSummaryCard = () => {
  const { transactions, categories, dataStatus } = useExpenseContext() as any;
  const { formatFromBase } = useCurrency();
  const [range, setRange] = React.useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [now, setNow] = React.useState(() => new Date());

  React.useEffect(() => {
    // Keep the "Today / Last 7 days / This month" calculations correct even if no new transactions are added.
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const isLoading = dataStatus === 'loading';
  const isError = dataStatus === 'error';

  const { byRange, daily, weekly, monthly, expenseCount } = useMemo(() => {
    const catById = new Map<string, any>();
    for (const c of categories || []) catById.set(c.id, c);

    const parseLocalDate = (value: any) => {
      const s = String(value || '').trim();
      const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
      const dt = new Date(value);
      return Number.isNaN(dt.getTime()) ? null : dt;
    };

    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfDay.getDate() - 6);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let dailySum = 0;
    let weeklySum = 0;
    let monthlySum = 0;

    const dailyByCat = new Map<string, number>();
    const weeklyByCat = new Map<string, number>();
    const monthlyByCat = new Map<string, number>();
    let expCount = 0;
    for (const t of transactions || []) {
      if (t?.type !== 'expense') continue;
      const dt = parseLocalDate(t?.date);
      if (!dt) continue;
      const amt = Number(t?.amount) || 0;
      const cat = String(t?.category || 'other');
      expCount += 1;

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
    };
  }, [categories, now, transactions]);

  const active = byRange[range];
  const currentTotal = range === 'daily' ? daily : range === 'weekly' ? weekly : monthly;
  const maxTotal = Math.max(1, daily, weekly, monthly);
  const periodLabel = range === 'daily' ? 'Today' : range === 'weekly' ? 'Last 7 days' : 'This month';
  const isEmpty = !isLoading && !isError && expenseCount === 0;
  const isRangeEmpty = !isLoading && !isError && !isEmpty && currentTotal === 0;

  return (
    <div className="kpi-card overflow-hidden relative">
      <div className="pointer-events-none absolute -top-20 -right-16 h-48 w-48 rounded-full bg-rose-200/35 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-indigo-200/30 blur-3xl" aria-hidden="true" />
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-2xl bg-white/80 text-rose-700 ring-1 ring-rose-200/60 shadow-[0_8px_22px_-18px_rgba(244,63,94,0.6)] grid place-items-center">
            <PieIcon />
          </div>
          <div>
            <div className="text-[12px] font-semibold text-slate-700">All expenses</div>
            <div className="mt-0.5 text-[11px] text-slate-400 font-semibold">{periodLabel}</div>
          </div>
        </div>

        <div className="w-full sm:w-auto shrink-0 flex items-center gap-1 rounded-full bg-white/70 backdrop-blur ring-1 ring-black/[0.06] shadow-[0_10px_26px_-22px_rgba(15,23,42,0.45)] p-0.5">
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
                  'flex-1 sm:flex-none px-2.5 py-0.5 rounded-full text-[11px] leading-4 font-semibold transition-all whitespace-nowrap text-center',
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
      </div>

      <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-3 items-stretch">
        <div className="min-w-0 flex flex-col">
          <div className="rounded-xl bg-white/75 backdrop-blur ring-1 ring-black/5 shadow-[0_12px_26px_-24px_rgba(15,23,42,0.5)] p-2">
            <div className="text-[11px] font-semibold text-slate-500">Total</div>
            <div className="mt-0.5 text-[15px] leading-[19px] font-semibold text-slate-950 tabular-nums tracking-[-0.02em] truncate">
              {isLoading ? (
                <span className="inline-flex items-center"><span className="kpi-loader" aria-label="Loading" /></span>
              ) : isError ? (
                <span className="text-rose-600">Unable to load data</span>
              ) : isEmpty ? (
                <span className="text-slate-500">No data</span>
              ) : (
                formatFromBase(currentTotal)
              )}
            </div>
          </div>

          <div className="mt-1.5 space-y-1 text-[12px] text-slate-600">
            {(
              [
                ['daily', 'Daily', daily],
                ['weekly', 'Weekly', weekly],
                ['monthly', 'Monthly', monthly],
              ] as const
            ).map(([id, label, amt]) => {
              const activeRow = range === id;
              const w = Math.round((Math.min(maxTotal, Math.max(0, amt)) / maxTotal) * 100);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setRange(id)}
                  disabled={isLoading || isError}
                  className={[
                    'w-full text-left rounded-xl px-2 py-1 ring-1 transition-colors',
                    activeRow
                      ? 'bg-white/85 backdrop-blur ring-black/5 shadow-[0_10px_22px_-22px_rgba(15,23,42,0.55)]'
                      : 'bg-transparent ring-transparent hover:bg-white/60 hover:ring-black/5',
                    isLoading || isError ? 'opacity-60 cursor-not-allowed hover:bg-transparent hover:ring-transparent' : '',
                  ].join(' ')}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500 font-semibold flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400/80" aria-hidden="true" />
                      {label}
                    </span>
                    <span className="font-semibold text-slate-900 tabular-nums">
                      {isLoading ? <span className="kpi-loader scale-[0.72] origin-right" aria-label="Loading" /> : isError || isEmpty ? '—' : formatFromBase(amt)}
                    </span>
                  </div>
                  {activeRow ? <div className="mt-1 h-1 rounded-full bg-slate-200/60 overflow-hidden"><div className="h-full rounded-full bg-slate-900/30" style={{ width: `${w}%` }} /></div> : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="h-[120px] sm:h-[108px] flex items-start justify-center pt-1.5 sm:pt-1 rounded-2xl bg-white/75 backdrop-blur ring-1 ring-black/[0.06] shadow-[0_16px_34px_-26px_rgba(15,23,42,0.6)]">
          <div className="h-[110px] sm:h-[96px] w-full px-1.5 sm:px-1 -translate-y-0.5">
            {isLoading ? (
              <div className="h-full w-full grid place-items-center">
                <span className="kpi-loader" aria-label="Loading" />
              </div>
            ) : isError ? (
              <div className="h-full w-full grid place-items-center text-[11px] font-semibold text-rose-600">Unable to load data</div>
            ) : (
              <DonutChart
                data={active.data}
                centerLabelTop={isEmpty ? 'No data' : isRangeEmpty ? '' : active.center.name}
                centerLabelBottom={isEmpty ? '—' : formatFromBase(isRangeEmpty ? 0 : active.center.amount)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DonutSummaryCard;
