import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Area, AreaChart, CartesianGrid, Line, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type RangeDays = 7 | 30 | 90 | 180 | 365 | 1095 | 1825;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  incomeTrendData: Array<{ ts: number; value: number; delta: number }>;
  monthlyData: Array<{ ts: number; expense: number; label: string }>;
  currentBudget: number;
  onSaveBudget: (val: number) => void;
  formatAmount: (amount: number) => string;
};

const BudgetAndTrendsModal = ({ isOpen, onClose, incomeTrendData, monthlyData, currentBudget, onSaveBudget, formatAmount }: Props) => {
  const [activeTab, setActiveTab] = useState<'income' | 'budget'>('budget');
  const [budgetStr, setBudgetStr] = useState(currentBudget ? String(currentBudget) : '');
  const [rangeDays, setRangeDays] = useState<RangeDays>(30);
  const [rangeMenuOpen, setRangeMenuOpen] = useState(false);
  const rangeMenuRef = useRef<HTMLDivElement | null>(null);

  // Sync internal budget string when prop changes
  useEffect(() => {
    setBudgetStr(currentBudget ? String(currentBudget) : '');
  }, [currentBudget]);

  const handleSaveBudget = () => {
    const val = Number(budgetStr);
    if (!isNaN(val) && val >= 0) {
      onSaveBudget(val);
    }
  };

  // Close handlers
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  // Click outside range menu
  useEffect(() => {
    if (!rangeMenuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const el = rangeMenuRef.current;
      if (!el) return;
      if (e.target instanceof Node && el.contains(e.target)) return;
      setRangeMenuOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [rangeMenuOpen]);

  // --- Chart Data Processing ---

  // Budget vs Actual Chart Data
  const budgetChartData = useMemo(() => {
    const recent = monthlyData.slice(-12);
    return recent.map(d => ({
      ...d,
      budget: currentBudget
    }));
  }, [monthlyData, currentBudget]);
  const hasBudgetData = budgetChartData.length > 0;

  // Income Trend Chart Data
  const fullIncomeData = useMemo(() => {
    const list = incomeTrendData.filter((p) => Number.isFinite(Number(p?.ts)) && Number.isFinite(Number(p?.value)));
    return list.sort((a, b) => Number(a.ts) - Number(b.ts));
  }, [incomeTrendData]);

  const incomeChartData = useMemo(() => {
    const len = fullIncomeData.length;
    if (!len) return [];
    const windowSize = Math.min(rangeDays, len);
    return fullIncomeData.slice(-windowSize);
  }, [fullIncomeData, rangeDays]);
  
  const hasIncomeData = useMemo(() => incomeChartData.some(p => p.value !== 0), [incomeChartData]);

  // --- Formatters ---
  
  const xTickFormatterIncome = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: '2-digit' });
    return (ts: any) => {
      const d = new Date(Number(ts) || 0);
      return Number.isNaN(d.getTime()) ? '' : fmt.format(d);
    };
  }, []);

  const incomeYDomain = useMemo(() => {
    const values = incomeChartData.map((p) => Number(p?.value)).filter((n) => Number.isFinite(n));
    if (!values.length) return ['auto', 'auto'];
    const min = Math.max(0, Math.min(...values) * 0.9);
    const max = Math.max(...values) * 1.1;
    return [min, max];
  }, [incomeChartData]);

  // --- Tooltips ---

  const BudgetTooltip = ({ active, payload, label }: any) => {
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

  const IncomeTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const v = Number(payload[0]?.value) || 0;
    const d = new Date(Number(label) || 0);
    const dateText = Number.isNaN(d.getTime()) ? '' : new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: '2-digit', year: 'numeric' }).format(d);
    return (
      <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-black/[0.08] shadow-[0_10px_28px_-20px_rgba(15,23,42,0.55)]">
        {dateText && <div className="text-[10px] font-semibold text-slate-500">{dateText}</div>}
        <div className="mt-0.5 text-[12px] font-extrabold text-slate-900">{formatAmount(v)}</div>
      </div>
    );
  };

  if (!isOpen) return null;

  const rangeOptions: Array<{ days: RangeDays; label: string }> = [
    { days: 7, label: '7D' },
    { days: 30, label: '30D' },
    { days: 90, label: '90D' },
    { days: 180, label: '6M' },
    { days: 365, label: '1Y' },
  ];
  const rangeLabel = rangeOptions.find((o) => o.days === rangeDays)?.label || `${rangeDays}D`;

  return (
    <div className="fixed inset-0 z-[10000]">
      <div aria-hidden="true" className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative h-full w-full flex items-center justify-center p-4 sm:p-6">
        <div
          role="dialog"
          aria-modal="true"
          className="w-full sm:w-[min(1000px,96vw)] shrink-0 mt-auto sm:my-auto flex flex-col max-h-[90dvh] sm:max-h-[85dvh] overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white/95 backdrop-blur-2xl shadow-2xl ring-1 ring-black/10 pointer-events-auto transition-transform mx-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mobile Handle */}
          <div className="w-full flex justify-center pt-3 pb-1 sm:hidden shrink-0" aria-hidden="true">
            <div className="w-12 h-1.5 rounded-full bg-slate-200" />
          </div>

          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-5 sm:px-6 py-3 sm:py-4 border-b border-black/5 shrink-0">
            <div className="min-w-0">
              <div className="font-display text-xl sm:text-xl font-extrabold text-slate-900 truncate">Budget vs Actual</div>
              <div className="mt-0.5 text-xs text-slate-500">Monitor your monthly trends and budget performance</div>
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
              <div className="flex bg-slate-100 p-1 rounded-xl ring-1 ring-black/5">
                <button
                  onClick={() => setActiveTab('budget')}
                  className={`px-4 py-1.5 rounded-lg text-[13px] font-bold transition-all ${activeTab === 'budget' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Budget vs Expense
                </button>
                <button
                  onClick={() => setActiveTab('income')}
                  className={`px-4 py-1.5 rounded-lg text-[13px] font-bold transition-all ${activeTab === 'income' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Income Trend
                </button>
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
          </div>
          
          {/* Content */}
          <div className="flex-1 p-5 min-h-0 flex flex-col bg-white">
            
            {activeTab === 'budget' && (
              <>
                <div className="mb-5 flex flex-wrap items-end gap-3 bg-slate-50/80 p-4 rounded-2xl ring-1 ring-black/[0.04]">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Monthly Budget Amount</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                      <input
                        type="number"
                        value={budgetStr}
                        onChange={(e) => setBudgetStr(e.target.value)}
                        placeholder="e.g. 5000"
                        className="w-full h-10 pl-8 pr-4 rounded-xl bg-white border-none ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-blue-500 text-slate-900 font-semibold text-[14px]"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleSaveBudget}
                    disabled={budgetStr === String(currentBudget)}
                    className="h-10 px-6 rounded-xl bg-slate-900 text-white text-[13px] font-bold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:hover:bg-slate-900 shadow-sm"
                  >
                    {budgetStr === String(currentBudget) ? 'Saved' : 'Save Budget'}
                  </button>
                </div>
                
                <div className="flex-1 min-h-0 relative select-none touch-none rounded-2xl overflow-hidden outline-none border-0 ring-0">
                  {!hasBudgetData ? (
                    <div className="absolute inset-0 grid place-items-center">
                      <div className="text-[14px] font-extrabold text-slate-400">No Data</div>
                    </div>
                  ) : null}
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={budgetChartData} margin={{ top: 10, right: 18, bottom: 8, left: 12 }}>
                      <defs>
                        <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.20} />
                          <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="rgba(15,23,42,0.06)" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={8} tickMargin={8} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => formatAmount(Number(v) || 0)} width={92} />
                      {hasBudgetData ? (
                        <>
                          <Tooltip content={<BudgetTooltip />} cursor={{ stroke: 'rgba(244,63,94,0.22)', strokeWidth: 1, strokeDasharray: '3 3' }} />
                          <Line type="monotone" dataKey="budget" stroke="#94a3b8" strokeWidth={2.6} strokeDasharray="6 4" dot={false} activeDot={false} />
                          <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={2.6} fill="url(#expenseFill)" dot={false} activeDot={{ r: 4.5, fill: '#f43f5e', stroke: '#fff', strokeWidth: 2 }} />
                        </>
                      ) : null}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}

            {activeTab === 'income' && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-[12px] font-semibold text-slate-700">Income Range</div>
                  <div className="relative" ref={rangeMenuRef}>
                    <button
                      type="button"
                      onClick={() => setRangeMenuOpen((v) => !v)}
                      className="h-9 px-3 rounded-full bg-slate-50 text-slate-800 ring-1 ring-slate-200 hover:bg-slate-100 transition-colors text-[12px] font-semibold inline-flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 shadow-sm"
                    >
                      {rangeLabel}
                      <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-500" aria-hidden="true"><path fill="currentColor" d="M7 10l5 5 5-5 1.4 1.4-6.4 6.4-6.4-6.4L7 10z" /></svg>
                    </button>
                    {rangeMenuOpen && (
                      <div className="absolute right-0 mt-2 w-36 overflow-hidden rounded-2xl bg-white ring-1 ring-black/10 shadow-[0_20px_44px_-30px_rgba(15,23,42,0.65)] z-50">
                        {rangeOptions.map((o) => (
                          <button
                            key={o.days}
                            type="button"
                            onClick={() => { setRangeDays(o.days); setRangeMenuOpen(false); }}
                            className={['w-full px-3 py-2 text-left text-[12px] font-semibold transition-colors', o.days === rangeDays ? 'bg-slate-950 text-white' : 'text-slate-700 hover:bg-slate-50'].join(' ')}
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1 min-h-0 relative select-none touch-none rounded-2xl overflow-hidden outline-none border-0 ring-0">
                  {!hasIncomeData ? (
                    <div className="absolute inset-0 grid place-items-center">
                      <div className="text-[14px] font-extrabold text-slate-400">No Data</div>
                    </div>
                  ) : null}
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={incomeChartData} margin={{ top: 10, right: 18, bottom: 8, left: 12 }}>
                      <defs>
                        <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#16a34a" stopOpacity={0.20} />
                          <stop offset="100%" stopColor="#16a34a" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="rgba(15,23,42,0.06)" />
                      <XAxis dataKey="ts" type="number" domain={['dataMin', 'dataMax']} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={8} tickFormatter={xTickFormatterIncome as any} tickMargin={8} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => formatAmount(Number(v) || 0)} width={92} domain={incomeYDomain as any} />
                      {hasIncomeData ? (
                        <>
                          <Tooltip content={<IncomeTooltip />} cursor={{ stroke: 'rgba(22,163,74,0.22)', strokeWidth: 1, strokeDasharray: '3 3' }} />
                          <Area type="monotone" dataKey="value" stroke="#16a34a" strokeWidth={2.6} fill="url(#incomeFill)" dot={false} activeDot={{ r: 4.5, fill: '#16a34a', stroke: '#fff', strokeWidth: 2 }} />
                        </>
                      ) : null}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetAndTrendsModal;
