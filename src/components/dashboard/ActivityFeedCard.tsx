import React, { useMemo } from 'react';
import { useExpenseContext } from '../../contexts/ExpenseContext';
import { useCurrency } from '../../contexts/CurrencyContext';

const iconFor = (t: any) => {
  if (t?.type === 'income') return { icon: '⬆️', tone: 'text-emerald-700 bg-emerald-50 ring-emerald-100' };
  if (t?.type === 'investment') return { icon: '📈', tone: 'text-indigo-700 bg-indigo-50 ring-indigo-100' };
  return { icon: '⬇️', tone: 'text-rose-700 bg-rose-50 ring-rose-100' };
};

export default function ActivityFeedCard() {
  const { transactions, categories } = useExpenseContext();
  const { formatFromBase } = useCurrency();

  const items = useMemo(() => {
    const catById = new Map();
    for (const c of categories || []) catById.set(c.id, c);

    return (transactions || [])
      .slice()
      .sort((a: any, b: any) => new Date(b?.date || 0).getTime() - new Date(a?.date || 0).getTime())
      .slice(0, 6)
      .map((t: any) => ({
        id: t?.id || `${t?.date}-${t?.amount}`,
        type: t?.type || 'expense',
        amount: Number(t?.amount) || 0,
        label: t?.description || (catById.get(t?.category)?.name || t?.category || 'Transaction'),
        date: t?.date ? new Date(t.date).toLocaleDateString() : '',
      }));
  }, [categories, transactions]);

  return (
    <div className="surface surface-pad-sm surface-pressable">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-slate-700">Real-time activity</div>
          <div className="mt-1 text-[11px] text-slate-400">Recent transactions</div>
        </div>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('finvision:navigate', { detail: { tab: 'transactions' } }))}
          className="text-[11px] font-semibold text-slate-600 hover:text-slate-800"
        >
          View
        </button>
      </div>

      <div className="mt-3 space-y-2.5">
        {items.length ? (
          items.map((t) => {
            const meta = iconFor(t);
            return (
              <div key={t.id} className="flex items-center gap-3">
                <div className={`h-9 w-9 rounded-2xl ring-1 grid place-items-center ${meta.tone}`}>
                  <span className="text-sm">{meta.icon}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-semibold text-slate-800 truncate">{t.label}</div>
                  <div className="text-[11px] text-slate-400">{t.date}</div>
                </div>
                <div
                  className={`text-[12px] font-semibold ${
                    t.type === 'income' ? 'text-emerald-700' : t.type === 'investment' ? 'text-indigo-700' : 'text-rose-600'
                  }`}
                >
                  {t.type === 'income' ? '+' : t.type === 'investment' ? '•' : '-'}
                  {formatFromBase(t.amount)}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-[12px] text-slate-500">No transactions yet. Add one to populate the feed.</div>
        )}
      </div>
    </div>
  );
}
