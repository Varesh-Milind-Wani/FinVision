import React, { useCallback, useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  LineElement,
  RadialLinearScale,
  Filler,
} from 'chart.js';
import { Pie, Bar, Line, Doughnut } from 'react-chartjs-2';
import { useExpenseContext } from '../contexts/ExpenseContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useAmountsVisibility } from '../contexts/AmountsVisibilityContext';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  LineElement,
  RadialLinearScale,
  Filler
);

function pctChange(current, previous) {
  const cur = Number(current);
  const prev = Number(previous);
  if (!Number.isFinite(cur) || !Number.isFinite(prev) || prev === 0) return null;
  return ((cur - prev) / prev) * 100;
}

function DeltaPill({ delta, goodWhen = 'up' }) {
  const { amountsHidden, maskedText } = useAmountsVisibility();
  if (!Number.isFinite(delta)) {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-[11px] font-semibold ring-1 bg-slate-100/80 text-slate-700 ring-black/10 dark:bg-slate-900/40 dark:text-slate-200 dark:ring-white/10">
        {'\u2014'}
      </span>
    );
  }

  const up = delta > 0;
  const isGood = goodWhen === 'up' ? up : !up;
  const tone = isGood
    ? 'bg-emerald-50/80 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-400/15 dark:text-emerald-100 dark:ring-emerald-300/20'
    : 'bg-rose-50/80 text-rose-700 ring-rose-500/20 dark:bg-rose-400/15 dark:text-rose-100 dark:ring-rose-300/20';
  const label = amountsHidden ? maskedText : `${up ? '+' : ''}${delta.toFixed(1)}%`;

  return (
    <span className={['inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold ring-1', tone].join(' ')}>
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
        {up ? (
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 14l5-5 5 5" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 10l5 5 5-5" />
        )}
      </svg>
      {label}
    </span>
  );
}

