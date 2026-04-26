import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useExpenseContext } from '../contexts/ExpenseContext';
import { useCurrency } from '../contexts/CurrencyContext';
import {
  coerceCategoryForType,
  formatTxCount,
  getIncomeCategories,
  parseTransactionMessage,
  sumByType,
} from '../utils/assistantTransactions';
import { buildAssistantAnswer } from '../utils/assistantAnswers';

const STORAGE_KEY = 'finvision.aiChat.v1';

const safeParse = (raw) => {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const Bubble = ({ role, text, children }) => (
  <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
    <div
      className={[
        'max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-6 ring-1 shadow-soft',
        role === 'user'
          ? 'bg-blue-600 text-white ring-blue-500/30'
          : 'bg-white/90 dark:bg-slate-950/40 text-slate-800 dark:text-slate-100 ring-black/5 dark:ring-white/[0.12]',
      ].join(' ')}
    >
      {text}
      {children}
    </div>
  </div>
);

const TypePill = ({ type }) => {
  const isIncome = type === 'income';
  const isInvestment = type === 'investment';
  return (
    <span
      className={[
        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ring-1',
        isIncome
          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200 ring-emerald-500/20'
          : isInvestment
            ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-200 ring-indigo-500/20'
            : 'bg-rose-500/10 text-rose-700 dark:text-rose-200 ring-rose-500/20',
      ].join(' ')}
    >
      {isIncome ? 'Income' : isInvestment ? 'Investment' : 'Expense'}
    </span>
  );
};

const TxSummaryCard = ({ txIds, onRequestFocusInput }) => {
  const { transactions, categories, editTransaction, deleteTransaction } = useExpenseContext();
  const { formatFromBase } = useCurrency();
  const incomeCategories = useMemo(() => getIncomeCategories(), []);

  const txById = useMemo(() => {
    const map = new Map();
    for (const t of transactions || []) map.set(t?.id, t);
    return map;
  }, [transactions]);

  const list = useMemo(
    () => (Array.isArray(txIds) ? txIds.map((id) => txById.get(id)).filter(Boolean) : []),
    [txById, txIds]
  );

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of list) {
      const amt = Number(t?.amount) || 0;
      if (t?.type === 'income') income += amt;
      else if (t?.type === 'expense') expense += amt;
    }
    return { income, expense };
  }, [list]);

  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ description: '', amount: '', type: 'expense', category: 'other', date: '' });
  const activeTx = editingId ? txById.get(editingId) : null;

  useEffect(() => {
    if (!activeTx) return;
    setDraft({
      description: String(activeTx.description || ''),
      amount: String(activeTx.amount ?? ''),
      type: activeTx.type === 'income' ? 'income' : 'expense',
      category: String(activeTx.category || ''),
      date: String(activeTx.date || ''),
    });
  }, [activeTx]);

  const expenseCategoryOptions = categories || [];
  const categoryOptions = draft.type === 'income' ? incomeCategories : expenseCategoryOptions;

  const trySave = () => {
    if (!activeTx) return;
    const amountNum = Number(String(draft.amount || '').replace(/,/g, '').trim());
    if (!Number.isFinite(amountNum) || Math.abs(amountNum) <= 0) return;

    const nextType = draft.type === 'income' ? 'income' : 'expense';
    const nextAmount = Math.round(Math.abs(amountNum) * 100) / 100;
    const nextCategory = coerceCategoryForType(nextType, draft.category, expenseCategoryOptions);
    const nextDate = String(draft.date || '').trim();
    const iso = /^\d{4}-\d{2}-\d{2}$/.test(nextDate) ? nextDate : activeTx.date;

    editTransaction({
      ...activeTx,
      type: nextType,
      amount: nextAmount,
      category: nextCategory,
      description: String(draft.description || '').trim() || (nextType === 'income' ? 'Income' : 'Expense'),
      date: iso,
    });

    setEditingId(null);
    onRequestFocusInput?.();
  };

  return (
    <div className="mt-3 rounded-2xl bg-slate-50/80 dark:bg-slate-900/35 ring-1 ring-black/5 dark:ring-white/[0.10] p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] font-extrabold text-slate-700 dark:text-slate-200">Added summary</div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400">
          +{formatFromBase(totals.income)} • -{formatFromBase(totals.expense)}
        </div>
      </div>

      <div className="mt-2 space-y-2">
        {list.map((t) => {
          const isEditing = editingId === t.id;
          const isIncome = t.type === 'income';
          const isInvestment = t.type === 'investment';
          const categoryName = isIncome
            ? incomeCategories.find((c) => c.id === t.category)?.name || 'Income'
            : isInvestment
              ? String(t.category || '').trim() || 'Investment'
              : expenseCategoryOptions.find((c) => c.id === t.category)?.name || 'Other';
          return (
            <div key={t.id} className="rounded-xl bg-white/70 dark:bg-slate-950/30 ring-1 ring-black/5 dark:ring-white/[0.10] p-2.5">
              {!isEditing ? (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <TypePill type={t.type} />
                      <div className="text-xs font-extrabold text-slate-900 dark:text-slate-100 truncate">
                        {t.description || (isIncome ? 'Income' : isInvestment ? 'Investment' : 'Expense')}
                      </div>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-300 truncate">
                      {categoryName} • {t.date || '—'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs font-extrabold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {isIncome ? '+' : isInvestment ? '•' : '-'} {formatFromBase(t.amount)}
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingId(t.id)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-slate-100 dark:bg-slate-900/60 text-slate-700 dark:text-slate-200 ring-1 ring-black/5 dark:ring-white/[0.10] hover:bg-slate-200 dark:hover:bg-slate-900/75 transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={draft.type}
                      onChange={(e) => {
                        const nextType = e.target.value === 'income' ? 'income' : 'expense';
                        setDraft((d) => ({
                          ...d,
                          type: nextType,
                          category: coerceCategoryForType(nextType, d.category, expenseCategoryOptions),
                        }));
                      }}
                      className="h-10 px-3 rounded-xl bg-white/80 dark:bg-slate-900/40 ring-1 ring-black/5 dark:ring-white/[0.10] text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                      aria-label="Type"
                    >
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select>
                    <select
                      value={draft.category}
                      onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
                      className="h-10 px-3 rounded-xl bg-white/80 dark:bg-slate-900/40 ring-1 ring-black/5 dark:ring-white/[0.10] text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                      aria-label="Category"
                    >
                      {(categoryOptions || []).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-[minmax(0,1fr)_8.5rem] gap-2">
                    <input
                      value={draft.description}
                      onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                      className="h-10 px-3 rounded-xl bg-white/80 dark:bg-slate-900/40 ring-1 ring-black/5 dark:ring-white/[0.10] text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                      placeholder="Description"
                      aria-label="Description"
                    />
                    <input
                      value={draft.amount}
                      onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))}
                      className="h-10 px-3 rounded-xl bg-white/80 dark:bg-slate-900/40 ring-1 ring-black/5 dark:ring-white/[0.10] text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                      placeholder="Amount"
                      inputMode="decimal"
                      aria-label="Amount"
                    />
                  </div>

                  <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2 items-center">
                    <input
                      value={draft.date}
                      onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
                      className="h-10 px-3 rounded-xl bg-white/80 dark:bg-slate-900/40 ring-1 ring-black/5 dark:ring-white/[0.10] text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                      placeholder="YYYY-MM-DD"
                      aria-label="Date"
                    />
                    <button
                      type="button"
                      onClick={trySave}
                      className="h-10 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-extrabold ring-1 ring-blue-500/30 shadow-soft"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        deleteTransaction(t.id);
                        setEditingId(null);
                        onRequestFocusInput?.();
                      }}
                      className="h-10 px-3 rounded-xl bg-white/80 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-900/55 text-rose-600 dark:text-rose-300 text-[11px] font-extrabold ring-1 ring-black/5 dark:ring-white/[0.10]"
                    >
                      Delete
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">
        Tip: paste like "Expense Food -45, Travel-100" or "Income Salary 50000".
      </div>
    </div>
  );
};

const TxDraftCard = ({ initialEntries, categories, onConfirm, onCancel }) => {
  const { formatFromBase } = useCurrency();
  const incomeCategories = useMemo(() => getIncomeCategories(), []);
  const expenseCategoryOptions = categories || [];

  const [entries, setEntries] = useState(() =>
    (Array.isArray(initialEntries) ? initialEntries : []).map((e, idx) => ({
      id: `draft-${idx}-${Date.now()}`,
      type: e?.type === 'income' ? 'income' : 'expense',
      description: String(e?.description || '').trim(),
      amount: String(e?.amount ?? '').trim(),
      category: String(e?.category || ''),
      date: String(e?.date || ''),
    }))
  );

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const e of entries) {
      const amt = Number(String(e.amount || '').replace(/,/g, '').trim());
      if (!Number.isFinite(amt)) continue;
      if (e.type === 'income') income += Math.abs(amt);
      else expense += Math.abs(amt);
    }
    return { income, expense };
  }, [entries]);

  const [editingId, setEditingId] = useState(() => (entries[0]?.id ? entries[0].id : null));

  const updateEntry = (id, patch) => {
    setEntries((list) => list.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  const normalizeForSave = (e) => {
    const amountNum = Number(String(e.amount || '').replace(/,/g, '').trim());
    if (!Number.isFinite(amountNum) || Math.abs(amountNum) <= 0) return null;
    const type = e.type === 'income' ? 'income' : 'expense';
    const amount = Math.round(Math.abs(amountNum) * 100) / 100;
    const description = String(e.description || '').trim() || (type === 'income' ? 'Income' : 'Expense');
    const category = coerceCategoryForType(type, e.category, expenseCategoryOptions);
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(e.date || '').trim()) ? String(e.date).trim() : undefined;
    return { type, amount, description, category, date };
  };

  const canConfirm = entries.some((e) => normalizeForSave(e));

  return (
    <div className="mt-3 rounded-2xl bg-slate-50/80 dark:bg-slate-900/35 ring-1 ring-black/5 dark:ring-white/[0.10] p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] font-extrabold text-slate-700 dark:text-slate-200">Review before saving</div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400">
          +{formatFromBase(totals.income)} • -{formatFromBase(totals.expense)}
        </div>
      </div>

      <div className="mt-2 space-y-2">
        {entries.map((e) => {
          const isEditing = editingId === e.id;
          const isIncome = e.type === 'income';
          const categoryOptions = isIncome ? incomeCategories : expenseCategoryOptions;
          const categoryName = isIncome
            ? incomeCategories.find((c) => c.id === e.category)?.name || 'Income'
            : expenseCategoryOptions.find((c) => c.id === e.category)?.name || 'Other';
          return (
            <div key={e.id} className="rounded-xl bg-white/70 dark:bg-slate-950/30 ring-1 ring-black/5 dark:ring-white/[0.10] p-2.5">
              {!isEditing ? (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <TypePill type={e.type} />
                      <div className="text-xs font-extrabold text-slate-900 dark:text-slate-100 truncate">
                        {e.description || (isIncome ? 'Income' : 'Expense')}
                      </div>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-300 truncate">
                      {categoryName} • {e.date || '—'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs font-extrabold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {isIncome ? '+' : '-'} {formatFromBase(Number(String(e.amount || '').replace(/,/g, '').trim()) || 0)}
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingId(e.id)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-slate-100 dark:bg-slate-900/60 text-slate-700 dark:text-slate-200 ring-1 ring-black/5 dark:ring-white/[0.10] hover:bg-slate-200 dark:hover:bg-slate-900/75 transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={e.type}
                      onChange={(ev) => {
                        const nextType = ev.target.value === 'income' ? 'income' : 'expense';
                        updateEntry(e.id, {
                          type: nextType,
                          category: coerceCategoryForType(nextType, e.category, expenseCategoryOptions),
                        });
                      }}
                      className="h-10 px-3 rounded-xl bg-white/80 dark:bg-slate-900/40 ring-1 ring-black/5 dark:ring-white/[0.10] text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                      aria-label="Type"
                    >
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select>
                    <select
                      value={e.category}
                      onChange={(ev) => updateEntry(e.id, { category: ev.target.value })}
                      className="h-10 px-3 rounded-xl bg-white/80 dark:bg-slate-900/40 ring-1 ring-black/5 dark:ring-white/[0.10] text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                      aria-label="Category"
                    >
                      {(categoryOptions || []).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-[minmax(0,1fr)_8.5rem] gap-2">
                    <input
                      value={e.description}
                      onChange={(ev) => updateEntry(e.id, { description: ev.target.value })}
                      className="h-10 px-3 rounded-xl bg-white/80 dark:bg-slate-900/40 ring-1 ring-black/5 dark:ring-white/[0.10] text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                      placeholder="Description"
                      aria-label="Description"
                    />
                    <input
                      value={e.amount}
                      onChange={(ev) => updateEntry(e.id, { amount: ev.target.value })}
                      className="h-10 px-3 rounded-xl bg-white/80 dark:bg-slate-900/40 ring-1 ring-black/5 dark:ring-white/[0.10] text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                      placeholder="Amount"
                      inputMode="decimal"
                      aria-label="Amount"
                    />
                  </div>

                  <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 items-center">
                    <input
                      value={e.date}
                      onChange={(ev) => updateEntry(e.id, { date: ev.target.value })}
                      className="h-10 px-3 rounded-xl bg-white/80 dark:bg-slate-900/40 ring-1 ring-black/5 dark:ring-white/[0.10] text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                      placeholder="YYYY-MM-DD"
                      aria-label="Date"
                    />
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="h-10 px-3 rounded-xl bg-slate-100 dark:bg-slate-900/60 text-slate-700 dark:text-slate-200 text-[11px] font-extrabold ring-1 ring-black/5 dark:ring-white/[0.10] hover:bg-slate-200 dark:hover:bg-slate-900/75 transition-colors"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          disabled={!canConfirm}
          onClick={() => {
            const normalized = entries.map(normalizeForSave).filter(Boolean);
            onConfirm?.(normalized);
          }}
          className={[
            'h-10 px-3 rounded-xl text-[11px] font-extrabold ring-1 shadow-soft',
            canConfirm
              ? 'bg-blue-600 hover:bg-blue-700 text-white ring-blue-500/30'
              : 'bg-slate-200 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 ring-black/5 dark:ring-white/[0.10] cursor-not-allowed',
          ].join(' ')}
        >
          Yes, save
        </button>
        <button
          type="button"
          onClick={() => onCancel?.()}
          className="h-10 px-3 rounded-xl bg-white/80 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-900/55 text-slate-700 dark:text-slate-200 text-[11px] font-extrabold ring-1 ring-black/5 dark:ring-white/[0.10]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default function AIChatAssistant() {
  const { transactions, categories, addTransaction, totalExpenses, totalIncome, netBalance } = useExpenseContext();
  const { formatFromBase } = useCurrency();
  const makeId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const defaultMessages = useMemo(
    () => [
      { id: 'm0', role: 'assistant', text: 'Hi! I can add income/expenses and answer finance questions.' },
      { id: 'm1', role: 'assistant', text: 'Try: "Expense Food -45, Travel-100" or "Income 30 June 50000".' },
    ],
    []
  );

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(() => {
    const stored = safeParse(window.localStorage?.getItem?.(STORAGE_KEY));
    const list = Array.isArray(stored?.messages) ? stored.messages : null;
    const base = list?.length ? list : defaultMessages;
    return base.map((m, idx) => ({ id: m?.id || `m-${idx}-${Date.now()}`, ...m }));
  });
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    try {
      const toStore = (messages || [])
        .filter((m) => m?.kind !== 'tx_draft')
        .slice(-40)
        .map((m) => {
          const { draftEntries, ...rest } = m || {};
          return rest;
        });
      window.localStorage?.setItem?.(STORAGE_KEY, JSON.stringify({ messages: toStore }));
    } catch {
      // ignore
    }
  }, [messages]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      scrollRef.current?.scrollTo?.({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, 40);
    return () => window.clearTimeout(t);
  }, [messages, open]);

  const computeAnswer = (q) => {
    const out = buildAssistantAnswer({
      text: q,
      transactions: transactions || [],
      categories: categories || [],
      totals: {
        income: Number(totalIncome || 0),
        expense: Number(totalExpenses || 0),
        net: Number(netBalance || 0),
      },
      formatMoney: (n) => formatFromBase(Number(n) || 0),
    });
    return String(out?.text || '').trim() || 'Tell me what you want to do.';
  };

  const focusInput = () => inputRef.current?.focus?.();
  const resolveDraft = (id, next) => {
    if (!id) return;
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...next } : m)));
  };

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    setMessages((m) => [...m, { id: makeId(), role: 'user', text }]);

    const parsed = parseTransactionMessage(text, { expenseCategories: categories || [], now: new Date() });
    if (parsed?.entries?.length) {
      window.setTimeout(() => {
        const draftId = makeId();
        setMessages((m) => [
          ...m,
          {
            id: draftId,
            role: 'assistant',
            text: `I parsed ${formatTxCount(parsed.entries)}. Confirm in the box below to save, or edit first.`,
            kind: 'tx_draft',
            draftEntries: parsed.entries,
          },
        ]);
      }, 120);
      return;
    }

    window.setTimeout(() => {
      setMessages((m) => [...m, { id: makeId(), role: 'assistant', text: computeAnswer(text) }]);
    }, 260);
  };

  const panel = open ? (
    <div
      className="fixed z-[10001] w-[min(420px,92vw)] h-[min(560px,78dvh)]"
      style={{
        right: 'calc(1.5rem + var(--safe-area-inset-right))',
        bottom: 'calc(1.5rem + var(--safe-area-inset-bottom))',
      }}
    >
      <div className="h-full rounded-3xl overflow-hidden bg-white/70 dark:bg-slate-950/55 backdrop-blur-xl ring-1 ring-black/10 dark:ring-white/[0.12] shadow-2xl flex flex-col">
        <div className="px-5 py-4 border-b border-black/5 dark:border-white/10 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-extrabold text-slate-900 dark:text-white">FinVision Assistant</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">Local AI • Runs in your browser</div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="h-9 w-9 rounded-2xl ring-1 ring-black/5 dark:ring-white/[0.12] bg-white/70 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-900/55 transition-colors grid place-items-center"
            aria-label="Close FinVision Assistant"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-700 dark:text-slate-200" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 min-h-0 overflow-auto p-4 space-y-3 scrollbar-hide">
          {messages.map((msg) => (
            <Bubble key={msg.id} role={msg.role} text={msg.text}>
              {msg.role === 'assistant' && msg.kind === 'tx_draft' && Array.isArray(msg.draftEntries) && msg.draftEntries.length ? (
                <TxDraftCard
                  initialEntries={msg.draftEntries}
                  categories={categories || []}
                  onConfirm={(normalized) => {
                    const created = [];
                    for (const entry of normalized || []) {
                      const tx = addTransaction({
                        description: entry.description,
                        amount: entry.amount,
                        type: entry.type,
                        category: entry.category,
                        date: entry.date,
                      });
                      if (tx?.id) created.push(tx);
                    }

                    const totals = sumByType(normalized || []);
                    const messageText =
                      created.length === 0
                        ? "I couldn't save that. Please check the amounts and try again."
                        : `${formatTxCount(normalized || [])} added successfully. (+${formatFromBase(totals.income)} • -${formatFromBase(totals.expense)}). You can edit below if something is wrong.`;

                    resolveDraft(msg.id, {
                      kind: 'tx_result',
                      txIds: created.map((t) => t.id),
                      text: messageText,
                      draftEntries: undefined,
                    });
                    focusInput();
                  }}
                  onCancel={() => {
                    resolveDraft(msg.id, { kind: undefined, draftEntries: undefined, text: 'Cancelled — nothing saved.' });
                    focusInput();
                  }}
                />
              ) : null}
              {msg.role === 'assistant' && msg.kind === 'tx_result' && Array.isArray(msg.txIds) && msg.txIds.length ? (
                <TxSummaryCard txIds={msg.txIds} onRequestFocusInput={focusInput} />
              ) : null}
            </Bubble>
          ))}
        </div>

        <div className="p-4 border-t border-black/5 dark:border-white/10">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') send();
              }}
              placeholder='Ask about spending, budgets, goals… or paste "Food-45, Travel-100"'
              className="flex-1 h-11 px-4 rounded-2xl bg-white/80 dark:bg-slate-900/40 ring-1 ring-black/5 dark:ring-white/[0.12] focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
              aria-label="Chat input"
            />
            <button
              type="button"
              onClick={send}
              className="h-11 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-extrabold ring-1 ring-blue-500/30 shadow-soft"
            >
              Send
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {['Summary', 'Top category', 'How to save more', 'Expense Food-45, Travel-100', 'Income-50000 / Income 30 June 50000'].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => {
                  setInput(q);
                  window.setTimeout(() => send(), 0);
                }}
                className="px-3 py-1.5 rounded-full text-[11px] font-extrabold bg-slate-100 dark:bg-slate-900/50 text-slate-700 dark:text-slate-200 ring-1 ring-black/5 dark:ring-white/[0.10] hover:bg-slate-200 dark:hover:bg-slate-900/65 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={[
          'fixed z-[10000] h-14 w-14 rounded-full',
          'bg-slate-950 text-white shadow-lg ring-1 ring-white/10',
          'hover:bg-slate-900 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-blue-500/50',
        ].join(' ')}
        style={{
          right: 'calc(6rem + var(--safe-area-inset-right))',
          bottom: 'calc(1.5rem + var(--safe-area-inset-bottom))',
        }}
        aria-label="Open FinVision Assistant"
        title="FinVision Assistant"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6 mx-auto" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8z" />
        </svg>
      </button>

      {open ? createPortal(panel, document.body) : null}
    </>
  );
}
