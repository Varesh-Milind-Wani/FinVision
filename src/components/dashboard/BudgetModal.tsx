import React, { useState } from 'react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  currentBudget: number;
  onSave: (budget: number) => void;
  formatAmount: (amount: number) => string;
};

const BudgetModal = ({ isOpen, onClose, currentBudget, onSave, formatAmount }: Props) => {
  const [budgetStr, setBudgetStr] = useState(currentBudget ? String(currentBudget) : '');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000]">
      <div aria-hidden="true" className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative h-full w-full flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          className="w-full sm:w-[min(450px,96vw)] shrink-0 mt-auto sm:my-auto flex flex-col max-h-[90dvh] sm:max-h-[85dvh] overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white/95 backdrop-blur-2xl shadow-2xl ring-1 ring-black/10 pointer-events-auto transition-transform mx-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mobile Handle */}
          <div className="w-full flex justify-center pt-3 pb-1 sm:hidden shrink-0" aria-hidden="true">
            <div className="w-12 h-1.5 rounded-full bg-slate-200" />
          </div>
          
          <div className="flex items-start justify-between gap-4 px-5 sm:px-6 py-3 sm:py-4 border-b border-black/5 shrink-0">
            <div className="min-w-0">
              <div className="font-display text-xl sm:text-xl font-extrabold text-slate-900 truncate">Set Monthly Budget</div>
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
          
          <div className="p-5">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Monthly Budget Amount</label>
            <div className="relative">
              <input
                type="number"
                value={budgetStr}
                onChange={(e) => setBudgetStr(e.target.value)}
                placeholder="e.g. 5000"
                className="w-full h-12 px-4 rounded-xl bg-slate-50 border-none ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-blue-500 text-slate-900 font-semibold"
              />
            </div>
            {budgetStr && !isNaN(Number(budgetStr)) ? (
              <div className="mt-2 text-xs font-semibold text-slate-500">
                Formatted: {formatAmount(Number(budgetStr))}
              </div>
            ) : null}
          </div>
          
          <div className="px-5 py-4 bg-slate-50 border-t border-black/[0.04] flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200/50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                const val = Number(budgetStr);
                if (!isNaN(val) && val >= 0) {
                  onSave(val);
                }
              }}
              className="px-5 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors shadow-sm"
            >
              Save Budget
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetModal;