function KpiCard({ title, value, subtitle, delta, deltaGoodWhen }) {
  return (
    <div className="surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</div>
          <div className="mt-1 font-display text-xl font-extrabold tracking-tight text-slate-900 dark:text-white tabular-nums truncate">
            {value}
          </div>
          {subtitle ? <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">{subtitle}</div> : null}
        </div>
        <DeltaPill delta={delta} goodWhen={deltaGoodWhen} />
      </div>
    </div>
  );
}

function InsightCard({ children }) {
  return (
    <div className="rounded-2xl ring-1 ring-black/5 dark:ring-white/[0.12] bg-slate-50/80 dark:bg-slate-950/20 px-4 py-3 text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
      {children}
    </div>
  );
}

function useChartTheme(darkMode) {
  return useMemo(() => {
    const axisColor = darkMode ? 'rgba(226,232,240,0.70)' : 'rgba(71,85,105,0.80)';
    const gridColor = darkMode ? 'rgba(148,163,184,0.14)' : 'rgba(15,23,42,0.06)';
    const tooltip = {
      backgroundColor: darkMode ? 'rgba(2,6,23,0.92)' : 'rgba(255,255,255,0.98)',
      borderColor: darkMode ? 'rgba(148,163,184,0.25)' : 'rgba(15,23,42,0.12)',
      borderWidth: 1,
      titleColor: darkMode ? 'rgba(226,232,240,0.95)' : 'rgba(15,23,42,0.92)',
      bodyColor: darkMode ? 'rgba(226,232,240,0.92)' : 'rgba(15,23,42,0.86)',
    };
    return { axisColor, gridColor, tooltip };
  }, [darkMode]);
}

function TrendsPanel() {
  const { getMonthlyData, darkMode } = useExpenseContext();
  const { formatFromBase } = useCurrency();
  const { amountsHidden, maskedText } = useAmountsVisibility();
  const theme = useChartTheme(darkMode);
  const displayMoney = useCallback((v) => (amountsHidden ? maskedText : formatFromBase(v, 'en-US')), [amountsHidden, formatFromBase, maskedText]);

  const monthlyData = useMemo(() => getMonthlyData(), [getMonthlyData]);
  const series = useMemo(() => monthlyData.slice(-12), [monthlyData]);

  const insights = useMemo(() => {
    const last = series.at(-1) || null;
    const prev = series.length > 1 ? series.at(-2) : null;

    const spend = Number(last?.expense || 0);
    const income = Number(last?.income || 0);
    const net = income - spend;

    const prevSpend = Number(prev?.expense || 0);
    const prevIncome = Number(prev?.income || 0);
    const prevNet = prevIncome - prevSpend;

    const dSpend = pctChange(spend, prevSpend);
    const dIncome = pctChange(income, prevIncome);
    const dNet = pctChange(net, prevNet);

    const avg3 = (() => {
      const xs = series.slice(-3);
      if (!xs.length) return 0;
      return xs.reduce((a, m) => a + Number(m?.expense || 0), 0) / xs.length;
    })();

    const bullets = [];
    if (Number.isFinite(dSpend)) bullets.push(dSpend > 0 ? `Spending rose ${amountsHidden ? maskedText : dSpend.toFixed(1)}% vs last month.` : `Spending fell ${amountsHidden ? maskedText : Math.abs(dSpend).toFixed(1)}% vs last month.`);
    if (Number.isFinite(dIncome)) bullets.push(dIncome > 0 ? `Income increased ${amountsHidden ? maskedText : dIncome.toFixed(1)}% vs last month.` : `Income decreased ${amountsHidden ? maskedText : Math.abs(dIncome).toFixed(1)}% vs last month.`);
    if (income > 0) bullets.push(`Savings rate: ${amountsHidden ? maskedText : ((net / income) * 100).toFixed(1)}% this month.`);
    bullets.push(`3-month average spending: ${amountsHidden ? maskedText : formatFromBase(avg3, 'en-US')}.`);

    return {
      label: last?.label || 'This month',
      spend,
      income,
      net,
      dSpend,
      dIncome,
      dNet,
      avg3,
      bullets: bullets.slice(0, 6),
    };
  }, [amountsHidden, formatFromBase, maskedText, series]);

  const chartData = useMemo(
    () => ({
      labels: series.map((d) => d.label),
      datasets: [
        {
          label: 'Total Spending',
          data: series.map((d) => d.expense),
          fill: true,
          backgroundColor: 'rgba(239, 68, 68, 0.16)',
          borderColor: 'rgba(239, 68, 68, 0.95)',
          tension: 0.4,
          pointBackgroundColor: 'rgba(239, 68, 68, 0.95)',
          pointBorderColor: darkMode ? 'rgba(2,6,23,0.9)' : '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: 'Total Income',
          data: series.map((d) => d.income),
          fill: true,
          backgroundColor: 'rgba(34, 197, 94, 0.14)',
          borderColor: 'rgba(34, 197, 94, 0.95)',
          tension: 0.4,
          pointBackgroundColor: 'rgba(34, 197, 94, 0.95)',
          pointBorderColor: darkMode ? 'rgba(2,6,23,0.9)' : '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: 'Net Balance',
          data: series.map((d) => d.income - d.expense),
          fill: false,
          borderColor: 'rgba(99, 102, 241, 0.95)',
          borderDash: [5, 5],
          tension: 0.4,
          pointBackgroundColor: 'rgba(99, 102, 241, 0.95)',
          pointBorderColor: darkMode ? 'rgba(2,6,23,0.9)' : '#fff',
          pointBorderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
        },
      ],
    }),
    [darkMode, series]
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { padding: 18, usePointStyle: true, color: theme.axisColor, font: { size: 12 } },
        },
        tooltip: {
          ...theme.tooltip,
          callbacks: { label: (ctx) => `${ctx.dataset.label}: ${amountsHidden ? maskedText : formatFromBase(ctx.raw || 0, 'en-US')}` },
        },
      },
      scales: {
        x: { ticks: { color: theme.axisColor }, grid: { display: false } },
        y: {
          beginAtZero: true,
          ticks: { color: theme.axisColor, callback: (v) => (amountsHidden ? maskedText : formatFromBase(v, 'en-US').replace('.00', '')) },
          grid: { color: theme.gridColor },
        },
      },
      interaction: { mode: 'index', intersect: false },
    }),
    [amountsHidden, formatFromBase, maskedText, theme]
  );

  return (
    <div className="space-y-6">
      {!monthlyData.length ? (
        <div className="surface p-10 text-center">
          <div className="text-sm text-slate-600 dark:text-slate-300">Add transactions across months to unlock trend insights.</div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard title="Spending" value={displayMoney(insights.spend)} subtitle={insights.label} delta={insights.dSpend} deltaGoodWhen="down" />
        <KpiCard title="Income" value={displayMoney(insights.income)} subtitle={insights.label} delta={insights.dIncome} deltaGoodWhen="up" />
        <KpiCard title="Net Balance" value={displayMoney(insights.net)} subtitle={insights.label} delta={insights.dNet} deltaGoodWhen="up" />
        <KpiCard title="3-mo Avg Spend" value={displayMoney(insights.avg3)} subtitle="Last 3 months" delta={null} deltaGoodWhen="down" />
      </div>

      <div className="surface surface-pad">
        <div className="flex items-end justify-between gap-3 mb-4">
          <div>
            <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white">Spending & Income Trends</h3>
            <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">Last {series.length} months</div>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Hover/tap a point to compare.</div>
        </div>
        <div className="h-[340px] sm:h-[380px]">
          {series.length ? (
            <Line data={chartData} options={options} />
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-slate-600 dark:text-slate-300">
              No data to chart yet.
            </div>
          )}
        </div>
      </div>

      <div className="surface surface-pad">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white">Trend Insights</h3>
          <div className="text-xs text-slate-500 dark:text-slate-400">Actionable highlights</div>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {insights.bullets.map((t, idx) => (
            <InsightCard key={`ti-${idx}`}>{t}</InsightCard>
          ))}
        </div>
      </div>
    </div>
  );
}

function SimpleChartsPanel() {
  const { categoryData, getMonthlyData, darkMode } = useExpenseContext();
  const { formatFromBase } = useCurrency();
  const { amountsHidden, maskedText } = useAmountsVisibility();
  const theme = useChartTheme(darkMode);

  const monthlyData = useMemo(() => getMonthlyData(), [getMonthlyData]);
  const recent = useMemo(() => monthlyData.slice(-6), [monthlyData]);

  const barData = useMemo(
    () => ({
      labels: recent.map((m) => m.label),
      datasets: [
        { label: 'Income', data: recent.map((m) => m.income), backgroundColor: 'rgba(34, 197, 94, 0.65)', borderRadius: 10 },
        { label: 'Expenses', data: recent.map((m) => m.expense), backgroundColor: 'rgba(239, 68, 68, 0.65)', borderRadius: 10 },
      ],
    }),
    [recent]
  );

  const barOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { position: 'top', labels: { usePointStyle: true, color: theme.axisColor } },
        tooltip: {
          ...theme.tooltip,
          callbacks: { label: (ctx) => `${ctx.dataset.label}: ${amountsHidden ? maskedText : formatFromBase(ctx.raw || 0, 'en-US')}` },
        },
      },
      scales: {
        x: { ticks: { color: theme.axisColor }, grid: { display: false } },
        y: { ticks: { color: theme.axisColor, callback: (v) => (amountsHidden ? maskedText : formatFromBase(v, 'en-US').replace('.00', '')) }, grid: { color: theme.gridColor } },
      },
    }),
    [amountsHidden, formatFromBase, maskedText, theme]
  );

  const pieData = useMemo(
    () => ({
      labels: (categoryData || []).map((c) => c.name),
      datasets: [{ data: (categoryData || []).map((c) => c.amount), backgroundColor: (categoryData || []).map((c) => `${c.color}CC`), borderWidth: 0 }],
    }),
    [categoryData]
  );

  const pieOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 10, color: theme.axisColor, font: { size: 11 } } },
        tooltip: { ...theme.tooltip, callbacks: { label: (ctx) => `${ctx.label}: ${amountsHidden ? maskedText : formatFromBase(ctx.raw || 0, 'en-US')}` } },
      },
    }),
    [amountsHidden, formatFromBase, maskedText, theme]
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="surface surface-pad">
        <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white mb-4">Expense Breakdown</h3>
        <div className="h-72">
          <Pie data={pieData} options={pieOptions} />
        </div>
      </div>
      <div className="surface surface-pad">
        <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white mb-4">Monthly Trends</h3>
        <div className="h-72">
          <Bar data={barData} options={barOptions} />
        </div>
      </div>
    </div>
  );
}

