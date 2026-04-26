import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  normalizeExpenseState,
  readExpenseStateFromStorage,
  writeExpenseStateToStorage,
} from '../utils/storage';
import { getExpenseStorageKeyForUser } from '../utils/authStorage';
import { useAuth } from './AuthContext';

const IS_DEV = process.env.NODE_ENV !== 'production';

// Define initial state
const initialState = {
  transactions: [],
  categories: [
    { id: 'basic_needs', name: 'Basic Needs', color: '#60A5FA' },
    { id: 'food', name: 'Food', color: '#FF6B6B' },
    { id: 'transportation', name: 'Transportation', color: '#4ECDC4' },
    { id: 'entertainment', name: 'Entertainment', color: '#FFD166' },
    { id: 'unneeded_products', name: 'Unneeded Products', color: '#F472B6' },
    { id: 'utilities', name: 'Utilities', color: '#6B5B95' },
    { id: 'salary', name: 'Salary', color: '#88D498' },
    { id: 'freelance', name: 'Freelance', color: '#F3A712' },
    { id: 'other', name: 'Other', color: '#A5A58D' },
  ],
  darkMode: false,
  isDemoData: false,
  currencyCode: 'INR',
  networthSnapshots: [],
  dashboardPrefs: {
    monthlyExpenseBudget: 0,
    monthlySavingsGoal: 0,
    forecastWindowMonths: 6,
    forecastHorizonMonths: 1,
    scenarioExpenseDeltaPct: 0,
    scenarioIncomeDeltaPct: 0,
    cashflowRange: '6M', // 1M | 3M | 6M | 12M | ALL
    cashflowMetric: 'savings', // savings | income | expense
    cashflowMetrics: { savings: true, income: false, expense: false }, // multi-metric line compare
    cashflowChartType: 'line', // line | histogram
    cashflowCumulative: false,
    cashflowBaseline: 'auto', // auto | zero
    cashflowSmaEnabled: true,
    cashflowSmaPeriod: 6, // months (monthly) or days (daily)
    cashflowMeanEnabled: false, // average line over the visible window
    spendMixCategoryId: null, // null = All
    showWidgets: {
      intelligence: true,
      prediction: true,
      goals: true,
      trends: true,
      spendMix: true,
      categoryBudgets: true,
      spikes: true,
      merchants: true,
      insights: true,
      activity: true,
    },
    categoryBudgets: {},
  },
};

// Define action types
const ADD_TRANSACTION = 'ADD_TRANSACTION';
const DELETE_TRANSACTION = 'DELETE_TRANSACTION';
const DELETE_TRANSACTIONS = 'DELETE_TRANSACTIONS';
const EDIT_TRANSACTION = 'EDIT_TRANSACTION';
const ADD_CATEGORY = 'ADD_CATEGORY';
const DELETE_CATEGORY = 'DELETE_CATEGORY';
const TOGGLE_DARK_MODE = 'TOGGLE_DARK_MODE';
const LOAD_DATA = 'LOAD_DATA';
const IMPORT_DATA = 'IMPORT_DATA';
const RESTORE_DATA = 'RESTORE_DATA';
const SET_CURRENCY = 'SET_CURRENCY';
const CONVERT_BASE_CURRENCY = 'CONVERT_BASE_CURRENCY';
const UPSERT_NETWORTH_SNAPSHOT = 'UPSERT_NETWORTH_SNAPSHOT';
const DELETE_NETWORTH_SNAPSHOT = 'DELETE_NETWORTH_SNAPSHOT';
const SET_DASHBOARD_PREFS = 'SET_DASHBOARD_PREFS';

