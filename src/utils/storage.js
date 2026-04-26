import { v4 as uuidv4 } from 'uuid';

export const EXPENSE_STORAGE_KEY = 'expenseTrackerData';
const STORAGE_VERSION = 1;

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

const safeParseJson = (text) => {
  if (typeof text !== 'string' || text.trim() === '') return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const normalizeHexColor = (value, fallback) => {
  if (typeof value !== 'string') return fallback;
  return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
};

const normalizeCategory = (cat, fallbackId) => {
  const id = typeof cat?.id === 'string' && cat.id.trim() ? cat.id.trim() : fallbackId;
  const name =
    typeof cat?.name === 'string' && cat.name.trim()
      ? cat.name.trim()
      : (fallbackId || 'Other');
  const color = normalizeHexColor(cat?.color, '#A5A58D');
  return { id, name, color };
};

const normalizeTransaction = (tx) => {
  const id = typeof tx?.id === 'string' && tx.id.trim() ? tx.id : uuidv4();

  const parseAmount = (value) => {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') return NaN;
    const text = value
      .trim()
      // strip common currency symbols/letters and spaces
      .replace(/[₹$,A-Z]/gi, '')
      // remove grouping separators
      .replace(/,/g, '')
      // keep digits, dot, minus
      .replace(/[^\d.-]/g, '');
    return parseFloat(text);
  };

  const rawAmount = parseAmount(tx?.amount);
  // Older versions may store expenses as negative numbers; normalize to positive.
  let amount = Number.isFinite(rawAmount) ? Math.abs(rawAmount) : 0;

  const rawType = typeof tx?.type === 'string' ? tx.type.trim() : '';
  const type = rawType === 'income' || rawType === 'expense' || rawType === 'investment' ? rawType : 'expense';
  const category = typeof tx?.category === 'string' && tx.category.trim() ? tx.category : (type === 'investment' ? 'Stocks' : 'other');

  const baseDesc = typeof tx?.description === 'string' ? tx.description.trim() : '';
  const name = typeof tx?.name === 'string' ? tx.name.trim() : '';
  const description = baseDesc || (type === 'investment' ? (name || 'Investment') : type === 'income' ? 'Income' : 'Expense');

  // Expect `YYYY-MM-DD`. If invalid, default to today.
  const dateCandidate = typeof tx?.date === 'string' ? tx.date : '';
  const date =
    /^\d{4}-\d{2}-\d{2}$/.test(dateCandidate)
      ? dateCandidate
      : new Date().toISOString().slice(0, 10);

  const createdAtCandidate = typeof tx?.createdAt === 'string' ? tx.createdAt : '';
  const createdAt = Number.isFinite(Date.parse(createdAtCandidate)) ? createdAtCandidate : null;

  const timeCandidate = typeof tx?.time === 'string' ? tx.time : '';
  const time = /^\d{2}:\d{2}$/.test(timeCandidate) ? timeCandidate : null;

  const num = (v, fb = null) => {
    const n = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : NaN;
    return Number.isFinite(n) ? n : fb;
  };

  // Some older payloads saved investment transactions without an explicit `amount`.
  // Recompute it from quantity * entryPrice so investments don't disappear after reload.
  if (type === 'investment' && !(amount > 0)) {
    const quantity = num(tx?.quantity, NaN);
    const entryPrice = num(tx?.entryPrice, NaN);
    if (Number.isFinite(quantity) && quantity > 0 && Number.isFinite(entryPrice) && entryPrice > 0) {
      amount = Math.round(quantity * entryPrice * 100) / 100;
    }
  }

  return {
    id,
    description,
    amount,
    date,
    ...(time ? { time } : {}),
    ...(createdAt ? { createdAt } : {}),
    category,
    type,
    ...(type === 'investment'
      ? {
          name: name || description,
          quantity: num(tx?.quantity, 0) || 0,
          entryPrice: num(tx?.entryPrice, 0) || 0,
          ...(num(tx?.exitPrice, null) != null ? { exitPrice: num(tx?.exitPrice, null) } : {}),
          ...(num(tx?.profit, null) != null ? { profit: num(tx?.profit, null) } : {}),
          ...(typeof tx?.status === 'string' && tx.status.trim() ? { status: tx.status.trim() } : {}),
        }
      : {}),
  };
};

export const readExpenseStateFromStorage = (storageKey = EXPENSE_STORAGE_KEY) => {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  const raw = window.localStorage.getItem(storageKey);
  const parsed = safeParseJson(raw);
  return isObject(parsed) ? parsed : null;
};

export const writeExpenseStateToStorage = (state, storageKey = EXPENSE_STORAGE_KEY) => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  const payload = {
    _v: STORAGE_VERSION,
    savedAt: new Date().toISOString(),
    transactions: state.transactions,
    categories: state.categories,
    darkMode: state.darkMode,
    // Demo mode removed: keep the field for backward compatibility, but always false.
    isDemoData: false,
    currencyCode: state.currencyCode,
    networthSnapshots: state.networthSnapshots,
    dashboardPrefs: state.dashboardPrefs,
  };
  window.localStorage.setItem(storageKey, JSON.stringify(payload));
};

