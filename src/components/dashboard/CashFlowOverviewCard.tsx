import React, { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useExpenseContext } from '../../contexts/ExpenseContext';
import { useCurrency } from '../../contexts/CurrencyContext';

const CustomTooltip = ({ active, payload }: any) => {
  const { formatFromBase } = useCurrency();
  if (!active || !payload?.length) return null;
  const income = payload.find((p: any) => p.dataKey === 'income')?.value;
  const expenses = payload.find((p: any) => p.dataKey === 'expenses')?.value;
  
  return (
    <div className="rounded-xl bg-white dark:bg-slate-900 px-4 py-3 ring-1 ring-black/[0.08] dark:ring-white/10 shadow-[0_10px_28px_-20px_rgba(15,23,42,0.55)]">
      <div className="flex items-center gap-2 text-[12px] font-medium text-slate-500 dark:text-slate-400">
        <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
        <span className="text-slate-900 dark:text-white font-bold">{formatFromBase(Number(income || 0))}</span> In
      </div>
      <div className="mt-1.5 flex items-center gap-2 text-[12px] font-medium text-slate-500 dark:text-slate-400">
        <span className="h-2.5 w-2.5 rounded-sm bg-indigo-500" />
        <span className="text-slate-900 dark:text-white font-bold">{formatFromBase(Number(expenses || 0))}</span> Out
      </div>
    </div>
  );
};

const CashFlowOverviewCard = () => {
  const { getMonthlyData } = useExpenseContext() as any;

  const data = useMemo(() => {
    const months = (typeof getMonthlyData === 'function' ? getMonthlyData() : []) || [];
    const base = months
      .slice()
      .sort((a: any, b: any) => (a?.ts || 0) - (b?.ts || 0))
      .slice(-6) // Last 6 months for clear bar chart
      .map((m: any) => ({
        m: typeof m?.label === 'string' && m.label ? m.label.split(' ')[0].substring(0, 3) : '—',
        income: Number(m?.income) || 0,
        expenses: Number(m?.expense) || 0,
      }));

    return base;
  }, [getMonthlyData]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[24px] p-5 md:p-6 shadow-soft ring-1 ring-slate-200/50 dark:ring-white/10 h-full flex flex-col">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-display text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Cash Flow</div>
          <div className="mt-1 text-[13px] text-slate-500 dark:text-slate-400 font-medium">Income vs Expenses (Last 6 Months)</div>
        </div>
        <div className="flex items-center gap-3 text-[12px] font-bold text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Income
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-indigo-500" /> Expenses
          </div>
        </div>
      </div>

      <div className="mt-6 flex-1 min-h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 0, bottom: 0, left: 0 }} barGap={6}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-800" />
            <XAxis
              dataKey="m"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }}
              dy={10}
            />
            <YAxis hide domain={[0, 'dataMax + 1000']} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(15,23,42,0.03)' }} />
            <Bar
              dataKey="income"
              fill="#10b981"
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
            <Bar
              dataKey="expenses"
              fill="#6366f1"
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CashFlowOverviewCard;
