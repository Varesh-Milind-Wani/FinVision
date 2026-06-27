import React from 'react';

function ActionIcon({ type }: { type: 'expense' | 'income' | 'transfer' | 'bill' }) {
  switch (type) {
    case 'expense':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      );
    case 'income':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14"></path>
          <path d="m19 12-7 7-7-7"></path>
        </svg>
      );
    case 'transfer':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 3v18"></path>
          <path d="m10 14 7 7 7-7"></path>
          <path d="M7 21V3"></path>
          <path d="m3 10 7-7 7 7"></path>
        </svg>
      );
    case 'bill':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      );
  }
}

const QuickActionsPanel = () => {
  const actions = [
    {
      id: 'add-expense',
      label: 'Add Expense',
      icon: 'expense',
      color: 'bg-rose-500',
      shadow: 'shadow-rose-500/20',
      action: () => window.dispatchEvent(new CustomEvent('finvision:navigate', { detail: { tab: 'transactions' } }))
    },
    {
      id: 'add-income',
      label: 'Add Income',
      icon: 'income',
      color: 'bg-emerald-500',
      shadow: 'shadow-emerald-500/20',
      action: () => window.dispatchEvent(new CustomEvent('finvision:navigate', { detail: { tab: 'transactions' } }))
    },
    {
      id: 'transfer',
      label: 'Transfer',
      icon: 'transfer',
      color: 'bg-indigo-500',
      shadow: 'shadow-indigo-500/20',
      action: () => window.dispatchEvent(new CustomEvent('finvision:navigate', { detail: { tab: 'transactions' } }))
    },
    {
      id: 'upload-bill',
      label: 'Upload Bill',
      icon: 'bill',
      color: 'bg-purple-500',
      shadow: 'shadow-purple-500/20',
      action: () => window.dispatchEvent(new CustomEvent('finvision:navigate', { detail: { tab: 'transactions' } }))
    }
  ] as const;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[24px] p-5 md:p-6 shadow-soft ring-1 ring-slate-200/50 dark:ring-white/10 relative h-full flex flex-col justify-center">
      <div className="mb-4">
        <h3 className="font-display text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">Quick Actions</h3>
        <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">Frequent tasks</p>
      </div>
      <div className="grid grid-cols-2 gap-3 flex-1">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={action.action}
            className={`group relative overflow-hidden rounded-2xl flex flex-col items-center justify-center gap-2 p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${action.shadow} bg-slate-50 dark:bg-slate-800/50 ring-1 ring-slate-200/60 dark:ring-white/5 hover:ring-slate-300 dark:hover:ring-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/40`}
          >
            <div className={`h-10 w-10 rounded-xl grid place-items-center text-white ${action.color} shadow-sm group-hover:scale-110 transition-transform duration-300`}>
              <ActionIcon type={action.icon} />
            </div>
            <span className="text-[12px] font-bold text-slate-700 dark:text-slate-200">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActionsPanel;
