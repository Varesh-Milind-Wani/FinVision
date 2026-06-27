import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useExpenseContext } from './ExpenseContext';

export type BudgetPeriod = 'Weekly' | 'Monthly' | 'Yearly' | 'Custom';
export type BudgetStatus = 'Active' | 'Paused' | 'Completed';

export interface Budget {
  id: string;
  name: string;
  amount: number;
  currency: string;
  period: BudgetPeriod;
  category: string;
  startDate: string | null;
  endDate: string | null;
  color: string;
  alertPercentage: number;
  recurring: boolean;
  carryForward: boolean;
  income: number;
  savingsGoal: number;
  notes: string;
  status: BudgetStatus;
  createdAt: number;
}

interface BudgetContextType {
  budgets: Budget[];
  addBudget: (budget: Omit<Budget, 'id' | 'createdAt'>) => void;
  updateBudget: (id: string, updates: Partial<Budget>) => void;
  deleteBudget: (id: string) => void;
  getBudgetUsage: (budgetId: string) => { spent: number; remaining: number; usagePercent: number };
}

const BudgetContext = createContext<BudgetContextType | undefined>(undefined);

const STORAGE_KEY = 'finvision.budgets.v1';

export const BudgetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { transactions } = useExpenseContext() as any;

  const [budgets, setBudgets] = useState<Budget[]>(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return [];
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(budgets));
    } catch {
      // ignore
    }
  }, [budgets]);

  const addBudget = useCallback((budgetData: Omit<Budget, 'id' | 'createdAt'>) => {
    const newBudget: Budget = {
      ...budgetData,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    setBudgets((prev) => [...prev, newBudget]);
  }, []);

  const updateBudget = useCallback((id: string, updates: Partial<Budget>) => {
    setBudgets((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  }, []);

  const deleteBudget = useCallback((id: string) => {
    setBudgets((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const getBudgetUsage = useCallback(
    (budgetId: string) => {
      const budget = budgets.find((b) => b.id === budgetId);
      if (!budget) return { spent: 0, remaining: 0, usagePercent: 0 };

      // Calculate spent based on category and period.
      // For a real app, this would deeply parse periods. For this simulation, 
      // we filter by category and optionally within startDate/endDate if they exist.
      let spent = 0;
      if (transactions && Array.isArray(transactions)) {
        for (const t of transactions) {
          if (t.type !== 'expense') continue;
          if (
            budget.category !== 'All' &&
            String(t.category).toLowerCase().replace(/\s+/g, '_') !== String(budget.category).toLowerCase().replace(/\s+/g, '_')
          ) {
            continue;
          }
          
          const tDate = new Date(t.date).getTime();
          if (budget.startDate && tDate < new Date(budget.startDate).getTime()) continue;
          if (budget.endDate && tDate > new Date(budget.endDate).getTime()) continue;
          
          spent += Number(t.amount) || 0;
        }
      }

      const remaining = Math.max(0, budget.amount - spent);
      const usagePercent = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

      return { spent, remaining, usagePercent };
    },
    [budgets, transactions]
  );

  const value = useMemo(
    () => ({ budgets, addBudget, updateBudget, deleteBudget, getBudgetUsage }),
    [budgets, addBudget, updateBudget, deleteBudget, getBudgetUsage]
  );

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
};

export const useBudgetContext = () => {
  const context = useContext(BudgetContext);
  if (context === undefined) {
    throw new Error('useBudgetContext must be used within a BudgetProvider');
  }
  return context;
};
