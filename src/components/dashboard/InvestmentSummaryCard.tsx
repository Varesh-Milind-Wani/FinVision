import React from 'react';
import { createPortal } from 'react-dom';
import {
  Area,
  Brush,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useDelayedCountUp } from '../../hooks/useDelayedCountUp';
import { useExpenseContext } from '../../contexts/ExpenseContext';

type Props = {
  title?: string;
  total: number;
  investAmount: number;
  series: number[];
};

function ModalTooltip({ active, payload, label, formatValue }: any) {
  if (!active || !payload?.length) return null;
  const v = Number(payload[0]?.value) || 0;
  const pct = payload?.[0]?.payload?.pct;
  const d = new Date(Number(label) || 0);
  const dateText = Number.isNaN(d.getTime())
    ? ''
    : new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: '2-digit', year: 'numeric' }).format(d);

  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-xl px-3.5 py-2.5 ring-1 ring-black/[0.08] shadow-[0_18px_45px_-26px_rgba(15,23,42,0.45)]">
      {dateText ? <div className="text-[10px] font-semibold text-slate-500">{dateText}</div> : null}
      <div className="mt-0.5 text-[12px] font-extrabold text-slate-900 tabular-nums">{formatValue(v)}</div>
      {Number.isFinite(Number(pct)) ? (
        <div className={['mt-0.5 text-[11px] font-extrabold tabular-nums', Number(pct) >= 0 ? 'text-emerald-700' : 'text-rose-700'].join(' ')}>
          {Number(pct) >= 0 ? '+' : '-'}
          {Math.abs(Number(pct)).toFixed(2)}%
        </div>
      ) : null}
    </div>
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

function InvestmentSparkline({ data, height = 48 }: { data: number[]; height?: number }) {
  const pts = (data || []).filter((n) => Number.isFinite(n));
  if (pts.length < 2) return null;
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || 1;
  const pad = range * 0.12;
  const yMin = min - pad;
  const yMax = max + pad;
  const safeR = yMax - yMin || 1;
  const vbW = 300;
  const vbH = height;
  const stepX = (vbW - 6) / (pts.length - 1);
  const toY = (v: number) => 4 + ((yMax - v) / safeR) * (vbH - 8);
  const d = pts.map((v, i) => `${i === 0 ? 'M' : 'L'} ${3 + i * stepX} ${toY(v)}`).join(' ');
  const areaD = `${d} L ${vbW - 3} ${vbH - 3} L 3 ${vbH - 3} Z`;
  const last = pts[pts.length - 1];
  const first = pts[0];
  const up = last >= first;
  const s = up ? '#7C3AED' : '#F97316';
  return (
    <svg width="100%" height={vbH} viewBox={`0 0 ${vbW} ${vbH}`} preserveAspectRatio="xMidYMid meet" className="block">
      <defs>
        <linearGradient id={`ig-${s.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={s} stopOpacity={0.2} />
          <stop offset="100%" stopColor={s} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#ig-${s.replace('#', '')})`} stroke="none" />
      <path d={d} fill="none" stroke={s} strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={vbW - 3} cy={toY(last)} r={2} fill={s} />
    </svg>
  );
}

