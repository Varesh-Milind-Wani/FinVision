import React, { useState } from 'react';
import { useBudgetContext } from '../contexts/BudgetContext';
import { useCurrency } from '../contexts/CurrencyContext';
import CreateBudgetModal from './dashboard/CreateBudgetModal';
import AnimatedKpiValue from './dashboard/AnimatedKpiValue';
import { Area, AreaChart, Pie, PieChart, Cell, CartesianGrid, ComposedChart, Line, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useExpenseContext } from '../contexts/ExpenseContext';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const Budgets = () => {
  const { budgets, getBudgetUsage, deleteBudget } = useBudgetContext();
  const { formatFromBase, displayCurrencyCode } = useCurrency();
  const { transactions } = useExpenseContext() as any;

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // High-level aggregate metrics
  const totalBudget = budgets.reduce((acc, b) => acc + (b.amount || 0), 0);
  const totalSpent = budgets.reduce((acc, b) => acc + getBudgetUsage(b.id).spent, 0);
  const totalSavingsGoal = budgets.reduce((acc, b) => acc + (b.savingsGoal || 0), 0);
  const remaining = Math.max(0, totalBudget - totalSpent);
  const usagePercent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  
  // Forecast mockup logic
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const currentDay = new Date().getDate();
  const forecastedSpending = currentDay > 0 ? (totalSpent / currentDay) * daysInMonth : 0;
  const daysRemaining = daysInMonth - currentDay;

  // Chart data mocks based on budgets
  const budgetVsExpenseData = budgets.map(b => {
    const usage = getBudgetUsage(b.id);
    return {
      name: b.name,
      budget: b.amount,
      spent: usage.spent
    };
  });

  const categoryBreakdownData = budgets.filter(b => b.category !== 'All').map((b, i) => ({
    name: b.category,
    value: getBudgetUsage(b.id).spent || 1, // Fallback for visualization if 0
    color: COLORS[i % COLORS.length]
  }));

  const exportCSV = () => {
    if (budgets.length === 0) return alert('No budgets to export.');
    const headers = ['Name', 'Amount', 'Currency', 'Period', 'Category', 'Spent', 'Remaining', 'Usage %', 'Status'];
    const rows = budgets.map(b => {
      const usage = getBudgetUsage(b.id);
      return [
        b.name, b.amount, b.currency, b.period, b.category, 
        usage.spent, usage.remaining, usage.usagePercent.toFixed(1), b.status
      ].join(',');
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'budgets_export.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="animate-fade-in pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Budget Management</h1>
          <p className="text-sm text-slate-500 mt-1">Smart tracking, AI insights, and forecasting.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-white ring-1 ring-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors shadow-sm whitespace-nowrap active:scale-[0.98]"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
            Export
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-indigo-600 to-blue-600 text-white text-sm font-bold rounded-xl hover:shadow-lg transition-all whitespace-nowrap active:scale-[0.98]"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Create Budget
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Budget', value: totalBudget, format: true },
          { label: 'Amount Spent', value: totalSpent, format: true },
          { label: 'Remaining', value: remaining, format: true },
          { label: 'Usage Percentage', value: usagePercent, format: false, suffix: '%' },
          { label: 'Forecasted Spending', value: forecastedSpending, format: true },
          { label: 'Days Remaining', value: daysRemaining, format: false },
          { label: 'Savings Goal', value: totalSavingsGoal, format: true },
        ].map((kpi, idx) => (
          <div key={idx} className="bg-white/80 backdrop-blur-xl p-5 rounded-3xl ring-1 ring-black/[0.04] shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2">{kpi.label}</div>
            <div className="font-display text-xl sm:text-2xl font-extrabold text-slate-900">
              {kpi.format ? (
                <AnimatedKpiValue value={kpi.value} formatValue={formatFromBase} />
              ) : (
                <>{kpi.value.toFixed(1)}{kpi.suffix}</>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Budget vs Expense (Composed Chart) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl ring-1 ring-black/[0.04] shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-6">Budget vs Actual Expense</h3>
          <div className="h-[300px]">
            {budgetVsExpenseData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={budgetVsExpenseData}>
                  <CartesianGrid vertical={false} stroke="rgba(15,23,42,0.06)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => formatFromBase(v)} tick={{ fontSize: 12, fill: '#64748b' }} dx={-10} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="bg-white p-3 rounded-xl shadow-xl ring-1 ring-black/10">
                          <p className="font-bold text-sm mb-2">{label}</p>
                          <p className="text-sm text-slate-600"><span className="inline-block w-2 h-2 rounded-full bg-slate-300 mr-2"/>Budget: {formatFromBase(payload[0].value)}</p>
                          <p className="text-sm text-slate-600"><span className="inline-block w-2 h-2 rounded-full bg-rose-500 mr-2"/>Spent: {formatFromBase(payload[1].value)}</p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="budget" fill="#e2e8f0" radius={[4, 4, 0, 0]} maxBarSize={60} />
                  <Bar dataKey="spent" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={60} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm font-semibold text-slate-400">No budgets created yet</div>
            )}
          </div>
        </div>

        {/* Category Breakdown (Donut) */}
        <div className="bg-white p-6 rounded-3xl ring-1 ring-black/[0.04] shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-6">Category Breakdown</h3>
          <div className="h-[300px]">
            {categoryBreakdownData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip 
                    formatter={(value: any) => formatFromBase(value)}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                  />
                  <Pie
                    data={categoryBreakdownData}
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {categoryBreakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm font-semibold text-slate-400">Not enough data</div>
            )}
          </div>
        </div>
      </div>

      {/* Active Budgets List */}
      <div>
        <h3 className="font-display text-lg font-bold text-slate-900 mb-4">Active Budgets</h3>
        {budgets.length === 0 ? (
          <div className="bg-slate-50 border border-slate-200 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center text-center">
            <div className="h-16 w-16 bg-white rounded-full grid place-items-center shadow-sm mb-4 ring-1 ring-slate-100">
              <span className="text-2xl font-extrabold text-blue-500">
                {new Intl.NumberFormat(undefined, { style: 'currency', currency: displayCurrencyCode || 'USD', maximumFractionDigits: 0 })
                  .format(0)
                  .replace(/[0-9.,\s]/g, '').trim() || (displayCurrencyCode || 'USD')}
              </span>
            </div>
            <h4 className="text-slate-900 font-bold mb-1">No Budgets Found</h4>
            <p className="text-slate-500 text-sm max-w-sm mb-4">Start managing your finances by creating a smart budget with AI insights and automated tracking.</p>
            <button onClick={() => setIsCreateOpen(true)} className="px-5 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-md">Create your first budget</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {budgets.map(b => {
              const usage = getBudgetUsage(b.id);
              const isOver = usage.usagePercent > 100;
              const isAlert = usage.usagePercent >= b.alertPercentage;
              
              return (
                <div key={b.id} className="bg-white p-5 rounded-3xl ring-1 ring-black/[0.04] shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => deleteBudget(b.id)} className="text-slate-400 hover:text-rose-500 transition-colors">
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl grid place-items-center text-white font-bold" style={{ backgroundColor: b.color }}>
                      {b.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{b.name}</div>
                      <div className="text-xs text-slate-500 font-semibold">{b.period} • {b.category}</div>
                    </div>
                  </div>
                  
                  <div className="mb-2 flex justify-between items-end">
                    <div>
                      <div className="text-xs text-slate-500 font-bold uppercase">Spent</div>
                      <div className="font-extrabold text-lg text-slate-900">{formatFromBase(usage.spent)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-500 font-bold uppercase">Budget</div>
                      <div className="font-extrabold text-slate-400">{formatFromBase(b.amount)}</div>
                    </div>
                  </div>
                  
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden mb-3">
                    <div 
                      className={`h-full rounded-full ${isOver ? 'bg-rose-500' : isAlert ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(100, usage.usagePercent)}%` }}
                    />
                  </div>
                  
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className={isOver ? 'text-rose-600' : isAlert ? 'text-amber-600' : 'text-slate-500'}>
                      {usage.usagePercent.toFixed(1)}% used
                    </span>
                    <span className="text-slate-500">{formatFromBase(usage.remaining)} left</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CreateBudgetModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
    </div>
  );
};

export default Budgets;
