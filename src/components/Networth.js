import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { useExpenseContext } from '../contexts/ExpenseContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useAmountsVisibility } from '../contexts/AmountsVisibilityContext';
import { useBodyScrollLock } from '../utils/scrollLock';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const pad2 = (n) => String(n).padStart(2, '0');
const monthKeyFromDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
const monthLabelFromKey = (key) => {
  const [y, m] = key.split('-').map((v) => parseInt(v, 10));
  return new Date(y, (m || 1) - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
};

const monthsBetween = (startKey, endKey) => {
  if (!/^\d{4}-\d{2}$/.test(startKey) || !/^\d{4}-\d{2}$/.test(endKey)) return [];
  const [sy, sm] = startKey.split('-').map((v) => parseInt(v, 10));
  const [ey, em] = endKey.split('-').map((v) => parseInt(v, 10));
  const start = new Date(sy, sm - 1, 1);
  const end = new Date(ey, em - 1, 1);
  if (start > end) return [];

  const out = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    out.push(monthKeyFromDate(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return out;
};

const pct = (n) => `${(Number(n) || 0).toFixed(1)}%`;
const isValidMonthKey = (key) => typeof key === 'string' && /^\d{4}-\d{2}$/.test(key);
const addMonthsToKey = (key, delta) => {
  if (!isValidMonthKey(key)) return key;
  const [y, m] = key.split('-').map((v) => parseInt(v, 10));
  const d = new Date(y, (m || 1) - 1, 1);
  d.setMonth(d.getMonth() + (Number(delta) || 0));
  return monthKeyFromDate(d);
};

const RANGE_PRESETS = [
  { id: '1m', label: '1M', months: 1 },
  { id: '3m', label: '3M', months: 3 },
  { id: '6m', label: '6M', months: 6 },
  { id: '1y', label: '1Y', months: 12 },
  { id: '3y', label: '3Y', months: 36 },
  { id: '5y', label: '5Y', months: 60 },
  { id: '10y', label: '10Y', months: 120 },
  { id: '15y', label: '15Y', months: 180 },
  { id: 'all', label: 'All', months: null },
  { id: 'custom', label: 'Custom', months: null },
];

const IconDot = ({ tone = 'neutral' }) => {
  const cls =
    tone === 'good'
      ? 'bg-emerald-500'
      : tone === 'warn'
        ? 'bg-amber-500'
        : tone === 'bad'
          ? 'bg-rose-500'
          : 'bg-slate-400';
  return <span aria-hidden="true" className={`inline-block h-2 w-2 rounded-full ${cls}`} />;
};

const Modal = ({ open, title, children, onClose }) => {
  useBodyScrollLock(open);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white/90 dark:bg-slate-900/80 backdrop-blur rounded-3xl shadow-2xl ring-1 ring-black/10 dark:ring-white/10 overflow-hidden">
        <div className="p-5 border-b border-black/5 dark:border-white/10 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-300">Insight</div>
            <div className="font-display text-lg font-extrabold text-slate-900 dark:text-white truncate">{title}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-10 rounded-2xl grid place-items-center ring-1 ring-black/5 dark:ring-white/[0.12] bg-white/60 dark:bg-slate-950/25 hover:bg-white/80 dark:hover:bg-slate-950/35 transition-colors"
            aria-label="Close"
            title="Close"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-700 dark:text-slate-200" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

const InfoIconButton = ({ onClick, label = 'Details' }) => (
  <button
    type="button"
    onClick={onClick}
    className="h-9 w-9 rounded-2xl grid place-items-center ring-1 ring-black/5 dark:ring-white/[0.12] bg-white/60 dark:bg-slate-950/25 hover:bg-white/80 dark:hover:bg-slate-950/35 transition-colors"
    aria-label={label}
    title={label}
  >
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-700 dark:text-slate-200" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 12h1v3h1" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a10 10 0 100 20 10 10 0 000-20z" />
    </svg>
  </button>
);

const KpiCard = ({ title, value, sub, tone = 'neutral', icon }) => (
  <div className="rounded-2xl ring-1 ring-black/5 dark:ring-white/[0.12] bg-white/70 dark:bg-slate-900/50 backdrop-blur p-4 shadow-soft">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
          <IconDot tone={tone} />
          <span className="truncate">{title}</span>
        </div>
        <div className="mt-1 font-display text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white tabular-nums">
          {value}
        </div>
        {sub ? <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">{sub}</div> : null}
      </div>
      {icon ? (
        <div className="shrink-0 h-9 w-9 rounded-2xl grid place-items-center bg-slate-950/5 dark:bg-white/10 ring-1 ring-black/5 dark:ring-white/[0.12]">
          {icon}
        </div>
      ) : null}
    </div>
  </div>
);

const Networth = () => {
  const {
    getMonthlyData,
    networthSnapshots,
    upsertNetworthSnapshot,
  } = useExpenseContext();

  const { formatFromBase } = useCurrency();

  const monthly = getMonthlyData();
  const monthlyByKey = useMemo(() => {
    const map = new Map();
    monthly.forEach((m) => {
      // `getMonthlyData()` already sorts by timestamp, but we want a stable key here.
      const dt = new Date(m.ts);
      map.set(monthKeyFromDate(dt), { income: m.income, expense: m.expense, label: m.label, ts: m.ts });
    });
    return map;
  }, [monthly]);

  const snapshotsByMonth = useMemo(() => {
    const map = new Map();
    networthSnapshots.forEach((s) => map.set(s.month, s));
    return map;
  }, [networthSnapshots]);

  const inferredRange = useMemo(() => {
    const keys = [];
    for (const k of monthlyByKey.keys()) keys.push(k);
    for (const s of networthSnapshots) keys.push(s.month);
    keys.sort();
    if (keys.length === 0) {
      const now = new Date();
      const end = monthKeyFromDate(now);
      const startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      const start = monthKeyFromDate(startDate);
      return { start, end };
    }
    return { start: keys[0], end: keys[keys.length - 1] };
  }, [monthlyByKey, networthSnapshots]);

  const [rangePreset, setRangePreset] = useState('1y'); // 1m | 3m | 6m | 1y | 3y | 5y | 10y | 15y | all | custom
  const [customStart, setCustomStart] = useState(inferredRange.start);
  const [customEnd, setCustomEnd] = useState(inferredRange.end);
  const [projectionEnabled, setProjectionEnabled] = useState(true);
  const [viewEndKey, setViewEndKey] = useState(inferredRange.end);
  const [chartMode, setChartMode] = useState('line'); // line | hist
  const [isPlaying, setIsPlaying] = useState(false);
  const [playIndex, setPlayIndex] = useState(null);
  const [openInsight, setOpenInsight] = useState(null);
  const { amountsHidden, setAmountsHidden, maskedText } = useAmountsVisibility();
  const importInputRef = useRef(null);
  const [importStatus, setImportStatus] = useState(null);

  useEffect(() => {
    setViewEndKey(inferredRange.end);
  }, [inferredRange.end]);


  const normalizedRangePreset = rangePreset === '12m' ? '1y' : rangePreset;
  const presetMonths = useMemo(() => {
    const found = RANGE_PRESETS.find((p) => p.id === normalizedRangePreset) || RANGE_PRESETS.find((p) => p.id === '1y');
    return found?.months ?? null;
  }, [normalizedRangePreset]);

  const canWindowNav = normalizedRangePreset !== 'all' && normalizedRangePreset !== 'custom' && presetMonths !== null;

  const { startKey, endKey } = useMemo(() => {
    if (normalizedRangePreset === 'all') return { startKey: inferredRange.start, endKey: inferredRange.end };
    if (normalizedRangePreset === 'custom') return { startKey: customStart, endKey: customEnd };

    const end = viewEndKey;
    const months = presetMonths || 12;
    const startCandidate = addMonthsToKey(end, -(months - 1));
    const start = startCandidate < inferredRange.start ? inferredRange.start : startCandidate;
    return { startKey: start, endKey: end };
  }, [customEnd, customStart, inferredRange.end, inferredRange.start, normalizedRangePreset, presetMonths, viewEndKey]);

  const monthKeys = useMemo(() => monthsBetween(startKey, endKey), [startKey, endKey]);

  useEffect(() => {
    if (!isPlaying) return;
    setPlayIndex(0);
    const id = window.setInterval(() => {
      setPlayIndex((cur) => {
        const next = typeof cur === 'number' ? cur + 1 : 0;
        if (next >= monthKeys.length - 1) {
          window.clearInterval(id);
          setIsPlaying(false);
          return monthKeys.length - 1;
        }
        return next;
      });
    }, 450);
    return () => window.clearInterval(id);
   
  }, [isPlaying, monthKeys.length]);

  const series = useMemo(() => {
    let lastKnownNetWorth = null;

    return monthKeys.map((k) => {
      const snap = snapshotsByMonth.get(k) || null;
      const monthData = monthlyByKey.get(k) || { income: 0, expense: 0, label: monthLabelFromKey(k) };
      const savings = Number(monthData.income) - Number(monthData.expense);

      const snapNetWorth = snap ? (Number(snap.assets) + Number(snap.investments) - Number(snap.liabilities)) : null;

      if (snapNetWorth !== null) lastKnownNetWorth = snapNetWorth;
      const projectedNetWorth =
        projectionEnabled && lastKnownNetWorth !== null
          ? (lastKnownNetWorth = lastKnownNetWorth + savings)
          : null;

      return {
        key: k,
        label: monthData.label || monthLabelFromKey(k),
        income: monthData.income,
        expense: monthData.expense,
        savings,
        snap,
        snapNetWorth,
        projectedNetWorth,
      };
    });
  }, [monthKeys, monthlyByKey, projectionEnabled, snapshotsByMonth]);

  const cashflowCumulativeByMonth = useMemo(() => {
    const keys = monthsBetween(inferredRange.start, inferredRange.end);
    let acc = 0;
    const map = new Map();
    keys.forEach((k) => {
      const m = monthlyByKey.get(k);
      const income = Number(m?.income) || 0;
      const expense = Number(m?.expense) || 0;
      const savings = income - expense;
      acc += savings;
      map.set(k, acc);
    });
    return map;
  }, [inferredRange.end, inferredRange.start, monthlyByKey]);

  const monthSavingsByKey = useMemo(() => {
    const keys = monthsBetween(inferredRange.start, inferredRange.end);
    const map = new Map();
    keys.forEach((k) => {
      const m = monthlyByKey.get(k);
      const income = Number(m?.income) || 0;
      const expense = Number(m?.expense) || 0;
      map.set(k, income - expense);
    });
    return map;
  }, [inferredRange.end, inferredRange.start, monthlyByKey]);

  const momoCashflow = useMemo(() => {
    const curKey = inferredRange.end;
    const prevKey = addMonthsToKey(curKey, -1);

    const cur = Number(cashflowCumulativeByMonth.get(curKey));
    const curSavings = Number(monthSavingsByKey.get(curKey));
    const prevDirect = Number(cashflowCumulativeByMonth.get(prevKey));

    const hasCur = Number.isFinite(cur);
    const hasPrev = Number.isFinite(prevDirect);
    const canEstimatePrev = hasCur && Number.isFinite(curSavings);
    const prev = hasPrev ? prevDirect : canEstimatePrev ? cur - curSavings : null;

    if (!hasCur) return { curKey, prevKey, cur: null, prev, delta: null, pctChange: null, estimatedPrev: !hasPrev && canEstimatePrev };
    if (!Number.isFinite(Number(prev))) return { curKey, prevKey, cur, prev: null, delta: null, pctChange: null, estimatedPrev: false };

    const delta = cur - Number(prev);
    const pctChange = Number(prev) === 0 ? null : (delta / Math.abs(Number(prev))) * 100;
    return { curKey, prevKey, cur, prev: Number(prev), delta, pctChange, estimatedPrev: !hasPrev && canEstimatePrev };
  }, [cashflowCumulativeByMonth, inferredRange.end, monthSavingsByKey]);

  const expectedNextMonthCashflow = useMemo(() => {
    const curKey = inferredRange.end;
    const nextKey = addMonthsToKey(curKey, 1);
    const cur = Number(cashflowCumulativeByMonth.get(curKey));
    if (!Number.isFinite(cur)) return null;

    // Expectation uses recent average savings (last 3 available months, including current month data so far).
    const recentKeys = [curKey, addMonthsToKey(curKey, -1), addMonthsToKey(curKey, -2), addMonthsToKey(curKey, -3), addMonthsToKey(curKey, -4)];
    const savingsVals = recentKeys
      .map((k) => monthSavingsByKey.get(k))
      .map((n) => Number(n))
      .filter((n) => Number.isFinite(n));

    const picked = savingsVals.slice(0, 3);
    const avgSavings = picked.length ? picked.reduce((a, b) => a + b, 0) / picked.length : 0;
    const expected = cur + avgSavings;
    return { curKey, nextKey, cur, avgSavings, expected, windowMonths: picked.length };
  }, [cashflowCumulativeByMonth, inferredRange.end, monthSavingsByKey]);

  const chartSeries = useMemo(() => {
    if (!isPlaying) return series;
    if (typeof playIndex !== 'number' || playIndex < 0) return series.slice(0, 1);
    return series.slice(0, Math.min(series.length, playIndex + 1));
  }, [isPlaying, playIndex, series]);

  const latest = useMemo(() => {
    const last = series[series.length - 1];
    if (!last) return null;
    const lastSnap = [...networthSnapshots].sort((a, b) => a.month.localeCompare(b.month)).slice(-1)[0] || null;
    const netWorth = lastSnap
      ? Number(lastSnap.assets) + Number(lastSnap.investments) - Number(lastSnap.liabilities)
      : (last.projectedNetWorth ?? 0);
    return { netWorth, lastSnap };
  }, [networthSnapshots, series]);

  const netWorthChart = useMemo(() => {
    const labels = chartSeries.map((s) => s.label);
    const isSnapshotPoint = chartSeries.map((s) => Number.isFinite(Number(s.snapNetWorth)));
    const values = chartSeries.map((s, idx) =>
      isSnapshotPoint[idx] ? Number(s.snapNetWorth) : projectionEnabled ? Number(s.projectedNetWorth) : null
    );

    return {
      labels,
      datasets: [
        {
          label: 'Net Worth',
          data: values,
          borderColor: 'rgba(99, 102, 241, 1)',
          backgroundColor: (ctx) => {
            const chart = ctx?.chart;
            const area = chart?.chartArea;
            const c = chart?.ctx;
            if (!area || !c) return 'rgba(99, 102, 241, 0.16)';
            const g = c.createLinearGradient(0, area.top, 0, area.bottom);
            g.addColorStop(0, 'rgba(99, 102, 241, 0.28)');
            g.addColorStop(1, 'rgba(99, 102, 241, 0.00)');
            return g;
          },
          pointRadius: (ctx) => (isSnapshotPoint?.[ctx.dataIndex] ? 4 : 0),
          pointHoverRadius: (ctx) => (isSnapshotPoint?.[ctx.dataIndex] ? 6 : 3),
          pointBackgroundColor: 'rgba(99, 102, 241, 1)',
          pointBorderColor: 'rgba(255,255,255,0.9)',
          pointBorderWidth: 2,
          spanGaps: true,
          fill: true,
          tension: 0.35,
          segment: { borderDash: (ctx) => (isSnapshotPoint?.[ctx.p1DataIndex] ? undefined : [7, 6]) },
        },
      ],
    };
  }, [chartSeries, projectionEnabled]);

  const netWorthHistogram = useMemo(() => {
    const labels = chartSeries.map((s) => s.label);
    const isSnapshotPoint = chartSeries.map((s) => Number.isFinite(Number(s.snapNetWorth)));
    const values = chartSeries.map((s, idx) =>
      isSnapshotPoint[idx] ? Number(s.snapNetWorth) : projectionEnabled ? Number(s.projectedNetWorth) : null
    );

    return {
      labels,
      datasets: [
        {
          label: 'Net Worth',
          data: values,
          borderRadius: 10,
          backgroundColor: values.map((_v, idx) =>
            isSnapshotPoint[idx] ? 'rgba(99, 102, 241, 0.75)' : 'rgba(16, 185, 129, 0.55)'
          ),
          borderColor: values.map((_v, idx) =>
            isSnapshotPoint[idx] ? 'rgba(99, 102, 241, 1)' : 'rgba(16, 185, 129, 0.9)'
          ),
          borderWidth: 1,
        },
      ],
    };
  }, [chartSeries, projectionEnabled]);

  const axisTick = useMemo(
    () => (v) => formatFromBase(v, 'en-US').replace('.00', ''),
    [formatFromBase]
  );

  const displayMoney = useCallback(
    (v) => (amountsHidden ? maskedText : axisTick(v)),
    [amountsHidden, axisTick, maskedText]
  );

  const incomeDrought = useMemo(() => {
    // Count consecutive months (from latest) with zero recorded income.
    let streak = 0;
    let cursor = inferredRange.end;
    for (let i = 0; i < 60; i += 1) {
      const m = monthlyByKey.get(cursor);
      if (!m) break;
      const income = Number(m.income) || 0;
      if (income > 0) break;
      streak += 1;
      cursor = addMonthsToKey(cursor, -1);
    }
    return streak;
  }, [inferredRange.end, monthlyByKey]);

  const commonOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(2, 6, 23, 0.92)',
        titleColor: 'rgba(226, 232, 240, 0.95)',
        bodyColor: 'rgba(226, 232, 240, 0.95)',
        borderColor: 'rgba(148, 163, 184, 0.20)',
        borderWidth: 1,
        padding: 10,
        callbacks: {
          title: (items) => (items && items[0] ? String(items[0].label || '') : ''),
          label: (ctx) => {
            const raw = ctx.raw || 0;
            const value = amountsHidden ? maskedText : formatFromBase(raw, 'en-US');
            const idx = typeof ctx.dataIndex === 'number' ? ctx.dataIndex : -1;
            const row = idx >= 0 ? series[idx] : null;
            const tag = row?.snap ? 'Snapshot' : projectionEnabled ? 'Projected' : 'No snapshot';
            return `${tag}: ${value}`;
          },
        },
      },
    },
    scales: {
      x: { grid: { display: false } },
      y: {
        beginAtZero: false,
        ticks: { callback: (v) => displayMoney(v) },
        grid: { color: 'rgba(0, 0, 0, 0.06)' },
      },
    },
    interaction: { mode: 'index', intersect: false },
  }), [amountsHidden, displayMoney, formatFromBase, maskedText, projectionEnabled, series]);

  const histogramOptions = useMemo(() => {
    const base = commonOptions;
    return {
      ...base,
      scales: {
        ...base.scales,
        y: { ...base.scales.y, beginAtZero: false },
      },
    };
  }, [commonOptions]);

  const handleSaveSnapshot = (month, patch) => {
    const existing = snapshotsByMonth.get(month);
    const next = {
      id: existing?.id,
      month,
      assets: patch.assets ?? existing?.assets ?? 0,
      liabilities: patch.liabilities ?? existing?.liabilities ?? 0,
      investments: patch.investments ?? existing?.investments ?? 0,
      notes: patch.notes ?? existing?.notes ?? '',
    };
    upsertNetworthSnapshot(next);
  };

  const [editMonth, setEditMonth] = useState(null);
  const [editForm, setEditForm] = useState({ assets: '', liabilities: '', investments: '', notes: '' });

  const openEdit = (month) => {
    const snap = snapshotsByMonth.get(month);
    setEditMonth(month);
    setEditForm({
      assets: snap ? String(snap.assets) : '',
      liabilities: snap ? String(snap.liabilities) : '',
      investments: snap ? String(snap.investments) : '',
      notes: snap?.notes || '',
    });
  };

  const saveEdit = () => {
    if (!editMonth) return;
    handleSaveSnapshot(editMonth, {
      assets: parseFloat(editForm.assets || '0'),
      liabilities: parseFloat(editForm.liabilities || '0'),
      investments: parseFloat(editForm.investments || '0'),
      notes: editForm.notes || '',
    });
    setEditMonth(null);
  };

  const hasAnySnapshots = networthSnapshots.length > 0;
  const displayPct = useCallback((n) => (amountsHidden ? maskedText : pct(n)), [amountsHidden, maskedText]);

  const snapshotSorted = useMemo(() => {
    const snaps = Array.isArray(networthSnapshots) ? [...networthSnapshots] : [];
    return snaps
      .filter((s) => isValidMonthKey(s?.month))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [networthSnapshots]);

  const latestSnapshot = snapshotSorted[snapshotSorted.length - 1] || null;
  const prevSnapshot = snapshotSorted[snapshotSorted.length - 2] || null;

  const latestBreakdown = useMemo(() => {
    const a = latestSnapshot ? Number(latestSnapshot.assets) : 0;
    const i = latestSnapshot ? Number(latestSnapshot.investments) : 0;
    const l = latestSnapshot ? Number(latestSnapshot.liabilities) : 0;
    const assets = Number.isFinite(a) ? a : 0;
    const investments = Number.isFinite(i) ? i : 0;
    const liabilities = Number.isFinite(l) ? l : 0;
    const netWorth = assets + investments - liabilities;
    return { assets, investments, liabilities, netWorth };
  }, [latestSnapshot]);

  const netWorthDelta = useMemo(() => {
    if (prevSnapshot && latestSnapshot) {
      const prev = Number(prevSnapshot.assets) + Number(prevSnapshot.investments) - Number(prevSnapshot.liabilities);
      const cur = latestBreakdown.netWorth;
      const delta = cur - (Number.isFinite(prev) ? prev : 0);
      const deltaPct = prev === 0 ? null : (delta / Math.abs(prev)) * 100;
      return { delta, deltaPct, label: `${monthLabelFromKey(prevSnapshot.month)} → ${monthLabelFromKey(latestSnapshot.month)}` };
    }

    // Fallback: use last two computed values in the rendered range.
    const picked = [];
    for (let idx = series.length - 1; idx >= 0; idx -= 1) {
      const row = series[idx];
      const v = row?.snapNetWorth ?? row?.projectedNetWorth;
      const n = Number(v);
      if (!Number.isFinite(n)) continue;
      picked.push({ key: row.key, label: row.label, value: n });
      if (picked.length === 2) break;
    }
    const cur = picked[0];
    const prev = picked[1];
    if (!cur || !prev) return { delta: null, deltaPct: null, label: null };
    const delta = cur.value - prev.value;
    const deltaPct = prev.value === 0 ? null : (delta / Math.abs(prev.value)) * 100;
    return { delta, deltaPct, label: `${prev.label} → ${cur.label}` };
  }, [latestBreakdown.netWorth, latestSnapshot, prevSnapshot, series]);

  const runway = useMemo(() => {
    // Prefer liquid-like value (assets + investments). If no snapshot, use max(netWorth, 0) as a rough proxy.
    const liquid = latestSnapshot ? latestBreakdown.assets + latestBreakdown.investments : Math.max(latest?.netWorth || 0, 0);
    const recent = series.slice(-6);
    const expenses = recent.map((r) => Number(r.expense)).filter((n) => Number.isFinite(n));
    const avgExpense = expenses.length ? expenses.reduce((a, b) => a + b, 0) / expenses.length : 0;
    if (avgExpense <= 0) return { months: null, avgExpense: 0, liquid };
    return { months: liquid / avgExpense, avgExpense, liquid };
  }, [latest, latestBreakdown.assets, latestBreakdown.investments, latestSnapshot, series]);

  const ratios = useMemo(() => {
    const denom = Math.max(1, latestBreakdown.assets + latestBreakdown.investments);
    const debtRatio = latestSnapshot ? latestBreakdown.liabilities / denom : null;
    const investShare = latestSnapshot ? latestBreakdown.investments / denom : null;
    return { debtRatio, investShare };
  }, [latestBreakdown, latestSnapshot]);

  const savingsMeta = useMemo(() => {
    const rows = series.filter((r) => Number.isFinite(Number(r.savings)));
    if (rows.length === 0) return null;

    let best = rows[0];
    let worst = rows[0];
    let maxExpense = rows[0];
    let sumIncome = 0;
    let sumSavings = 0;
    let sumSavingsSq = 0;
    rows.forEach((r) => {
      if (r.savings > best.savings) best = r;
      if (r.savings < worst.savings) worst = r;
      if (r.expense > maxExpense.expense) maxExpense = r;
      sumIncome += Number(r.income) || 0;
      sumSavings += Number(r.savings) || 0;
      sumSavingsSq += (Number(r.savings) || 0) * (Number(r.savings) || 0);
    });
    const meanSavings = sumSavings / rows.length;
    const variance = sumSavingsSq / rows.length - meanSavings * meanSavings;
    const stdSavings = Math.sqrt(Math.max(0, variance));
    const savingsRate = sumIncome > 0 ? (sumSavings / sumIncome) * 100 : null;

    return {
      best,
      worst,
      maxExpense,
      meanSavings,
      stdSavings,
      savingsRate,
    };
  }, [series]);

  const exportSnapshots = useCallback(() => {
    const payload = {
      kind: 'finvision.networth.snapshots',
      exportedAt: new Date().toISOString(),
      snapshots: snapshotSorted.map((s) => ({
        month: s.month,
        assets: Number(s.assets) || 0,
        liabilities: Number(s.liabilities) || 0,
        investments: Number(s.investments) || 0,
        notes: s.notes || '',
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finvision-networth-snapshots-${inferredRange.end}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [inferredRange.end, snapshotSorted]);

  const onImportFile = useCallback(
    async (e) => {
      const file = e?.target?.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const rawList = Array.isArray(parsed?.snapshots) ? parsed.snapshots : Array.isArray(parsed) ? parsed : [];
        const normalized = rawList
          .map((s) => {
            const month = s?.month;
            if (!isValidMonthKey(month)) return null;
            return {
              month,
              assets: Number(s.assets) || 0,
              liabilities: Number(s.liabilities) || 0,
              investments: Number(s.investments) || 0,
              notes: typeof s.notes === 'string' ? s.notes : '',
            };
          })
          .filter(Boolean);

        if (normalized.length === 0) {
          setImportStatus({ tone: 'warn', msg: 'No valid snapshots found in file.' });
          return;
        }
        normalized.forEach((snap) => upsertNetworthSnapshot(snap));
        setImportStatus({ tone: 'good', msg: `Imported ${normalized.length} snapshot(s).` });
      } catch {
        setImportStatus({ tone: 'bad', msg: 'Import failed: invalid JSON file.' });
      } finally {
        if (importInputRef.current) importInputRef.current.value = '';
        setTimeout(() => setImportStatus(null), 4500);
      }
    },
    [upsertNetworthSnapshot]
  );

  const insights = useMemo(() => {
    const items = [];

    const detailBlock = (title, lines, footnote) => ({ title, lines: Array.isArray(lines) ? lines.filter(Boolean) : [], footnote: footnote || null });

    items.push({
      tone: latest?.netWorth >= 0 ? 'good' : 'warn',
      k: 'Current net worth',
      v: displayMoney(latest?.netWorth || 0),
      s: latestSnapshot ? `Snapshot: ${monthLabelFromKey(latestSnapshot.month)}` : 'No snapshot yet (cashflow projection only)',
      detail: (() => {
        if (latestSnapshot) {
          const a = Number(latestSnapshot.assets) || 0;
          const i = Number(latestSnapshot.investments) || 0;
          const l = Number(latestSnapshot.liabilities) || 0;
          const net = a + i - l;
          return detailBlock('Current net worth', [
            `Month: ${monthLabelFromKey(latestSnapshot.month)} (${latestSnapshot.month})`,
            `Assets = ${displayMoney(a)}`,
            `Investments = ${displayMoney(i)}`,
            `Liabilities = ${displayMoney(l)}`,
            `Net worth = Assets + Investments − Liabilities = ${displayMoney(a)} + ${displayMoney(i)} − ${displayMoney(l)} = ${displayMoney(net)}`,
          ]);
        }
        const curKey = inferredRange.end;
        const cum = Number(cashflowCumulativeByMonth.get(curKey));
        const savings = Number(monthSavingsByKey.get(curKey));
        return detailBlock('Current net worth (cashflow)', [
          `Current month: ${monthLabelFromKey(curKey)} (${curKey})`,
          `Net worth (cashflow) is cumulative savings from transactions.`,
          Number.isFinite(cum) ? `Cumulative savings (to date) = ${displayMoney(cum)}` : 'Cumulative savings: not enough data',
          Number.isFinite(savings)
            ? `This month savings = Income − Expenses = ${displayMoney(savings)}`
            : 'This month savings: not available',
        ]);
      })(),
    });

    if (momoCashflow) {
      const prevLabel = monthLabelFromKey(momoCashflow.prevKey);
      const curLabel = monthLabelFromKey(momoCashflow.curKey);
      items.push({
        tone: momoCashflow.delta === null ? 'neutral' : momoCashflow.delta >= 0 ? 'good' : 'bad',
        k: 'Prev vs current month (cashflow)',
        v:
          momoCashflow.delta === null
            ? '\u2014'
            : `${displayMoney(momoCashflow.delta)}${momoCashflow.pctChange === null ? '' : ` (${displayPct(momoCashflow.pctChange)})`}`,
        s:
          momoCashflow.prev === null || momoCashflow.cur === null
            ? `Need both months of transaction history (${momoCashflow.prevKey} and ${momoCashflow.curKey}).`
            : `${prevLabel} ${displayMoney(momoCashflow.prev)} → ${curLabel} ${displayMoney(momoCashflow.cur)}${
                momoCashflow.estimatedPrev ? ' (prev estimated)' : ''
              }`,
        detail: (() => {
          const lines = [
            `Prev month: ${prevLabel} (${momoCashflow.prevKey})`,
            `Current month: ${curLabel} (${momoCashflow.curKey})`,
          ];
          if (momoCashflow.prev === null || momoCashflow.cur === null) {
            lines.push('Not enough transaction history to compute both months.');
            return detailBlock('Prev vs current month (cashflow)', lines);
          }
          lines.push(`Prev net worth (cashflow) = ${displayMoney(momoCashflow.prev)}${momoCashflow.estimatedPrev ? ' (estimated)' : ''}`);
          lines.push(`Current net worth (cashflow) = ${displayMoney(momoCashflow.cur)}`);
          if (momoCashflow.estimatedPrev) {
            const curSavings = Number(monthSavingsByKey.get(momoCashflow.curKey));
            const curIncome = Number(monthlyByKey.get(momoCashflow.curKey)?.income) || 0;
            const curExpense = Number(monthlyByKey.get(momoCashflow.curKey)?.expense) || 0;
            lines.push(`Estimate prev = current − currentMonthSavings`);
            lines.push(
              `Current month savings = Income − Expenses = ${displayMoney(curIncome)} − ${displayMoney(curExpense)} = ${displayMoney(curSavings)}`
            );
            lines.push(`Prev (estimated) = ${displayMoney(momoCashflow.cur)} − ${displayMoney(curSavings)} = ${displayMoney(momoCashflow.prev)}`);
          }
          if (momoCashflow.delta !== null) {
            lines.push(`Δ = Current − Prev = ${displayMoney(momoCashflow.cur)} − ${displayMoney(momoCashflow.prev)} = ${displayMoney(momoCashflow.delta)}`);
          }
          if (momoCashflow.pctChange !== null) {
            lines.push(
              `% change = (Δ ÷ |Prev|) × 100 = (${displayMoney(momoCashflow.delta)} ÷ |${displayMoney(momoCashflow.prev)}|) × 100 = ${displayPct(momoCashflow.pctChange)}`
            );
          } else {
            lines.push('% change: not available (Prev is 0).');
          }
          return detailBlock('Prev vs current month (cashflow)', lines);
        })(),
      });
    }

    if (expectedNextMonthCashflow) {
      items.push({
        tone: expectedNextMonthCashflow.avgSavings >= 0 ? 'good' : 'warn',
        k: 'Expected next month net worth',
        v: displayMoney(expectedNextMonthCashflow.expected),
        s: `Based on avg savings ${displayMoney(expectedNextMonthCashflow.avgSavings)} (last ${expectedNextMonthCashflow.windowMonths} mo) → ${monthLabelFromKey(expectedNextMonthCashflow.nextKey)}.`,
        detail: (() => {
          const curLabel = monthLabelFromKey(expectedNextMonthCashflow.curKey);
          const nextLabel = monthLabelFromKey(expectedNextMonthCashflow.nextKey);
          const usedKeys = [
            expectedNextMonthCashflow.curKey,
            addMonthsToKey(expectedNextMonthCashflow.curKey, -1),
            addMonthsToKey(expectedNextMonthCashflow.curKey, -2),
          ].slice(0, expectedNextMonthCashflow.windowMonths);
          const perMonth = usedKeys
            .map((k) => {
              const inc = Number(monthlyByKey.get(k)?.income) || 0;
              const exp = Number(monthlyByKey.get(k)?.expense) || 0;
              const sav = inc - exp;
              return `${monthLabelFromKey(k)} savings = ${displayMoney(inc)} − ${displayMoney(exp)} = ${displayMoney(sav)}`;
            })
            .filter(Boolean);
          return detailBlock('Expected next month net worth', [
            `Current month: ${curLabel} (${expectedNextMonthCashflow.curKey})`,
            `Next month: ${nextLabel} (${expectedNextMonthCashflow.nextKey})`,
            `Current net worth basis (cashflow) = ${displayMoney(expectedNextMonthCashflow.cur)}`,
            ...perMonth,
            `Avg savings = ${displayMoney(expectedNextMonthCashflow.avgSavings)} (from ${expectedNextMonthCashflow.windowMonths} month(s))`,
            `Expected next month net worth = Current + AvgSavings = ${displayMoney(expectedNextMonthCashflow.cur)} + ${displayMoney(expectedNextMonthCashflow.avgSavings)} = ${displayMoney(
              expectedNextMonthCashflow.expected
            )}`,
          ]);
        })(),
      });
    }

    if (incomeDrought >= 2) {
      const depletionMonths = runway.months !== null ? Math.max(0, Math.ceil(runway.months)) : null;
      const depletionKey = depletionMonths !== null ? addMonthsToKey(inferredRange.end, depletionMonths) : null;
      const droughtDetail = (() => {
        const months = [];
        let cursor = inferredRange.end;
        for (let i = 0; i < Math.min(12, incomeDrought); i += 1) {
          const inc = Number(monthlyByKey.get(cursor)?.income) || 0;
          months.push(`${monthLabelFromKey(cursor)} income = ${displayMoney(inc)}`);
          cursor = addMonthsToKey(cursor, -1);
        }
        return detailBlock('Income drought', [
          `Consecutive months with income = 0: ${amountsHidden ? maskedText : String(incomeDrought)}`,
          ...months,
          depletionKey && depletionMonths !== null
            ? `Runway estimate (if income stays 0): ~${amountsHidden ? maskedText : depletionMonths} mo (to ~${monthLabelFromKey(depletionKey)}).`
            : null,
        ]);
      })();
      items.push({
        tone: incomeDrought >= 4 ? 'bad' : 'warn',
        k: 'Income drought',
        v: `${amountsHidden ? maskedText : String(incomeDrought)} mo`,
        s:
          depletionKey && depletionMonths !== null
            ? `At avg spend ${displayMoney(runway.avgExpense)}/mo, runway ~${amountsHidden ? maskedText : depletionMonths} mo (to ~${monthLabelFromKey(depletionKey)}).`
            : 'No income recorded recently. Add income transactions to improve forecasting.',
        detail: droughtDetail,
      });
    }

    if (netWorthDelta.delta !== null) {
      const deltaDetail = (() => {
        const curKey = inferredRange.end;
        const prevKey = addMonthsToKey(curKey, -1);
        const cur = Number(cashflowCumulativeByMonth.get(curKey));
        const prev = Number(cashflowCumulativeByMonth.get(prevKey));
        const has = Number.isFinite(cur) && Number.isFinite(prev);
        const lines = [`Range: ${netWorthDelta.label || `${monthLabelFromKey(prevKey)} → ${monthLabelFromKey(curKey)}`}`];

        if (has) {
          const delta = cur - prev;
          const p = prev === 0 ? null : (delta / Math.abs(prev)) * 100;
          lines.push(`Prev (cashflow) = ${displayMoney(prev)}`);
          lines.push(`Current (cashflow) = ${displayMoney(cur)}`);
          lines.push(`Δ = Current − Prev = ${displayMoney(cur)} − ${displayMoney(prev)} = ${displayMoney(delta)}`);
          lines.push(p === null ? '% change: not available (Prev is 0).' : `% change = (Δ ÷ |Prev|) × 100 = ${displayPct(p)}`);
          return detailBlock('Change (cashflow)', lines);
        }

        if (prevSnapshot && latestSnapshot) {
          const prevNet = (Number(prevSnapshot.assets) || 0) + (Number(prevSnapshot.investments) || 0) - (Number(prevSnapshot.liabilities) || 0);
          const curNet = (Number(latestSnapshot.assets) || 0) + (Number(latestSnapshot.investments) || 0) - (Number(latestSnapshot.liabilities) || 0);
          const delta = curNet - prevNet;
          const p = prevNet === 0 ? null : (delta / Math.abs(prevNet)) * 100;
          lines.push(`Prev snapshot (${monthLabelFromKey(prevSnapshot.month)}): ${displayMoney(prevNet)}`);
          lines.push(`Current snapshot (${monthLabelFromKey(latestSnapshot.month)}): ${displayMoney(curNet)}`);
          lines.push(`Δ = ${displayMoney(delta)}`);
          lines.push(p === null ? '% change: not available (Prev is 0).' : `% change = ${displayPct(p)}`);
          return detailBlock('Change (snapshot)', lines);
        }

        lines.push('Not enough data to show the full numeric breakdown.');
        return detailBlock('Change', lines);
      })();
      items.push({
        tone: netWorthDelta.delta >= 0 ? 'good' : 'bad',
        k: 'Change',
        v: `${displayMoney(netWorthDelta.delta)}${netWorthDelta.deltaPct === null ? '' : ` (${displayPct(netWorthDelta.deltaPct)})`}`,
        s: netWorthDelta.label || 'Last change',
        detail: deltaDetail,
      });
    }

    if (runway.months !== null) {
      items.push({
        tone: runway.months >= 6 ? 'good' : runway.months >= 3 ? 'warn' : 'bad',
        k: 'Runway',
        v: `${amountsHidden ? maskedText : runway.months.toFixed(1)} mo`,
        s: `Based on avg spend ${displayMoney(runway.avgExpense)} / month`,
        detail: (() => {
          const recent = series.slice(-6);
          const expList = recent
            .map((r) => `Expense ${r.label}: ${displayMoney(r.expense)}`)
            .filter(Boolean);
          const liquid = runway.liquid;
          return detailBlock('Runway', [
            `Liquid basis = ${displayMoney(liquid)}`,
            ...expList,
            `Avg monthly expense = ${displayMoney(runway.avgExpense)}`,
            `Runway (months) = Liquid ÷ AvgExpense = ${displayMoney(liquid)} ÷ ${displayMoney(runway.avgExpense)} = ${amountsHidden ? maskedText : runway.months.toFixed(2)}`,
          ]);
        })(),
      });
    }

    if (ratios.debtRatio !== null) {
      const debtDetail = detailBlock('Debt ratio', [
        `Debt ratio = Liabilities ÷ (Assets + Investments)`,
        `Liabilities = ${displayMoney(latestBreakdown.liabilities)}`,
        `Assets + Investments = ${displayMoney(latestBreakdown.assets + latestBreakdown.investments)}`,
        `Debt ratio = ${displayMoney(latestBreakdown.liabilities)} ÷ ${displayMoney(latestBreakdown.assets + latestBreakdown.investments)} = ${displayPct(ratios.debtRatio * 100)}`,
      ]);
      items.push({
        tone: ratios.debtRatio <= 0.25 ? 'good' : ratios.debtRatio <= 0.5 ? 'warn' : 'bad',
        k: 'Debt ratio',
        v: displayPct(ratios.debtRatio * 100),
        s: 'Liabilities ÷ (Assets + Investments)',
        detail: debtDetail,
      });
    }

    if (savingsMeta?.savingsRate !== null && savingsMeta?.savingsRate !== undefined) {
      const sumIncome = series.reduce((a, r) => a + (Number(r.income) || 0), 0);
      const sumSavings = series.reduce((a, r) => a + (Number(r.savings) || 0), 0);
      items.push({
        tone: savingsMeta.savingsRate >= 20 ? 'good' : savingsMeta.savingsRate >= 0 ? 'neutral' : 'bad',
        k: 'Savings rate',
        v: displayPct(savingsMeta.savingsRate),
        s: 'Across the selected range',
        detail: detailBlock('Savings rate', [
          `Sum income = ${displayMoney(sumIncome)}`,
          `Sum savings = ${displayMoney(sumSavings)}`,
          `Savings rate = (SumSavings ÷ SumIncome) × 100 = (${displayMoney(sumSavings)} ÷ ${displayMoney(sumIncome)}) × 100 = ${displayPct(savingsMeta.savingsRate)}`,
        ]),
      });
    }

    if (savingsMeta?.best) {
      const inc = Number(savingsMeta.best.income) || 0;
      const exp = Number(savingsMeta.best.expense) || 0;
      const sav = Number(savingsMeta.best.savings) || 0;
      items.push({
        tone: 'good',
        k: 'Best savings month',
        v: `${savingsMeta.best.label} · ${displayMoney(savingsMeta.best.savings)}`,
        s: 'Highest (Income − Expenses)',
        detail: detailBlock('Best savings month', [
          `Month: ${savingsMeta.best.label} (${savingsMeta.best.key})`,
          `Income = ${displayMoney(inc)}`,
          `Expenses = ${displayMoney(exp)}`,
          `Savings = Income − Expenses = ${displayMoney(inc)} − ${displayMoney(exp)} = ${displayMoney(sav)}`,
        ]),
      });
    }

    if (savingsMeta?.maxExpense) {
      const exp = Number(savingsMeta.maxExpense.expense) || 0;
      items.push({
        tone: 'warn',
        k: 'Highest expense month',
        v: `${savingsMeta.maxExpense.label} · ${displayMoney(savingsMeta.maxExpense.expense)}`,
        s: 'Watch recurring costs and spikes',
        detail: detailBlock('Highest expense month', [
          `Month: ${savingsMeta.maxExpense.label} (${savingsMeta.maxExpense.key})`,
          `Expenses = ${displayMoney(exp)}`,
        ]),
      });
    }

    return items.slice(0, 10);
  }, [
    amountsHidden,
    displayMoney,
    displayPct,
    incomeDrought,
    expectedNextMonthCashflow,
    momoCashflow,
    latest,
    latestSnapshot,
    prevSnapshot,
    maskedText,
    inferredRange.end,
    cashflowCumulativeByMonth,
    monthSavingsByKey,
    monthlyByKey,
    netWorthDelta.delta,
    netWorthDelta.deltaPct,
    netWorthDelta.label,
    ratios.debtRatio,
    latestBreakdown.assets,
    latestBreakdown.investments,
    latestBreakdown.liabilities,
    runway.avgExpense,
    runway.months,
    runway.liquid,
    savingsMeta,
    series,
  ]);

  return (
    <div className="p-0 md:p-6 animate-float-in">
      <input ref={importInputRef} type="file" accept="application/json" className="hidden" onChange={onImportFile} />
      <div className="relative overflow-hidden rounded-3xl ring-1 ring-black/5 dark:ring-white/[0.12] bg-gradient-to-br from-white/70 via-white/50 to-indigo-50/40 dark:from-slate-950/40 dark:via-slate-950/25 dark:to-indigo-500/10 backdrop-blur p-6 md:p-8 mb-6">
        <div aria-hidden="true" className="pointer-events-none absolute -top-28 -right-24 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-24 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Net Worth</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 max-w-2xl">
              A private, statement-like view of your wealth. Add snapshots for accuracy, and use cashflow projection to fill the gaps.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/60 dark:bg-slate-950/25 ring-1 ring-black/5 dark:ring-white/[0.10]">
                <span className="font-semibold">Hotkey</span> Ctrl + Shift toggles hide
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/60 dark:bg-slate-950/25 ring-1 ring-black/5 dark:ring-white/[0.10]">
                <span className="font-semibold">Security</span> On-device analytics (no network calls)
              </span>
              {importStatus ? (
                <span
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ring-1 ${
                    importStatus.tone === 'good'
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200 ring-emerald-500/20'
                      : importStatus.tone === 'bad'
                        ? 'bg-rose-500/10 text-rose-700 dark:text-rose-200 ring-rose-500/20'
                        : 'bg-amber-500/10 text-amber-800 dark:text-amber-200 ring-amber-500/20'
                  }`}
                >
                  {importStatus.msg}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setAmountsHidden((v) => !v)}
              className="px-4 py-2.5 rounded-2xl text-sm font-extrabold ring-1 ring-black/5 dark:ring-white/[0.12] bg-white/60 dark:bg-slate-950/25 hover:bg-white/80 dark:hover:bg-slate-950/35 transition-colors"
            >
              {amountsHidden ? 'Show amounts' : 'Hide amounts'}
            </button>
            <button
              type="button"
              onClick={exportSnapshots}
              className="px-4 py-2.5 rounded-2xl text-sm font-extrabold ring-1 ring-black/5 dark:ring-white/[0.12] bg-white/60 dark:bg-slate-950/25 hover:bg-white/80 dark:hover:bg-slate-950/35 transition-colors"
            >
              Export
            </button>
            <button
              type="button"
              onClick={() => importInputRef.current?.click()}
              className="px-4 py-2.5 rounded-2xl text-sm font-extrabold ring-1 ring-black/5 dark:ring-white/[0.12] bg-white/60 dark:bg-slate-950/25 hover:bg-white/80 dark:hover:bg-slate-950/35 transition-colors"
            >
              Import
            </button>
            <button
              type="button"
              onClick={() => openEdit(inferredRange.end)}
              className="px-4 py-2.5 rounded-2xl text-sm font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-soft"
            >
              Add snapshot
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        <KpiCard
          title="Net worth"
          tone={latest?.netWorth >= 0 ? 'good' : 'warn'}
          value={displayMoney(latest?.netWorth || 0)}
          sub={latestSnapshot ? `Snapshot month: ${monthLabelFromKey(latestSnapshot.month)}` : 'Projection only (no snapshots yet)'}
        />
        <KpiCard
          title="Change"
          tone={netWorthDelta.delta === null ? 'neutral' : netWorthDelta.delta >= 0 ? 'good' : 'bad'}
          value={netWorthDelta.delta === null ? '\u2014' : displayMoney(netWorthDelta.delta)}
          sub={netWorthDelta.delta === null ? 'Not enough data' : netWorthDelta.label}
        />
        <KpiCard
          title="Runway"
          tone={runway.months === null ? 'neutral' : runway.months >= 6 ? 'good' : runway.months >= 3 ? 'warn' : 'bad'}
          value={runway.months === null ? '\u2014' : `${amountsHidden ? maskedText : runway.months.toFixed(1)} mo`}
          sub={runway.months === null ? 'Need expenses data' : `Avg spend ${displayMoney(runway.avgExpense)}/mo`}
        />
      </div>

      <div className="rounded-2xl ring-1 ring-black/5 dark:ring-white/[0.12] bg-white/70 dark:bg-slate-900/50 backdrop-blur shadow-soft p-4 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="min-w-0">
            <div className="font-display text-lg font-extrabold text-slate-900 dark:text-white">Wealth timeline</div>
            <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">Switch ranges, enable projection, and drill into monthly snapshots.</div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-1 rounded-2xl bg-white/60 dark:bg-slate-950/25 ring-1 ring-black/5 dark:ring-white/[0.10] p-1">
              {RANGE_PRESETS.map((p) => (
                <button
                  key={`nw-range-${p.id}`}
                  type="button"
                  onClick={() => setRangePreset(p.id)}
                  className={`px-3 py-2 rounded-2xl text-sm font-extrabold transition-colors ${
                    normalizedRangePreset === p.id
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-900/40'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white/60 dark:bg-slate-950/25 rounded-2xl px-4 py-2.5 ring-1 ring-black/5 dark:ring-white/[0.10]">
              <input type="checkbox" checked={projectionEnabled} onChange={(e) => setProjectionEnabled(e.target.checked)} />
              Project with cashflow
            </label>
          </div>
        </div>
      </div>

      {rangePreset === 'custom' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          <div className="bg-white/70 dark:bg-slate-950/25 backdrop-blur rounded-2xl shadow-soft ring-1 ring-black/5 dark:ring-white/10 p-4">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Start (YYYY-MM)</label>
            <input
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm"
              placeholder="2025-01"
            />
          </div>
          <div className="bg-white/70 dark:bg-slate-950/25 backdrop-blur rounded-2xl shadow-soft ring-1 ring-black/5 dark:ring-white/10 p-4">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">End (YYYY-MM)</label>
            <input
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm"
              placeholder="2026-03"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 mb-6">
        <div className="rounded-3xl ring-1 ring-black/5 dark:ring-white/[0.12] bg-white/70 dark:bg-slate-900/50 backdrop-blur shadow-soft p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-3">
            <div className="min-w-0">
              <h3 className="font-display text-lg font-extrabold text-slate-900 dark:text-white">Net Worth Trend</h3>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">Snapshots + cashflow projection (local-only).</div>
            </div>
            <div className="flex flex-wrap items-center gap-2 justify-between lg:justify-end">
              {canWindowNav ? (
                <div className="inline-flex items-center gap-1 rounded-2xl bg-white/60 dark:bg-slate-950/25 ring-1 ring-black/5 dark:ring-white/[0.10] p-1">
                  <button
                    type="button"
                    onClick={() => setViewEndKey((k) => (k <= inferredRange.start ? k : addMonthsToKey(k, -1)))}
                    className="px-3 py-2 rounded-2xl text-sm font-extrabold text-slate-700 dark:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-900/40 transition-colors"
                    title="Back 1 month"
                  >
                    ‹
                  </button>
                  <div className="px-2 text-xs font-semibold text-slate-600 dark:text-slate-300 tabular-nums">
                    {startKey} → {endKey}
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewEndKey((k) => (k >= inferredRange.end ? k : addMonthsToKey(k, 1)))}
                    className="px-3 py-2 rounded-2xl text-sm font-extrabold text-slate-700 dark:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-900/40 transition-colors"
                    title="Forward 1 month"
                  >
                    ›
                  </button>
                </div>
              ) : (
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 tabular-nums">
                  {startKey} → {endKey}
                </div>
              )}

              <div className="inline-flex items-center gap-1 rounded-2xl bg-white/60 dark:bg-slate-950/25 ring-1 ring-black/5 dark:ring-white/[0.10] p-1">
                <button
                  type="button"
                  onClick={() => setChartMode('line')}
                  className={`px-3 py-2 rounded-2xl text-sm font-extrabold transition-colors ${
                    chartMode === 'line'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-900/40'
                  }`}
                >
                  Line
                </button>
                <button
                  type="button"
                  onClick={() => setChartMode('hist')}
                  className={`px-3 py-2 rounded-2xl text-sm font-extrabold transition-colors ${
                    chartMode === 'hist'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-900/40'
                  }`}
                >
                  Histogram
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (isPlaying) {
                    setIsPlaying(false);
                    setPlayIndex(null);
                  } else {
                    setIsPlaying(true);
                  }
                }}
                className="px-4 py-2.5 rounded-2xl text-sm font-extrabold bg-white/60 dark:bg-slate-950/25 hover:bg-white/80 dark:hover:bg-slate-950/35 ring-1 ring-black/5 dark:ring-white/[0.10] transition-colors"
                title="Play / pause timeline"
              >
                {isPlaying ? 'Pause' : 'Play'}
              </button>

              <div className="shrink-0 text-sm font-extrabold text-slate-900 dark:text-white tabular-nums">
                {displayMoney(latest?.netWorth || 0)}
              </div>
            </div>
          </div>
          <div className="h-80">
            {chartMode === 'hist' ? (
              <Bar data={netWorthHistogram} options={histogramOptions} />
            ) : (
              <Line data={netWorthChart} options={commonOptions} />
            )}
          </div>
          {!hasAnySnapshots && (
            <div className="mt-4 text-sm rounded-lg p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200">
              Add your first snapshot to unlock a true net worth line. Projections will still use your monthly cashflow.
            </div>
          )}
        </div>

        <div className="rounded-3xl ring-1 ring-black/5 dark:ring-white/[0.12] bg-white/70 dark:bg-slate-900/50 backdrop-blur shadow-soft p-6">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Insights</div>
          <div className="mt-3 space-y-3">
            {insights.map((it, idx) => (
              <div key={`nw-i-${idx}`} className="rounded-2xl ring-1 ring-black/5 dark:ring-white/[0.10] bg-white/60 dark:bg-slate-950/25 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-slate-900 dark:text-white">
                      <IconDot tone={it.tone} />
                      <span className="truncate">{it.k}</span>
                    </div>
                    {it.s ? <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">{it.s}</div> : null}
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <div className="text-sm font-extrabold text-slate-900 dark:text-white tabular-nums">{it.v}</div>
                    <InfoIconButton
                      label={`Explain ${it.k}`}
                      onClick={() => setOpenInsight(it.detail || { title: it.k, lines: ['No calculation details available.'], footnote: null })}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-3xl ring-1 ring-black/5 dark:ring-white/[0.12] bg-white/70 dark:bg-slate-900/50 backdrop-blur shadow-soft overflow-hidden">
        <div className="p-6 border-b border-black/5 dark:border-white/10 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-extrabold text-slate-900 dark:text-white">Snapshot ledger</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Statement months + projected months in one place (stored locally).</p>
          </div>
          <button
            type="button"
            onClick={() => openEdit(inferredRange.end)}
            className="inline-flex items-center px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-extrabold shadow-soft"
          >
            Add / Edit latest
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50/80 dark:bg-slate-950/30 text-slate-700 dark:text-slate-200">
              <tr>
                <th className="text-left font-extrabold px-4 py-3">Month</th>
                <th className="text-right font-extrabold px-4 py-3">Income</th>
                <th className="text-right font-extrabold px-4 py-3">Expenses</th>
                <th className="text-right font-extrabold px-4 py-3">Savings</th>
                <th className="text-right font-extrabold px-4 py-3">Assets</th>
                <th className="text-right font-extrabold px-4 py-3">Liabilities</th>
                <th className="text-right font-extrabold px-4 py-3">Investments</th>
                <th className="text-right font-extrabold px-4 py-3">Net Worth</th>
                <th className="text-right font-extrabold px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/10">
              {series.map((row) => {
                const snap = row.snap;
                const assets = snap ? Number(snap.assets) : 0;
                const liabilities = snap ? Number(snap.liabilities) : 0;
                const investments = snap ? Number(snap.investments) : 0;
                const netWorth = snap ? (assets + investments - liabilities) : (row.projectedNetWorth ?? 0);

                return (
                  <tr key={row.key} className="hover:bg-slate-50/70 dark:hover:bg-slate-950/25 transition-colors">
                    <td className="px-4 py-3 text-slate-900 dark:text-white whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{row.label}</span>
                        {snap ? (
                          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-1 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-200 ring-1 ring-indigo-500/20">
                            Snapshot
                          </span>
                        ) : projectionEnabled ? (
                          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-200 ring-1 ring-emerald-500/20">
                            Projected
                          </span>
                        ) : (
                          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-1 rounded-full bg-slate-500/10 text-slate-700 dark:text-slate-200 ring-1 ring-slate-500/20">
                            Missing
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-200 tabular-nums">{displayMoney(row.income)}</td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-200 tabular-nums">{displayMoney(row.expense)}</td>
                    <td
                      className={`px-4 py-3 text-right font-medium tabular-nums ${
                        amountsHidden ? 'text-gray-900 dark:text-white' : row.savings >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {displayMoney(row.savings)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-200 tabular-nums">{snap ? displayMoney(assets) : '\u2014'}</td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-200 tabular-nums">{snap ? displayMoney(liabilities) : '\u2014'}</td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-200 tabular-nums">{snap ? displayMoney(investments) : '\u2014'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white tabular-nums">{displayMoney(netWorth)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(row.key)}
                        className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 text-xs font-medium"
                      >
                        {snap ? 'Edit' : 'Add'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-6 text-xs text-slate-600 dark:text-slate-300">
          Tip: For statement-accurate net worth, add a snapshot for that month. Projection is purely cashflow-based and stays local.
        </div>
      </div>

      <Modal open={!!openInsight} title={openInsight?.title || 'Insight'} onClose={() => setOpenInsight(null)}>
        <div className="space-y-3">
          {Array.isArray(openInsight?.lines) ? (
            <div className="space-y-2">
              {openInsight.lines.map((ln, idx) => (
                <div key={`nw-calc-${idx}`} className="text-sm text-slate-800 dark:text-slate-200">
                  {ln}
                </div>
              ))}
            </div>
          ) : null}
          {openInsight?.footnote ? <div className="text-xs text-slate-600 dark:text-slate-300">{openInsight.footnote}</div> : null}
        </div>
      </Modal>

      {editMonth && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white/90 dark:bg-slate-900/80 backdrop-blur rounded-2xl shadow-2xl ring-1 ring-black/10 dark:ring-white/10 overflow-hidden">
            <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Snapshot</p>
                <h4 className="font-display text-lg font-semibold text-slate-900 dark:text-white">{monthLabelFromKey(editMonth)}</h4>
              </div>
              <button
                type="button"
                onClick={() => setEditMonth(null)}
                className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Assets</label>
                  <input
                    value={editForm.assets}
                    onChange={(e) => setEditForm((p) => ({ ...p, assets: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                    inputMode="decimal"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Liabilities</label>
                  <input
                    value={editForm.liabilities}
                    onChange={(e) => setEditForm((p) => ({ ...p, liabilities: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                    inputMode="decimal"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Investments</label>
                  <input
                    value={editForm.investments}
                    onChange={(e) => setEditForm((p) => ({ ...p, investments: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                    inputMode="decimal"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))}
                  className="w-full min-h-[90px] px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional: what changed this month?"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setEditMonth(null)}
                  className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveEdit}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
                >
                  Save Snapshot
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Networth;