export default function InvestmentSummaryCard({ title = 'Total Investment', total, investAmount, series }: Props) {
  const { formatFromBase } = useCurrency();
  const { transactions, editTransaction } = useExpenseContext() as any;
  const delayMs = 1000;
  const durationMs = 7000;
  const { value: invV, phase } = useDelayedCountUp(Number(total) || 0, { delayMs, durationMs, startValue: 0 });
  const [chartOpen, setChartOpen] = React.useState(false);
  const [infoOpen, setInfoOpen] = React.useState(false);
  const [now, setNow] = React.useState(() => new Date());
  const [editCell, setEditCell] = React.useState<{ id: string; field: 'entryPrice' | 'currentPrice' | 'exitPrice' } | null>(null);
  const [editValue, setEditValue] = React.useState('');
  const [editError, setEditError] = React.useState('');
  const [showPrediction, setShowPrediction] = React.useState(true);

  const yAxisTick = React.useCallback(
    ({ x, y, payload }: any) => {
      const text = formatFromBase(Number(payload?.value) || 0);
      return (
        <text
          x={(Number(x) || 0) - 10}
          y={y}
          dy={4}
          textAnchor="end"
          fill="#64748b"
          style={{ fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
        >
          {text}
        </text>
      );
    },
    [formatFromBase]
  );

  const yAxisTickCompact = React.useCallback(({ x, y, payload }: any) => {
    const v = Number(payload?.value) || 0;
    const abs = Math.abs(v);
    const fmt = (() => {
      if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
      if (abs >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
      return `${Math.round(v)}`;
    })();
    return (
      <text
        x={(Number(x) || 0) - 10}
        y={y}
        dy={4}
        textAnchor="end"
        fill="#64748b"
        style={{ fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
      >
        {fmt}
      </text>
    );
  }, []);

  React.useEffect(() => {
    // Keep "today" boundaries correct for daily series.
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

  const activePositions = React.useMemo(() => {
    const tx = Array.isArray(transactions) ? transactions : [];

    const isActiveInvestment = (t: any) => {
      if (t?.type !== 'investment') return false;
      const status = typeof t?.status === 'string' ? t.status.trim().toLowerCase() : '';
      const exit = Number(t?.exitPrice);
      const isClosed = status === 'closed' || (t?.exitPrice != null && Number.isFinite(exit) && exit > 0);
      return !isClosed;
    };

    const positions = tx
      .filter(isActiveInvestment)
      .map((t: any) => {
        const name = String(t?.name || t?.description || 'Investment').trim() || 'Investment';
        const qty = Number(t?.quantity);
        const entry = Number(t?.entryPrice);
        const current = Number(t?.currentPrice);
        const exit = Number(t?.exitPrice);
        const invested = Number(t?.amount);

        const qtyOk = Number.isFinite(qty) && qty > 0;
        const entryOk = Number.isFinite(entry) && entry > 0;
        const investedValue =
          Number.isFinite(invested) && invested > 0 ? invested : qtyOk && entryOk ? Math.round(qty * entry * 100) / 100 : 0;

        const currentOk = Number.isFinite(current) && current >= 0;
        const currentValue =
          qtyOk && currentOk ? Math.round(qty * current * 100) / 100 : investedValue;

        const pnl = Math.round((currentValue - investedValue) * 100) / 100;
        const pnlPct = investedValue > 0 ? (pnl / investedValue) * 100 : 0;

        return {
          id: String(t?.id || name),
          txId: String(t?.id || ''),
          name,
          quantity: qtyOk ? qty : null,
          entryPrice: entryOk ? entry : null,
          currentPrice: currentOk && qtyOk ? current : currentOk && !qtyOk ? current : null,
          exitPrice: Number.isFinite(exit) && exit >= 0 ? exit : null,
          invested: investedValue,
          value: currentValue,
          pnl,
          pnlPct,
          hasCurrent: qtyOk && currentOk,
        };
      })
      .filter((p) => p.invested > 0);

    positions.sort((a, b) => b.value - a.value);
    return positions;
  }, [transactions]);

  const startEdit = React.useCallback(
    (p: any, field: 'entryPrice' | 'currentPrice' | 'exitPrice') => {
      setEditError('');
      setEditCell({ id: String(p?.id || ''), field });
      const raw = p?.[field];
      setEditValue(raw == null ? '' : String(raw));
    },
    []
  );

  const commitEdit = React.useCallback(() => {
    if (!editCell) return;
    const id = editCell.id;
    if (!id) return;
    const raw = String(editValue || '').trim();

    const clear = raw === '';
    const n = clear ? NaN : Number(raw);
    if (!clear && (!Number.isFinite(n) || n < 0)) {
      setEditError('Enter a valid number.');
      return;
    }
    if (editCell.field === 'entryPrice' && !clear && n <= 0) {
      setEditError('Entry price must be greater than 0.');
      return;
    }

    try {
      editTransaction?.({
        id,
        [editCell.field]: clear ? null : n,
      });
      setEditCell(null);
      setEditValue('');
      setEditError('');
    } catch {
      setEditError('Save failed.');
    }
  }, [editCell, editTransaction, editValue]);

  const cancelEdit = React.useCallback(() => {
    setEditCell(null);
    setEditValue('');
    setEditError('');
  }, []);

  const topHoldingName = React.useMemo(() => {
    return activePositions[0]?.name || '';
  }, [activePositions]);

  const holdingsRiskInputs = React.useMemo(() => {
    const totalInvested = activePositions.reduce((s, p) => s + p.invested, 0);
    const totalValue = activePositions.reduce((s, p) => s + p.value, 0);
    const count = activePositions.length;
    const maxInvested = activePositions.reduce((m, p) => Math.max(m, p.invested), 0);
    const concentration01 = totalInvested > 0 ? maxInvested / totalInvested : 0;
    const missingCurrentCount = activePositions.reduce((s, p) => s + (p.hasCurrent ? 0 : 1), 0);
    const missingCurrent01 = count > 0 ? missingCurrentCount / count : 0;
    const pnl = totalValue - totalInvested;
    const pnlPct = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;

    return {
      count,
      totalInvested,
      totalValue,
      concentration01,
      missingCurrent01,
      pnl,
      pnlPct,
    };
  }, [activePositions]);

  const hasInvestments = React.useMemo(() => {
    const invested = Number(investAmount) || 0;
    const curTotal = Number(total) || 0;
    return holdingsRiskInputs.count > 0 || invested > 0 || curTotal > 0;
  }, [holdingsRiskInputs.count, investAmount, total]);

  const fillId = React.useId();
  const strokeId = React.useId();

  type RangeDays = 7 | 30 | 90 | 180 | 365 | 1825;
  const [rangeDays, setRangeDays] = React.useState<RangeDays>(30);
  const [viewEndIndex, setViewEndIndex] = React.useState<number | null>(null);
  const [yPan, setYPan] = React.useState(0);
  const [brushRange, setBrushRange] = React.useState<{ startIndex: number; endIndex: number } | null>(null);
  const [lineDrawn, setLineDrawn] = React.useState(false);
  type CompareKey = 'prev_day' | 'prev_week' | 'prev_month' | 'prev_6m' | 'prev_1y' | 'prev_5y';
  const [compareKey, setCompareKey] = React.useState<CompareKey>('prev_week');
  const chartViewportRef = React.useRef<HTMLDivElement | null>(null);
  const dragRef = React.useRef<{
    active: boolean;
    startX: number;
    startY: number;
    startEndIndex: number;
    startYPan: number;
  } | null>(null);

  const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

  const rangeOptions: Array<{ days: RangeDays; label: string }> = [
    { days: 7, label: '7D' },
    { days: 30, label: '30D' },
    { days: 90, label: '3M' },
    { days: 180, label: '6M' },
    { days: 365, label: '1Y' },
    { days: 1825, label: 'ALL' },
  ];

  const compareOptions = React.useMemo<Array<{ key: CompareKey; label: string; days: number }>>(
    () => [
      { key: 'prev_day', label: 'Previous day', days: 1 },
      { key: 'prev_week', label: 'Previous week', days: 7 },
      { key: 'prev_month', label: 'Previous month', days: 30 },
      { key: 'prev_6m', label: 'Previous 6 month', days: 182 },
      { key: 'prev_1y', label: 'Previous 1 Yr', days: 365 },
      { key: 'prev_5y', label: 'Previous 5 Yr', days: 1825 },
    ],
    []
  );

  const findValueAtOrBefore = React.useCallback((arr: Array<{ ts: number; value: number }>, ts: number) => {
    if (!arr.length) return null;
    let lo = 0;
    let hi = arr.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const v = arr[mid]?.ts ?? 0;
      if (v === ts) return arr[mid]?.value ?? null;
      if (v < ts) lo = mid + 1;
      else hi = mid - 1;
    }
    return hi >= 0 ? arr[hi]?.value ?? null : null;
  }, []);

  const fullChartData = React.useMemo(() => {
    // Build a real daily series from investment transactions (active positions), ending today.
    const tx = Array.isArray(transactions) ? transactions : [];
    const activeInvestments = tx.filter((t: any) => {
      if (t?.type !== 'investment') return false;
      const status = typeof t?.status === 'string' ? t.status.trim().toLowerCase() : '';
      const exit = Number(t?.exitPrice);
      const isClosed = status === 'closed' || (t?.exitPrice != null && Number.isFinite(exit) && exit > 0);
      return !isClosed;
    });

    const toDateKey = (raw: any): string | null => {
      if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
      const d = raw ? new Date(raw) : null;
      if (!d || Number.isNaN(d.getTime())) return null;
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const dailyFlows = new Map<string, number>();
    for (const t of activeInvestments) {
      const key = toDateKey(t?.date);
      if (!key) continue;
      const amt = Number(t?.amount);
      if (Number.isFinite(amt) && amt > 0) {
        dailyFlows.set(key, (dailyFlows.get(key) || 0) + amt);
        continue;
      }
      const qty = Number(t?.quantity);
      const entry = Number(t?.entryPrice);
      if (Number.isFinite(qty) && qty > 0 && Number.isFinite(entry) && entry > 0) {
        dailyFlows.set(key, (dailyFlows.get(key) || 0) + qty * entry);
      }
    }

    const days = 1825;
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const start = new Date(end);
    start.setDate(start.getDate() - (days - 1));

    const invested = Number(investAmount) || 0;
    const curTotal = Number(total) || 0;
    const factor = invested > 0 ? curTotal / invested : 1;

    let running = 0;
    const out: Array<{ ts: number; value: number; flow: number }> = [];
    for (let i = 0; i < days; i += 1) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const flow = Number(dailyFlows.get(key) || 0);
      running += flow;
      const v = Math.max(0, Math.round((running * factor) * 100) / 100);
      out.push({ ts: d.getTime(), value: v, flow });
    }

    // Ensure the series ends at the current displayed total.
    if (out.length) out[out.length - 1] = { ...out[out.length - 1], value: Math.max(0, Math.round(curTotal * 100) / 100) };
    return out;
  }, [investAmount, now, total, transactions]);

  const modalData = React.useMemo(() => {
    const clampLocal = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
    const len = fullChartData.length;
    if (!len) return [];

    if (brushRange) {
      const start = clampLocal(brushRange.startIndex, 0, Math.max(0, len - 1));
      const end = clampLocal(brushRange.endIndex, start, Math.max(0, len - 1));
      return fullChartData.slice(start, end + 1);
    }

    const windowSize = Math.min(rangeDays, len);
    const defaultEnd = len - 1;
    const end = viewEndIndex == null ? defaultEnd : clampLocal(viewEndIndex, windowSize - 1, defaultEnd);
    const start = end - windowSize + 1;
    return fullChartData.slice(start, end + 1);
  }, [brushRange, fullChartData, rangeDays, viewEndIndex]);

  React.useEffect(() => {
    setLineDrawn(false);
  }, [modalData]);

  const xTickFormatter = React.useMemo(() => {
    const fmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: '2-digit' });
    return (ts: any) => {
      const d = new Date(Number(ts) || 0);
      return Number.isNaN(d.getTime()) ? '' : fmt.format(d);
    };
  }, []);

  const modalYDomain = React.useMemo(() => {
    const values = modalData.map((p) => Number(p?.value)).filter((n) => Number.isFinite(n));
    if (!values.length) return ['auto', 'auto'] as const;

    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    let min = rawMin;
    let max = rawMax;
    if (min === max) {
      const pad = Math.max(1, Math.abs(min) * 0.06);
      min -= pad;
      max += pad;
    } else {
      const pad = (max - min) * 0.08;
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
  }, [modalData, yPan]);

  const modalStats = React.useMemo(() => {
    const values = modalData
      .map((p: any) => Number(p?.value))
      .filter((n) => Number.isFinite(n)) as number[];

    const first = values[0] ?? 0;
    const last = values[values.length - 1] ?? 0;
    const endTs = Number(modalData[modalData.length - 1]?.ts) || 0;

    const picked = compareOptions.find((o) => o.key === compareKey) || compareOptions[1];
    const refTs = endTs ? endTs - picked.days * 86_400_000 : 0;
    const base = refTs ? findValueAtOrBefore(fullChartData as any, refTs) : null;
    const baseValueRaw = typeof base === 'number' && Number.isFinite(base) ? base : null;

    const invested = Number(investAmount) || 0;
    const curTotal = Number(total) || 0;
    const hasAnyInvestment = holdingsRiskInputs.count > 0 || invested > 0 || curTotal > 0 || last > 0;

    // If we can't find a comparison baseline (e.g. not enough history), show the current P/L
    // vs invested capital instead of incorrectly showing the portfolio value as "P/L".
    const hasCompareBaseline = !!(refTs && baseValueRaw != null && baseValueRaw > 0);

    const baseValue = hasCompareBaseline ? (baseValueRaw as number) : invested > 0 ? invested : first;

    const profit = (() => {
      if (hasCompareBaseline) return last - baseValue;
      if (invested > 0) return curTotal - invested;
      return last - first;
    })();

    const profitPct = (() => {
      // For percentage, fall back to "range start" if invested is unknown.
      const pctBase = hasCompareBaseline ? baseValue : invested > 0 ? invested : first;
      return pctBase > 0 ? (profit / pctBase) * 100 : 0;
    })();
    const growthPct = profitPct;

    // Volatility from capped log returns to avoid huge spikes when values are small.
    const logRets: number[] = [];
    const windowStartTs = hasCompareBaseline ? refTs : Number(modalData[0]?.ts) || 0;
    const windowValues = modalData
      .filter((p: any) => (Number(p?.ts) || 0) >= windowStartTs && (Number(p?.ts) || 0) <= endTs)
      .map((p: any) => Number(p?.value))
      .filter((n) => Number.isFinite(n)) as number[];

    const seriesForVol = windowValues.length >= 3 ? windowValues : values;
    for (let i = 1; i < seriesForVol.length; i += 1) {
      const prev = seriesForVol[i - 1];
      const cur = seriesForVol[i];
      if (!(prev > 0 && cur > 0)) continue;
      if (prev === cur) continue;
      const r = Math.log(cur / prev);
      const capped = Math.max(-0.2, Math.min(0.2, r));
      if (Number.isFinite(capped)) logRets.push(capped);
    }

    const mean = logRets.length ? logRets.reduce((a, b) => a + b, 0) / logRets.length : 0;
    const variance = logRets.length ? logRets.reduce((s, r) => s + (r - mean) ** 2, 0) / logRets.length : 0;
    const volatility = Math.sqrt(Math.max(0, variance)) * 100;

    // Convert raw volatility into a UX-friendly 10..100 score.
    // This is a heuristic score (not market-implied volatility) based on the portfolio time series.
    const volScore = (() => {
      if (!hasAnyInvestment) return 0;
      // Typical capped log-return std dev ~ 0..6 (as %) for calm portfolios; map to 10..100.
      const scaled = 10 + volatility * 14;
      return Math.max(10, Math.min(100, Math.round(scaled)));
    })();

    // Decision-based risk: combine portfolio volatility + concentration + missing price tracking + drawdown.
    const riskScore = (() => {
      if (!hasAnyInvestment) return 0;
      const conc = holdingsRiskInputs.concentration01; // 0..1
      const miss = holdingsRiskInputs.missingCurrent01; // 0..1
      const pnlPctLocal = profitPct;

      const concentrationPenalty = conc <= 0.35 ? 0 : conc <= 0.55 ? 8 : conc <= 0.75 ? 18 : 28;
      const trackingPenalty = miss <= 0.2 ? 0 : miss <= 0.5 ? 6 : 14;
      const lossPenalty = pnlPctLocal >= 0 ? 0 : pnlPctLocal >= -5 ? 6 : pnlPctLocal >= -15 ? 14 : 22;
      const smallPortfolioPenalty = holdingsRiskInputs.count <= 1 ? 10 : holdingsRiskInputs.count <= 2 ? 6 : 0;

      const weighted = volScore * 0.65 + concentrationPenalty + trackingPenalty + lossPenalty + smallPortfolioPenalty;
      return Math.max(10, Math.min(100, Math.round(weighted)));
    })();

    const risk01 = riskScore > 0 ? riskScore / 100 : 0;

    const decisionLabel = (() => {
      // Heuristic "decision" label derived from P/L and risk score.
      if (!(baseValue > 0)) return { tone: 'flat' as const, text: 'Add investments to evaluate' };
      if (profitPct >= 5 && riskScore <= 60) return { tone: 'good' as const, text: 'Good decision' };
      if (profitPct <= -5 && riskScore >= 70) return { tone: 'bad' as const, text: 'Bad decision' };
      if (profitPct >= 0) return { tone: 'flat' as const, text: 'Looks okay' };
      return { tone: 'flat' as const, text: 'Needs review' };
    })();

    return {
      first,
      last,
      growthPct,
      profit,
      profitPct,
      volatility,
      volScore,
      riskScore,
      risk01,
      decisionLabel,
      isUp: growthPct >= 0,
      hasAnyInvestment,
    };
  }, [compareKey, compareOptions, findValueAtOrBefore, fullChartData, holdingsRiskInputs, investAmount, modalData, total]);

  const summaryStats = React.useMemo(() => {
    const invested = Number(investAmount) || 0;
    const curTotal = Number(total) || 0;
    const profit = curTotal - invested;
    const profitPct = invested > 0 ? (profit / invested) * 100 : 0;

    const values = modalData
      .map((p: any) => Number(p?.value))
      .filter((n) => Number.isFinite(n)) as number[];

    // Keep "has data" based on real investment inputs (not synthetic chart points / projections).
    const hasAnyInvestment = holdingsRiskInputs.count > 0 || invested > 0 || curTotal > 0;

    const logRets: number[] = [];
    for (let i = 1; i < values.length; i += 1) {
      const prev = values[i - 1];
      const cur = values[i];
      if (!(prev > 0 && cur > 0)) continue;
      if (prev === cur) continue;
      const r = Math.log(cur / prev);
      const capped = Math.max(-0.2, Math.min(0.2, r));
      if (Number.isFinite(capped)) logRets.push(capped);
    }

    const mean = logRets.length ? logRets.reduce((a, b) => a + b, 0) / logRets.length : 0;
    const variance = logRets.length ? logRets.reduce((s, r) => s + (r - mean) ** 2, 0) / logRets.length : 0;
    const volatility = Math.sqrt(Math.max(0, variance)) * 100;

    const volScore = (() => {
      if (!hasAnyInvestment) return 0;
      const scaled = 10 + volatility * 14;
      return Math.max(10, Math.min(100, Math.round(scaled)));
    })();

    const riskScore = (() => {
      if (!hasAnyInvestment) return 0;
      const conc = holdingsRiskInputs.concentration01;
      const miss = holdingsRiskInputs.missingCurrent01;
      const pnlPctLocal = holdingsRiskInputs.totalInvested > 0 ? holdingsRiskInputs.pnlPct : profitPct;

      const concentrationPenalty = conc <= 0.35 ? 0 : conc <= 0.55 ? 8 : conc <= 0.75 ? 18 : 28;
      const trackingPenalty = miss <= 0.2 ? 0 : miss <= 0.5 ? 6 : 14;
      const lossPenalty = pnlPctLocal >= 0 ? 0 : pnlPctLocal >= -5 ? 6 : pnlPctLocal >= -15 ? 14 : 22;
      const smallPortfolioPenalty = holdingsRiskInputs.count <= 1 ? 10 : holdingsRiskInputs.count <= 2 ? 6 : 0;

      const weighted = volScore * 0.65 + concentrationPenalty + trackingPenalty + lossPenalty + smallPortfolioPenalty;
      return Math.max(10, Math.min(100, Math.round(weighted)));
    })();

    const decisionLabel = (() => {
      if (!hasAnyInvestment) return { tone: 'flat' as const, text: 'Add investments to evaluate' };
      if (profitPct >= 5 && riskScore <= 60) return { tone: 'good' as const, text: 'Good decision' };
      if (profitPct <= -5 && riskScore >= 70) return { tone: 'bad' as const, text: 'Bad decision' };
      if (profitPct >= 0) return { tone: 'flat' as const, text: 'Looks okay' };
      return { tone: 'flat' as const, text: 'Needs review' };
    })();

    const firstPoint = Number(modalData[0]?.value);
    const lastPoint = Number(modalData[modalData.length - 1]?.value);
    const startTs = Number(modalData[0]?.ts) || 0;
    const endTs = Number(modalData[modalData.length - 1]?.ts) || 0;
    const years = startTs > 0 && endTs > startTs ? (endTs - startTs) / 31_557_600_000 : 0; // average year length
    const cagrPct = firstPoint > 0 && years > 0 ? Math.pow(lastPoint / firstPoint, 1 / years) - 1 : 0;

    return {
      profit,
      profitPct,
      cagrPct,
      volScore,
      volatility,
      riskScore,
      decisionLabel,
      hasAnyInvestment,
    };
  }, [holdingsRiskInputs, investAmount, modalData, total]);

  const portfolioHealthText = React.useMemo(() => {
    if (!summaryStats.hasAnyInvestment) return '—';
    const r = Number(summaryStats.riskScore) || 0;
    if (r <= 40) return 'Strong';
    if (r <= 70) return 'Moderate';
    return 'Weak';
  }, [summaryStats.hasAnyInvestment, summaryStats.riskScore]);

  const lastMarkerPoint = React.useMemo(() => {
    const lastPt = modalData[modalData.length - 1];
    if (!lastPt) return null;
    const ts = Number((lastPt as any).ts) || 0;
    const value = Number((lastPt as any).value) || 0;
    if (!ts || !Number.isFinite(value)) return null;
    return { ts, value };
  }, [modalData]);

  const projections = React.useMemo(() => {
    const current = Number(total) || 0;
    const values = modalData
      .map((p: any) => Number(p?.value))
      .filter((n) => Number.isFinite(n) && n > 0) as number[];

    // Estimate an annualized rate from recent log returns; fallback to a heuristic by risk score.
    let annualRate = 0;
    const recent = values.slice(-Math.min(values.length, 60));
    const rets: number[] = [];
    for (let i = 1; i < recent.length; i += 1) {
      const prev = recent[i - 1];
      const cur = recent[i];
      if (!(prev > 0 && cur > 0)) continue;
      const r = Math.log(cur / prev);
      const capped = Math.max(-0.08, Math.min(0.08, r));
      if (Number.isFinite(capped)) rets.push(capped);
    }

    if (rets.length >= 8) {
      const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
      annualRate = Math.exp(mean * 252) - 1; // trading days-ish
    } else {
      const risk = modalStats.riskScore;
      annualRate = risk <= 35 ? 0.08 : risk <= 60 ? 0.10 : risk <= 75 ? 0.12 : 0.14;
    }

    annualRate = Math.max(-0.15, Math.min(0.22, annualRate));

    const years = (y: number) => Math.max(0, y);
    const project = (yrs: number) => {
      const v = current * Math.pow(1 + annualRate, years(yrs));
      return Math.round(v * 100) / 100;
    };

    return {
      annualRate,
      horizons: [
        { k: '3M', years: 0.25, v: project(0.25) },
        { k: '6M', years: 0.5, v: project(0.5) },
        { k: '12M', years: 1, v: project(1) },
        { k: '1Y', years: 1, v: project(1) },
        { k: '3Y', years: 3, v: project(3) },
        { k: '5Y', years: 5, v: project(5) },
        { k: '10Y', years: 10, v: project(10) },
        { k: '20Y', years: 20, v: project(20) },
        { k: '50Y', years: 50, v: project(50) },
      ],
    };
  }, [modalData, modalStats.riskScore, total]);

  const aiSuggestions = React.useMemo(() => {
    const suggestions: string[] = [];

    if (!summaryStats.hasAnyInvestment) {
      return [
        'Add your first investment (with Entry Price + Quantity) to unlock risk, P/L, and portfolio insights.',
        'Tip: also enter Current Price so the dashboard can track unrealized P/L and reduce risk uncertainty.',
      ];
    }

    const computeRiskScore = (args: { volScore: number; concentration01: number; missingCurrent01: number; pnlPct: number; count: number }) => {
      const conc = Math.max(0, Math.min(1, args.concentration01));
      const miss = Math.max(0, Math.min(1, args.missingCurrent01));
      const pnlPctLocal = Number.isFinite(args.pnlPct) ? args.pnlPct : 0;
      const count = Math.max(0, Math.floor(args.count || 0));
      const volScore = Math.max(0, Math.min(100, Math.round(args.volScore || 0)));

      const concentrationPenalty = conc <= 0.35 ? 0 : conc <= 0.55 ? 8 : conc <= 0.75 ? 18 : 28;
      const trackingPenalty = miss <= 0.2 ? 0 : miss <= 0.5 ? 6 : 14;
      const lossPenalty = pnlPctLocal >= 0 ? 0 : pnlPctLocal >= -5 ? 6 : pnlPctLocal >= -15 ? 14 : 22;
      const smallPortfolioPenalty = count <= 1 ? 10 : count <= 2 ? 6 : 0;

      const weighted = volScore * 0.65 + concentrationPenalty + trackingPenalty + lossPenalty + smallPortfolioPenalty;
      return Math.max(0, Math.min(100, Math.round(weighted)));
    };

    const current = computeRiskScore({
      volScore: summaryStats.volScore,
      concentration01: holdingsRiskInputs.concentration01,
      missingCurrent01: holdingsRiskInputs.missingCurrent01,
      pnlPct: holdingsRiskInputs.pnlPct,
      count: holdingsRiskInputs.count,
    });

    const fmtDelta = (next: number) => {
      const d = Math.round((next - current) * 10) / 10;
      return d === 0 ? '≈ no change' : d < 0 ? `${Math.abs(d)} pts lower` : `${d} pts higher`;
    };

    const topName = topHoldingName || 'your largest holding';
    const conc = holdingsRiskInputs.concentration01;
    const count = holdingsRiskInputs.count;
    const miss = holdingsRiskInputs.missingCurrent01;

    // 1) Diversification options (impact estimate)
    if (count < 5) {
      const concAfter1 = conc * (count / Math.max(1, count + 1)); // new holding roughly "average" size
      const next1 = computeRiskScore({
        volScore: summaryStats.volScore,
        concentration01: concAfter1,
        missingCurrent01: miss,
        pnlPct: holdingsRiskInputs.pnlPct,
        count: count + 1,
      });
      suggestions.push(
        `Diversify (add 1 more holding) to reduce concentration from ${(conc * 100).toFixed(0)}% to ~${(concAfter1 * 100).toFixed(0)}% — estimated risk ${current}% → ${next1}% (${fmtDelta(next1)}).`
      );

      if (count < 4) {
        const concAfter2 = conc * (count / Math.max(1, count + 2));
        const next2 = computeRiskScore({
          volScore: summaryStats.volScore,
          concentration01: concAfter2,
          missingCurrent01: miss,
          pnlPct: holdingsRiskInputs.pnlPct,
          count: count + 2,
        });
        suggestions.push(
          `Diversify faster (add 2 holdings over time) to bring concentration to ~${(concAfter2 * 100).toFixed(0)}% — estimated risk ${current}% → ${next2}% (${fmtDelta(next2)}).`
        );
      }
    }

    // 2) Price tracking completeness (impact estimate)
    if (miss > 0) {
      const next = computeRiskScore({
        volScore: summaryStats.volScore,
        concentration01: conc,
        missingCurrent01: 0,
        pnlPct: holdingsRiskInputs.pnlPct,
        count,
      });
      suggestions.push(`Fill missing Current Price values (100% coverage) to reduce tracking uncertainty — estimated risk ${current}% → ${next}% (${fmtDelta(next)}).`);
    }

    // 3) Concentration target (impact estimate)
    if (conc > 0.35) {
      const next = computeRiskScore({
        volScore: summaryStats.volScore,
        concentration01: 0.35,
        missingCurrent01: miss,
        pnlPct: holdingsRiskInputs.pnlPct,
        count,
      });
      suggestions.push(`Rebalance so ${topName} is ≤35% of invested capital — estimated risk ${current}% → ${next}% (${fmtDelta(next)}).`);
    }

    // 4) Review / discipline prompts (non-advisory)
    if (holdingsRiskInputs.pnlPct < 0) suggestions.push('Set a review cadence: update Current Price weekly and re-check concentration after big buys/sells.');
    if (holdingsRiskInputs.pnlPct < -5) suggestions.push('Portfolio is down >5% vs invested: document thesis + exit rules for each holding (time horizon, invalidation, stop level).');

    // 5) General “next steps” (no stock picks)
    suggestions.push('If you plan to buy more, prefer adding a new position or topping up smaller positions first to keep concentration falling over time.');

    const note =
      'Note: these insights are heuristic estimates based on your entered transactions/prices (not market data) and are not investment advice.';

    const unique = Array.from(new Set(suggestions));
    const actionable = unique.filter((s) => !s.startsWith('Note:'));
    return [...actionable.slice(0, 5), note];
  }, [
    holdingsRiskInputs.concentration01,
    holdingsRiskInputs.count,
    holdingsRiskInputs.missingCurrent01,
    holdingsRiskInputs.pnlPct,
    summaryStats.hasAnyInvestment,
    summaryStats.volScore,
    topHoldingName,
  ]);

  const predictionData = React.useMemo(() => {
    if (!showPrediction) return null;

    const pts = modalData
      .map((p: any) => ({
        ts: Number(p?.ts) || 0,
        value: Number(p?.value) || 0,
        flow: Number(p?.flow) || 0, // deposits/buys/sells captured by our own data pipeline
      }))
      .filter((p) => p.ts > 0)
      .sort((a, b) => a.ts - b.ts);

    if (pts.length < 6) return null;

    // Flow-adjusted daily return:
    // r_t = (V_t - V_{t-1} - Flow_t) / max(1, V_{t-1})
    // This avoids treating purchases/deposits as "growth".
    const returns: number[] = [];
    const flowsByDow: number[][] = [[], [], [], [], [], [], []]; // 0..6
    for (let i = 1; i < pts.length; i += 1) {
      const prev = pts[i - 1];
      const cur = pts[i];
      const base = Math.max(1, Number(prev.value) || 0);
      const flow = Number.isFinite(cur.flow) ? cur.flow : 0;
      const r = (cur.value - prev.value - flow) / base;
      if (Number.isFinite(r)) returns.push(Math.max(-0.25, Math.min(0.25, r)));

      // Learn typical user "buy/sell/deposit" behavior by weekday (simple average).
      const dow = new Date(cur.ts).getDay();
      if (dow >= 0 && dow <= 6 && Number.isFinite(flow) && flow !== 0) flowsByDow[dow].push(flow);
    }

    if (returns.length < 4) return null;

    // EWMA mean return for a smoother, less jumpy forecast.
    const alpha = 0.28;
    let ewma = returns[0];
    for (let i = 1; i < returns.length; i += 1) ewma = alpha * returns[i] + (1 - alpha) * ewma;

    // Damp aggressive forecasts; we don't have market prices here, so keep it conservative.
    const mu = Math.max(-0.03, Math.min(0.03, ewma));

    const avg = (xs: number[]) => (xs.length ? xs.reduce((s, n) => s + n, 0) / xs.length : 0);
    const expectedFlowForTs = (ts: number) => {
      const dow = new Date(ts).getDay();
      const samples = flowsByDow[dow] || [];
      // Clamp extreme recurring flows so the forecast doesn't explode from one big deposit.
      return Math.max(-1_000_000, Math.min(1_000_000, avg(samples)));
    };

    const last = pts[pts.length - 1];
    const out: Array<{ ts: number; value: number }> = [];
    let prevValue = Number(last.value) || 0;
    for (let i = 1; i <= 7; i += 1) {
      const ts = last.ts + i * 86_400_000;
      const expectedFlow = expectedFlowForTs(ts);
      const next = Math.max(0, prevValue * (1 + mu) + expectedFlow);
      const rounded = Math.round(next * 100) / 100;
      out.push({ ts, value: rounded });
      prevValue = rounded;
    }

    return [{ ts: last.ts, value: Number(last.value) || 0 }, ...out];
  }, [modalData, showPrediction]);

  const composedData = React.useMemo(() => {
    let prevReal: number | null = null;
    const base: Array<{ ts: number; value: number | null; pred: number | null; flow: number; pct: number | null }> = modalData.map((p: any) => {
      const v = Number(p.value) || 0;
      const pct = prevReal != null && prevReal !== 0 ? ((v - prevReal) / prevReal) * 100 : null;
      prevReal = v;
      return {
        ts: Number(p.ts) || 0,
        value: v,
        pred: null,
        flow: Number(p.flow) || 0,
        pct,
      };
    });

    if (predictionData && predictionData.length) {
      const lastPred = predictionData[0];
      const lastIdx = base.length - 1;
      if (lastIdx >= 0 && lastPred && Number(base[lastIdx]?.ts) === Number(lastPred.ts)) {
        base[lastIdx] = { ...base[lastIdx], pred: Number(lastPred.value) || 0 };
      }
    }

    if (predictionData && predictionData.length > 1) {
      for (let i = 1; i < predictionData.length; i += 1) {
        const p = predictionData[i];
        base.push({ ts: Number(p.ts) || 0, value: null, pred: Number(p.value) || 0, flow: 0, pct: null });
      }
    }

    return base;
  }, [modalData, predictionData]);

  React.useEffect(() => {
    if (!chartOpen) return undefined;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (infoOpen) setInfoOpen(false);
        else setChartOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [chartOpen, infoOpen]);

  React.useEffect(() => {
    if (!chartOpen) return;
    setViewEndIndex(null);
    setYPan(0);
    setBrushRange(null);
    setInfoOpen(false);
  }, [chartOpen, rangeDays]);

  React.useEffect(() => {
    if (!chartOpen) return;
    if (!modalStats.hasAnyInvestment) setShowPrediction(false);
  }, [chartOpen, modalStats.hasAnyInvestment]);

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

    const y0 = Number((modalYDomain as any)?.[0]);
    const y1 = Number((modalYDomain as any)?.[1]);
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
    <div className="kpi-card relative group hover:shadow-lg transition-all duration-300 ring-1 ring-black/[0.04] bg-white flex flex-col">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-2.5">
          <div
            className={`h-9 w-9 rounded-xl grid place-items-center ring-1 transition-all duration-300 ${
              phase === 'loading' ? 'bg-slate-100 text-slate-500 ring-black/5' : 'bg-orange-50 text-orange-600 ring-orange-500/10 group-hover:bg-orange-100'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/></svg>
          </div>
          <div>
            <div className="text-[12px] font-bold text-slate-600 tracking-tight uppercase">{title}</div>
            <div className="mt-0.5 text-[10px] text-slate-400 font-semibold">Current value</div>
          </div>
        </div>
        <button
          type="button"
          className="shrink-0 h-9 w-9 rounded-xl grid place-items-center bg-slate-50 text-slate-700 ring-1 ring-slate-200/80 shadow-sm hover:bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          aria-label="Open investment chart"
          onClick={() => setChartOpen(true)}
        >
          <MoreIcon />
        </button>
      </div>
      <div className="mt-2">
        <div className="text-[24px] sm:text-[26px] leading-[30px] sm:leading-[32px] font-semibold tracking-[-0.03em] text-slate-950 tabular-nums">{formatFromBase(invV)}</div>
        <div className="mt-1 flex items-center gap-1.5 text-[12px]">
          <span className="text-slate-500 tracking-tight">Invested {formatFromBase(Number(investAmount) || 0)}</span>
          {hasInvestments ? (
            <span className={['inline-flex items-center rounded-sm px-1 py-0.5 text-[10px] font-bold tabular-nums', (Number(total) - Number(investAmount)) >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'].join(' ')}>
              {(Number(total) - Number(investAmount)) >= 0 ? '+' : ''}{((Number(total) - Number(investAmount)) / Math.max(1, Number(investAmount)) * 100).toFixed(1)}%
            </span>
          ) : null}
        </div>
      </div>

{hasInvestments && series && series.length > 1 ? (
         <div className="mt-auto pt-2">
           <div className="w-full max-w-full overflow-hidden">
             <InvestmentSparkline data={series as number[]} height={36} />
           </div>
           <div className="mt-1 flex items-center justify-between text-[10px] font-bold">
             <span className="text-slate-500">{activePositions.length} holding{activePositions.length === 1 ? '' : 's'}</span>
             <span onClick={() => setChartOpen(true)} className="cursor-pointer text-orange-600 hover:text-orange-700 transition-colors">Trend & details →</span>
           </div>
         </div>
      ) : phase === 'loading' ? (
        <div className="flex-1 grid place-items-center">
          <span className="kpi-loader" aria-label="Loading" />
        </div>
      ) : null}

      {chartOpen
        ? createPortal(
            <div className="fixed inset-0 z-[10000]">
              <div aria-hidden="true" className="fixed inset-0 bg-slate-950/55 backdrop-blur-md" onClick={() => setChartOpen(false)} />
              <div className="relative h-full w-full flex items-start sm:items-center justify-center p-4 sm:p-6">
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-label="Investment trend"
                  className="relative w-[min(1100px,96vw)] h-[min(780px,92dvh)] overflow-hidden rounded-3xl bg-white/75 dark:bg-slate-950/70 backdrop-blur-xl shadow-[0_30px_80px_-40px_rgba(15,23,42,0.65)] ring-1 ring-black/10 dark:ring-white/10 flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-5 py-4 border-b border-black/[0.06] dark:border-white/10 flex items-start justify-between gap-4 bg-white/55 dark:bg-slate-950/40 backdrop-blur">
                    <div>
                      <div className="font-display text-lg font-extrabold text-slate-900 dark:text-white">Investment trend</div>
                      <div className="mt-1 text-[12px] text-slate-500 dark:text-slate-300">Interactive timeline with verified insights</div>
                      <div className="mt-1 text-[12px] text-slate-500 dark:text-slate-300">
                        Status: {modalStats.decisionLabel.text}
                        {topHoldingName ? ` - ${topHoldingName}` : ''}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {modalStats.hasAnyInvestment ? (
                          <span
                            className={[
                              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold ring-1 shadow-sm',
                              modalStats.isUp
                                ? 'bg-emerald-50 text-emerald-700 ring-emerald-200/70 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/20'
                                : 'bg-rose-50 text-rose-700 ring-rose-200/70 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-500/20',
                            ].join(' ')}
                          >
                            {modalStats.isUp ? '▲' : '▼'} {Math.abs(modalStats.growthPct).toFixed(1)}%
                          </span>
                        ) : null}
                        <span className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-extrabold ring-1 ring-black/5 dark:ring-white/10 bg-white/70 dark:bg-slate-900/40 text-slate-700 dark:text-slate-200">
                          <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-300">vs</span>
                          <select
                            value={compareKey}
                            onChange={(e) => setCompareKey(e.target.value as any)}
                            className="bg-transparent outline-none border-0 ring-0 p-0 m-0 text-[11px] font-extrabold text-slate-700 dark:text-slate-200"
                            aria-label="Compare percentage to"
                          >
                            {compareOptions.map((o) => (
                              <option key={o.key} value={o.key}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </span>
                        {modalStats.hasAnyInvestment ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold ring-1 ring-black/5 dark:ring-white/10 bg-white/70 dark:bg-slate-900/40 text-slate-700 dark:text-slate-200">
                            P/L: {formatFromBase(modalStats.profit)}
                          </span>
                        ) : null}
                        {modalStats.hasAnyInvestment ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold ring-1 ring-black/5 dark:ring-white/10 bg-white/70 dark:bg-slate-900/40 text-slate-700 dark:text-slate-200">
                            Volatility score: {modalStats.volScore}
                          </span>
                        ) : null}
                        <span
                          className={[
                            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold ring-1 shadow-sm',
                            'hidden',
                            modalStats.decisionLabel.tone === 'good'
                              ? 'bg-emerald-50 text-emerald-700 ring-emerald-200/70 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/20'
                              : modalStats.decisionLabel.tone === 'bad'
                                ? 'bg-rose-50 text-rose-700 ring-rose-200/70 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-500/20'
                                : 'bg-slate-50 text-slate-700 ring-slate-200/70 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10',
                          ].join(' ')}
                        >
                          {modalStats.decisionLabel.text}
                          {topHoldingName ? ` • ${topHoldingName}` : ''}
                        </span>
                        <button
                          type="button"
                          onClick={() => setInfoOpen(true)}
                          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold ring-1 ring-black/5 dark:ring-white/10 bg-white/70 dark:bg-slate-900/40 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-white/10 transition-colors"
                        >
                          View info
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setChartOpen(false)}
                      className="h-9 w-9 rounded-xl grid place-items-center text-slate-500 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-white/10 transition-colors"
                      aria-label="Close"
                    >
                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
                      </svg>
                    </button>
                  </div>

                  <div className="px-3 sm:px-5 py-4 flex-1 min-h-0 flex flex-col">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                      {(modalStats.hasAnyInvestment
                        ? ([
                            {
                              k: 'Portfolio growth',
                              v: `${modalStats.growthPct >= 0 ? '+' : '-'}${Math.abs(modalStats.growthPct).toFixed(1)}%`,
                              tone: modalStats.growthPct >= 0 ? 'emerald' : 'rose',
                            },
                            {
                              k: 'Profit / Loss',
                              v: formatFromBase(modalStats.profit),
                              tone: modalStats.profit >= 0 ? 'emerald' : 'rose',
                            },
                            {
                              k: 'Volatility score',
                              v: String(modalStats.volScore),
                              tone: 'slate',
                            },
                            {
                              k: 'Risk meter',
                              v: `${modalStats.riskScore}%`,
                              tone: modalStats.risk01 > 0.66 ? 'rose' : modalStats.risk01 > 0.4 ? 'amber' : 'emerald',
                              meter: modalStats.risk01,
                            },
                          ] as const)
                        : ([
                            { k: 'Profit / Loss', v: formatFromBase(0), tone: 'slate' },
                            { k: 'Status', v: 'Add investments to evaluate', tone: 'slate' },
                          ] as const)
                      ).map((c) => (
                        <div
                          key={c.k}
                          className="rounded-2xl bg-white/70 dark:bg-slate-900/35 ring-1 ring-black/[0.06] dark:ring-white/10 shadow-[0_14px_34px_-28px_rgba(15,23,42,0.55)] px-3 py-2.5"
                        >
                          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-300">{c.k}</div>
                          <div className="mt-1 text-[13px] font-extrabold text-slate-900 dark:text-white tabular-nums">{c.v}</div>
                          {'meter' in c ? (
                            <div className="mt-2 h-1.5 rounded-full bg-slate-200/60 dark:bg-white/10 overflow-hidden">
                              <div
                                className={[
                                  'h-full rounded-full',
                                  c.tone === 'emerald'
                                    ? 'bg-gradient-to-r from-emerald-400/40 to-emerald-500/80'
                                    : c.tone === 'amber'
                                      ? 'bg-gradient-to-r from-amber-400/40 to-amber-500/80'
                                      : 'bg-gradient-to-r from-rose-400/40 to-rose-500/80',
                                ].join(' ')}
                                style={{ width: `${Math.round((c as any).meter * 100)}%` }}
                              />
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">Range</div>
                        <div className="flex items-center gap-1 rounded-2xl bg-white/70 dark:bg-slate-900/35 ring-1 ring-black/[0.06] dark:ring-white/10 p-1 shadow-[0_14px_34px_-28px_rgba(15,23,42,0.55)]">
                          {rangeOptions.map((o) => {
                            const activeTab = o.days === rangeDays && !brushRange;
                            return (
                              <button
                                key={o.days}
                                type="button"
                                onClick={() => {
                                  setBrushRange(null);
                                  setViewEndIndex(null);
                                  setRangeDays(o.days);
                                }}
                                className={[
                                  'h-8 px-3 rounded-xl text-[11px] font-extrabold transition-all',
                                  activeTab
                                    ? 'bg-white dark:bg-slate-950 text-slate-950 dark:text-white ring-1 ring-black/[0.06] dark:ring-white/10 shadow-sm'
                                    : 'text-slate-500 dark:text-slate-300 hover:text-slate-700 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/10',
                                ].join(' ')}
                                aria-pressed={activeTab}
                              >
                                {o.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {modalStats.hasAnyInvestment ? (
                          <button
                            type="button"
                            onClick={() => setShowPrediction((v) => !v)}
                            className="h-9 px-3 rounded-2xl text-[12px] font-extrabold bg-white/70 dark:bg-slate-900/35 text-slate-700 dark:text-slate-200 ring-1 ring-black/[0.06] dark:ring-white/10 hover:bg-white dark:hover:bg-white/10 shadow-sm transition-colors"
                          >
                            {showPrediction ? 'Forecast: On' : 'Forecast: Off'}
                          </button>
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
                        <div className="relative h-full w-full">
                          {!modalStats.hasAnyInvestment ? (
                            <div className="absolute inset-0 grid place-items-center">
                              <div className="text-[14px] font-extrabold text-slate-400">No Data</div>
                            </div>
                          ) : (
                            <>
                              <div className="absolute inset-0 bg-white/35 backdrop-blur-[2px]" />
                              <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={composedData as any} margin={{ top: 26, right: 28, bottom: 24, left: 0 }}>
                                  <defs>
                                    <linearGradient id={`${strokeId}-modal`} x1="0" y1="0" x2="1" y2="0">
                                      <stop offset="0%" stopColor="#A78BFA" stopOpacity={0.65} />
                                      <stop offset="45%" stopColor="#7C3AED" stopOpacity={1} />
                                      <stop offset="100%" stopColor="#4F46E5" stopOpacity={0.9} />
                                    </linearGradient>
                                    <linearGradient id={`${fillId}-modal`} x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.14} />
                                      <stop offset="55%" stopColor="#7C3AED" stopOpacity={0.05} />
                                      <stop offset="100%" stopColor="#7C3AED" stopOpacity={0.0} />
                                    </linearGradient>
                                  </defs>

                                  <CartesianGrid vertical={false} stroke="rgba(15,23,42,0.05)" />
                                  <XAxis
                                    dataKey="ts"
                                    type="number"
                                    domain={['dataMin', 'dataMax']}
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }}
                                    dy={10}
                                    tickFormatter={xTickFormatter as any}
                                    tickMargin={12}
                                    interval="preserveStartEnd"
                                    minTickGap={18}
                                  />
                                  <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={yAxisTickCompact as any}
                                    width={96}
                                    tickMargin={0}
                                    domain={modalYDomain as any}
                                    tickCount={6}
                                  />

                                  <Tooltip content={<ModalTooltip formatValue={formatFromBase} />} cursor={{ stroke: 'rgba(124,58,237,0.18)', strokeWidth: 1 }} />

                                  {/*
                                    Intentionally omit the invested-capital reference line in this premium view to keep the chart clean.
                                    It was rendering as a dotted horizontal line and visually competing with the data series.
                                  */}

                                  {showPrediction ? (
                                    <Line
                                      type="monotone"
                                      dataKey="pred"
                                      stroke="rgba(99,102,241,0.55)"
                                      strokeDasharray="3 7"
                                      strokeWidth={2.2}
                                      dot={false}
                                      activeDot={false as any}
                                      connectNulls
                                      isAnimationActive={false}
                                    />
                                  ) : null}

                                  <Line
                                    type="monotone"
                                    dataKey="value"
                                    stroke={`url(#${strokeId}-modal)`}
                                    strokeWidth={2.6}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    dot={false}
                                    connectNulls
                                    isAnimationActive
                                    animationDuration={950}
                                    animationEasing="ease-out"
                                    activeDot={{ r: 4.6, fill: '#7C3AED', stroke: '#ffffff', strokeWidth: 2 }}
                                  />
                                </ComposedChart>
                              </ResponsiveContainer>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {infoOpen ? (
                    <div className="absolute inset-0 z-50">
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 bg-slate-950/30 dark:bg-slate-950/55 backdrop-blur-sm"
                        onClick={() => setInfoOpen(false)}
                      />
                      <div className="absolute inset-0 p-0 flex items-start sm:items-center justify-center">
                        <div
                          role="dialog"
                          aria-modal="true"
                          aria-label="Investment summary"
                          className="w-[min(1600px,100vw)] max-h-[min(860px,96dvh)] overflow-hidden rounded-none sm:rounded-[32px] bg-white shadow-[0_34px_100px_-55px_rgba(15,23,42,0.55)] ring-1 ring-black/10 flex flex-col"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="sticky top-0 z-30 px-6 py-5 border-b border-black/[0.06] flex items-start justify-between gap-4 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
                            <div>
                              <div className="font-display text-[22px] sm:text-[26px] leading-tight font-extrabold text-slate-900">Portfolio Summary</div>
                              <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-slate-600">
                                {summaryStats.hasAnyInvestment ? (
                                  <>
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 font-extrabold text-emerald-700 ring-1 ring-emerald-200/70">
                                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                      Healthy Growth
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700 ring-1 ring-black/5">
                                      ↑ +4.2% this month
                                    </span>
                                  </>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 font-extrabold text-slate-700 ring-1 ring-black/5">
                                    Add investments to start tracking
                                  </span>
                                )}
                              </div>
                              <div className="mt-2 text-[12px] text-slate-500">
                                {activePositions.length} active holding{activePositions.length === 1 ? '' : 's'}
                                {' • '}
                                Status: {summaryStats.decisionLabel.text}
                                {summaryStats.hasAnyInvestment ? (
                                  <>
                                    {' • '}Risk {summaryStats.riskScore}%{' • '}Volatility {summaryStats.volScore}
                                  </>
                                ) : null}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setInfoOpen(false)}
                              className="h-10 w-10 rounded-2xl grid place-items-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors ring-1 ring-black/5 shadow-sm"
                              aria-label="Close"
                            >
                              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
                              </svg>
                            </button>
                          </div>

                          <div className="overflow-auto bg-white">
                            <div className="sticky top-0 z-20 px-6 pt-5 pb-4 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 border-b border-black/[0.06]">
                              <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                                <div className="group rounded-3xl bg-white/95 ring-1 ring-black/[0.06] shadow-[0_18px_45px_-40px_rgba(15,23,42,0.55)] px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_28px_64px_-50px_rgba(15,23,42,0.60)]">
                                  <div className="mt-2 text-[12px] font-semibold text-slate-500">Total Value</div>
                                  <div className="mt-1 text-[18px] sm:text-[20px] font-extrabold text-slate-900 tabular-nums">{formatFromBase(Number(total) || 0)}</div>
                                </div>
                                <div className="group rounded-3xl bg-white/95 ring-1 ring-black/[0.06] shadow-[0_18px_45px_-40px_rgba(15,23,42,0.55)] px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_28px_64px_-50px_rgba(15,23,42,0.60)]">
                                  <div className="h-1.5 w-full rounded-full bg-gradient-to-r from-sky-500/55 to-violet-500/55" />
                                  <div className="mt-2 text-[12px] font-semibold text-slate-500">Invested</div>
                                  <div className="mt-1 text-[18px] sm:text-[20px] font-extrabold text-slate-900 tabular-nums">{formatFromBase(Number(investAmount) || 0)}</div>
                                </div>
                                <div className="group rounded-3xl bg-white/95 ring-1 ring-black/[0.06] shadow-[0_18px_45px_-40px_rgba(15,23,42,0.55)] px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_28px_64px_-50px_rgba(15,23,42,0.60)]">
                                  <div className="h-1.5 w-full rounded-full bg-gradient-to-r from-emerald-500/55 to-teal-500/55" />
                                  <div className="mt-2 text-[12px] font-semibold text-slate-500">Profit / Loss</div>
                                  <div className={['mt-1 text-[18px] sm:text-[20px] font-extrabold tabular-nums', summaryStats.profit >= 0 ? 'text-emerald-700' : 'text-rose-700'].join(' ')}>
                                    {summaryStats.profit >= 0 ? '+' : '-'}{formatFromBase(Math.abs(summaryStats.profit))}
                                  </div>
                                  <div className={['mt-1 text-sm tabular-nums font-semibold', summaryStats.profitPct >= 0 ? 'text-emerald-600' : 'text-rose-600'].join(' ')}>
                                    {summaryStats.profitPct >= 0 ? '+' : '-'}{Math.abs(summaryStats.profitPct).toFixed(1)}%
                                  </div>
                                </div>
                                {summaryStats.hasAnyInvestment ? (
                                  <div className="group rounded-3xl bg-white/95 ring-1 ring-black/[0.06] shadow-[0_18px_45px_-40px_rgba(15,23,42,0.55)] px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_28px_64px_-50px_rgba(15,23,42,0.60)]">
                                    <div className="h-1.5 w-full rounded-full bg-gradient-to-r from-indigo-500/45 to-violet-500/45" />
                                    <div className="mt-2 text-[12px] font-semibold text-slate-500">CAGR (est.)</div>
                                    <div className="mt-1 text-[18px] sm:text-[20px] font-extrabold text-slate-900 tabular-nums">{(summaryStats.cagrPct * 100).toFixed(1)}%</div>
                                  </div>
                                ) : null}
                                {summaryStats.hasAnyInvestment ? (
                                  <div className="group rounded-3xl bg-white/95 ring-1 ring-black/[0.06] shadow-[0_18px_45px_-40px_rgba(15,23,42,0.55)] px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_28px_64px_-50px_rgba(15,23,42,0.60)]">
                                    <div className="h-1.5 w-full rounded-full bg-gradient-to-r from-amber-500/55 to-orange-500/55" />
                                    <div className="mt-2 text-[12px] font-semibold text-slate-500">Risk Score</div>
                                    <div className="mt-1 text-[18px] sm:text-[20px] font-extrabold text-slate-900 tabular-nums">{summaryStats.riskScore}%</div>
                                  </div>
                                ) : null}
                                {summaryStats.hasAnyInvestment ? (
                                  <div className="group rounded-3xl bg-white/95 ring-1 ring-black/[0.06] shadow-[0_18px_45px_-40px_rgba(15,23,42,0.55)] px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_28px_64px_-50px_rgba(15,23,42,0.60)]">
                                    <div className="h-1.5 w-full rounded-full bg-gradient-to-r from-emerald-500/45 to-indigo-500/45" />
                                    <div className="mt-2 text-[12px] font-semibold text-slate-500">Health</div>
                                    <div className="mt-1 text-[18px] sm:text-[20px] font-extrabold text-slate-900">{portfolioHealthText}</div>
                                  </div>
                                ) : null}
                              </div>
                            </div>

                            <div className="px-6 pb-6 pt-5">
                              <div className="rounded-3xl bg-white ring-1 ring-black/[0.06] shadow-[0_22px_55px_-48px_rgba(15,23,42,0.55)] overflow-hidden">
                              <div className="sticky top-0 z-10 grid grid-cols-7 gap-2 px-4 py-2 text-[11px] font-extrabold text-slate-500 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75 border-b border-black/[0.06]">
                                <div className="col-span-2">Holding</div>
                                <div className="text-right">Entry</div>
                                <div className="text-right">Current</div>
                                <div className="text-right hidden sm:block">Exit</div>
                                <div className="text-right">Value</div>
                                <div className="text-right">P/L</div>
                              </div>
                              <div className="divide-y divide-black/[0.06]">
                                {activePositions.length ? (
                                  activePositions.map((p) => (
                                    <div key={p.id} className="grid grid-cols-7 gap-2 px-4 py-3 text-[12px] text-slate-800 items-center transition-colors hover:bg-slate-50/80">
                                      <div className="col-span-2 min-w-0">
                                        <div className="font-extrabold truncate">{p.name}</div>
                                        <div className="mt-0.5 text-[11px] text-slate-500 tabular-nums">
                                          {p.quantity != null ? `${p.quantity} units` : '—'}
                                        </div>
                                      </div>
                                      <div className="text-right tabular-nums">
                                        {editCell?.id === p.id && editCell.field === 'entryPrice' ? (
                                          <div className="flex items-center justify-end">
                                            <input
                                              value={editValue}
                                              onChange={(e) => setEditValue(e.target.value)}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') commitEdit();
                                                if (e.key === 'Escape') cancelEdit();
                                              }}
                                              onBlur={() => commitEdit()}
                                              autoFocus
                                              inputMode="decimal"
                                              className="h-9 w-[120px] rounded-2xl bg-white px-3 text-right text-[12px] font-extrabold text-slate-900 ring-1 ring-black/10 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                                              aria-label={`Edit entry price for ${p.name}`}
                                            />
                                          </div>
                                        ) : (
                                          <div
                                            className="inline-flex items-center justify-end w-full rounded-xl px-2 py-1 cursor-text hover:bg-slate-100/70 transition-colors"
                                            onDoubleClick={() => startEdit(p, 'entryPrice')}
                                            title="Double-click to edit"
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') startEdit(p, 'entryPrice');
                                            }}
                                            aria-label={`Entry price for ${p.name}. Double-click to edit.`}
                                          >
                                            <span className="select-none">{p.entryPrice != null ? formatFromBase(p.entryPrice) : '-'}</span>
                                          </div>
                                        )}
                                        {editCell?.id === p.id && editCell.field === 'entryPrice' && editError ? (
                                          <div className="mt-1 text-[11px] font-semibold text-rose-700">{editError}</div>
                                        ) : null}
                                      </div>
                                      <div className="text-right tabular-nums">
                                        {editCell?.id === p.id && editCell.field === 'currentPrice' ? (
                                          <div className="flex items-center justify-end">
                                            <input
                                              value={editValue}
                                              onChange={(e) => setEditValue(e.target.value)}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') commitEdit();
                                                if (e.key === 'Escape') cancelEdit();
                                              }}
                                              onBlur={() => commitEdit()}
                                              autoFocus
                                              inputMode="decimal"
                                              className="h-9 w-[120px] rounded-2xl bg-white px-3 text-right text-[12px] font-extrabold text-slate-900 ring-1 ring-black/10 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                                              aria-label={`Edit current price for ${p.name}`}
                                            />
                                          </div>
                                        ) : (
                                          <div
                                            className="inline-flex items-center justify-end w-full rounded-xl px-2 py-1 cursor-text hover:bg-slate-100/70 transition-colors"
                                            onDoubleClick={() => startEdit(p, 'currentPrice')}
                                            title="Double-click to edit"
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') startEdit(p, 'currentPrice');
                                            }}
                                            aria-label={`Current price for ${p.name}. Double-click to edit.`}
                                          >
                                            <span className="select-none">{p.currentPrice != null ? formatFromBase(p.currentPrice) : '-'}</span>
                                          </div>
                                        )}
                                        {editCell?.id === p.id && editCell.field === 'currentPrice' && editError ? (
                                          <div className="mt-1 text-[11px] font-semibold text-rose-700">{editError}</div>
                                        ) : null}
                                      </div>
                                      <div className="text-right tabular-nums hidden sm:block">
                                        {editCell?.id === p.id && editCell.field === 'exitPrice' ? (
                                          <div className="flex items-center justify-end">
                                            <input
                                              value={editValue}
                                              onChange={(e) => setEditValue(e.target.value)}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') commitEdit();
                                                if (e.key === 'Escape') cancelEdit();
                                              }}
                                              onBlur={() => commitEdit()}
                                              autoFocus
                                              inputMode="decimal"
                                              className="h-9 w-[120px] rounded-2xl bg-white px-3 text-right text-[12px] font-extrabold text-slate-900 ring-1 ring-black/10 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                                              aria-label={`Edit exit price for ${p.name}`}
                                            />
                                          </div>
                                        ) : (
                                          <div
                                            className="inline-flex items-center justify-end w-full rounded-xl px-2 py-1 cursor-text hover:bg-slate-100/70 transition-colors"
                                            onDoubleClick={() => startEdit(p, 'exitPrice')}
                                            title="Double-click to edit"
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') startEdit(p, 'exitPrice');
                                            }}
                                            aria-label={`Exit price for ${p.name}. Double-click to edit.`}
                                          >
                                            <span className="select-none">{p.exitPrice != null ? formatFromBase(p.exitPrice) : '-'}</span>
                                          </div>
                                        )}
                                        {editCell?.id === p.id && editCell.field === 'exitPrice' && editError ? (
                                          <div className="mt-1 text-[11px] font-semibold text-rose-700">{editError}</div>
                                        ) : null}
                                      </div>
                                      <div className="text-right tabular-nums font-semibold">{formatFromBase(p.value)}</div>
                                      <div className={['text-right tabular-nums font-extrabold', p.pnl >= 0 ? 'text-emerald-700' : 'text-rose-700'].join(' ')}>
                                        {p.pnl >= 0 ? '+' : '-'}{formatFromBase(Math.abs(p.pnl))}
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="px-4 py-6 text-[12px] text-slate-500">No active investments found.</div>
                                )}
                              </div>
                              </div>

                            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
                              <div className="rounded-3xl bg-white ring-1 ring-black/[0.06] shadow-[0_22px_55px_-48px_rgba(15,23,42,0.55)] px-5 py-4">
                                <div className="text-[13px] font-extrabold text-slate-900">AI insights</div>
                                <ul className="mt-3 space-y-2 text-[12.5px] text-slate-600">
                                  {aiSuggestions.map((s) => (
                                    <li key={s} className="flex items-start gap-2">
                                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-violet-400 shrink-0" />
                                      <span>{s}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <div className="rounded-3xl bg-white ring-1 ring-black/[0.06] shadow-[0_22px_55px_-48px_rgba(15,23,42,0.55)] px-5 py-4">
                                <div className="text-[13px] font-extrabold text-slate-900">Expected value (projection)</div>
                                <div className="mt-1.5 text-[12px] text-slate-500">
                                  Uses your recent trend + risk score (not market data). Annual rate: {(projections.annualRate * 100).toFixed(1)}%
                                </div>
                                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                                  {projections.horizons.filter((h) => ['3M', '6M', '1Y', '3Y', '5Y'].includes(h.k)).map((h) => (
                                      <div
                                        key={h.k}
                                        className="rounded-2xl bg-white ring-1 ring-black/[0.06] px-3 py-2.5 shadow-[0_18px_45px_-42px_rgba(15,23,42,0.45)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_26px_60px_-48px_rgba(15,23,42,0.55)]"
                                      >
                                        <div className="text-[10px] font-extrabold text-slate-500">{h.k}</div>
                                        <div className="mt-1 text-[13px] font-extrabold text-slate-900 tabular-nums">{formatFromBase(h.v)}</div>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                       </div>
                     </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}


