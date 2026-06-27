import React, { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, Line, ComposedChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  monthlyData: Array<{ ts: number; expense: number; label: string }>;
  monthlyBudget: number;
  formatAmount: (amount: number) => string;
};

const BudgetVsExpenseChartModal = ({ isOpen, onClose, monthlyData, monthlyBudget, formatAmount }: Props) => {
  const chartData = useMemo(() => {
    // Take the last 12 months of data
    const recent = monthlyData.slice(-12);
    return recent.map(d => ({
      ...d,
      budget: monthlyBudget
    }));
  }, [monthlyData, monthlyBudget]);

  const hasData = chartData.length > 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl bg-white px-4 py-3 ring-1 ring-black/[0.08] shadow-[0_10px_28px_-20px_rgba(15,23,42,0.55)]">
        <div className="text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">{label}</div>
        
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-rose-500" />
            <div className="text-[12px] font-semibold text-slate-600 flex-1">Actual Expense</div>
            <div className="text-[12px] font-extrabold text-slate-900 ml-4">
              {formatAmount(payload.find((p: any) => p.dataKey === 'expense')?.value || 0)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-slate-300" />
            <div className="text-[12px] font-semibold text-slate-600 flex-1">Expected Budget</div>
            <div className="text-[12px] font-extrabold text-slate-900 ml-4">
              {formatAmount(payload.find((p: any) => p.dataKey === 'budget')?.value || 0)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000]">
      <div aria-hidden="true" className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative h-full w-full flex items-center justify-center p-4 sm:p-6">
        <div
          role="dialog"
          aria-modal="true"
          className="w-full sm:w-[min(900px,96vw)] shrink-0 mt-auto sm:my-auto flex flex-col max-h-[90dvh] sm:max-h-[85dvh] overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white/95 backdrop-blur-2xl shadow-2xl ring-1 ring-black/10 pointer-events-auto transition-transform mx-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mobile Handle */}
          <div className="w-full flex justify-center pt-3 pb-1 sm:hidden shrink-0" aria-hidden="true">
            <div className="w-12 h-1.5 rounded-full bg-slate-200" />
          </div>

          <div className="flex items-start justify-between gap-4 px-5 sm:px-6 py-3 sm:py-4 border-b border-black/5 shrink-0">
            <div className="min-w-0">
              <div className="font-display text-xl sm:text-xl font-extrabold text-slate-900 truncate">Budget vs Actual Expense</div>
              <div className="mt-0.5 text-xs text-slate-500">Comparing expected monthly budget with actual expenses</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 h-9 w-9 rounded-2xl ring-1 ring-black/5 bg-slate-50/80 hover:bg-slate-100 transition-colors grid place-items-center"
              aria-label="Close"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-700" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          
          <div className="flex-1 p-5 min-h-0 flex flex-col">
            <div className="flex-1 min-h-0 relative select-none touch-none rounded-2xl overflow-hidden outline-none border-0 ring-0">
              {!hasData ? (
                <div className="absolute inset-0 grid place-items-center">
                  <div className="text-[14px] font-extrabold text-slate-400">No Data</div>
                </div>
              ) : null}
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 18, bottom: 8, left: 12 }}>
                  <defs>
                    <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.20} />
                      <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="rgba(15,23,42,0.06)" />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    dy={8}
                    tickMargin={8}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickFormatter={(v) => formatAmount(Number(v) || 0)}
                    width={92}
                  />
                  
                  {hasData ? (
                    <>
                      <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(244,63,94,0.22)', strokeWidth: 1, strokeDasharray: '3 3' }} />
                      <Line
                        type="monotone"
                        dataKey="budget"
                        stroke="#94a3b8"
                        strokeWidth={2.6}
                        strokeDasharray="6 4"
                        dot={false}
                        activeDot={false}
                      />
                      <Area
                        type="monotone"
                        dataKey="expense"
                        stroke="#f43f5e"
                        strokeWidth={2.6}
                        fill="url(#expenseFill)"
                        dot={false}
                        activeDot={{ r: 4.5, fill: '#f43f5e', stroke: '#fff', strokeWidth: 2 }}
                      />
                    </>
                  ) : null}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetVsExpenseChartModal;
