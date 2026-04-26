import React, { useMemo } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
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
  const predIncome = payload.find((p: any) => p.dataKey === 'predIncome')?.value;
  const predExpenses = payload.find((p: any) => p.dataKey === 'predExpenses')?.value;
  return (
    <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-black/[0.08] shadow-[0_10px_28px_-20px_rgba(15,23,42,0.55)]">
      <div className="flex items-center gap-2 text-[11px] text-slate-600">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        <span className="font-semibold text-slate-900">{formatFromBase(Number(income || 0))}</span>
      </div>
      <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-600">
        <span className="h-2 w-2 rounded-full bg-orange-500" />
        <span className="font-semibold text-slate-900">{formatFromBase(Number(expenses || 0))}</span>
      </div>
      {predIncome !== undefined || predExpenses !== undefined ? (
        <div className="mt-1.5 text-[10px] text-slate-500">
          Predicted:{' '}
          <span className="font-semibold text-slate-700">
            {formatFromBase(Number(predIncome || 0))}
          </span>
          {' • '}
          <span className="font-semibold text-slate-700">
            {formatFromBase(Number(predExpenses || 0))}
          </span>
        </div>
      ) : null}
    </div>
  );
};

const IncomeExpenseLineChart = () => {
  const { getMonthlyData } = useExpenseContext();

  const data = useMemo(() => {
    const months = (typeof getMonthlyData === 'function' ? getMonthlyData() : []) || [];
    const base = months
      .slice()
      .sort((a: any, b: any) => (a?.ts || 0) - (b?.ts || 0))
      .slice(-12)
      .map((m: any) => ({
        m: typeof m?.label === 'string' && m.label ? m.label.split(' ')[0] : '—',
        income: Number(m?.income) || 0,
        expenses: Number(m?.expense) || 0,
        predIncome: undefined as number | undefined,
        predExpenses: undefined as number | undefined,
      }));

    if (base.length < 2) return base;

    // Simple prediction: use last 3 months average as the baseline.
    const tail = base.slice(-3);
    const avgIncome = tail.reduce((s: number, d: any) => s + (Number(d.income) || 0), 0) / tail.length;
    const avgExpense = tail.reduce((s: number, d: any) => s + (Number(d.expenses) || 0), 0) / tail.length;

    const next1 = { m: 'Next\u2032', income: null as any, expenses: null as any, predIncome: Math.round(avgIncome), predExpenses: Math.round(avgExpense) };
    const next2 = { m: 'Soon\u2032', income: null as any, expenses: null as any, predIncome: Math.round(avgIncome * 1.02), predExpenses: Math.round(avgExpense * 1.03) };
    return [...base, next1, next2];
  }, [getMonthlyData]);

  const warning = useMemo(() => {
    const lastPred = [...data].reverse().find((d: any) => d?.predIncome != null || d?.predExpenses != null);
    if (!lastPred) return null;
    const pi = Number(lastPred.predIncome) || 0;
    const pe = Number(lastPred.predExpenses) || 0;
    if (pe <= pi) return null;
    return `⚠ Balance may drop below threshold around ${String(lastPred.m).replace('′', '')}`;
  }, [data]);

  return (
    <div className="surface surface-pressable">
      <div className="px-4 sm:px-5 py-4 border-b border-black/[0.06] flex items-center justify-between gap-4">
        <div>
          <div className="text-[13px] font-semibold text-slate-800">Statistics</div>
          <div className="mt-2 flex items-center gap-4 text-[12px] text-slate-500">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Total income
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-orange-500" />
              Total expenses
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <span className="h-2 w-6 rounded-full border border-slate-300" style={{ borderStyle: 'dashed' }} />
              Predicted
            </div>
          </div>
          {warning ? <div className="mt-2 text-[11px] text-rose-500 font-semibold">{warning}</div> : null}
        </div>
        <button
          type="button"
          className="h-8 px-3.5 rounded-full ring-1 ring-black/[0.08] text-[12px] text-slate-600 inline-flex items-center gap-2"
        >
          <span className="h-3.5 w-3.5 rounded bg-slate-200" />
          Monthly
        </button>
      </div>

      <div className="px-2 sm:px-4 pt-4">
        <div className="h-[220px] sm:h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="rgba(15,23,42,0.06)" />
              <XAxis
                dataKey="m"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                dy={8}
              />
              <YAxis hide domain={[0, 'dataMax + 2000']} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(15,23,42,0.10)', strokeDasharray: '3 3' }} />
              <Line
                type="monotone"
                dataKey="income"
                stroke="#16a34a"
                strokeWidth={2.25}
                dot={false}
                activeDot={{ r: 4, fill: '#16a34a', stroke: '#fff', strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="expenses"
                stroke="#f97316"
                strokeWidth={2.25}
                dot={false}
                activeDot={{ r: 4, fill: '#f97316', stroke: '#fff', strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="predIncome"
                stroke="#16a34a"
                strokeWidth={2.25}
                strokeDasharray="6 6"
                dot={false}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="predExpenses"
                stroke="#f97316"
                strokeWidth={2.25}
                strokeDasharray="6 6"
                dot={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="px-4 sm:px-5 py-4 border-t border-black/[0.06] grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <div className="text-[11px] text-slate-400">Average income</div>
          <AverageMetric metric="income" />
        </div>
        <div>
          <div className="text-[11px] text-slate-400">Average expenses</div>
          <AverageMetric metric="expenses" />
        </div>
      </div>
    </div>
  );
};

const AverageMetric = ({ metric }: { metric: 'income' | 'expenses' }) => {
  const { getMonthlyData } = useExpenseContext();
  const { formatFromBase } = useCurrency();

  const { avg, deltaPct } = useMemo(() => {
    const months = (typeof getMonthlyData === 'function' ? getMonthlyData() : []) || [];
    const sorted = months.slice().sort((a: any, b: any) => (a?.ts || 0) - (b?.ts || 0));
    const last = sorted[sorted.length - 1] || null;
    const prev = sorted[sorted.length - 2] || null;
    const values = sorted.slice(-6).map((m: any) => (metric === 'income' ? Number(m?.income) || 0 : Number(m?.expense) || 0));
    const avg = values.length ? values.reduce((s: number, n: number) => s + n, 0) / values.length : 0;
    const lastV = metric === 'income' ? Number(last?.income) || 0 : Number(last?.expense) || 0;
    const prevV = metric === 'income' ? Number(prev?.income) || 0 : Number(prev?.expense) || 0;
    const deltaPct = prevV > 0 ? ((lastV - prevV) / prevV) * 100 : 0;
    return { avg, deltaPct };
  }, [getMonthlyData, metric]);

  const tone = metric === 'income' ? 'text-emerald-600' : 'text-rose-500';
  return (
    <>
      <div className="mt-1 text-[20px] leading-[26px] font-semibold tracking-[-0.01em]">{formatFromBase(avg)}</div>
      <div className={`mt-0.5 text-[11px] ${tone}`}>
        {deltaPct >= 0 ? '+' : '-'}
        {Math.abs(deltaPct).toFixed(1)}%&nbsp;&nbsp;compare to last month
      </div>
    </>
  );
};

export default IncomeExpenseLineChart;