function CategoriesPanel() {
  const { categoryData, darkMode } = useExpenseContext();
  const { formatFromBase } = useCurrency();
  const { amountsHidden, maskedText } = useAmountsVisibility();
  const theme = useChartTheme(darkMode);
  const displayMoney = useCallback((v) => (amountsHidden ? maskedText : formatFromBase(v, 'en-US')), [amountsHidden, formatFromBase, maskedText]);

  const doughnutData = useMemo(
    () => ({
      labels: (categoryData || []).map((c) => c.name),
      datasets: [
        {
          data: (categoryData || []).map((c) => c.amount),
          backgroundColor: (categoryData || []).map((c) => `${c.color}CC`),
          borderWidth: 0,
          cutout: '72%',
        },
      ],
    }),
    [categoryData]
  );

  const total = useMemo(() => (categoryData || []).reduce((a, c) => a + Number(c.amount || 0), 0), [categoryData]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: { ...theme.tooltip, callbacks: { label: (ctx) => `${ctx.label}: ${amountsHidden ? maskedText : formatFromBase(ctx.raw || 0, 'en-US')}` } },
      },
    }),
    [amountsHidden, formatFromBase, maskedText, theme]
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="surface surface-pad">
        <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white mb-4">Category Distribution</h3>
        <div className="relative h-72">
            <Doughnut data={doughnutData} options={options} />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="text-xs text-slate-500 dark:text-slate-400">Total</div>
              <div className="mt-1 font-display text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">{displayMoney(total)}</div>
            </div>
          </div>
        </div>
      <div className="surface p-10 text-center">
        <div className="text-sm text-slate-600 dark:text-slate-300">Select a slice on Overview/Trends to drill down.</div>
      </div>
    </div>
  );
}

