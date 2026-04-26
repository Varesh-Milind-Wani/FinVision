import React, { useMemo } from 'react';
import { useExpenseContext } from '../contexts/ExpenseContext';
import { useCurrency } from '../contexts/CurrencyContext';

const toneStyles = {
  positive: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  warning: 'bg-rose-50 text-rose-700 ring-rose-100',
  neutral: 'bg-slate-50 text-slate-700 ring-slate-200',
};

const InsightCard = ({ icon, title, body, tone = 'neutral' }) => (
  <div className="rounded-2xl bg-white/90 dark:bg-slate-950/40 ring-1 ring-black/5 dark:ring-white/[0.12] p-5 shadow-soft">
    <div className="flex items-start gap-3">
      <div className={`h-10 w-10 rounded-2xl ring-1 grid place-items-center ${toneStyles[tone]}`}>
        <span className="text-sm font-extrabold">{icon}</span>
      </div>
      <div className="min-w-0">
        <div className="text-sm font-extrabold text-slate-900 dark:text-white">{title}</div>
        <div className="mt-1 text-sm text-slate-600 dark:text-slate-300 leading-6">{body}</div>
      </div>
    </div>
  </div>
);

const getMonthKey = (d) => {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

export default function AIInsights() {
  const { transactions, categories } = useExpenseContext();
  const { formatFromBase } = useCurrency();

  const insights = useMemo(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonth = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;

    const categoryById = new Map();
    for (const c of categories || []) categoryById.set(c.id, c);

    let curFood = 0;
    let prevFood = 0;
    let curSubs = 0;
    let curTotalExpense = 0;
    let prevTotalExpense = 0;
    const weekdayExpense = new Array(7).fill(0);

    for (const t of transactions || []) {
      if (t?.type !== 'expense') continue;
      const key = getMonthKey(t?.date);
      const amount = Number(t?.amount) || 0;
      if (!key) continue;

      const categoryId = t?.category || 'other';
      const categoryName = categoryById.get(categoryId)?.name?.toLowerCase?.() || '';

      if (key === currentMonth) {
        curTotalExpense += amount;
        if (categoryId === 'food' || categoryName.includes('food')) curFood += amount;
        if (categoryId === 'unneeded_products' || categoryName.includes('subscription') || categoryName.includes('unneeded')) curSubs += amount;
      } else if (key === prevMonth) {
        prevTotalExpense += amount;
        if (categoryId === 'food' || categoryName.includes('food')) prevFood += amount;
      }

      try {
        const dt = new Date(t?.date);
        const w = dt.getDay(); // 0 Sun
        if (!Number.isNaN(w)) weekdayExpense[w] += amount;
      } catch {
        // ignore
      }
    }

    const foodDeltaPct = prevFood > 0 ? ((curFood - prevFood) / prevFood) * 100 : null;
    const subscriptionsSuggestion = curSubs > 0 ? Math.min(curSubs, Math.round(curSubs * 0.25)) : 0;

    let topDay = 0;
    for (let i = 1; i < weekdayExpense.length; i++) if (weekdayExpense[i] > weekdayExpense[topDay]) topDay = i;
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const highSpend = prevTotalExpense > 0 ? curTotalExpense > prevTotalExpense * 1.25 : curTotalExpense > 0;

    const out = [];

    if (foodDeltaPct !== null) {
      out.push({
        icon: '🍽️',
        tone: foodDeltaPct > 0 ? 'warning' : 'positive',
        title: 'Food trend',
        body: `Your food spending is ${foodDeltaPct >= 0 ? 'up' : 'down'} by ${Math.abs(foodDeltaPct).toFixed(0)}% vs last month.`,
      });
    } else {
      out.push({
        icon: '🍽️',
        tone: 'neutral',
        title: 'Food trend',
        body: 'Add more transactions across months to unlock month-over-month comparisons.',
      });
    }

    out.push({
      icon: '💳',
      tone: subscriptionsSuggestion > 0 ? 'positive' : 'neutral',
      title: 'Subscription savings',
      body:
        subscriptionsSuggestion > 0
          ? `You can save about ${formatFromBase(subscriptionsSuggestion)}/month by trimming unused subscriptions.`
          : 'No obvious subscription spikes detected this month.',
    });

    out.push({
      icon: '📅',
      tone: 'neutral',
      title: 'Highest expense day',
      body: `Your highest expense day tends to be ${dayNames[topDay]}.`,
    });

    if (highSpend) {
      out.push({
        icon: '⚠️',
        tone: 'warning',
        title: 'Smart alert',
        body: 'High spending detected this month. Consider tightening discretionary categories for the next 2 weeks.',
      });
    } else {
      out.push({
        icon: '✅',
        tone: 'positive',
        title: 'Smart alert',
        body: 'Spending looks stable vs last month. Keep the current pace to hit your savings targets.',
      });
    }

    return out.slice(0, 6);
  }, [categories, formatFromBase, transactions]);

  return (
    <div className="p-5 sm:p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {insights.map((i, idx) => (
          <InsightCard key={`${i.title}-${idx}`} icon={i.icon} title={i.title} body={i.body} tone={i.tone} />
        ))}
      </div>

      <div className="mt-6 rounded-2xl bg-gradient-to-r from-slate-950 to-slate-900 text-white ring-1 ring-white/10 p-5 shadow-soft">
        <div className="text-sm font-extrabold">AI note</div>
        <div className="mt-1 text-sm text-slate-200 leading-6">
          These insights are generated locally from your saved transactions (mock AI). No data leaves your browser.
        </div>
      </div>
    </div>
  );
}
