import React from 'react';
import { useExpenseContext } from '../../contexts/ExpenseContext';
import { useCurrency } from '../../contexts/CurrencyContext';

type TxItem = {
  id: string;
  type: 'income' | 'expense' | 'investment' | string;
  amount: number;
  label: string;
  categoryName: string;
  dt: Date;
  when: string;
};

function ArrowUpIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7 10l5-5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowDownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 19V5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7 14l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 16l6-6 4 4 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 8v4h-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const parseTransactionDate = (raw: unknown): Date | null => {
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : raw;
  if (typeof raw === 'number') {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const s = String(raw || '').trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/.exec(s);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));

  const parsed = new Date(s);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isSameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const formatWhen = (dt: Date, now: Date) => {
  const ms = now.getTime() - dt.getTime();
  const mins = Math.round(ms / 60000);
  if (mins >= 0 && mins <= 120) return mins <= 1 ? 'Just now' : `${mins}m ago`;
  if (isSameDay(dt, now)) {
    try {
      return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(dt);
    } catch {
      return dt.toLocaleTimeString();
    }
  }
  try {
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: '2-digit' }).format(dt);
  } catch {
    return dt.toLocaleDateString();
  }
};

const iconFor = (t: { type: string }) => {
  if (t.type === 'income') {
    return { icon: <ArrowUpIcon />, tone: 'text-emerald-700 bg-emerald-50 ring-emerald-100', chip: 'chip chip-good' };
  }
  if (t.type === 'investment') {
    return { icon: <TrendIcon />, tone: 'text-indigo-700 bg-indigo-50 ring-indigo-100', chip: 'chip' };
  }
  return { icon: <ArrowDownIcon />, tone: 'text-rose-700 bg-rose-50 ring-rose-100', chip: 'chip chip-bad' };
};

export default function ActivityFeedCard() {
  const { transactions, categories } = useExpenseContext();
  const { formatFromBase } = useCurrency();

  const items = React.useMemo<TxItem[]>(() => {
    const now = new Date();
    const catById = new Map<string, any>();
    for (const c of categories || []) catById.set(String(c?.id || ''), c);

    const tx = Array.isArray(transactions) ? transactions : [];
    return tx
      .map((t: any) => {
        const dt = parseTransactionDate(t?.date);
        if (!dt) return null;
        const type = String(t?.type || 'expense');
        const amount = Math.abs(Number(t?.amount) || 0);
        if (!(amount > 0)) return null;
        const categoryId = String(t?.category || 'other');
        const categoryName = String(catById.get(categoryId)?.name || categoryId || 'Other');
        const label = String(t?.description || '').trim() || categoryName || 'Transaction';
        return {
          id: String(t?.id || `${t?.date}-${t?.amount}-${t?.category}-${t?.type}`),
          type,
          amount,
          label,
          categoryName,
          dt,
          when: formatWhen(dt, now),
        } satisfies TxItem;
      })
      .filter((t): t is TxItem => Boolean(t))
      .sort((a, b) => b.dt.getTime() - a.dt.getTime())
      .slice(0, 6);
  }, [categories, transactions]);

  const summary = React.useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let inToday = 0;
    let outToday = 0;
    for (const t of items) {
      if (t.dt.getTime() < start.getTime()) continue;
      if (t.type === 'income') inToday += t.amount;
      else if (t.type === 'investment') {
        // neutral
      } else outToday += t.amount;
    }
    const net = inToday - outToday;
    return { inToday, outToday, net, count: items.length };
  }, [items]);

  const openTransactions = () => window.dispatchEvent(new CustomEvent('finvision:navigate', { detail: { tab: 'transactions' } }));

  return (
    <div className="surface surface-pad-sm surface-pressable">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-slate-700">Real-time activity</div>
          <div className="mt-1 text-[11px] text-slate-400">Recent transactions</div>
          {items.length ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="chip">Latest: {summary.count}</span>
              <span className="chip chip-good">In today: +{formatFromBase(summary.inToday)}</span>
              <span className="chip chip-bad">Out today: -{formatFromBase(summary.outToday)}</span>
              <span className={`chip ${summary.net >= 0 ? 'chip-good' : 'chip-bad'}`}>
                Net today: {summary.net >= 0 ? '+' : '-'}
                {formatFromBase(Math.abs(summary.net))}
              </span>
            </div>
          ) : null}
        </div>
        <button type="button" onClick={openTransactions} className="text-[11px] font-semibold text-slate-600 hover:text-slate-800">
          View
        </button>
      </div>

      <div className="mt-3 space-y-2.5">
        {items.length ? (
          items.map((t) => {
            const meta = iconFor(t);
            const amountTone = t.type === 'income' ? 'text-emerald-700' : t.type === 'investment' ? 'text-indigo-700' : 'text-rose-600';
            const amountPrefix = t.type === 'income' ? '+' : t.type === 'investment' ? '•' : '-';
            return (
              <button
                key={t.id}
                type="button"
                onClick={openTransactions}
                className="w-full text-left tile tile-pad flex items-center gap-3 transition-[transform,box-shadow,background-color] duration-150 hover:-translate-y-0.5 hover:shadow-soft hover:bg-white/60 dark:hover:bg-slate-950/40"
                title="Open transactions"
              >
                <div className={`h-9 w-9 rounded-2xl ring-1 grid place-items-center shrink-0 ${meta.tone}`}>
                  <span className="text-sm" aria-hidden="true">
                    {meta.icon}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-semibold text-slate-800 truncate">{t.label}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                    <span className={meta.chip}>{t.categoryName}</span>
                    <span className="chip">{t.when}</span>
                  </div>
                </div>
                <div className={`text-[12px] font-semibold tabular-nums ${amountTone}`}>
                  {amountPrefix}
                  {formatFromBase(t.amount)}
                </div>
              </button>
            );
          })
        ) : (
          <div className="text-[12px] text-slate-500">No transactions yet. Add one to populate the feed.</div>
        )}
      </div>
    </div>
  );
}
