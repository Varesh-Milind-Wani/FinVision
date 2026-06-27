import React, { useMemo } from 'react';
import { useExpenseContext } from '../../contexts/ExpenseContext';
import { useCurrency } from '../../contexts/CurrencyContext';

const BudgetOverviewWidget = () => {
  const { transactions, categories, dashboardPrefs } = useExpenseContext() as any;
  const { formatFromBase } = useCurrency();

  const budgets = useMemo(() => {
    // Generate some interesting budget progress based on actual transactions
    const tx = Array.isArray(transactions) ? transactions : [];
    const catById = new Map<string, any>();
    for (const c of (categories || [])) catById.set(c.id, c);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const spendByCat = new Map<string, number>();
    let totalSpend = 0;

    for (const t of tx) {
      if (t?.type !== 'expense') continue;
      const dt = new Date(t.date);
      if (dt < startOfMonth) continue;
      const amt = Math.abs(Number(t.amount) || 0);
      const cat = String(t.category || 'other');
      spendByCat.set(cat, (spendByCat.get(cat) || 0) + amt);
      totalSpend += amt;
    }

    // Overall budget progress
    const overallBudget = dashboardPrefs?.monthlyExpenseBudget || (totalSpend > 0 ? totalSpend * 1.5 : 50000);
    
    // Sort categories by spend
    const sortedCats = Array.from(spendByCat.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4);
    
    const palette = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6'];

    const items = sortedCats.map(([id, spent], idx) => {
      const name = catById.get(id)?.name || id;
      // Mock a budget for the category based on spend
      const budget = Math.max(spent * 1.2, spent + 500);
      const pct = Math.min(100, (spent / budget) * 100);
      return {
        id,
        name,
        spent,
        budget,
        pct,
        color: catById.get(id)?.color || palette[idx]
      };
    });

    if (items.length === 0) {
      items.push({ id: 'demo', name: 'Food & Dining', spent: 0, budget: 15000, pct: 0, color: '#ef4444' });
    }

    const overallPct = Math.min(100, (totalSpend / overallBudget) * 100);

    return { totalSpend, overallBudget, overallPct, items };
  }, [transactions, categories, dashboardPrefs]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[24px] p-5 md:p-6 shadow-soft ring-1 ring-slate-200/50 dark:ring-white/10 h-full flex flex-col">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-display text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Budgets</div>
          <div className="mt-1 text-[13px] text-slate-500 dark:text-slate-400 font-medium">Monthly limits</div>
        </div>
        <div className="text-right">
          <div className="text-[14px] font-bold text-slate-900 dark:text-white">{formatFromBase(budgets.totalSpend)}</div>
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">of {formatFromBase(budgets.overallBudget)}</div>
        </div>
      </div>

      {/* Overall Progress */}
      <div className="mt-4">
        <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 ring-1 ring-slate-200/50 dark:ring-white/5 overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-1000 ${budgets.overallPct > 90 ? 'bg-rose-500' : budgets.overallPct > 75 ? 'bg-amber-500' : 'bg-emerald-500'}`}
            style={{ width: `${budgets.overallPct}%` }}
          />
        </div>
      </div>

      <div className="mt-6 flex-1 flex flex-col gap-5">
        {budgets.items.map((item) => (
          <div key={item.id} className="group">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="text-[12px] font-bold text-slate-700 dark:text-slate-300">{item.name}</div>
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                <span className="text-slate-900 dark:text-white font-bold">{formatFromBase(item.spent)}</span> / {formatFromBase(item.budget)}
              </div>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
              <div 
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 opacity-90 group-hover:opacity-100"
                style={{ width: `${item.pct}%`, backgroundColor: item.color }}
              />
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/50">
        <button className="text-[12px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors w-full text-center focus:outline-none">
          Manage all budgets →
        </button>
      </div>
    </div>
  );
};

export default BudgetOverviewWidget;