// Define reducer function
const expenseReducer = (state, action) => {
  switch (action.type) {
    case ADD_TRANSACTION: {
      // Ensure we have a unique ID
      if (!action.payload.id) {
        if (IS_DEV) console.error('Attempting to add transaction without ID');
        return state;
      }
      return {
        ...state,
        transactions: [...state.transactions, action.payload],
      };
    }
    case DELETE_TRANSACTION: {
      // Ensure we have matching IDs
      const updatedTransactions = state.transactions.filter(
        (transaction) => transaction.id !== action.payload
      );
      return {
        ...state,
        transactions: updatedTransactions,
      };
    }
    case DELETE_TRANSACTIONS: {
      const ids = Array.isArray(action.payload) ? action.payload : [];
      if (ids.length === 0) return state;
      const idSet = new Set(ids);
      return {
        ...state,
        transactions: state.transactions.filter((t) => !idSet.has(t.id)),
      };
    }
    case EDIT_TRANSACTION: {
      if (!action.payload.id) {
        if (IS_DEV) console.error('Attempting to edit transaction without ID');
        return state;
      }
      
      // Create entirely new array with the updated transaction
      const updatedTransactions = state.transactions.map((transaction) => {
        if (transaction.id === action.payload.id) {
          return { ...action.payload };
        }
        return transaction;
      });
      
      return {
        ...state,
        transactions: updatedTransactions,
      };
    }
    case ADD_CATEGORY:
      return {
        ...state,
        categories: [...state.categories, action.payload],
      };
    case DELETE_CATEGORY:
      return {
        ...state,
        categories: state.categories.filter(
          (category) => category.id !== action.payload
        ),
      };
    case TOGGLE_DARK_MODE:
      return {
        ...state,
        darkMode: !state.darkMode,
      };
    case LOAD_DATA:
      return {
        ...state,
        ...action.payload,
      };
    case IMPORT_DATA:
      return {
        ...state,
        transactions: [...state.transactions, ...action.payload.transactions],
        categories: [...state.categories.filter(cat => 
          !action.payload.categories.some(importedCat => importedCat.id === cat.id)
        ), ...action.payload.categories],
        currencyCode: action.payload.currencyCode || state.currencyCode,
        dashboardPrefs: action.payload.dashboardPrefs ? { ...state.dashboardPrefs, ...action.payload.dashboardPrefs } : state.dashboardPrefs,
        networthSnapshots: (() => {
          const byMonth = new Map(state.networthSnapshots.map((s) => [s.month, s]));
          (action.payload.networthSnapshots || []).forEach((s) => byMonth.set(s.month, s));
          return Array.from(byMonth.values());
        })(),
      };
    case RESTORE_DATA:
      return {
        ...state,
        ...action.payload,
      };
    case SET_CURRENCY:
      return {
        ...state,
        currencyCode: action.payload,
      };
    case CONVERT_BASE_CURRENCY: {
      const nextCode = action?.payload?.nextCode;
      const factor = Number(action?.payload?.factor);
      if (typeof nextCode !== 'string' || !/^[A-Z]{3}$/.test(nextCode)) return state;
      if (!Number.isFinite(factor) || factor <= 0) return state;

      const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

      const transactions = (state.transactions || []).map((t) => ({
        ...t,
        amount: round2((Number(t.amount) || 0) * factor),
      }));

      const networthSnapshots = (state.networthSnapshots || []).map((s) => ({
        ...s,
        assets: round2((Number(s.assets) || 0) * factor),
        liabilities: round2((Number(s.liabilities) || 0) * factor),
        investments: round2((Number(s.investments) || 0) * factor),
      }));

      const prefs = state.dashboardPrefs || {};
      const categoryBudgetsRaw = prefs.categoryBudgets && typeof prefs.categoryBudgets === 'object' ? prefs.categoryBudgets : {};
      const categoryBudgets = Object.fromEntries(
        Object.entries(categoryBudgetsRaw).map(([k, v]) => [k, round2((Number(v) || 0) * factor)])
      );

      return {
        ...state,
        currencyCode: nextCode,
        transactions,
        networthSnapshots,
        dashboardPrefs: {
          ...prefs,
          monthlyExpenseBudget: round2((Number(prefs.monthlyExpenseBudget) || 0) * factor),
          monthlySavingsGoal: round2((Number(prefs.monthlySavingsGoal) || 0) * factor),
          categoryBudgets,
        },
      };
    }
    case SET_DASHBOARD_PREFS:
      return {
        ...state,
        dashboardPrefs: {
          ...state.dashboardPrefs,
          ...(action.payload || {}),
        },
      };
    case UPSERT_NETWORTH_SNAPSHOT: {
      const snap = action.payload;
      const exists = state.networthSnapshots.some((s) => s.month === snap.month);
      return {
        ...state,
        networthSnapshots: exists
          ? state.networthSnapshots.map((s) => (s.month === snap.month ? snap : s))
          : [...state.networthSnapshots, snap],
      };
    }
    case DELETE_NETWORTH_SNAPSHOT:
      return {
        ...state,
        networthSnapshots: state.networthSnapshots.filter((s) => s.month !== action.payload),
      };
    default:
      return state;
  }
};