const normalizeCurrencyCode = (value, fallback) => {
  if (typeof value !== 'string') return fallback;
  const code = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : fallback;
};

const normalizeMonthKey = (value) => {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  if (!/^\d{4}-\d{2}$/.test(v)) return null;
  const [y, m] = v.split('-').map((n) => parseInt(n, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return null;
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}`;
};

const normalizeNetworthSnapshot = (snap) => {
  const month = normalizeMonthKey(snap?.month);
  if (!month) return null;
  const id = typeof snap?.id === 'string' && snap.id.trim() ? snap.id : uuidv4();
  const assets = Number.isFinite(Number(snap?.assets)) ? Number(snap.assets) : 0;
  const liabilities = Number.isFinite(Number(snap?.liabilities)) ? Number(snap.liabilities) : 0;
  const investments = Number.isFinite(Number(snap?.investments)) ? Number(snap.investments) : 0;
  const notes = typeof snap?.notes === 'string' ? snap.notes.slice(0, 500) : '';
  return { id, month, assets, liabilities, investments, notes };
};

const normalizeDashboardPrefs = (prefs, fallback = {}) => {
  const p = isObject(prefs) ? prefs : {};
  const fb = isObject(fallback) ? fallback : {};

  const num = (v, fb = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fb;
  };

  const clampInt = (v, a, b, fb) => {
    const n = Math.trunc(Number(v));
    return Number.isFinite(n) ? clamp(n, a, b) : fb;
  };

  // Small helper so we can validate without importing.
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

  const defaultShowWidgets = {
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
  };

  const normalizeShowWidgets = (value) => {
    const raw = isObject(value) ? value : {};
    const out = { ...defaultShowWidgets };
    Object.keys(defaultShowWidgets).forEach((k) => {
      if (typeof raw[k] === 'boolean') out[k] = raw[k];
    });
    return out;
  };

  const normalizeCategoryBudgets = (value) => {
    const raw = isObject(value) ? value : {};
    const out = {};
    Object.entries(raw).forEach(([k, v]) => {
      if (typeof k !== 'string' || !k.trim()) return;
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0) return;
      out[k] = n;
    });
    return out;
  };

  const normalizeForecastHorizonMonths = (value, fallback) => {
    // Allow all preset horizons and custom ranges (Dashboard supports up to 1000 years).
    const raw = clampInt(value, 1, 12000, fallback);
    return Number.isFinite(raw) && raw >= 1 ? raw : clampInt(fallback, 1, 12000, 1);
  };

  const normalizeDateKey = (value) => {
    const s = typeof value === 'string' ? value.trim() : '';
    if (!s) return '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '';
    // Basic sanity (Date will accept overflow values, so explicitly verify round-trip).
    const d = new Date(`${s}T00:00:00.000Z`);
    if (!Number.isFinite(d.getTime())) return '';
    const yyyy = String(d.getUTCFullYear()).padStart(4, '0');
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}` === s ? s : '';
  };

  const normalizeCashflowMetrics = (value, fallbackMetric = 'savings') => {
    const raw = isObject(value) ? value : {};
    const out = {
      savings: false,
      income: false,
      expense: false,
    };
    ['savings', 'income', 'expense'].forEach((k) => {
      if (typeof raw[k] === 'boolean') out[k] = raw[k];
    });
    if (!out.savings && !out.income && !out.expense) {
      out[fallbackMetric === 'income' ? 'income' : fallbackMetric === 'expense' ? 'expense' : 'savings'] = true;
    }
    return out;
  };

  const normalizeFromSet = (value, allowed, fallback) => {
    const v = typeof value === 'string' ? value.trim() : '';
    if (allowed.has(v)) return v;
    const fbv = typeof fallback === 'string' ? fallback.trim() : '';
    return allowed.has(fbv) ? fbv : Array.from(allowed)[0];
  };

  const normalizeNullableId = (value, fallback = null) => {
    if (value === null || typeof value === 'undefined') return null;
    if (typeof value !== 'string') return fallback === undefined ? null : fallback;
    const v = value.trim();
    return v ? v : null;
  };

  const normalizeBool = (value, fallback) => {
    if (typeof value === 'boolean') return value;
    if (typeof fallback === 'boolean') return fallback;
    return false;
  };

  return {
    monthlyExpenseBudget: Math.max(0, num(p.monthlyExpenseBudget, num(fb.monthlyExpenseBudget, 0))),
    monthlySavingsGoal: Math.max(0, num(p.monthlySavingsGoal, num(fb.monthlySavingsGoal, 0))),
    forecastWindowMonths: clampInt(p.forecastWindowMonths, 3, 12, clampInt(fb.forecastWindowMonths, 3, 12, 6)),
    forecastHorizonMonths: normalizeForecastHorizonMonths(
      p.forecastHorizonMonths,
      normalizeForecastHorizonMonths(fb.forecastHorizonMonths, 1)
    ),
    forecastCustomStart: normalizeDateKey(p.forecastCustomStart) || normalizeDateKey(fb.forecastCustomStart),
    forecastCustomEnd: normalizeDateKey(p.forecastCustomEnd) || normalizeDateKey(fb.forecastCustomEnd),
    scenarioExpenseDeltaPct: clamp(num(p.scenarioExpenseDeltaPct, num(fb.scenarioExpenseDeltaPct, 0)), -50, 50),
    scenarioIncomeDeltaPct: clamp(num(p.scenarioIncomeDeltaPct, num(fb.scenarioIncomeDeltaPct, 0)), -50, 50),
    cashflowRange: normalizeFromSet(
      p.cashflowRange,
      new Set(['1M', '3M', '6M', '12M', '3Y', '5Y', '10Y', 'ALL']),
      fb.cashflowRange || '6M'
    ),
    cashflowMetric: normalizeFromSet(
      p.cashflowMetric,
      new Set(['savings', 'income', 'expense']),
      fb.cashflowMetric || 'savings'
    ),
    cashflowMetrics: normalizeCashflowMetrics(p.cashflowMetrics, normalizeFromSet(p.cashflowMetric, new Set(['savings', 'income', 'expense']), fb.cashflowMetric || 'savings')),
    cashflowChartType: normalizeFromSet(
      p.cashflowChartType,
      new Set(['line', 'histogram']),
      fb.cashflowChartType || 'line'
    ),
    cashflowCumulative: normalizeBool(p.cashflowCumulative, fb.cashflowCumulative ?? false),
    cashflowBaseline: normalizeFromSet(p.cashflowBaseline, new Set(['auto', 'zero']), fb.cashflowBaseline || 'auto'),
    cashflowSmaEnabled: normalizeBool(p.cashflowSmaEnabled, fb.cashflowSmaEnabled ?? true),
    cashflowSmaPeriod: clampInt(p.cashflowSmaPeriod, 2, 60, clampInt(fb.cashflowSmaPeriod, 2, 60, 6)),
    cashflowMeanEnabled: normalizeBool(p.cashflowMeanEnabled, fb.cashflowMeanEnabled ?? false),
    spendMixCategoryId: normalizeNullableId(p.spendMixCategoryId, fb.spendMixCategoryId ?? null),
    showWidgets: normalizeShowWidgets(p.showWidgets || fb.showWidgets),
    categoryBudgets: normalizeCategoryBudgets(p.categoryBudgets || fb.categoryBudgets),
  };
};

