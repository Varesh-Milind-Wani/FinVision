import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useExpenseContext } from '../../contexts/ExpenseContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import AnimatedKpiValue from './AnimatedKpiValue';

const BalanceCard = () => {
  const { netBalance, getMonthlyData, transactions } = useExpenseContext();
  const { formatFromBase } = useCurrency();
  const [isLoading, setIsLoading] = useState(true);
  const [chartOpen, setChartOpen] = useState(false);
  type RangeDays = 7 | 30 | 90 | 180 | 365 | 1095 | 1825;
  const [rangeDays, setRangeDays] = useState<RangeDays>(30);
  const [rangeMenuOpen, setRangeMenuOpen] = useState(false);
  const [viewEndIndex, setViewEndIndex] = useState<number | null>(null);
  const [yPan, setYPan] = useState(0);
  const chartViewportRef = useRef<HTMLDivElement | null>(null);
  const rangeMenuRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    startEndIndex: number;
    startYPan: number;
  } | null>(null);

  const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

  const delta = useMemo(() => {
    const months = (typeof getMonthlyData === 'function' ? getMonthlyData() : []) || [];
    const sorted = months.slice().sort((a: any, b: any) => (a?.ts || 0) - (b?.ts || 0));
    const last = sorted[sorted.length - 1] || null;
    const prev = sorted[sorted.length - 2] || null;
    const lastNet = (Number(last?.income) || 0) - (Number(last?.expense) || 0);
    const prevNet = (Number(prev?.income) || 0) - (Number(prev?.expense) || 0);
    const pct = prevNet !== 0 ? ((lastNet - prevNet) / Math.abs(prevNet)) * 100 : 0;
    return { pct, positive: pct >= 0 };
  }, [getMonthlyData]);

  const dailyDelta = useMemo(() => {
    const toNum = (v: any) => {
      const n = typeof v === 'number' ? v : Number(v);
      return Number.isFinite(n) ? n : NaN;
    };

    const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

    const tx = Array.isArray(transactions) ? transactions : [];
    const out = new Map<string, number>();

    for (const t of tx) {
      const dateKey = typeof t?.date === 'string' ? t.date : '';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) continue;

      let deltaValue = 0;
      if (t?.type === 'income') {
        deltaValue = Math.abs(toNum(t?.amount) || 0);
      } else if (t?.type === 'expense') {
        deltaValue = -Math.abs(toNum(t?.amount) || 0);
      } else if (t?.type === 'investment') {
        const rawStatus = typeof t?.status === 'string' ? t.status.trim().toLowerCase() : '';
        const exit = toNum(t?.exitPrice);
        const hasExit = t?.exitPrice != null && Number.isFinite(exit) && exit >= 0;
        const closed = rawStatus === 'closed' || hasExit;
        if (closed) {
          const profit = toNum(t?.profit);
          if (Number.isFinite(profit)) {
            deltaValue = round2(profit);
          } else {
            const qty = toNum(t?.quantity);
            const entry = toNum(t?.entryPrice);
            if (Number.isFinite(qty) && qty > 0 && Number.isFinite(entry) && entry > 0 && hasExit) {
              deltaValue = round2((exit - entry) * qty);
            }
          }
        }
      }

      if (!Number.isFinite(deltaValue) || deltaValue === 0) continue;
      out.set(dateKey, round2((out.get(dateKey) || 0) + deltaValue));
    }

    return out;
  }, [transactions]);

  const fullChartData = useMemo(() => {
    const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
    const maxDays: RangeDays = 1825;

    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const start = new Date(end);
    start.setDate(start.getDate() - (maxDays - 1));

    const keys: { key: string; ts: number }[] = [];
    for (let i = 0; i < maxDays; i += 1) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const key = `${y}-${m}-${day}`;
      keys.push({ key, ts: d.getTime() });
    }

    const sum = keys.reduce((s, k) => s + (dailyDelta.get(k.key) || 0), 0);
    const endBalance = round2(Number(netBalance) || 0);
    const startBalance = round2(endBalance - sum);

    let running = startBalance;
    return keys.map((k) => {
      const delta = dailyDelta.get(k.key) || 0;
      running = round2(running + delta);
      return { ts: k.ts, dateKey: k.key, balance: running, delta };
    });
  }, [dailyDelta, netBalance]);

  const chartData = useMemo(() => {
    const len = fullChartData.length;
    if (!len) return [];
    const windowSize = Math.min(rangeDays, len);
    const defaultEnd = len - 1;
    const end = viewEndIndex == null ? defaultEnd : clamp(viewEndIndex, windowSize - 1, defaultEnd);
    const start = end - windowSize + 1;
    return fullChartData.slice(start, end + 1);
  }, [fullChartData, rangeDays, viewEndIndex]);

  const xTickFormatter = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: '2-digit' });
    return (ts: any) => {
      const d = new Date(Number(ts) || 0);
      return Number.isNaN(d.getTime()) ? '' : fmt.format(d);
    };
  }, []);

  const yDomain = useMemo(() => {
    const values = chartData.map((p) => Number(p?.balance)).filter((n) => Number.isFinite(n));
    if (!values.length) return ['auto', 'auto'] as const;

    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    let min = rawMin;
    let max = rawMax;

    if (min === max) {
      const pad = Math.max(1, Math.abs(min) * 0.05);
      min -= pad;
      max += pad;
    } else {
      const pad = (max - min) * 0.06;
      min -= pad;
      max += pad;
    }

    // Avoid showing negative/positive padding if the data never crosses zero.
    if (rawMin >= 0) min = Math.max(0, min);
    if (rawMax <= 0) max = Math.min(0, max);

    if (yPan !== 0) {
      min += yPan;
      max += yPan;
    }

    return [min, max] as const;
  }, [chartData, yPan]);

  const BalanceTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const v = payload[0]?.value;
    const delta = Number(payload?.[0]?.payload?.delta) || 0;
    const d = new Date(Number(label) || 0);
    const dateText = Number.isNaN(d.getTime())
      ? ''
      : new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: '2-digit', year: 'numeric' }).format(d);
    return (
      <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-black/[0.08] shadow-[0_10px_28px_-20px_rgba(15,23,42,0.55)]">
        {dateText ? <div className="text-[10px] font-semibold text-slate-500">{dateText}</div> : null}
        <div className="mt-0.5 text-[12px] font-extrabold text-slate-900">{formatFromBase(Number(v) || 0)}</div>
        {Number.isFinite(delta) && delta !== 0 ? (
          <div className={`mt-0.5 text-[11px] font-semibold ${delta >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {delta >= 0 ? '+' : '−'}
            {formatFromBase(Math.abs(delta))}
          </div>
        ) : (
          <div className="mt-0.5 text-[11px] font-semibold text-slate-500">No change</div>
        )}
      </div>
    );
  };

  useEffect(() => {
    if (!chartOpen) return undefined;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (rangeMenuOpen) setRangeMenuOpen(false);
        else setChartOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [chartOpen, rangeMenuOpen]);

  useEffect(() => {
    if (!rangeMenuOpen) return undefined;
    const onPointerDown = (e: PointerEvent) => {
      const el = rangeMenuRef.current;
      if (!el) return;
      if (e.target instanceof Node && el.contains(e.target)) return;
      setRangeMenuOpen(false);
    };
    // Use bubble phase so menu item clicks aren't swallowed by an early close.
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [rangeMenuOpen]);

  useEffect(() => {
    // When changing window size, keep the view anchored to the latest point and reset vertical pan.
    setViewEndIndex(null);
    setYPan(0);
    setRangeMenuOpen(false);
  }, [rangeDays]);

  const rangeOptions: Array<{ days: RangeDays; label: string }> = [
    { days: 7, label: '7D' },
    { days: 30, label: '30D' },
    { days: 90, label: '90D' },
    { days: 180, label: '6M' },
    { days: 365, label: '1Y' },
    { days: 1095, label: '3Y' },
    { days: 1825, label: '5Y' },
  ];
  const rangeLabel = rangeOptions.find((o) => o.days === rangeDays)?.label || `${rangeDays}D`;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!chartViewportRef.current) return;
    const len = fullChartData.length;
    if (len < 2) return;

    chartViewportRef.current.setPointerCapture?.(e.pointerId);
    const windowSize = Math.min(rangeDays, len);
    const defaultEnd = len - 1;
    const currentEnd = viewEndIndex == null ? defaultEnd : clamp(viewEndIndex, windowSize - 1, defaultEnd);

    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      startEndIndex: currentEnd,
      startYPan: yPan,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const state = dragRef.current;
    const el = chartViewportRef.current;
    if (!state?.active || !el) return;

    const len = fullChartData.length;
    if (len < 2) return;

    const rect = el.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;

    const windowSize = Math.min(rangeDays, len);
    const minEnd = windowSize - 1;
    const maxEnd = len - 1;

    const dayShift = Math.round((-dx / w) * windowSize);
    const nextEnd = clamp(state.startEndIndex + dayShift, minEnd, maxEnd);
    setViewEndIndex(nextEnd === maxEnd ? null : nextEnd);

    const y0 = Number((yDomain as any)?.[0]);
    const y1 = Number((yDomain as any)?.[1]);
    const range = Number.isFinite(y0) && Number.isFinite(y1) ? Math.max(1, Math.abs(y1 - y0)) : 1;
    const yShift = (dy / h) * range;
    setYPan(state.startYPan + yShift);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = chartViewportRef.current;
    try {
      el?.releasePointerCapture?.(e.pointerId);
    } catch {
      // noop
    }
    dragRef.current = null;
  };

  return (
    <div className="kpi-card">
      <div className="kpi-header">
        <div className="kpi-title">My balance</div>
        <button
          type="button"
          className="h-9 w-9 rounded-xl grid place-items-center bg-slate-50 text-slate-700 ring-1 ring-slate-200/80 shadow-sm hover:bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          aria-label="Open balance chart"
          onClick={() => setChartOpen(true)}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
            <circle cx="7" cy="12" r="2" fill="currentColor" />
            <circle cx="12" cy="12" r="2" fill="currentColor" />
            <circle cx="17" cy="12" r="2" fill="currentColor" />
          </svg>
        </button>
      </div>

      <div className="kpi-value flex items-center min-h-[40px]">
        <AnimatedKpiValue
          value={Number(netBalance) || 0}
          formatValue={formatFromBase}
          delayMs={1000}
          durationMs={7000}
          onPhaseChange={(p) => setIsLoading(p === 'loading')}
        />
      </div>

      <div className="mt-2 flex items-center justify-start">
        {isLoading ? (
          <span className="chip bg-slate-100 text-slate-500 ring-black/5">Loading</span>
        ) : (
          <span
            className={[
              'inline-flex items-center gap-2 rounded-2xl px-3 py-2 ring-1 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.55)]',
              delta.positive ? 'bg-emerald-50/80 text-emerald-800 ring-emerald-200/70' : 'bg-rose-50/80 text-rose-800 ring-rose-200/70',
            ].join(' ')}
            aria-label="Compared to previous month"
          >
            <span
              className={[
                'grid h-6 w-6 place-items-center rounded-xl text-white ring-1',
                delta.positive ? 'bg-emerald-600 ring-emerald-500/40' : 'bg-rose-600 ring-rose-500/40',
              ].join(' ')}
              aria-hidden="true"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4">
                {delta.positive ? (
                  <path fill="currentColor" d="M7 14l5-5 5 5 1.4-1.4-6.4-6.4-6.4 6.4L7 14z" />
                ) : (
                  <path fill="currentColor" d="M7 10l5 5 5-5 1.4 1.4-6.4 6.4-6.4-6.4L7 10z" />
                )}
              </svg>
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-[12px] font-extrabold tracking-tight">
                {delta.pct >= 0 ? '+' : '−'}
                {Math.abs(delta.pct).toFixed(1)}%
              </span>
              <span className="text-[10px] font-semibold opacity-80">Compared to previous month</span>
            </span>
          </span>
        )}
      </div>

      {chartOpen
        ? createPortal(
            <div className="fixed inset-0 z-[10000]">
              <div
                aria-hidden="true"
                className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
                onClick={() => setChartOpen(false)}
              />
              <div className="relative h-full w-full flex items-start sm:items-center justify-center p-4 sm:p-6">
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-label="Balance chart"
                  className="w-[min(1100px,96vw)] h-[min(760px,92dvh)] overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/10 flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-5 py-4 border-b border-black/[0.06] flex items-start justify-between gap-4">
                    <div>
                      <div className="font-display text-lg font-extrabold text-slate-900">Balance trend</div>
                      <div className="mt-1 text-[12px] text-slate-500">Daily balance (income − expenses + realized P/L)</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setChartOpen(false)}
                      className="h-9 w-9 rounded-xl grid place-items-center text-slate-500 hover:bg-slate-100 transition-colors"
                      aria-label="Close"
                    >
                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
                      </svg>
                    </button>
                  </div>

                  <div className="px-3 sm:px-5 py-4 flex-1 min-h-0 flex flex-col">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="text-[12px] font-semibold text-slate-700">Range</div>
                      <div className="relative" ref={rangeMenuRef}>
                        <button
                          type="button"
                          onClick={() => setRangeMenuOpen((v) => !v)}
                          className="h-9 px-3 rounded-full bg-white/80 text-slate-800 ring-1 ring-black/5 hover:bg-white transition-colors text-[12px] font-semibold inline-flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                          aria-haspopup="menu"
                          aria-expanded={rangeMenuOpen}
                        >
                          {rangeLabel}
                          <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-500" aria-hidden="true">
                            <path fill="currentColor" d="M7 10l5 5 5-5 1.4 1.4-6.4 6.4-6.4-6.4L7 10z" />
                          </svg>
                        </button>

                        {rangeMenuOpen ? (
                          <div
                            role="menu"
                            className="absolute right-0 mt-2 w-36 overflow-hidden rounded-2xl bg-white ring-1 ring-black/10 shadow-[0_20px_44px_-30px_rgba(15,23,42,0.65)] z-50"
                          >
                            {rangeOptions.map((o) => (
                              <button
                                key={o.days}
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setRangeDays(o.days);
                                  setRangeMenuOpen(false);
                                }}
                                className={[
                                  'w-full px-3 py-2 text-left text-[12px] font-semibold transition-colors',
                                  o.days === rangeDays ? 'bg-slate-950 text-white' : 'text-slate-700 hover:bg-slate-50',
                                ].join(' ')}
                              >
                                {o.label}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex-1 min-h-0">
                      <div
                        ref={chartViewportRef}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerUp}
                        onPointerLeave={handlePointerUp}
                        className="relative h-full w-full select-none touch-none cursor-grab active:cursor-grabbing rounded-2xl overflow-hidden outline-none border-0 ring-0"
                        aria-label="Drag to pan"
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData} margin={{ top: 10, right: 18, bottom: 8, left: 12 }}>
                            <defs>
                              <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#2563eb" stopOpacity={0.22} />
                                <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} stroke="rgba(15,23,42,0.06)" />
                            <XAxis
                              dataKey="ts"
                              type="number"
                              domain={['dataMin', 'dataMax']}
                              axisLine={false}
                              tickLine={false}
                              tick={{ fontSize: 11, fill: '#64748b' }}
                              dy={8}
                              tickFormatter={xTickFormatter as any}
                              tickMargin={8}
                              interval="preserveStartEnd"
                            />
                            <YAxis
                              axisLine={false}
                              tickLine={false}
                              tick={{ fontSize: 11, fill: '#64748b' }}
                              tickFormatter={(v) => formatFromBase(Number(v) || 0)}
                              width={84}
                              domain={yDomain as any}
                            />
                            <ReferenceLine y={0} stroke="rgba(15,23,42,0.10)" strokeDasharray="3 3" />
                            <Tooltip
                              content={<BalanceTooltip />}
                              cursor={{ stroke: 'rgba(37,99,235,0.25)', strokeWidth: 1, strokeDasharray: '3 3' }}
                            />
                            <Area
                              type="monotone"
                              dataKey="balance"
                              stroke="#2563eb"
                              strokeWidth={2.6}
                              fill="url(#balanceFill)"
                              dot={false}
                              activeDot={{ r: 4.5, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
};

export default BalanceCard;