// Create context
const ExpenseContext = createContext();

// Create provider component
export const ExpenseProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const storageKey = useMemo(
    () => getExpenseStorageKeyForUser(currentUser?.id || 'guest'),
    [currentUser?.id]
  );

  const hasLocalStorage = typeof window !== 'undefined' && !!window.localStorage;
  const [dataMeta, setDataMeta] = React.useState(() => ({
    status: hasLocalStorage ? 'ready' : 'error', // ready | loading | error
    error: hasLocalStorage ? null : 'Unable to load data',
    storageKey,
  }));

  // Hydrate initial state from localStorage (works reliably even in React StrictMode dev).
  const [state, dispatch] = useReducer(
    expenseReducer,
    initialState,
    (init) => normalizeExpenseState(init, readExpenseStateFromStorage(storageKey))
  );

  const hydratedKeyRef = useRef(storageKey);

  useEffect(() => {
    if (hydratedKeyRef.current === storageKey) return;
    hydratedKeyRef.current = storageKey;
    setDataMeta({ status: hasLocalStorage ? 'loading' : 'error', error: hasLocalStorage ? null : 'Unable to load data', storageKey });
    let readyTimer = null;
    try {
      dispatch({
        type: LOAD_DATA,
        payload: normalizeExpenseState(initialState, readExpenseStateFromStorage(storageKey)),
      });
      // Allow one render in "loading" so dashboards don't flash ₹0.00 / empty states.
      readyTimer = window.setTimeout(() => setDataMeta({ status: 'ready', error: null, storageKey }), 0);
    } catch (error) {
      setDataMeta({ status: 'error', error: 'Unable to load data', storageKey });
    }

    return () => {
      if (readyTimer) window.clearTimeout(readyTimer);
    };
  }, [hasLocalStorage, storageKey]);

  const { transactions, categories, darkMode, currencyCode, networthSnapshots, dashboardPrefs } = state;

  // Save data to localStorage whenever state changes (debounced to avoid UI jank on large datasets).
  const saveTimerRef = useRef(null);
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      try {
        writeExpenseStateToStorage({ transactions, categories, darkMode, currencyCode, networthSnapshots, dashboardPrefs }, storageKey);
      } catch (error) {
        console.error("Error saving data to localStorage:", error);
      }
    }, 250);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    };
  }, [transactions, categories, darkMode, currencyCode, networthSnapshots, dashboardPrefs, storageKey]);

  const investmentRealizedPnL = useMemo(() => {
    let pnl = 0;
    for (const t of transactions) {
      if (t?.type !== 'investment') continue;
      const qty = typeof t.quantity === 'number' ? t.quantity : Number(t.quantity);
      const entry = typeof t.entryPrice === 'number' ? t.entryPrice : Number(t.entryPrice);
      const exit = typeof t.exitPrice === 'number' ? t.exitPrice : Number(t.exitPrice);
      const hasExit = t.exitPrice != null && Number.isFinite(exit) && exit >= 0;
      if (!hasExit) continue;
      if (Number.isFinite(qty) && qty > 0 && Number.isFinite(entry) && entry > 0) {
        pnl += (exit - entry) * qty;
      } else if (Number.isFinite(Number(t.profit))) {
        pnl += Number(t.profit);
      }
    }
    return Math.round(pnl * 100) / 100;
  }, [transactions]);

  // Calculate totals
  const totalIncome = useMemo(() => {
    let sum = 0;
    for (const transaction of transactions) {
      if (transaction.type === 'income') sum += Number(transaction.amount) || 0;
    }
    const realized = Number(investmentRealizedPnL) || 0;
    if (realized > 0) sum += realized;
    return Math.round(sum * 100) / 100;
  }, [investmentRealizedPnL, transactions]);

  const totalExpenses = useMemo(() => {
    let sum = 0;
    for (const transaction of transactions) {
      if (transaction.type === 'expense') sum += Number(transaction.amount) || 0;
    }
    const realized = Number(investmentRealizedPnL) || 0;
    if (realized < 0) sum += Math.abs(realized);
    return Math.round(sum * 100) / 100;
  }, [investmentRealizedPnL, transactions]);

  const netBalance = useMemo(() => totalIncome - totalExpenses, [totalIncome, totalExpenses]);

  // Action creators
  const addTransaction = useCallback((transaction) => {
    try {
      const newId = uuidv4();
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');

      const allowedTypes = new Set(['expense', 'income', 'investment']);
      const type = allowedTypes.has(transaction?.type) ? transaction.type : 'expense';

      const toNum = (v) => {
        const n = typeof v === 'number' ? v : Number(v);
        return Number.isFinite(n) ? n : NaN;
      };

      const quantity = toNum(transaction?.quantity);
      const entryPrice = toNum(transaction?.entryPrice);
      const rawAmount = toNum(transaction?.amount);
      const computedInvestmentAmount =
        type === 'investment' && Number.isFinite(quantity) && quantity > 0 && Number.isFinite(entryPrice) && entryPrice > 0
          ? quantity * entryPrice
          : NaN;

      const amountCandidate = Number.isFinite(rawAmount) && rawAmount > 0 ? rawAmount : computedInvestmentAmount;
      const amount = Number.isFinite(amountCandidate) && amountCandidate > 0 ? Math.round(amountCandidate * 100) / 100 : 0;

      const category = typeof transaction?.category === 'string' && transaction.category.trim() ? transaction.category.trim() : 'other';
      const descriptionRaw =
        typeof transaction?.description === 'string' && transaction.description.trim()
          ? transaction.description.trim()
          : type === 'investment' && typeof transaction?.name === 'string' && transaction.name.trim()
            ? transaction.name.trim()
            : '';
      const description = descriptionRaw || (type === 'income' ? 'Income' : type === 'investment' ? 'Investment' : 'Expense');

      const newTransaction = {
        id: newId,
        date: transaction?.date || new Date().toISOString().split('T')[0],
        time: `${hh}:${mm}`,
        createdAt: now.toISOString(),
        type,
        category,
        description,
        amount,
        hyperData: typeof transaction?.hyperData === 'string' ? transaction.hyperData : '',
        hyperDataItems: Array.isArray(transaction?.hyperDataItems) ? transaction.hyperDataItems : [],
        ...(type === 'investment'
          ? {
              name: typeof transaction?.name === 'string' ? transaction.name.trim() : '',
              quantity: Number.isFinite(quantity) ? quantity : 0,
              entryPrice: Number.isFinite(entryPrice) ? entryPrice : 0,
              ...(Number.isFinite(toNum(transaction?.exitPrice)) && toNum(transaction?.exitPrice) > 0 ? { exitPrice: toNum(transaction.exitPrice) } : {}),
              ...(Number.isFinite(toNum(transaction?.profit)) ? { profit: toNum(transaction.profit) } : {}),
              ...(typeof transaction?.status === 'string' ? { status: transaction.status } : {}),
            }
          : {}),
      };

      dispatch({
        type: ADD_TRANSACTION,
        payload: newTransaction,
      });
      
      return newTransaction; // Return the new transaction for reference
    } catch (error) {
      console.error("Error adding transaction:", error);
    }
  }, []);

  const deleteTransaction = useCallback((id) => {
    try {
      if (!id) {
        if (IS_DEV) console.error("Attempt to delete transaction without ID");
        return;
      }

      dispatch({
        type: DELETE_TRANSACTION,
        payload: id,
      });
    } catch (error) {
      console.error("Error deleting transaction:", error);
    }
  }, []);

  const deleteTransactions = useCallback((ids) => {
    try {
      const list = Array.isArray(ids) ? ids.filter(Boolean) : [];
      if (list.length === 0) return;

      dispatch({
        type: DELETE_TRANSACTIONS,
        payload: Array.from(new Set(list)),
      });
    } catch (error) {
      console.error("Error deleting transactions:", error);
    }
  }, []);

  const editTransaction = useCallback((transaction) => {
    try {
      if (!transaction || !transaction.id) {
        if (IS_DEV) console.error("Invalid transaction or missing ID for edit");
        return;
      }
      
      // Find the transaction to confirm it exists
      const existingTransaction = state.transactions.find(t => t.id === transaction.id);
      
      if (!existingTransaction) {
        if (IS_DEV) console.error(`Transaction with ID ${transaction.id} not found for editing`);
        return;
      }

      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');

      const updatedTransaction = {
        ...existingTransaction,
        ...transaction,
        createdAt: transaction.createdAt || existingTransaction.createdAt || now.toISOString(),
        time: transaction.time || existingTransaction.time || `${hh}:${mm}`,
        hyperData: typeof transaction.hyperData === 'string' ? transaction.hyperData : (existingTransaction.hyperData || ''),
        hyperDataItems: Array.isArray(transaction.hyperDataItems) ? transaction.hyperDataItems : (existingTransaction.hyperDataItems || []),
      };

      const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
      const toNum = (v) => {
        const n = typeof v === 'number' ? v : Number(v);
        return Number.isFinite(n) ? n : NaN;
      };

      // Special handling for investment edits: allow clearing exit price and recompute derived fields.
      if (updatedTransaction.type === 'investment') {
        const qty = toNum(updatedTransaction.quantity);
        const entry = toNum(updatedTransaction.entryPrice);
        const exit =
          Object.prototype.hasOwnProperty.call(transaction, 'exitPrice') && (transaction.exitPrice === null || transaction.exitPrice === '')
            ? null
            : (() => {
                const n = toNum(updatedTransaction.exitPrice);
                return Number.isFinite(n) && n >= 0 ? n : null;
              })();

        const amount =
          Number.isFinite(qty) && qty > 0 && Number.isFinite(entry) && entry > 0 ? round2(qty * entry) : round2(updatedTransaction.amount);

        if (exit == null) {
          updatedTransaction.exitPrice = undefined;
          updatedTransaction.profit = undefined;
          updatedTransaction.status = 'active';
          updatedTransaction.amount = amount;
        } else {
          updatedTransaction.exitPrice = exit;
          updatedTransaction.profit =
            Number.isFinite(qty) && qty > 0 && Number.isFinite(entry) && entry > 0 ? round2((exit - entry) * qty) : updatedTransaction.profit;
          updatedTransaction.status = 'closed';
          updatedTransaction.amount = amount;
        }
      } else {
        const n = typeof transaction.amount === 'number' ? transaction.amount : Number(transaction.amount);
        if (Number.isFinite(n) && n > 0) updatedTransaction.amount = round2(n);
      }
      
      dispatch({
        type: EDIT_TRANSACTION,
        payload: updatedTransaction,
      });
      
      return updatedTransaction; // Return the updated transaction for reference
    } catch (error) {
      console.error("Error editing transaction:", error);
    }
  }, [state.transactions]);

  const addCategory = useCallback((category) => {
    try {
      const newCategory = {
        id: category.name.toLowerCase().replace(/\s+/g, '_'),
        ...category,
      };
      
      dispatch({
        type: ADD_CATEGORY,
        payload: newCategory,
      });
      
      return newCategory;
    } catch (error) {
      console.error("Error adding category:", error);
    }
  }, []);

  const deleteCategory = useCallback((id) => {
    try {
      if (!id) {
        if (IS_DEV) console.error("Attempt to delete category without ID");
        return;
      }
      
      dispatch({
        type: DELETE_CATEGORY,
        payload: id,
      });
    } catch (error) {
      console.error("Error deleting category:", error);
    }
  }, []);

  const importData = useCallback((data, options = {}) => {
    try {
      const mode = options?.mode === 'replace' ? 'replace' : 'merge';
      const payload = normalizeExpenseState(initialState, data);
      dispatch({ type: mode === 'replace' ? RESTORE_DATA : IMPORT_DATA, payload });
    } catch (error) {
      console.error("Error importing data:", error);
    }
  }, []);

  const toggleDarkMode = useCallback(() => {
    dispatch({ type: TOGGLE_DARK_MODE });
  }, []);

  const setCurrencyCode = useCallback((nextCurrencyCode) => {
    if (typeof nextCurrencyCode !== 'string') return;
    const code = nextCurrencyCode.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(code)) return;
    dispatch({ type: SET_CURRENCY, payload: code });
  }, []);

  const convertBaseCurrency = useCallback((nextCurrencyCode, factor) => {
    if (typeof nextCurrencyCode !== 'string') return;
    const code = nextCurrencyCode.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(code)) return;
    const f = Number(factor);
    if (!Number.isFinite(f) || f <= 0) return;
    dispatch({ type: CONVERT_BASE_CURRENCY, payload: { nextCode: code, factor: f } });
  }, []);

  const setDashboardPrefs = useCallback((next) => {
    if (!next || typeof next !== 'object') return;
    dispatch({ type: SET_DASHBOARD_PREFS, payload: next });
  }, []);

  const upsertNetworthSnapshot = useCallback((snapshot) => {
    try {
      const month = typeof snapshot?.month === 'string' ? snapshot.month.trim() : '';
      if (!/^\d{4}-\d{2}$/.test(month)) return;
      const normalized = {
        id: snapshot.id || uuidv4(),
        month,
        assets: Number.isFinite(Number(snapshot.assets)) ? Number(snapshot.assets) : 0,
        liabilities: Number.isFinite(Number(snapshot.liabilities)) ? Number(snapshot.liabilities) : 0,
        investments: Number.isFinite(Number(snapshot.investments)) ? Number(snapshot.investments) : 0,
        notes: typeof snapshot.notes === 'string' ? snapshot.notes : '',
      };
      dispatch({ type: UPSERT_NETWORTH_SNAPSHOT, payload: normalized });
      return normalized;
    } catch (error) {
      console.error("Error saving networth snapshot:", error);
    }
  }, []);

  const deleteNetworthSnapshot = useCallback((month) => {
    if (typeof month !== 'string') return;
    dispatch({ type: DELETE_NETWORTH_SNAPSHOT, payload: month });
  }, []);

  const categoryData = useMemo(() => {
    const totalsByCategory = new Map();
    for (const transaction of transactions) {
      if (transaction.type !== 'expense') continue;
      const categoryId = transaction.category || 'other';
      const prev = totalsByCategory.get(categoryId) || 0;
      totalsByCategory.set(categoryId, prev + (Number(transaction.amount) || 0));
    }

    const categoryById = new Map();
    for (const category of categories) categoryById.set(category.id, category);

    const out = [];
    for (const [categoryId, amount] of totalsByCategory.entries()) {
      const category = categoryById.get(categoryId) || { name: categoryId, color: '#888' };
      out.push({
        id: categoryId,
        name: category.name,
        amount,
        percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
        color: category.color,
      });
    }
    return out;
  }, [categories, totalExpenses, transactions]);

  const monthlyData = useMemo(() => {
    const months = new Map();

    for (const transaction of transactions) {
      try {
        const date = new Date(transaction.date);
        const year = date.getFullYear();
        const monthIndex = date.getMonth(); // 0-based
        const monthKey = `${year}-${monthIndex + 1}`;

        if (!months.has(monthKey)) {
          months.set(monthKey, {
            income: 0,
            expense: 0,
            ts: Date.UTC(year, monthIndex, 1),
            label: new Date(year, monthIndex, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
          });
        }

        const bucket = months.get(monthKey);
        if (transaction.type === 'income') bucket.income += Number(transaction.amount) || 0;
        else if (transaction.type === 'expense') bucket.expense += Number(transaction.amount) || 0;
        else if (transaction.type === 'investment') {
          const qty = typeof transaction.quantity === 'number' ? transaction.quantity : Number(transaction.quantity);
          const entry = typeof transaction.entryPrice === 'number' ? transaction.entryPrice : Number(transaction.entryPrice);
          const exit = typeof transaction.exitPrice === 'number' ? transaction.exitPrice : Number(transaction.exitPrice);
          const hasExit = transaction.exitPrice != null && Number.isFinite(exit) && exit >= 0;
          if (hasExit && Number.isFinite(qty) && qty > 0 && Number.isFinite(entry) && entry > 0) {
            const profit = (exit - entry) * qty;
            if (profit >= 0) bucket.income += profit;
            else bucket.expense += Math.abs(profit);
          } else if (hasExit && Number.isFinite(Number(transaction.profit))) {
            const profit = Number(transaction.profit);
            if (profit >= 0) bucket.income += profit;
            else bucket.expense += Math.abs(profit);
          }
        }
      } catch (error) {
        if (IS_DEV) console.error("Error processing transaction for monthly data:", transaction, error);
      }
    }

    return Array.from(months.values()).sort((a, b) => a.ts - b.ts);
  }, [transactions]);

  // Backwards compatible API (existing components call getMonthlyData()).
  const getMonthlyData = useCallback(() => monthlyData, [monthlyData]);

  const contextValue = useMemo(
    () => ({
      transactions: state.transactions,
      categories: state.categories,
      darkMode: state.darkMode,
      currencyCode: state.currencyCode,
      networthSnapshots: state.networthSnapshots,
      dashboardPrefs: state.dashboardPrefs,
      dataStatus: dataMeta.status,
      dataError: dataMeta.error,
      totalIncome,
      totalExpenses,
      netBalance,
      categoryData,
      getMonthlyData,
      addTransaction,
      deleteTransaction,
      deleteTransactions,
      editTransaction,
      addCategory,
      deleteCategory,
      importData,
      toggleDarkMode,
      setCurrencyCode,
      convertBaseCurrency,
      setDashboardPrefs,
      upsertNetworthSnapshot,
      deleteNetworthSnapshot,
    }),
    [
      addCategory,
      addTransaction,
      categoryData,
      dataMeta.error,
      dataMeta.status,
      deleteCategory,
      deleteNetworthSnapshot,
      deleteTransaction,
      deleteTransactions,
      editTransaction,
      getMonthlyData,
      importData,
      netBalance,
      convertBaseCurrency,
      setCurrencyCode,
      setDashboardPrefs,
      state.categories,
      state.currencyCode,
      state.darkMode,
      state.dashboardPrefs,
      state.networthSnapshots,
      state.transactions,
      toggleDarkMode,
      totalExpenses,
      totalIncome,
      upsertNetworthSnapshot,
    ]
  );

  return (
    <ExpenseContext.Provider
      value={contextValue}
    >
      {children}
    </ExpenseContext.Provider>
  );
};

// Create custom hook for using the expense context
export const useExpenseContext = () => {
  const context = useContext(ExpenseContext);
  if (!context) {
    throw new Error('useExpenseContext must be used within an ExpenseProvider');
  }
  return context;
}; 
