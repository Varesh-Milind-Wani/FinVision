import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useExpenseContext } from './ExpenseContext';
import { formatCurrency } from '../utils/formatUtils';

const CurrencyContext = createContext(null);

const CACHE_PREFIX = 'finvision.fxRates.v1';
const CACHE_TTL_MS = 15 * 60 * 1000; // 15m (keep rates reasonably "real-time")
const DISPLAY_CHANGE_REFRESH_MIN_MS = 60 * 1000; // avoid refetching repeatedly while user toggles

const normalizeCode = (value) => {
  if (typeof value !== 'string') return null;
  const code = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : null;
};

const readCache = (baseCurrencyCode) => {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  const base = normalizeCode(baseCurrencyCode);
  if (!base) return null;
  const raw = window.localStorage.getItem(`${CACHE_PREFIX}:${base}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (normalizeCode(parsed.base) !== base) return null;
    if (!parsed.rates || typeof parsed.rates !== 'object') return null;
    if (typeof parsed.savedAt !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeCache = (baseCurrencyCode, rates) => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  const base = normalizeCode(baseCurrencyCode);
  if (!base) return;
  const payload = {
    base,
    savedAt: Date.now(),
    rates,
  };
  try {
    window.localStorage.setItem(`${CACHE_PREFIX}:${base}`, JSON.stringify(payload));
  } catch {
    // ignore quota / private mode failures
  }
};

const fetchFxRates = async (baseCurrencyCode, signal) => {
  const base = normalizeCode(baseCurrencyCode);
  if (!base) throw new Error('Invalid base currency');

  // Primary: open.er-api.com (no API key)
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${base}`, { signal });
    if (!res.ok) throw new Error(`FX HTTP ${res.status}`);
    const data = await res.json();
    const rates = data?.rates && typeof data.rates === 'object' ? data.rates : null;
    if (!rates) throw new Error('FX invalid payload');
    return { base, rates };
  } catch (err) {
    if (signal?.aborted) throw err;
  }

  // Fallback: frankfurter.app
  const res2 = await fetch(`https://api.frankfurter.app/latest?from=${base}`, { signal });
  if (!res2.ok) throw new Error(`FX HTTP ${res2.status}`);
  const data2 = await res2.json();
  const rates2 = data2?.rates && typeof data2.rates === 'object' ? data2.rates : null;
  if (!rates2) throw new Error('FX invalid payload');
  return { base, rates: rates2 };
};

export const CurrencyProvider = ({ children }) => {
  const { currencyCode: baseCurrencyCode } = useExpenseContext();
  const base = normalizeCode(baseCurrencyCode) || 'INR';

  const [displayCurrencyCode, setDisplayCurrencyCode] = useState(() => {
    if (typeof window === 'undefined' || !window.localStorage) return base;
    const saved = normalizeCode(window.localStorage.getItem('finvision.displayCurrencyCode'));
    return saved || base;
  });

  const [fxState, setFxState] = useState(() => {
    const cached = readCache(base);
    const rates = cached?.rates && typeof cached.rates === 'object' ? cached.rates : {};
    return {
      status: 'idle', // idle | loading | ready | error
      error: null,
      base,
      fetchedAt: cached?.savedAt || null,
      rates: { ...rates, [base]: 1 },
    };
  });

  const abortRef = useRef(null);
  const didMountRef = useRef(false);

  useEffect(() => {
    const next = normalizeCode(displayCurrencyCode) || base;
    if (next !== displayCurrencyCode) setDisplayCurrencyCode(next);
   
  }, [base]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem('finvision.displayCurrencyCode', displayCurrencyCode);
      } catch {
        // ignore
      }
    }
  }, [displayCurrencyCode]);

  const refreshRates = useCallback(async () => {
    abortRef.current?.abort?.();
    const controller = new AbortController();
    abortRef.current = controller;

    setFxState((s) => ({ ...s, status: s.status === 'ready' ? 'ready' : 'loading', error: null, base }));

    try {
      const out = await fetchFxRates(base, controller.signal);
      const rawRates = out?.rates && typeof out.rates === 'object' ? out.rates : {};
      const rates = { ...rawRates, [base]: 1 };
      writeCache(base, rates);
      setFxState({ status: 'ready', error: null, base, fetchedAt: Date.now(), rates });
    } catch (err) {
      if (controller.signal.aborted) return;
      setFxState((s) => ({
        ...s,
        status: s.rates && Object.keys(s.rates).length ? 'ready' : 'error',
        error: err?.message || 'Failed to fetch FX rates',
        base,
      }));
    }
  }, [base]);

  useEffect(() => {
    const cached = readCache(base);
    const cachedIsFresh = cached?.savedAt && Date.now() - cached.savedAt < CACHE_TTL_MS;
    const cachedRates = cached?.rates && typeof cached.rates === 'object' ? cached.rates : null;

    if (cachedRates) {
      setFxState((s) => ({
        ...s,
        base,
        fetchedAt: cached?.savedAt || null,
        rates: { ...cachedRates, [base]: 1 },
        status: 'ready',
        error: null,
      }));
    } else {
      setFxState((s) => ({ ...s, base, fetchedAt: null, rates: { [base]: 1 }, status: 'loading', error: null }));
    }

    if (!cachedIsFresh) refreshRates();

    return () => abortRef.current?.abort?.();
  }, [base, refreshRates]);

  useEffect(() => {
    // Requirement: when display currency changes, fetch latest rates (without blocking UI).
    // If we have a recent fetch, skip to avoid needless requests while the user scrolls the dropdown.
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    // If the display currency matches base, a refresh is unnecessary (rate is always 1).
    const to = normalizeCode(displayCurrencyCode) || base;
    if (to === base) return;

    const last = fxState?.fetchedAt;
    const isRecent = typeof last === 'number' && Date.now() - last < DISPLAY_CHANGE_REFRESH_MIN_MS;
    if (!isRecent) refreshRates();
  }, [base, displayCurrencyCode, fxState?.fetchedAt, refreshRates]);

  const rate = useMemo(() => {
    const to = normalizeCode(displayCurrencyCode) || base;
    const n = Number(fxState?.rates?.[to]);
    return Number.isFinite(n) && n > 0 ? n : 1;
  }, [base, displayCurrencyCode, fxState?.rates]);

  const convertFromBase = useCallback((baseValue) => {
    const n = Number(baseValue);
    if (!Number.isFinite(n)) return 0;
    return n * rate;
  }, [rate]);

  const convertToBase = useCallback((displayValue) => {
    const n = Number(displayValue);
    if (!Number.isFinite(n)) return 0;
    return n / rate;
  }, [rate]);

  const formatFromBase = useCallback(
    (baseValue, locale = 'en-US') => {
      return formatCurrency(convertFromBase(baseValue), locale, normalizeCode(displayCurrencyCode) || base);
    },
    [base, convertFromBase, displayCurrencyCode]
  );

  const value = useMemo(
    () => ({
      baseCurrencyCode: base,
      displayCurrencyCode: normalizeCode(displayCurrencyCode) || base,
      setDisplayCurrencyCode: (code) => setDisplayCurrencyCode(normalizeCode(code) || base),
      fxStatus: fxState.status,
      fxError: fxState.error,
      fxFetchedAt: fxState.fetchedAt,
      fxRates: fxState.rates,
      rate,
      convertFromBase,
      convertToBase,
      formatFromBase,
      refreshRates,
    }),
    [base, convertFromBase, convertToBase, displayCurrencyCode, fxState.error, fxState.fetchedAt, fxState.rates, fxState.status, formatFromBase, rate, refreshRates]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
};

export const useCurrency = () => {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
};