function ComparisonPanel() {
  const { getMonthlyData } = useExpenseContext();
  const monthlyData = useMemo(() => getMonthlyData(), [getMonthlyData]);

  if (monthlyData.length < 2) {
    return (
      <div className="surface p-10 text-center">
        <div className="text-sm text-slate-600 dark:text-slate-300">Add transactions across at least 2 months to compare.</div>
      </div>
    );
  }

  const cur = monthlyData.at(-1);
  const prev = monthlyData.at(-2);
  const dIncome = pctChange(cur?.income || 0, prev?.income || 0);
  const dExpense = pctChange(cur?.expense || 0, prev?.expense || 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <KpiCard title="Income Change" value={cur?.label || 'This month'} subtitle="vs previous month" delta={dIncome} deltaGoodWhen="up" />
      <KpiCard title="Expense Change" value={cur?.label || 'This month'} subtitle="vs previous month" delta={dExpense} deltaGoodWhen="down" />
    </div>
  );
}

export default function ExpenseChart() {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'trends', label: 'Trends' },
    { id: 'categories', label: 'Categories' },
    { id: 'comparison', label: 'Comparison' },
  ];

  return (
    <div className="p-0 md:p-6 animate-float-in">
      <div className="mb-6 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex bg-white/60 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800/70 rounded-2xl p-1.5 w-full overflow-x-auto whitespace-nowrap shadow-sm">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-3 sm:px-4 text-xs sm:text-sm font-medium transition-colors flex-shrink-0 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm rounded-xl'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 rounded-xl'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' ? <SimpleChartsPanel /> : null}
      {activeTab === 'trends' ? <TrendsPanel /> : null}
      {activeTab === 'categories' ? <CategoriesPanel /> : null}
      {activeTab === 'comparison' ? <ComparisonPanel /> : null}
    </div>
  );
}
