import React, { useMemo } from 'react';
import { useExpenseContext } from '../../contexts/ExpenseContext';

export default function ExpenseExplanationCard() {
  const { transactions, categories } = useExpenseContext();

  const bullets = useMemo(() => {
    const catById = new Map();
    for (const c of categories || []) catById.set(c.id, c);

    const totals = new Map();
    let weekendTransport = 0;
    let transport = 0;

    for (const t of transactions || []) {
      if (t?.type !== 'expense') continue;
      const amt = Number(t?.amount) || 0;
      const cat = String(t?.category || 'other');
      totals.set(cat, (totals.get(cat) || 0) + amt);

      if (cat === 'transportation') {
        transport += amt;
        const dt = new Date(t?.date);
        const day = dt.getDay();
        if (day === 0 || day === 6) weekendTransport += amt;
      }
    }

    const sorted = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const top = sorted.map(([id, amt]) => ({
      id,
      name: catById.get(id)?.name || id,
      amt,
    }));

    const weekendPct = transport > 0 ? (weekendTransport / transport) * 100 : 0;

    return [
      top[0] ? `Your biggest driver is ${top[0].name} spend this period.` : 'Add more expense transactions to generate explanations.',
      top[1] ? `${top[1].name} is the second-largest contributor.` : 'Track categories consistently to improve accuracy.',
      transport > 0 ? `Transport is ${weekendPct.toFixed(0)}% weekend-heavy.` : 'Transport patterns will appear once you log more rides.',
    ];
  }, [categories, transactions]);

  return (
    <div className="surface surface-pad-sm surface-pressable">
      <div className="text-xs font-semibold text-slate-700">Why did you spend more?</div>
      <div className="mt-1 text-[11px] text-slate-400">AI explanation (local, mock)</div>

      <ul className="mt-3 space-y-2.5">
        {bullets.map((t) => (
          <li key={t} className="flex items-start gap-2">
            <span className="mt-1 h-2 w-2 rounded-full bg-slate-300" />
            <div className="text-[11px] text-slate-600 leading-5">{t}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
