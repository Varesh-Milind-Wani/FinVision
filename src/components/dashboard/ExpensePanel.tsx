import React, { useMemo } from 'react';
import DonutChart from './DonutChart';
import { useExpenseContext } from '../../contexts/ExpenseContext';
import { useCurrency } from '../../contexts/CurrencyContext';

const ExpensePanel = () => {
  const { categoryData, totalExpenses } = useExpenseContext();
  const { formatFromBase } = useCurrency();

  const data = useMemo(() => {
    const sorted = (categoryData || [])
      .slice()
      .sort((a: any, b: any) => (b?.amount || 0) - (a?.amount || 0))
      .slice(0, 4)
      .map((c: any) => ({
        name: c?.name || c?.id || 'Category',
        value: Math.max(1, Math.round(Number(c?.percentage) || 0)),
        color: c?.color || '#94a3b8',
        amount: Number(c?.amount) || 0,
      }));
    return sorted.length ? sorted : [{ name: 'No data', value: 100, color: '#cbd5e1', amount: 0 }];
  }, [categoryData]);

  const center = data[0];

  return (
    <div className="surface surface-pad-sm">
      <div className="text-xs font-semibold text-slate-700">Expense breakdown</div>
      <div className="mt-3 grid grid-cols-12 gap-3 items-center">
        <div className="col-span-6 h-[150px]">
          <DonutChart data={data} centerLabelTop={center?.name || '—'} centerLabelBottom={formatFromBase(center?.amount || 0)} />
          <div className="mt-2 text-[10px] text-slate-400">
            Total expenses: <span className="font-semibold text-slate-600">{formatFromBase(Number(totalExpenses) || 0)}</span>
          </div>
        </div>
        <div className="col-span-6">
          <div className="space-y-2.5">
            {data.map((d: any) => (
              <div key={d.name} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-[11px] text-slate-600 truncate">{d.name}</span>
                </div>
                <div className="text-[11px] font-semibold text-slate-600">{d.value}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpensePanel;
