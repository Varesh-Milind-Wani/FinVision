import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useExpenseContext } from '../contexts/ExpenseContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useAmountsVisibility } from '../contexts/AmountsVisibilityContext';
import { formatDate, formatTime12h } from '../utils/formatUtils';
import { useBodyScrollLock } from '../utils/scrollLock';
import TransactionForm from './TransactionForm';

const FilterDropdown = ({ value, onChange, buttonLabel, sections = [], className = '' }) => {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const flatOptions = useMemo(() => {
    const out = [];
    for (const section of sections || []) {
      for (const opt of section.options || []) {
        out.push({ ...opt, sectionId: section.id, sectionLabel: section.label });
      }
    }
    return out;
  }, [sections]);

  useEffect(() => {
    if (!open) return undefined;
    const onDocMouseDown = (e) => {
      const t = e.target;
      if (buttonRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onDocKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onDocKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onDocKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const idx = Math.max(0, flatOptions.findIndex((o) => o.value === value));
    setActiveIndex(idx);
  }, [flatOptions, open, value]);

  const commit = (nextValue) => {
    onChange?.(nextValue);
    setOpen(false);
    buttonRef.current?.focus?.();
  };

  const onButtonKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(true);
    }
  };

  const onMenuKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(flatOptions.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActiveIndex(Math.max(0, flatOptions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = flatOptions[activeIndex];
      if (opt) commit(opt.value);
    }
  };

  const rect = buttonRef.current?.getBoundingClientRect?.();
  const width = rect ? rect.width : 220;
  const top = rect ? rect.bottom + 8 : 0;
  const maxHeight = Math.min(380, Math.max(220, (window.innerHeight || 800) - top - 16));
  let left = rect ? rect.left : 0;
  left = Math.max(12, Math.min(left, (window.innerWidth || 1024) - width - 12));

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onButtonKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={['control-soft min-w-[10.5rem]', className].join(' ')}
      >
        <span className="truncate">{buttonLabel}</span>
        <svg
          className={`h-4 w-4 text-slate-500 dark:text-slate-300 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
        </svg>
      </button>

      {open
        ? createPortal(
            <div
              ref={menuRef}
              role="listbox"
              tabIndex={-1}
              aria-label="Filter"
              onKeyDown={onMenuKeyDown}
              onWheel={(e) => e.stopPropagation()}
              className="fixed z-[10000] overflow-hidden rounded-2xl bg-white/95 dark:bg-slate-950/80 backdrop-blur-xl shadow-2xl ring-1 ring-slate-200/70 dark:ring-white/[0.12] flex flex-col"
              style={{ left, top, width, maxHeight }}
            >
              <div className="flex-1 min-h-0 overflow-auto overscroll-contain scrollbar-hide p-1.5">
                {sections.map((section, sectionIndex) => (
                  <div
                    key={section.id}
                    className={[
                      'mb-1.5',
                      section.label && sectionIndex > 0 ? 'pt-2 mt-1 border-t border-slate-200/70 dark:border-white/10' : '',
                    ].join(' ')}
                  >
                    {section.label ? (
                      <div className="px-2.5 py-1.5 mb-1 rounded-xl bg-slate-100/70 text-[11px] font-extrabold tracking-wide text-slate-600 dark:bg-white/5 dark:text-slate-300 uppercase">
                        {section.label}
                      </div>
                    ) : null}
                    {(section.options || []).map((opt) => {
                      const selected = opt.value === value;
                      const idx = flatOptions.findIndex((o) => o.value === opt.value);
                      const active = idx === activeIndex;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          role="option"
                          aria-selected={selected}
                          onMouseEnter={() => setActiveIndex(Math.max(0, idx))}
                          onClick={() => commit(opt.value)}
                          className={[
                            'w-full text-left px-3 py-2 rounded-xl text-sm font-semibold transition-colors',
                            selected
                              ? 'bg-indigo-600 text-white ring-1 ring-indigo-500/30'
                              : active
                                ? 'bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-slate-100'
                                : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/10',
                          ].join(' ')}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
};

const TransactionItem = ({ transaction, selected, onToggleSelect, onEdit, onDelete }) => {
  const { categories } = useExpenseContext();
  const { formatFromBase } = useCurrency();
  const { amountsHidden, maskedText } = useAmountsVisibility();
  const round2 = useCallback((n) => Math.round((Number(n) || 0) * 100) / 100, []);

  const investmentLive = useMemo(() => {
    if (transaction.type !== 'investment') return null;

    const rawStatus = String(transaction.status || '').trim().toLowerCase();
    const hasExit = transaction.exitPrice != null && String(transaction.exitPrice).trim() !== '';
    const status = rawStatus || (hasExit ? 'closed' : 'active');
    if (status === 'closed') return null;

    const qty = Number(transaction.quantity);
    const entry = Number(transaction.entryPrice);
    const current = transaction.currentPrice == null || String(transaction.currentPrice).trim() === '' ? null : Number(transaction.currentPrice);

    const invested =
      Number.isFinite(qty) && qty > 0 && Number.isFinite(entry) && entry > 0 ? round2(qty * entry) : round2(Number(transaction.amount) || 0);

    const marketValue =
      current != null && Number.isFinite(qty) && qty > 0 && Number.isFinite(current) && current >= 0 ? round2(qty * current) : null;

    const rawUnreal = transaction.unrealizedProfit != null ? Number(transaction.unrealizedProfit) : null;
    const pnl =
      rawUnreal != null && Number.isFinite(rawUnreal)
        ? round2(rawUnreal)
        : marketValue != null && Number.isFinite(invested)
          ? round2(marketValue - invested)
          : null;

    return { invested, marketValue, pnl };
  }, [
    round2,
    transaction.amount,
    transaction.currentPrice,
    transaction.entryPrice,
    transaction.exitPrice,
    transaction.quantity,
    transaction.status,
    transaction.type,
    transaction.unrealizedProfit,
  ]);

  const amountText = useMemo(() => {
    const sign = transaction.type === 'income' ? '+' : transaction.type === 'investment' ? '•' : '−';
    const displayAmount = transaction.type === 'investment' && investmentLive?.marketValue != null ? investmentLive.marketValue : transaction.amount;
    const money = amountsHidden ? maskedText : formatFromBase(Number(displayAmount) || 0, 'en-US');
    return `${sign} ${money}`;
  }, [amountsHidden, formatFromBase, investmentLive?.marketValue, maskedText, transaction.amount, transaction.type]);

  const investmentStatus = useMemo(() => {
    if (transaction.type !== 'investment') return null;
    const raw = String(transaction.status || '').trim().toLowerCase();
    const hasExit = transaction.exitPrice != null && String(transaction.exitPrice).trim() !== '';
    const status = raw || (hasExit ? 'closed' : 'active');
    return status === 'closed' ? 'Closed' : 'Active';
  }, [transaction.exitPrice, transaction.status, transaction.type]);

  const investmentPL = useMemo(() => {
    if (transaction.type !== 'investment') return null;

    const status = String(transaction.status || '').trim().toLowerCase();
    const qty = Number(transaction.quantity);
    const entry = Number(transaction.entryPrice);
    const exit = transaction.exitPrice == null || String(transaction.exitPrice).trim() === '' ? null : Number(transaction.exitPrice);
    const closed = status === 'closed' || exit != null;
    if (!closed) return null;

    const investedFromFields =
      Number.isFinite(qty) && qty > 0 && Number.isFinite(entry) && entry > 0 ? qty * entry : null;
    const invested = investedFromFields != null ? investedFromFields : Number(transaction.amount) || 0;

    const storedProfit = transaction.profit != null ? Number(transaction.profit) : null;
    const computedProfit =
      exit != null && Number.isFinite(exit) && exit >= 0 && Number.isFinite(qty) && qty > 0 && Number.isFinite(entry) && entry > 0
        ? (exit - entry) * qty
        : null;
    const profitRaw = storedProfit != null && Number.isFinite(storedProfit) ? storedProfit : computedProfit;
    if (profitRaw == null || !Number.isFinite(profitRaw)) return null;

    const profit = round2(profitRaw);
    const pct = Number.isFinite(invested) && invested > 0 ? round2((profit / invested) * 100) : null;
    return { profit, pct };
  }, [round2, transaction.amount, transaction.entryPrice, transaction.exitPrice, transaction.profit, transaction.quantity, transaction.status, transaction.type]);

  const incomeCategoryName = useMemo(() => {
    const key = String(transaction.category || '');
    const map = {
      income_salary: 'Salary',
      income_gifts: 'Gifts',
      income_freelance: 'Freelance / Contract',
      income_business: 'Business Income',
      income_investment: 'Investment Income',
      income_rental: 'Rental Income',
      income_bonus: 'Bonus / Incentives',
      income_interest: 'Interest Income',
      income_other: 'Other',
    };
    return map[key] || null;
  }, [transaction.category]);

  const categoryMeta = useMemo(() => {
    if (transaction.type === 'income') {
      return {
        label: incomeCategoryName || 'Income',
        color: '#10B981',
        bg: 'rgba(16,185,129,0.12)',
      };
    }
    if (transaction.type === 'investment') {
      const label = String(transaction.category || '').trim() || 'Investment';
      return { label, color: '#2563EB', bg: 'rgba(37,99,235,0.14)' };
    }
    const cat = categories.find((c) => c.id === transaction.category);
    return cat
      ? { label: cat.name, color: cat.color, bg: `${cat.color}20` }
      : { label: 'Other', color: '#94A3B8', bg: 'rgba(148,163,184,0.12)' };
  }, [categories, incomeCategoryName, transaction.category, transaction.type]);

  const typeBadge =
    transaction.type === 'income'
      ? { label: 'Income', color: '#10B981', bg: 'rgba(16,185,129,0.12)' }
      : transaction.type === 'investment'
        ? { label: 'Investment', color: '#2563EB', bg: 'rgba(37,99,235,0.14)' }
        : { label: 'Expense', color: '#F43F5E', bg: 'rgba(244,63,94,0.12)' };

  return (
    <div
      data-transaction-row="true"
      className={[
        'group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-950/35 shadow-soft ring-1 ring-slate-200/70 dark:ring-white/[0.12]',
        'transition-[box-shadow,background-color,border-color] duration-200 ease-out',
        'hover:bg-slate-50/70 dark:hover:bg-slate-950/55 hover:shadow-[0_14px_34px_-26px_rgba(15,23,42,0.28)]',
        selected ? 'ring-2 ring-indigo-500/30 dark:ring-indigo-400/40' : 'hover:ring-slate-300/60 dark:hover:ring-white/[0.16]',
      ].join(' ')}
    >
      <div className="p-4 sm:p-4.5">
        <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0">
              <input
                type="checkbox"
                checked={!!selected}
                onChange={(e) => {
                  e.stopPropagation?.();
                  onToggleSelect?.(transaction.id, e.target.checked);
                }}
                onClick={(e) => e.stopPropagation?.()}
                aria-label={`Select transaction ${transaction.description}`}
                className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 bg-white/90 dark:bg-slate-900/50 text-indigo-600 focus:ring-indigo-500/40"
              />
            </div>
            <div
              aria-hidden="true"
              className={`h-9 w-9 rounded-2xl flex-shrink-0 flex items-center justify-center ring-1 ring-black/5 dark:ring-white/[0.10] ${
                transaction.type === 'income'
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200'
                  : transaction.type === 'investment'
                    ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-200'
                    : 'bg-rose-500/10 text-rose-700 dark:text-rose-200'
              }`}
            >
              {transaction.type === 'income' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                </svg>
              ) : transaction.type === 'investment' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M3 3a1 1 0 011-1h1a1 1 0 110 2H5v12h12v-1a1 1 0 112 0v2a1 1 0 01-1 1H4a1 1 0 01-1-1V3z" />
                  <path d="M7 12a1 1 0 011-1h1a1 1 0 011 1v2H8a1 1 0 01-1-1v-1zM11 9a1 1 0 011-1h1a1 1 0 011 1v5h-2V9zM15 6a1 1 0 011-1h1a1 1 0 011 1v8h-2V6z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
                </svg>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="font-display text-[15px] sm:text-base font-extrabold text-slate-900 dark:text-white truncate">
                  {transaction.description}
                </h3>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="tabular-nums">{formatDate(transaction.date)}</span>
                  {transaction.time ? <span className="mx-2 text-slate-400 dark:text-slate-600">{'\u2022'}</span> : null}
                  {transaction.time ? <span className="tabular-nums">{formatTime12h(transaction.time)}</span> : null}
                </span>
                <span
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ring-1 ring-black/5 dark:ring-white/[0.10]"
                  style={{ backgroundColor: typeBadge.bg, color: typeBadge.color }}
                >
                  {typeBadge.label}
                </span>
                <span
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ring-1 ring-black/5 dark:ring-white/[0.10]"
                  style={{ backgroundColor: categoryMeta.bg, color: categoryMeta.color }}
                >
                  {categoryMeta.label}
                </span>
                {investmentStatus ? (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ring-1 ring-black/5 dark:ring-white/[0.10] bg-slate-100/80 dark:bg-slate-900/40 text-slate-700 dark:text-slate-200">
                    {investmentStatus}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 min-w-0">
            <div className="min-w-0 flex flex-col items-end text-right">
              <span
                title={amountText}
                className={`min-w-0 text-right text-[16px] sm:text-[18px] font-extrabold tabular-nums truncate ${
                  transaction.type === 'income'
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : transaction.type === 'investment'
                      ? 'text-blue-700 dark:text-blue-300'
                      : 'text-rose-700 dark:text-rose-300'
                }`}
              >
                {amountText}
              </span>
              {investmentPL ? (
                <div
                  className={`mt-0.5 text-xs font-semibold tabular-nums ${
                    investmentPL.profit >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
                  }`}
                >
                  {(() => {
                    const sign = investmentPL.profit >= 0 ? '+' : '−';
                    const profitText = amountsHidden ? `${sign} ${maskedText}` : `${sign} ${formatFromBase(Math.abs(investmentPL.profit), 'en-US')}`;
                    const pctText =
                      !amountsHidden && investmentPL.pct != null
                        ? ` (${sign}${Math.abs(investmentPL.pct).toFixed(2)}%)`
                        : '';
                    return `P/L ${profitText}${pctText}`;
                  })()}
                </div>
              ) : null}
              {!investmentPL && transaction.type === 'investment' && investmentLive?.pnl != null ? (
                <div
                  className={`mt-0.5 text-xs font-semibold tabular-nums ${
                    investmentLive.pnl >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
                  }`}
                >
                  {(() => {
                    const sign = investmentLive.pnl >= 0 ? '+' : 'âˆ’';
                    const pnlText = amountsHidden ? `${sign} ${maskedText}` : `${sign} ${formatFromBase(Math.abs(investmentLive.pnl), 'en-US')}`;
                    return `Unrealized ${pnlText}`;
                  })()}
                </div>
              ) : null}
            </div>
            <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation?.();
                  console.log("Transaction item - Editing transaction:", transaction);
                  onEdit(transaction);
                }}
                className="btn-icon-ghost"
                aria-label="Edit transaction"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation?.();
                  onDelete?.(transaction);
                }}
                className="btn-icon-ghost"
                aria-label="Delete transaction"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex sm:hidden items-center justify-end gap-2 pt-1">
            <button
              onClick={(e) => {
                e.stopPropagation?.();
                onEdit(transaction);
              }}
              className="px-3 py-2 rounded-xl text-sm font-semibold ring-1 ring-black/5 dark:ring-white/10 bg-white/70 dark:bg-slate-900/40 text-slate-700 dark:text-slate-200"
            >
              Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation?.();
                onDelete?.(transaction);
              }}
              className="px-3 py-2 rounded-xl text-sm font-semibold ring-1 ring-black/5 dark:ring-white/10 bg-white/70 dark:bg-slate-900/40 text-rose-700 dark:text-rose-300"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const TransactionDetailsModal = ({ transaction, onClose, onEdit, onDelete }) => {
  const { categories } = useExpenseContext();
  const { formatFromBase } = useCurrency();
  const { amountsHidden, maskedText } = useAmountsVisibility();

  const meta = useMemo(() => {
    if (!transaction) return null;
    const type = transaction.type;
    const isIncome = type === 'income';
    const isInvestment = type === 'investment';
    const typeBadge = isIncome
      ? { label: 'Income', color: '#10B981', bg: 'rgba(16,185,129,0.12)', ring: 'rgba(16,185,129,0.22)' }
      : isInvestment
        ? { label: 'Investment', color: '#2563EB', bg: 'rgba(37,99,235,0.14)', ring: 'rgba(37,99,235,0.22)' }
        : { label: 'Expense', color: '#F43F5E', bg: 'rgba(244,63,94,0.12)', ring: 'rgba(244,63,94,0.22)' };

    const incomeMap = {
      income_salary: 'Salary',
      income_gifts: 'Gifts',
      income_freelance: 'Freelance / Contract',
      income_business: 'Business Income',
      income_investment: 'Investment Income',
      income_rental: 'Rental Income',
      income_bonus: 'Bonus / Incentives',
      income_interest: 'Interest Income',
      income_other: 'Other',
    };

    let categoryLabel = 'Other';
    let categoryColor = '#94A3B8';
    let categoryBg = 'rgba(148,163,184,0.12)';

    if (isIncome) {
      const key = String(transaction.category || '');
      categoryLabel = incomeMap[key] || 'Income';
      categoryColor = '#10B981';
      categoryBg = 'rgba(16,185,129,0.12)';
    } else if (isInvestment) {
      categoryLabel = String(transaction.category || '').trim() || 'Investment';
      categoryColor = '#2563EB';
      categoryBg = 'rgba(37,99,235,0.14)';
    } else {
      const cat = (categories || []).find((c) => c.id === transaction.category);
      if (cat) {
        categoryLabel = cat.name;
        categoryColor = cat.color || '#94A3B8';
        categoryBg = `${cat.color}20`;
      }
    }

    return {
      typeBadge,
      category: { label: categoryLabel, color: categoryColor, bg: categoryBg },
    };
  }, [categories, transaction]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  if (!transaction || !meta) return null;

  const investmentMarketValue = (() => {
    if (transaction.type !== 'investment') return null;
    const rawStatus = String(transaction.status || '').trim().toLowerCase();
    const hasExit = transaction.exitPrice != null && String(transaction.exitPrice).trim() !== '';
    const status = rawStatus || (hasExit ? 'closed' : 'active');
    if (status === 'closed') return null;
    const qty = Number(transaction.quantity);
    const current = transaction.currentPrice == null || String(transaction.currentPrice).trim() === '' ? null : Number(transaction.currentPrice);
    if (!(Number.isFinite(qty) && qty > 0 && current != null && Number.isFinite(current) && current >= 0)) return null;
    return Math.round(qty * current * 100) / 100;
  })();

  const amountText = `${transaction.type === 'income' ? '+' : transaction.type === 'investment' ? '•' : '−'} ${
    amountsHidden ? maskedText : formatFromBase(Number(investmentMarketValue ?? transaction.amount) || 0, 'en-US')
  }`;
  const hasTime = !!transaction.time;
  const createdAt = transaction.createdAt ? new Date(transaction.createdAt) : null;
  const createdAtText = createdAt && !Number.isNaN(createdAt.getTime()) ? createdAt.toLocaleString() : null;

  const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
  const investmentReturnPct = (() => {
    if (transaction.type !== 'investment') return null;
    const qty = Number(transaction.quantity);
    const entry = Number(transaction.entryPrice);
    const invested = Number.isFinite(qty) && qty > 0 && Number.isFinite(entry) && entry > 0 ? qty * entry : Number(transaction.amount) || 0;
    const profit = transaction.profit != null ? Number(transaction.profit) : null;
    if (profit == null || !Number.isFinite(profit) || !(Number.isFinite(invested) && invested > 0)) return null;
    return round2((profit / invested) * 100);
  })();

  const Field = ({ label, value }) => (
    <div className="grid grid-cols-1 sm:grid-cols-[10rem_minmax(0,1fr)] gap-1 sm:gap-3 py-3 border-b border-black/5 dark:border-white/10">
      <div className="text-xs font-extrabold tracking-wide uppercase text-slate-600 dark:text-slate-400">{label}</div>
      <div className="text-sm font-semibold text-slate-900 dark:text-white break-words">{value}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50">
      <div aria-hidden="true" className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative h-full w-full flex items-start sm:items-center justify-center p-4 sm:p-6">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Transaction details"
          className="w-[min(680px,94vw)] max-h-[calc(100dvh-3rem)] sm:max-h-[calc(100dvh-5rem)] overflow-hidden rounded-3xl bg-white dark:bg-slate-950/90 shadow-2xl ring-1 ring-black/10 dark:ring-white/[0.12] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-black/5 dark:border-white/10">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="font-display text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white truncate">
                  {transaction.description || 'Transaction'}
                </div>
                <span
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold ring-1"
                  style={{ backgroundColor: meta.typeBadge.bg, color: meta.typeBadge.color, borderColor: meta.typeBadge.ring }}
                >
                  {meta.typeBadge.label}
                </span>
                <span
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold ring-1 ring-black/5 dark:ring-white/[0.10]"
                  style={{ backgroundColor: meta.category.bg, color: meta.category.color }}
                >
                  {meta.category.label}
                </span>
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {formatDate(transaction.date)}{hasTime ? ` \u2022 ${formatTime12h(transaction.time)}` : ''}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 h-9 w-9 rounded-2xl ring-1 ring-black/5 dark:ring-white/[0.12] bg-slate-50/80 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-900/55 transition-colors grid place-items-center"
              aria-label="Close"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-700 dark:text-slate-200" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <div className="px-6 py-2 flex-1 min-h-0 overflow-auto scrollbar-hide">
            <Field label="Amount" value={amountText} />
            <Field label="Category" value={meta.category.label} />
            <Field label="Type" value={meta.typeBadge.label} />
            {transaction.type === 'investment' ? (
              <>
                <Field label="Asset" value={transaction.name || transaction.description || '\u2014'} />
                <Field label="Quantity" value={transaction.quantity != null ? String(transaction.quantity) : '\u2014'} />
                <Field
                  label="Entry Price"
                  value={
                    transaction.entryPrice != null
                      ? amountsHidden
                        ? maskedText
                        : formatFromBase(Number(transaction.entryPrice) || 0, 'en-US')
                      : '\u2014'
                  }
                />
                <Field
                  label="Exit Price"
                  value={
                    transaction.exitPrice != null
                      ? amountsHidden
                        ? maskedText
                        : formatFromBase(Number(transaction.exitPrice) || 0, 'en-US')
                      : '\u2014'
                  }
                />
                <Field
                  label="Current Price"
                  value={
                    transaction.currentPrice != null
                      ? amountsHidden
                        ? maskedText
                        : formatFromBase(Number(transaction.currentPrice) || 0, 'en-US')
                      : '\u2014'
                  }
                />
                <Field
                  label="Status"
                  value={transaction.status ? String(transaction.status) : transaction.exitPrice != null ? 'closed' : 'active'}
                />
                {transaction.profit != null ? (
                  <Field
                    label="Profit/Loss"
                    value={`${Number(transaction.profit) >= 0 ? '+' : '−'} ${
                      amountsHidden ? maskedText : formatFromBase(Math.abs(Number(transaction.profit) || 0), 'en-US')
                    }`}
                  />
                ) : null}
                {transaction.profit == null && transaction.unrealizedProfit != null ? (
                  <Field
                    label="Unrealized P/L"
                    value={`${Number(transaction.unrealizedProfit) >= 0 ? '+' : '-'} ${
                      amountsHidden ? maskedText : formatFromBase(Math.abs(Number(transaction.unrealizedProfit) || 0), 'en-US')
                    }`}
                  />
                ) : null}
                {investmentReturnPct != null && !amountsHidden ? (
                  <Field
                    label="Return"
                    value={`${investmentReturnPct >= 0 ? '+' : '−'}${Math.abs(investmentReturnPct).toFixed(2)}%`}
                  />
                ) : null}
              </>
            ) : null}
            <Field label="Date" value={formatDate(transaction.date)} />
            <Field label="Time" value={hasTime ? formatTime12h(transaction.time) : '\u2014'} />
            {createdAtText ? <Field label="Added" value={createdAtText} /> : null}
          </div>

          <div className="px-6 py-4 border-t border-black/5 dark:border-white/10 bg-white/80 dark:bg-slate-950/60">
            <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
              <button
                type="button"
                onClick={() => onEdit?.(transaction)}
                className="px-4 py-2.5 rounded-xl font-semibold ring-1 ring-black/5 dark:ring-white/[0.12] bg-white/90 dark:bg-slate-900/40 text-slate-800 dark:text-slate-100 hover:bg-white dark:hover:bg-slate-900/55 transition-colors"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => onDelete?.(transaction)}
                className="px-4 py-2.5 rounded-xl font-extrabold ring-1 ring-black/5 dark:ring-white/[0.12] bg-rose-600 hover:bg-rose-700 text-white transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DeleteTransactionsModal = ({ transactions = [], onCancel, onConfirm }) => {
  const { categories } = useExpenseContext();
  const { formatFromBase } = useCurrency();
  const { amountsHidden, maskedText } = useAmountsVisibility();

  const sorted = useMemo(() => {
    const arr = Array.isArray(transactions) ? [...transactions] : [];
    return arr.sort((a, b) => {
      const da = new Date(a?.date || 0).getTime();
      const db = new Date(b?.date || 0).getTime();
      return db - da;
    });
  }, [transactions]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onCancel?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  const getCategoryLabel = useCallback(
    (t) => {
      if (!t) return 'Other';
      if (t.type === 'income') {
        const key = String(t.category || '');
        const incomeMap = {
          income_salary: 'Salary',
          income_gifts: 'Gifts',
          income_freelance: 'Freelance / Contract',
          income_business: 'Business Income',
          income_investment: 'Investment Income',
          income_rental: 'Rental Income',
          income_bonus: 'Bonus / Incentives',
          income_interest: 'Interest Income',
          income_other: 'Other',
        };
        return incomeMap[key] || 'Income';
      }
      if (t.type === 'investment') {
        return String(t.category || '').trim() || 'Investment';
      }
      const cat = (categories || []).find((c) => c.id === t.category);
      return cat?.name || 'Other';
    },
    [categories]
  );

  const getAmountText = useCallback(
    (t) => {
      const sign = t?.type === 'income' ? '+' : t?.type === 'investment' ? '•' : '\u2212';
      const money = amountsHidden ? maskedText : formatFromBase(Number(t?.amount) || 0, 'en-US');
      return `${sign} ${money}`;
    },
    [amountsHidden, formatFromBase, maskedText]
  );

  const title = sorted.length === 1 ? 'Delete transaction?' : `Delete ${sorted.length} transactions?`;
  const subtitle =
    sorted.length === 1
      ? 'This will permanently remove this transaction.'
      : 'This will permanently remove these transactions.';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel?.();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Delete confirmation"
    >
      <div className="min-h-full flex items-center justify-center p-4">
        <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur rounded-2xl shadow-2xl ring-1 ring-black/10 dark:ring-white/10 w-full max-w-xl mx-auto animate-fade-in overflow-hidden">
          <div className="p-4 sm:p-6">
          <div className="flex justify-between items-start gap-4">
            <div>
              <h2 className="font-display text-xl font-extrabold text-slate-900 dark:text-white">{title}</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{subtitle}</p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mt-4 rounded-2xl ring-1 ring-black/5 dark:ring-white/10 bg-white/70 dark:bg-slate-950/30">
            <div className="px-4 py-3 border-b border-black/5 dark:border-white/10">
              <div className="text-xs font-extrabold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                Summary
              </div>
            </div>
            <div className="max-h-[46vh] overflow-auto overscroll-contain p-2">
              {sorted.map((t) => (
                <div
                  key={t.id}
                  className="flex items-start justify-between gap-3 p-3 rounded-2xl hover:bg-slate-950/5 dark:hover:bg-white/5"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 dark:text-white truncate">{t.description || 'Untitled'}</div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span>{formatDate(t.date)}</span>
                      {t.time ? <span>{'\u2022'} {formatTime12h(t.time)}</span> : null}
                      <span>{'\u2022'} {t.type === 'income' ? 'Income' : t.type === 'investment' ? 'Investment' : 'Expense'}</span>
                      <span>{'\u2022'} {getCategoryLabel(t)}</span>
                    </div>
                  </div>
                  <div
                    className={`flex-shrink-0 text-right text-sm font-extrabold tabular-nums ${
                      t.type === 'income'
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : t.type === 'investment'
                          ? 'text-blue-700 dark:text-blue-300'
                          : 'text-rose-700 dark:text-rose-300'
                    }`}
                    title={getAmountText(t)}
                  >
                    {getAmountText(t)}
                  </div>
                </div>
              ))}

              {sorted.length === 0 ? (
                <div className="p-4 text-sm text-slate-600 dark:text-slate-300">No transactions selected.</div>
              ) : null}
            </div>
          </div>

          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 rounded-xl font-semibold ring-1 ring-black/5 dark:ring-white/10 bg-white/80 dark:bg-slate-900/40 text-slate-700 dark:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={sorted.length === 0}
              className="px-4 py-2.5 rounded-xl font-extrabold ring-1 ring-rose-500/30 bg-rose-600 hover:bg-rose-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Delete
            </button>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const EmptyState = () => (
  <div className="surface p-8 text-center">
    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
    <p className="font-display text-lg font-semibold text-slate-900 dark:text-white mb-2">No transactions found</p>
    <p className="text-slate-600 dark:text-slate-300 mb-6">Try changing your filters or add a new transaction</p>
  </div>
);

const TransactionList = () => {
  const { transactions, deleteTransaction, deleteTransactions } = useExpenseContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [pageInput, setPageInput] = useState('1');
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [pendingDeleteIds, setPendingDeleteIds] = useState([]);
  const { categories } = useExpenseContext();

  useBodyScrollLock(isModalOpen || !!selectedTransaction || deleteModalOpen);
  const incomeCategories = useMemo(
    () => [
      { id: 'income_salary', name: 'Salary' },
      { id: 'income_gifts', name: 'Gifts' },
      { id: 'income_freelance', name: 'Freelance / Contract' },
      { id: 'income_business', name: 'Business Income' },
      { id: 'income_investment', name: 'Investment Income' },
      { id: 'income_rental', name: 'Rental Income' },
      { id: 'income_bonus', name: 'Bonus / Incentives' },
      { id: 'income_interest', name: 'Interest Income' },
      { id: 'income_other', name: 'Other' },
    ],
    []
  );

  const categoryLabelFor = useCallback(
    (id) => {
      if (!id || id === 'all') return 'All Categories';
      const income = incomeCategories.find((c) => c.id === id);
      if (income) return income.name;
      const exp = categories.find((c) => c.id === id);
      return exp?.name || 'Category';
    },
    [categories, incomeCategories]
  );
  const listViewportRef = useRef(null);

  // Fit as many rows as possible in the available space (prevents big empty gaps)
  useEffect(() => {
    const el = listViewportRef.current;
    if (!el) return undefined;

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    const estimateRowPx = () => {
      const firstRow = el.querySelector('[data-transaction-row="true"]');
      if (firstRow) {
        const h = firstRow.getBoundingClientRect().height;
        if (Number.isFinite(h) && h > 0) return h + 10; // add typical vertical spacing
      }
      return 92;
    };

    const update = () => {
      const height = el.getBoundingClientRect().height;
      if (!Number.isFinite(height) || height <= 0) return;
      const rowPx = estimateRowPx();
      const next = clamp(Math.floor((height - 16) / rowPx), 6, 40);
      setPageSize((prev) => (prev === next ? prev : next));
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Apply filters (memoized so pagination UI changes don't re-filter/sort)
  const filteredTransactions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return (transactions || [])
      .filter((transaction) => {
        if (term && !String(transaction.description || '').toLowerCase().includes(term)) return false;
        if (filterType !== 'all' && transaction.type !== filterType) return false;
        if (filterCategory !== 'all' && transaction.category !== filterCategory) return false;
        return true;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [filterCategory, filterType, searchTerm, transactions]);

  // Reset pagination when filters change
  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
  }, [filterCategory, filterType, searchTerm]);

  // Prune selection if underlying transactions were removed.
  useEffect(() => {
    const existing = new Set((transactions || []).map((t) => t.id));
    setSelectedIds((prev) => {
      if (!prev || prev.size === 0) return prev;
      const next = new Set();
      for (const id of prev) if (existing.has(id)) next.add(id);
      if (next.size === prev.size) return prev;
      return next;
    });
  }, [transactions]);

  const totalCount = filteredTransactions.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    setPageInput(String(page));
  }, [page]);

  const paginatedTransactions = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, page, pageSize]);

  const handleEdit = (transaction) => {
    console.log("TransactionList - Setting transaction for edit:", transaction);
    setEditingTransaction({...transaction}); // Create a copy to prevent unintended reference updates
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => {
      setEditingTransaction(null);
    }, 300); // Clear after closing animation
  };

  const toggleSelected = useCallback((id, checked) => {
    setSelectedIds((prev) => {
      const next = new Set(prev || []);
      const shouldAdd = typeof checked === 'boolean' ? checked : !next.has(id);
      if (shouldAdd) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const openDeleteModalForIds = useCallback((ids) => {
    const unique = Array.from(new Set((ids || []).filter(Boolean)));
    setPendingDeleteIds(unique);
    setDeleteModalOpen(true);
  }, []);

  const openDeleteModalForTransaction = useCallback(
    (transaction) => openDeleteModalForIds([transaction?.id]),
    [openDeleteModalForIds]
  );

  const closeDeleteModal = useCallback(() => {
    setDeleteModalOpen(false);
    setTimeout(() => setPendingDeleteIds([]), 150);
  }, []);

  const confirmDelete = useCallback(() => {
    const ids = (pendingDeleteIds || []).filter(Boolean);
    if (ids.length === 0) {
      closeDeleteModal();
      return;
    }

    if (typeof deleteTransactions === 'function') deleteTransactions(ids);
    else ids.forEach((id) => deleteTransaction(id));

    setSelectedIds((prev) => {
      if (!prev || prev.size === 0) return prev;
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });

    closeDeleteModal();
  }, [closeDeleteModal, deleteTransaction, deleteTransactions, pendingDeleteIds]);

  const handleOpenDetails = (transaction) => {
    setSelectedTransaction(transaction);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterType('all');
    setFilterCategory('all');
  };

  const buildPageItems = (current, total) => {
    // Always render a small, constant set of page buttons (works for 1,000,000+ rows)
    if (total <= 9) return Array.from({ length: total }, (_, i) => i + 1);

    const out = new Set([
      1,
      total,
      current - 2,
      current - 1,
      current,
      current + 1,
      current + 2,
    ]);
    const nums = [...out].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);

    const items = [];
    for (let i = 0; i < nums.length; i += 1) {
      const n = nums[i];
      const prev = nums[i - 1];
      if (i > 0 && n - prev > 1) items.push('…');
      items.push(n);
    }
    return items;
  };

  const showingFrom = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingTo = Math.min(page * pageSize, totalCount);

  const clampPage = (next) => Math.min(totalPages, Math.max(1, next));
  const goToPage = (raw) => {
    const n = Number.parseInt(String(raw), 10);
    if (!Number.isFinite(n)) return;
    setPage(clampPage(n));
  };

  return (
    <div className="p-4 sm:p-5 md:p-6 h-full min-h-0 flex flex-col animate-float-in">
      <div className="mb-4 sm:mb-6 space-y-3 sm:space-y-0">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 mb-2">
          <div className="relative w-full sm:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-soft pl-10 pr-3"
            />
          </div>
          
          <div className="flex flex-row items-center justify-between sm:justify-end gap-2 sm:gap-3">
            <FilterDropdown
              value={filterType}
              onChange={setFilterType}
              buttonLabel={
                filterType === 'all' ? 'All Types' : filterType === 'income' ? 'Income' : filterType === 'investment' ? 'Investment' : 'Expense'
              }
              className={
                filterType === 'investment'
                  ? 'bg-blue-50 text-blue-700 ring-blue-200/80 hover:bg-blue-50/70 dark:bg-blue-500/10 dark:text-blue-200 dark:ring-blue-500/20 dark:hover:bg-blue-500/15'
                  : ''
              }
              sections={[
                {
                  id: 'types',
                  label: null,
                  options: [
                    { value: 'all', label: 'All Types' },
                    { value: 'income', label: 'Income' },
                    { value: 'expense', label: 'Expense' },
                    { value: 'investment', label: 'Investment' },
                  ],
                },
              ]}
            />

            <FilterDropdown
              value={filterCategory}
              onChange={setFilterCategory}
              buttonLabel={categoryLabelFor(filterCategory)}
              sections={[
                { id: 'all', label: null, options: [{ value: 'all', label: 'All Categories' }] },
                {
                  id: 'income',
                  label: 'Income',
                  options: incomeCategories.map((c) => ({ value: c.id, label: c.name })),
                },
                {
                  id: 'expense',
                  label: 'Expenses',
                  options: categories.map((c) => ({ value: c.id, label: c.name })),
                },
              ]}
              className="min-w-[13rem]"
            />
          </div>
        </div>
        
        {(searchTerm || filterType !== 'all' || filterCategory !== 'all') && (
          <div className="flex justify-between items-center bg-white/80 dark:bg-slate-900/45 p-2.5 sm:p-3 rounded-2xl ring-1 ring-slate-200/70 dark:ring-white/10 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-300">
                Filters:
              </span>
              
              {searchTerm && (
                <span className="inline-flex items-center px-2.5 py-1 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-200/70 dark:bg-indigo-500/10 dark:text-indigo-100 dark:ring-indigo-500/20 rounded-full text-xs font-semibold">
                  "{searchTerm}"
                </span>
              )}
              
              {filterType !== 'all' && (
                <span
                  className={[
                    'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ring-1',
                    filterType === 'income'
                      ? 'bg-emerald-50 text-emerald-900 ring-emerald-200/70 dark:bg-emerald-500/10 dark:text-emerald-100 dark:ring-emerald-500/20'
                      : filterType === 'investment'
                        ? 'bg-blue-50 text-blue-900 ring-blue-200/70 dark:bg-blue-500/10 dark:text-blue-100 dark:ring-blue-500/20'
                        : 'bg-rose-50 text-rose-900 ring-rose-200/70 dark:bg-rose-500/10 dark:text-rose-100 dark:ring-rose-500/20',
                  ].join(' ')}
                >
                  {filterType === 'income' ? 'Income' : filterType === 'investment' ? 'Investment' : 'Expense'}
                </span>
              )}
              
              {filterCategory !== 'all' && (
                <span className="inline-flex items-center px-2.5 py-1 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/70 dark:bg-emerald-500/10 dark:text-emerald-100 dark:ring-emerald-500/20 rounded-full text-xs font-semibold">
                  {categoryLabelFor(filterCategory)}
                </span>
              )}
            </div>
            
            <button
              onClick={handleClearFilters}
              className="text-xs sm:text-sm text-rose-600 dark:text-rose-300 hover:text-rose-800 dark:hover:text-rose-200 font-semibold transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}

        {selectedIds.size > 0 ? (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-950/5 dark:bg-white/5 p-3 rounded-2xl ring-1 ring-black/5 dark:ring-white/10">
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {selectedIds.size} selected
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedIds((prev) => {
                    const next = new Set(prev || []);
                    paginatedTransactions.forEach((t) => next.add(t.id));
                    return next;
                  });
                }}
                className="px-3 py-2 rounded-xl text-sm font-semibold ring-1 ring-black/5 dark:ring-white/10 bg-white/80 dark:bg-slate-900/40 text-slate-700 dark:text-slate-200"
              >
                Select page
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="px-3 py-2 rounded-xl text-sm font-semibold ring-1 ring-black/5 dark:ring-white/10 bg-white/80 dark:bg-slate-900/40 text-slate-700 dark:text-slate-200"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => openDeleteModalForIds(Array.from(selectedIds))}
                className="px-3 py-2 rounded-xl text-sm font-extrabold ring-1 ring-rose-500/30 bg-rose-600 hover:bg-rose-700 text-white transition-colors"
              >
                Delete selected
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div ref={listViewportRef} className="flex-1 min-h-0 px-1 sm:px-2 pt-3 pb-2.5 overflow-y-auto scrollbar-hide">
        {totalCount === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {paginatedTransactions.map((transaction) => (
              <div
                key={transaction.id}
                role="button"
                tabIndex={0}
                onClick={() => handleOpenDetails(transaction)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleOpenDetails(transaction);
                  }
                }}
                className="outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 rounded-2xl"
              >
                <TransactionItem
                  transaction={transaction}
                  selected={selectedIds.has(transaction.id)}
                  onToggleSelect={toggleSelected}
                  onEdit={handleEdit}
                  onDelete={openDeleteModalForTransaction}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {totalCount > 0 && totalPages > 1 ? (
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-2 sm:px-0">
          <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 tabular-nums">
            Showing {showingFrom}{'\u2013'}{showingTo} of {totalCount}{' '}
            <span className="mx-2 text-slate-400 dark:text-slate-600">{'\u2022'}</span> Page {page} of {totalPages}
          </div>
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setPage((p) => clampPage(p - 1))}
              disabled={page === 1}
              className="px-3 py-2 rounded-xl text-sm font-semibold ring-1 ring-black/5 dark:ring-white/10 bg-white/80 dark:bg-slate-900/40 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            {buildPageItems(page, totalPages).map((item, idx) => {
              if (item === '…') {
                return (
                  <span key={`ellipsis-${idx}`} className="px-2 text-slate-500 dark:text-slate-400">
                    …
                  </span>
                );
              }
              const n = item;
              const active = n === page;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  className={`min-w-10 px-3 py-2 rounded-xl text-sm font-semibold ring-1 ${
                    active
                      ? 'bg-blue-600 text-white ring-blue-500/40'
                      : 'bg-white/80 dark:bg-slate-900/40 text-slate-700 dark:text-slate-200 ring-black/5 dark:ring-white/10'
                  }`}
                >
                  {n}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setPage((p) => clampPage(p + 1))}
              disabled={page === totalPages}
              className="px-3 py-2 rounded-xl text-sm font-semibold ring-1 ring-black/5 dark:ring-white/10 bg-white/80 dark:bg-slate-900/40 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>

            {totalPages >= 10 ? (
              <div className="hidden sm:flex items-center gap-2 ml-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">Go to</span>
                <input
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value.replace(/[^\d]/g, ''))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') goToPage(pageInput);
                  }}
                  onBlur={() => goToPage(pageInput)}
                  inputMode="numeric"
                  className="input-soft w-20 py-2"
                  aria-label="Go to page"
                />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {isModalOpen
        ? createPortal(
            <div className="fixed inset-0 z-50">
              <div aria-hidden="true" className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={handleCloseModal} />
              <div className="relative h-full w-full flex items-start sm:items-center justify-center p-4 sm:p-6">
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-label="Edit transaction"
                  className="w-[min(560px,92vw)] max-h-[calc(100dvh-3rem)] overflow-hidden rounded-3xl bg-white/90 dark:bg-slate-950/70 backdrop-blur-xl shadow-2xl ring-1 ring-black/10 dark:ring-white/[0.12] flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-black/5 dark:border-white/10">
                    <div className="min-w-0">
                      <div className="font-display text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white truncate">Edit Transaction</div>
                      <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Update the selected transaction</div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="shrink-0 h-9 w-9 rounded-2xl ring-1 ring-black/5 dark:ring-white/[0.12] bg-slate-50/80 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-900/55 transition-colors grid place-items-center"
                      aria-label="Close"
                    >
                      <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-700 dark:text-slate-200" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
                      </svg>
                    </button>
                  </div>
                  <div className="px-6 py-4 flex-1 min-h-0 overflow-auto scrollbar-hide">
                    <TransactionForm variant="embedded" editTransaction={editingTransaction} onClose={handleCloseModal} />
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      {selectedTransaction
        ? createPortal(
            <TransactionDetailsModal
              transaction={selectedTransaction}
              onClose={() => setSelectedTransaction(null)}
              onEdit={(t) => {
                setSelectedTransaction(null);
                handleEdit(t);
              }}
              onDelete={(t) => {
                setSelectedTransaction(null);
                openDeleteModalForIds([t?.id]);
              }}
            />,
            document.body
          )
        : null}

      {deleteModalOpen
        ? createPortal(
            <DeleteTransactionsModal
              transactions={(transactions || []).filter((t) => pendingDeleteIds.includes(t.id))}
              onCancel={closeDeleteModal}
              onConfirm={confirmDelete}
            />,
            document.body
          )
        : null}
    </div>
  );
};

export default TransactionList; 
