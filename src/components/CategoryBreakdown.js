import React, { useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

const DEFAULT_DATA = [
  { category: 'Food', amount: 1200 },
  { category: 'Travel', amount: 800 },
  { category: 'Shopping', amount: 600 },
  { category: 'Bills', amount: 400 },
];

const CATEGORY_META = {
  food: { emoji: '🍔', color: '#FF6B7A' },
  travel: { emoji: '🚗', color: '#38BDF8' },
  shopping: { emoji: '🛍️', color: '#A78BFA' },
  bills: { emoji: '💡', color: '#FBBF24' },
  rent: { emoji: '🏠', color: '#34D399' },
  transport: { emoji: '🚕', color: '#22D3EE' },
  entertainment: { emoji: '🎬', color: '#F472B6' },
  health: { emoji: '💊', color: '#2DD4BF' },
  other: { emoji: '📌', color: '#94A3B8' },
};

const FALLBACK_COLORS = ['#FF6B7A', '#38BDF8', '#A78BFA', '#FBBF24', '#34D399', '#F472B6', '#2DD4BF', '#818CF8'];

const toKey = (value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');

const formatDefaultMoney = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const CategoryBreakdown = ({
  data = DEFAULT_DATA,
  title = 'Category Breakdown',
  subtitle = 'Expense distribution by category',
  formatMoney = formatDefaultMoney,
  onCategorySelect,
}) => {
  const [activeIndex, setActiveIndex] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);

  const rows = useMemo(() => {
    const source = Array.isArray(data) && data.length ? data : DEFAULT_DATA;
    return source
      .map((item, index) => {
        const category = item.category || item.name || 'Other';
        const key = item.id || toKey(category) || `category-${index}`;
        const meta = CATEGORY_META[toKey(category)] || CATEGORY_META.other;
        return {
          key,
          category,
          emoji: item.emoji || meta.emoji,
          amount: Math.max(0, Number(item.amount) || 0),
          color: item.color || meta.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length],
        };
      })
      .filter((item) => item.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [data]);

  const total = useMemo(() => rows.reduce((sum, item) => sum + item.amount, 0), [rows]);
  const activeRow = activeIndex !== null ? rows[activeIndex] : selectedIndex !== null ? rows[selectedIndex] : null;

  const chartData = useMemo(
    () => ({
      labels: rows.map((item) => item.category),
      datasets: [
        {
          data: rows.map((item) => item.amount),
          backgroundColor: rows.map((item, index) => (selectedIndex === null || selectedIndex === index ? item.color : `${item.color}55`)),
          borderColor: rows.map((item, index) => (activeIndex === index || selectedIndex === index ? '#FFFFFF' : 'rgba(255,255,255,0.10)')),
          borderWidth: rows.map((_, index) => (activeIndex === index || selectedIndex === index ? 3 : 1)),
          hoverBorderColor: '#FFFFFF',
          hoverBorderWidth: 4,
          hoverOffset: 14,
          spacing: 3,
        },
      ],
    }),
    [activeIndex, rows, selectedIndex]
  );

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: '72%',
      animation: {
        animateRotate: true,
        animateScale: true,
        duration: 900,
        easing: 'easeOutQuart',
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          displayColors: false,
          padding: 12,
          backgroundColor: 'rgba(2, 6, 23, 0.94)',
          titleColor: '#F8FAFC',
          bodyColor: '#CBD5E1',
          borderColor: 'rgba(255,255,255,0.14)',
          borderWidth: 1,
          callbacks: {
            title: (items) => items?.[0]?.label || '',
            label: (context) => {
              const value = Number(context.raw) || 0;
              const pct = total > 0 ? (value / total) * 100 : 0;
              return `${formatMoney(value)} (${pct.toFixed(1)}%)`;
            },
          },
        },
      },
      onHover: (event, elements) => {
        const target = event?.native?.target;
        if (target) target.style.cursor = elements?.length ? 'pointer' : 'default';
        setActiveIndex(elements?.length ? elements[0].index : null);
      },
      onClick: (_event, elements) => {
        if (!elements?.length) return;
        const index = elements[0].index;
        const row = rows[index];
        setSelectedIndex((current) => (current === index ? null : index));
        console.log('Filter transactions by category:', row.category);
        onCategorySelect?.(row);
      },
    }),
    [formatMoney, onCategorySelect, rows, total]
  );

  const insight = useMemo(() => {
    const row = rows[0];
    if (!row || total <= 0) return 'Add expenses to unlock spending insights.';
    const pct = (row.amount / total) * 100;
    return `You spent 35% more on ${row.category} compared to last week. It is ${pct.toFixed(0)}% of total expenses.`;
  }, [rows, total]);

  return (
    <section className="w-full animate-float-in rounded-lg border border-white/10 bg-slate-950/70 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-cyan-200/80">Expenses</div>
          <h3 className="mt-1 font-display text-xl font-extrabold text-white">{title}</h3>
          <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
        </div>
        <div className="inline-flex w-fit items-center rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-xs font-extrabold text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.12)]">
          {rows.length} categories
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(17rem,23rem)_minmax(0,1fr)] lg:items-center">
        <div className="relative mx-auto h-72 w-full max-w-sm">
          <Doughnut data={chartData} options={chartOptions} />
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="rounded-lg border border-white/10 bg-slate-950/70 px-4 py-3 text-center shadow-[0_0_40px_rgba(56,189,248,0.10)] backdrop-blur">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                {activeRow ? activeRow.category : 'Total Spent'}
              </div>
              <div className="mt-1 font-display text-lg font-extrabold text-white tabular-nums">
                {formatMoney(activeRow ? activeRow.amount : total)}
              </div>
              {activeRow ? (
                <div className="mt-1 text-xs font-bold text-cyan-200">{total > 0 ? ((activeRow.amount / total) * 100).toFixed(1) : '0.0'}%</div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {rows.map((item, index) => {
            const pct = total > 0 ? (item.amount / total) * 100 : 0;
            const isActive = activeIndex === index || selectedIndex === index;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setSelectedIndex((current) => (current === index ? null : index));
                  console.log('Filter transactions by category:', item.category);
                  onCategorySelect?.(item);
                }}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
                className={`group w-full rounded-lg border p-3 text-left transition-all duration-200 ${
                  isActive
                    ? 'border-cyan-300/40 bg-cyan-300/10 shadow-[0_0_28px_rgba(34,211,238,0.16)]'
                    : 'border-white/10 bg-white/[0.035] hover:border-white/18 hover:bg-white/[0.06]'
                }`}
                title={`${item.category}: ${formatMoney(item.amount)} (${pct.toFixed(1)}%)`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-lg" style={{ backgroundColor: `${item.color}22`, color: item.color }}>
                      {item.emoji}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-extrabold text-white">{item.category}</div>
                      <div className="mt-0.5 text-xs text-slate-400">{pct.toFixed(1)}% of expenses</div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-extrabold text-slate-100 tabular-nums">{formatMoney(item.amount)}</div>
                    <div className="mt-0.5 text-xs font-bold text-slate-500">{pct.toFixed(0)}%</div>
                  </div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-cyan-300 to-emerald-300 transition-all duration-700"
                    style={{ width: `${Math.max(3, pct)}%`, boxShadow: isActive ? `0 0 20px ${item.color}` : 'none' }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-amber-300/20 bg-gradient-to-r from-amber-300/10 via-white/[0.04] to-cyan-300/10 px-4 py-3 text-sm font-semibold text-slate-200">
        <span className="text-amber-200">AI insight:</span> {insight}
      </div>
    </section>
  );
};

export default CategoryBreakdown;
