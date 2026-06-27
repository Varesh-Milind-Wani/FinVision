import React from 'react';
import { useCurrency } from '../../contexts/CurrencyContext';

const UpcomingBillsWidget = () => {
  const { formatFromBase } = useCurrency();

  // Mock upcoming bills for the premium dashboard design
  const bills = [
    { id: '1', name: 'Netflix Subscription', amount: 15.99, due: 'Tomorrow', icon: 'netflix', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-500/10' },
    { id: '2', name: 'Electricity Bill', amount: 85.50, due: 'In 3 days', icon: 'zap', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-500/10' },
    { id: '3', name: 'Car Insurance', amount: 120.00, due: 'In 5 days', icon: 'car', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-500/10' },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[24px] p-5 md:p-6 shadow-soft ring-1 ring-slate-200/50 dark:ring-white/10 h-full flex flex-col">
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <div className="font-display text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Upcoming Bills</div>
          <div className="mt-1 text-[13px] text-slate-500 dark:text-slate-400 font-medium">Next 7 days</div>
        </div>
        <button type="button" className="text-[12px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors focus:outline-none">
          Manage
        </button>
      </div>

      <div className="flex-1 flex flex-col gap-3">
        {bills.map((b) => (
          <div key={b.id} className="group flex items-center gap-4 p-3 rounded-2xl transition-all duration-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 ring-1 ring-transparent hover:ring-slate-200/60 dark:hover:ring-white/5">
            <div className={`h-11 w-11 rounded-[16px] grid place-items-center shrink-0 ${b.bg} ${b.color} group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
              <span className="font-bold text-sm tracking-tight">{b.icon.charAt(0).toUpperCase()}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-bold text-slate-900 dark:text-white truncate">{b.name}</div>
              <div className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                Due {b.due}
              </div>
            </div>
            <div className="text-[14px] font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-white">
              {formatFromBase(b.amount)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UpcomingBillsWidget;
