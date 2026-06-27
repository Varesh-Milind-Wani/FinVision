import React, { useState } from 'react';
import { useBudgetContext, BudgetPeriod, BudgetStatus } from '../../contexts/BudgetContext';
import { useExpenseContext } from '../../contexts/ExpenseContext';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const CreateBudgetModal = ({ isOpen, onClose }: Props) => {
  const { addBudget } = useBudgetContext();
  const { categories } = useExpenseContext() as any;

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [period, setPeriod] = useState<BudgetPeriod>('Monthly');
  const [category, setCategory] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [alertPercentage, setAlertPercentage] = useState('80');
  const [recurring, setRecurring] = useState(false);
  const [carryForward, setCarryForward] = useState(false);
  const [income, setIncome] = useState('');
  const [savingsGoal, setSavingsGoal] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<BudgetStatus>('Active');

  const handleSave = () => {
    if (!name.trim() || !amount) return;
    addBudget({
      name,
      amount: Number(amount) || 0,
      currency,
      period,
      category,
      startDate: startDate || null,
      endDate: endDate || null,
      color,
      alertPercentage: Number(alertPercentage) || 80,
      recurring,
      carryForward,
      income: Number(income) || 0,
      savingsGoal: Number(savingsGoal) || 0,
      notes,
      status,
    });
    onClose();
    // Reset fields
    setName('');
    setAmount('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000]">
      <div aria-hidden="true" className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative h-full w-full flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          className="w-full sm:w-[min(800px,96vw)] shrink-0 mt-auto sm:my-auto flex flex-col max-h-[90dvh] sm:max-h-[85dvh] overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white/95 backdrop-blur-2xl shadow-2xl ring-1 ring-black/10 pointer-events-auto transition-transform mx-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mobile Handle */}
          <div className="w-full flex justify-center pt-3 pb-1 sm:hidden shrink-0" aria-hidden="true">
            <div className="w-12 h-1.5 rounded-full bg-slate-200" />
          </div>

          <div className="flex items-start justify-between gap-4 px-5 sm:px-6 py-3 sm:py-4 border-b border-black/5 shrink-0 sticky top-0 bg-white/90 backdrop-blur z-10">
            <div className="min-w-0">
              <div className="font-display text-xl sm:text-xl font-extrabold text-slate-900 truncate">Create Budget</div>
              <div className="mt-0.5 text-xs text-slate-500">Configure your new smart budget</div>
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
          
          <div className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-6 overflow-y-auto overscroll-contain scrollbar-hide">
            {/* Core Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b pb-2">Core Settings</h3>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Budget Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Groceries"
                  className="w-full h-11 px-3 rounded-xl bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Amount *</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full h-11 px-3 rounded-xl bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="INR">INR</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Period</label>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as BudgetPeriod)}
                  className="w-full h-11 px-3 rounded-xl bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Yearly">Yearly</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="All">All Categories</option>
                  {categories?.map((c: any) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Advanced Settings */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b pb-2">Advanced Features</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Color Theme</label>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-full h-11 rounded-xl cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Alert threshold (%)</label>
                  <input
                    type="number"
                    value={alertPercentage}
                    onChange={(e) => setAlertPercentage(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={recurring}
                    onChange={(e) => setRecurring(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  Recurring Budget
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={carryForward}
                    onChange={(e) => setCarryForward(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  Carry Forward
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Expected Income</label>
                  <input
                    type="number"
                    value={income}
                    onChange={(e) => setIncome(e.target.value)}
                    placeholder="0.00"
                    className="w-full h-11 px-3 rounded-xl bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Savings Goal</label>
                  <input
                    type="number"
                    value={savingsGoal}
                    onChange={(e) => setSavingsGoal(e.target.value)}
                    placeholder="0.00"
                    className="w-full h-11 px-3 rounded-xl bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as BudgetStatus)}
                  className="w-full h-11 px-3 rounded-xl bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Active">Active</option>
                  <option value="Paused">Paused</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional context..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-blue-500 h-20 resize-none"
                />
              </div>
            </div>
          </div>
          
          <div className="px-6 py-4 border-t border-black/[0.04] flex justify-end gap-3 sticky bottom-0 bg-white/90 backdrop-blur z-10">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-sm font-bold hover:shadow-lg transition-all"
            >
              Create Budget
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateBudgetModal;
