import * as React from 'react';

export type Transaction = {
  id: string;
  description?: string;
  amount: number;
  date: string;
  type: 'income' | 'expense' | 'investment';
  category?: string;
  name?: string;
  quantity?: number;
  entryPrice?: number;
  exitPrice?: number;
  profit?: number;
  status?: 'active' | 'closed' | string;
};

export type Category = {
  id: string;
  name: string;
  color?: string;
};

export type ExpenseContextValue = {
  transactions: Transaction[];
  categories: Category[];
  categoryData?: any[];
  currencyCode: string;
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  getMonthlyData?: () => Array<{ income: number; expense: number; ts: number; label: string }>;

  // Hydration / load meta (local storage keyed per user)
  dataStatus?: 'ready' | 'loading' | 'error';
  dataError?: string | null;

  addTransaction?: (t: any) => any;
  editTransaction?: (t: any) => any;
  deleteTransaction?: (id: string) => any;
  deleteTransactions?: (ids: string[]) => any;
  addCategory?: (c: any) => any;
  deleteCategory?: (id: string) => any;
  importData?: (payload: any, options?: { mode?: 'merge' | 'replace' }) => any;
  toggleDarkMode?: () => any;
  setCurrencyCode?: (code: string) => any;
  convertBaseCurrency?: (code: string) => any;
  setDashboardPrefs?: (next: any) => any;
};

export const ExpenseProvider: React.FC<{ children?: React.ReactNode }>;
export const useExpenseContext: () => ExpenseContextValue;