export const normalizeExpenseState = (initialState, rawState) => {
  const raw = isObject(rawState) ? rawState : null;

  // Demo mode removed: if prior storage is flagged as demo, treat it as empty.
  const isDemoData = !!raw?.isDemoData;
  const rawForData = isDemoData ? null : raw;

  const rawTransactions = Array.isArray(rawForData?.transactions) ? rawForData.transactions : null;
  const transactions = rawTransactions
    ? rawTransactions.map(normalizeTransaction).filter((t) => t.description && t.amount > 0)
    : null;

  const rawCategories = Array.isArray(rawForData?.categories) ? rawForData.categories : null;
  const normalizedCategories = rawCategories
    ? rawCategories.map((c, i) => normalizeCategory(c, `cat_${i}`))
    : null;

  const categoryById = new Map();
  initialState.categories.forEach((c) => categoryById.set(c.id, normalizeCategory(c, c.id)));
  (normalizedCategories || []).forEach((c) => categoryById.set(c.id, normalizeCategory(c, c.id)));
  const categories = Array.from(categoryById.values());

  const darkMode = !!rawForData?.darkMode;
  const currencyCode = normalizeCurrencyCode(rawForData?.currencyCode, initialState.currencyCode || 'USD');

  const networthSnapshots = Array.isArray(rawForData?.networthSnapshots)
    ? rawForData.networthSnapshots.map(normalizeNetworthSnapshot).filter(Boolean)
    : [];

  const dashboardPrefs = normalizeDashboardPrefs(rawForData?.dashboardPrefs, initialState.dashboardPrefs || {});

  if (transactions) {
    return {
      ...initialState,
      ...rawForData,
      transactions,
      categories,
      darkMode,
      isDemoData: false,
      currencyCode,
      networthSnapshots,
      dashboardPrefs,
    };
  }

  return {
    ...initialState,
    transactions: [],
    categories,
    darkMode,
    isDemoData: false,
    currencyCode,
    networthSnapshots,
    dashboardPrefs,
  };
};
