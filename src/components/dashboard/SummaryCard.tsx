import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type Props = {
  title: string;
  value: React.ReactNode;
  deltaLabel: string;
  deltaTone: 'up' | 'down' | 'neutral';
  iconTone: 'emerald' | 'orange' | 'violet';
  icon?: React.ReactNode;
  isLoading?: boolean;
  deltaVariant?: 'text' | 'badge';
  sparkline?: number[];
  sparklineLabel?: string;
  footerLabel?: string | null;
  emptyRightLabel?: string | null;
  sparklineVariant?: 'footer' | 'inline';
  modal?: {
    title: string;
    subtitle?: string;
    data: Array<{ ts: number; value: number; delta?: number }>;
    valueFormatter?: (value: number) => string;
    valueLabel?: string;
  } | null;
};

const toneStyles = {
  up: 'text-emerald-600',
  down: 'text-rose-500',
  neutral: 'text-slate-500',
} as const;

const iconStyles = {
  emerald: 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-[0_8px_16px_-6px_rgba(16,185,129,0.5)] ring-1 ring-emerald-500/30 ring-inset',
  orange: 'bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-[0_8px_16px_-6px_rgba(249,115,22,0.5)] ring-1 ring-orange-500/30 ring-inset',
  violet: 'bg-gradient-to-br from-violet-400 to-violet-600 text-white shadow-[0_8px_16px_-6px_rgba(139,92,246,0.5)] ring-1 ring-violet-500/30 ring-inset',
} as const;

const SummaryCard = ({
  title,
  value,
  deltaLabel,
  deltaTone,
  iconTone,
  icon,
  isLoading = false,
  deltaVariant = 'text',
  sparkline,
  sparklineLabel,
  footerLabel,
  emptyRightLabel = 'Updated today',
  sparklineVariant = 'footer',
  modal = null,
}: Props) => {
  const sparkStroke =
    iconTone === 'violet'
      ? '#7c3aed'
      : deltaTone === 'down'
        ? '#f97316'
        : deltaTone === 'up'
          ? '#16a34a'
          : '#64748b';
  const sparkFill =
    iconTone === 'violet'
      ? 'rgba(124,58,237,0.10)'
      : deltaTone === 'down'
        ? 'rgba(249,115,22,0.12)'
        : deltaTone === 'up'
          ? 'rgba(22,163,74,0.12)'
          : 'rgba(100,116,139,0.10)';

  const spark = (() => {
    const values = (sparkline || []).map((v) => Number(v) || 0).slice(-10);
    if (values.length < 2) return null;

    const w = sparklineVariant === 'inline' ? 200 : 140;
    const h = sparklineVariant === 'inline' ? 74 : 40;
    const padX = 4;
    const padY = sparklineVariant === 'inline' ? 14 : 3; // reserve space for the inline label
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = Math.max(1e-9, max - min);

    const pts = values.map((v, i) => {
      const x = padX + (i * (w - padX * 2)) / (values.length - 1);
      const y = padY + (1 - (v - min) / span) * (h - padY - 6);
      return { x, y };
    });

    const toSmoothPath = (points: Array<{ x: number; y: number }>) => {
      if (points.length < 2) return '';
      if (points.length === 2) return `M${points[0]!.x},${points[0]!.y} L${points[1]!.x},${points[1]!.y}`;

      // Catmull-Rom to Bezier (uniform). Produces a smooth "dashboard" sparkline.
      const d: string[] = [`M${points[0]!.x.toFixed(2)},${points[0]!.y.toFixed(2)}`];
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i - 1] || points[i];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[i + 2] || p2;

        const c1x = p1!.x + (p2!.x - p0!.x) / 6;
        const c1y = p1!.y + (p2!.y - p0!.y) / 6;
        const c2x = p2!.x - (p3!.x - p1!.x) / 6;
        const c2y = p2!.y - (p3!.y - p1!.y) / 6;

        d.push(`C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2!.x.toFixed(2)},${p2!.y.toFixed(2)}`);
      }
      return d.join(' ');
    };

    const d = toSmoothPath(pts);
    const floor = h - 4;
    const area = `${d} L${pts[pts.length - 1]!.x.toFixed(2)},${floor.toFixed(2)} L${pts[0]!.x.toFixed(2)},${floor.toFixed(2)} Z`;

    const mid = pts[Math.floor(pts.length * 0.45)];
    return { d, area, w, h, mid };
  })();

  type RangeDays = 7 | 30 | 90 | 180 | 365 | 1095 | 1825;
  const [chartOpen, setChartOpen] = useState(false);
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

  const fullChartData = useMemo(() => {
    const list = (modal?.data || []).filter((p) => Number.isFinite(Number(p?.ts)) && Number.isFinite(Number(p?.value)));
    return list.sort((a, b) => Number(a.ts) - Number(b.ts));
  }, [modal?.data]);

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
    const values = chartData.map((p) => Number(p?.value)).filter((n) => Number.isFinite(n));
    if (!values.length) return ['auto', 'auto'] as const;

    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    let min = rawMin;
    let max = rawMax;

    if (min === max) {
      // When the series is flat, avoid a symmetric domain that puts 0 in the middle.
      // Recharts may also auto-expand a [0,0] domain back to a symmetric range.
      if (rawMin === 0) {
        min = 0;
        max = 1;
      } else {
        const pad = Math.max(1, Math.abs(min) * 0.06);
        min -= pad;
        max += pad;
      }
    } else {
      const pad = (max - min) * 0.08;
      min -= pad;
      max += pad;
    }

    // Never show negative/positive padding unless the data itself crosses 0.
    if (rawMin >= 0) min = Math.max(0, min);
    if (rawMax <= 0) max = Math.min(0, max);

    if (yPan !== 0) {
      min += yPan;
      max += yPan;
    }

    return [min, max] as const;
  }, [chartData, yPan]);

  const hasNonZeroData = useMemo(() => {
    return chartData.some((p) => {
      const v = Number((p as any)?.value);
      return Number.isFinite(v) && v !== 0;
    });
  }, [chartData]);

  const formatValue = useMemo(() => {
    return typeof modal?.valueFormatter === 'function' ? modal.valueFormatter : (n: number) => String(n);
  }, [modal?.valueFormatter]);

  const ModalTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const v = Number(payload[0]?.value) || 0;
    const delta = Number(payload?.[0]?.payload?.delta);
    const d = new Date(Number(label) || 0);
    const dateText = Number.isNaN(d.getTime())
      ? ''
      : new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: '2-digit', year: 'numeric' }).format(d);

    return (
      <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-black/[0.08] shadow-[0_10px_28px_-20px_rgba(15,23,42,0.55)]">
        {dateText ? <div className="text-[10px] font-semibold text-slate-500">{dateText}</div> : null}
        <div className="mt-0.5 text-[12px] font-extrabold text-slate-900">{formatValue(v)}</div>
        {Number.isFinite(delta) ? (
          <div className="mt-0.5 text-[11px] font-semibold text-slate-500">
            {modal?.valueLabel || 'Value'}: {formatValue(Math.abs(Number(delta) || 0))}
          </div>
        ) : null}
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
    if (!chartOpen) return;
    setViewEndIndex(null);
    setYPan(0);
  }, [chartOpen, rangeDays]);

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

  const parsedDelta = React.useMemo(() => {
    const raw = typeof deltaLabel === 'string' ? deltaLabel.trim() : '';
    if (!raw) return null;

    // Supports: "+12.3% compared to last month" / "-4% vs previous month"
    const match = raw.match(/^([+−-]?\s*\d+(?:\.\d+)?)\s*%?\s*(.*)$/);
    if (!match) return { pctText: raw, caption: 'Compared to previous month' };

    const pctRaw = (match[1] || '').replace(/\s+/g, '');
    const rest = (match[2] || '').trim();
    const caption = rest || 'Compared to previous month';

    // Keep the percent sign if the caller omitted it; we always render as %.
    const num = Number(pctRaw.replace('−', '-'));
    if (!Number.isFinite(num)) return { pctText: raw, caption };

    const sign = num >= 0 ? '+' : '−';
    return { pctText: `${sign}${Math.abs(num).toFixed(1)}%`, caption };
  }, [deltaLabel]);

  const DeltaBadge = () => {
    if (!parsedDelta) return null;
    const positive = deltaTone === 'up' || (deltaTone === 'neutral' && parsedDelta.pctText.startsWith('+'));
    const negative = deltaTone === 'down' || (deltaTone === 'neutral' && parsedDelta.pctText.startsWith('−'));

    const tone = negative && !positive ? 'down' : positive ? 'up' : 'neutral';
    const container =
      tone === 'up'
        ? 'bg-emerald-50/80 text-emerald-800 ring-emerald-200/70 shadow-[0_4px_12px_-4px_rgba(16,185,129,0.25)] backdrop-blur-sm'
        : tone === 'down'
          ? 'bg-rose-50/80 text-rose-800 ring-rose-200/70 shadow-[0_4px_12px_-4px_rgba(225,29,72,0.25)] backdrop-blur-sm'
          : 'bg-slate-50/80 text-slate-800 ring-slate-200/70 shadow-[0_4px_12px_-4px_rgba(100,116,139,0.25)] backdrop-blur-sm';

    const icon =
      tone === 'up'
        ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 ring-emerald-500/40 text-white shadow-sm'
        : tone === 'down'
          ? 'bg-gradient-to-br from-rose-500 to-rose-600 ring-rose-500/40 text-white shadow-sm'
          : 'bg-gradient-to-br from-slate-600 to-slate-700 ring-slate-500/30 text-white shadow-sm';

    return (
      <span
        className={['mt-2 inline-flex items-center gap-2 rounded-2xl px-3 py-2 ring-1 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.55)]', container].join(
          ' '
        )}
        aria-label="Compared to previous month"
      >
        <span className={['grid h-6 w-6 place-items-center rounded-xl text-white ring-1', icon].join(' ')} aria-hidden="true">
          <svg viewBox="0 0 24 24" className="h-4 w-4">
            {tone === 'down' ? (
              <path fill="currentColor" d="M7 10l5 5 5-5 1.4 1.4-6.4 6.4-6.4-6.4L7 10z" />
            ) : tone === 'up' ? (
              <path fill="currentColor" d="M7 14l5-5 5 5 1.4-1.4-6.4-6.4-6.4 6.4L7 14z" />
            ) : (
              <path fill="currentColor" d="M5 12h14v2H5z" />
            )}
          </svg>
        </span>
        <span className="flex flex-col leading-tight">
          <span className="text-[12px] font-extrabold tracking-tight">{parsedDelta.pctText}</span>
          <span className="text-[10px] font-semibold opacity-80">{parsedDelta.caption}</span>
        </span>
      </span>
    );
  };

  return (
    <div className="kpi-card relative group hover:shadow-lg transition-all duration-300 ring-1 ring-black/[0.04] bg-white flex flex-col h-full">
      <div className="flex items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className={`h-9 w-9 rounded-xl grid place-items-center ring-1 transition-all duration-300 ${
            iconTone === 'emerald' ? 'bg-emerald-50 text-emerald-600 ring-emerald-500/10 group-hover:bg-emerald-100' :
            iconTone === 'orange' ? 'bg-orange-50 text-orange-600 ring-orange-500/10 group-hover:bg-orange-100' :
            iconTone === 'violet' ? 'bg-violet-50 text-violet-600 ring-violet-500/10 group-hover:bg-violet-100' :
            'bg-slate-50 text-slate-600 ring-slate-500/10 group-hover:bg-slate-100'
          }`}>
            {icon ? React.cloneElement(icon as React.ReactElement, { className: 'h-4 w-4' }) : null}
          </div>
          <div>
            <div className="text-[12px] font-bold text-slate-600 tracking-tight uppercase">{title}</div>
            <div className="mt-0.5 text-[10px] text-slate-400 font-semibold">{footerLabel === null ? 'Current total' : footerLabel || 'Last 30 days'}</div>
          </div>
        </div>

        {modal ? (
          <button
            type="button"
            onClick={() => setChartOpen(true)}
            className="h-9 w-9 rounded-xl grid place-items-center bg-slate-50 text-slate-700 ring-1 ring-slate-200/80 shadow-sm hover:bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <circle cx="7" cy="12" r="2" fill="currentColor" />
              <circle cx="12" cy="12" r="2" fill="currentColor" />
              <circle cx="17" cy="12" r="2" fill="currentColor" />
            </svg>
          </button>
        ) : null}
      </div>

      <div className="mt-2">
        <div className="text-[24px] sm:text-[26px] leading-[30px] sm:leading-[32px] font-semibold tracking-[-0.03em] text-slate-950 tabular-nums">
          {value}
        </div>
        {isLoading ? (
          <div className="mt-1 h-3 w-[72%] max-w-[220px] rounded-full bg-slate-100 ring-1 ring-black/5 animate-pulse" aria-hidden="true" />
        ) : deltaLabel && !spark ? (
          <div className="mt-auto pt-2 flex items-center gap-1.5 text-[12px]">
            <span className={['font-bold text-[10px]', deltaTone === 'up' || (deltaTone === 'neutral' && parsedDelta?.pctText.startsWith('+')) ? 'text-emerald-600' : deltaTone === 'down' || (deltaTone === 'neutral' && parsedDelta?.pctText.startsWith('−')) ? 'text-rose-600' : 'text-slate-600'].join(' ')}>
              {deltaTone === 'up' ? '▲' : deltaTone === 'down' ? '▼' : ''} {parsedDelta?.pctText}
            </span>
            <span className="text-[10px] font-semibold text-slate-400 tracking-tight">
              {parsedDelta?.caption}
            </span>
          </div>
        ) : null}
      </div>

      {sparklineVariant === 'inline' && spark ? (
        <div className="mt-3 flex justify-end">
          <svg width={spark.w} height={spark.h} viewBox={`0 0 ${spark.w} ${spark.h}`} className="shrink-0" aria-hidden="true">
            <path d={spark.area} fill={sparkFill} />
            <path d={spark.d} fill="none" stroke={sparkStroke} strokeWidth="2.4" strokeLinecap="round" />
            {spark.mid ? <circle cx={spark.mid.x} cy={spark.mid.y} r="3.2" fill={sparkStroke} opacity="0.9" /> : null}
            {sparklineLabel ? (
              <text x={spark.mid?.x || spark.w / 2} y={Math.max(12, (spark.mid?.y || 28) - 10)} textAnchor="middle" className="fill-slate-500" fontSize="10" fontWeight="600">
                {sparklineLabel}
              </text>
            ) : null}
          </svg>
        </div>
      ) : spark ? (
        <div className="mt-auto pt-2">
          <div className="w-full overflow-hidden flex justify-end">
            <svg width={spark.w} height={spark.h} viewBox={`0 0 ${spark.w} ${spark.h}`} className="shrink-0" aria-hidden="true">
              <defs>
                <linearGradient id={`grad-${title.replace(/\s+/g, '')}`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={sparkStroke} stopOpacity="0.4" />
                  <stop offset="50%" stopColor={sparkStroke} stopOpacity="1" />
                  <stop offset="100%" stopColor={sparkStroke} stopOpacity="0.2" />
                </linearGradient>
              </defs>
              <path d={spark.area} fill={sparkFill} />
              <path d={spark.d} fill="none" stroke={`url(#grad-${title.replace(/\s+/g, '')})`} strokeWidth="2.8" strokeLinecap="round" className="transition-all duration-500 group-hover:stroke-3" />
            </svg>
          </div>
          {deltaLabel ? (
            <div className="mt-1 flex items-center justify-between text-[10px] font-bold">
              <span className="text-slate-500 tracking-tight">{deltaLabel.split(' ').slice(1).join(' ')}</span>
              <span className={['font-bold', deltaTone === 'up' ? 'text-emerald-600' : deltaTone === 'down' ? 'text-rose-600' : 'text-slate-600'].join(' ')}>
                {deltaTone === 'up' ? '▲' : deltaTone === 'down' ? '▼' : ''} {parsedDelta?.pctText}
              </span>
            </div>
          ) : null}
        </div>
      ) : null}

      {chartOpen && modal
        ? createPortal(
            <div className="fixed inset-0 z-[10000]">
              <div aria-hidden="true" className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setChartOpen(false)} />
              <div className="relative h-full w-full flex items-start sm:items-center justify-center p-4 sm:p-6">
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-label={modal.title}
                  className="w-[min(1100px,96vw)] h-[min(760px,92dvh)] overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/10 flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-5 py-4 border-b border-black/[0.06] flex items-start justify-between gap-4">
                    <div>
                      <div className="font-display text-lg font-extrabold text-slate-900">{modal.title}</div>
                      {modal.subtitle ? <div className="mt-1 text-[12px] text-slate-500">{modal.subtitle}</div> : null}
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
                        aria-label="Chart"
                      >
                        {!hasNonZeroData ? (
                          <div className="absolute inset-0 grid place-items-center">
                            <div className="text-[14px] font-extrabold text-slate-400">No Data</div>
                          </div>
                        ) : null}
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData} margin={{ top: 10, right: 18, bottom: 8, left: 12 }}>
                            <defs>
                              <linearGradient id="summaryFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#16a34a" stopOpacity={0.20} />
                                <stop offset="100%" stopColor="#16a34a" stopOpacity={0.02} />
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
                              tickFormatter={(v) => formatValue(Number(v) || 0)}
                              width={92}
                              domain={yDomain as any}
                            />
                            {hasNonZeroData ? <ReferenceLine y={0} stroke="rgba(15,23,42,0.10)" strokeDasharray="3 3" /> : null}
                            {hasNonZeroData ? (
                              <>
                                <Tooltip
                                  content={<ModalTooltip />}
                                  cursor={{ stroke: 'rgba(22,163,74,0.22)', strokeWidth: 1, strokeDasharray: '3 3' }}
                                />
                                <Area
                                  type="monotone"
                                  dataKey="value"
                                  stroke="#16a34a"
                                  strokeWidth={2.6}
                                  fill="url(#summaryFill)"
                                  dot={false}
                                  activeDot={{ r: 4.5, fill: '#16a34a', stroke: '#fff', strokeWidth: 2 }}
                                />
                              </>
                            ) : null}
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

export default SummaryCard;
