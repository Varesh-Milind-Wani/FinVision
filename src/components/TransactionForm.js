import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useExpenseContext } from '../contexts/ExpenseContext';
import { getCurrencySymbol } from '../utils/formatUtils';
import { evaluateAmountExpression, formatAmountForInput, hasMathOperators } from '../utils/amountMath';
import {
  buildOsmEmbedUrl,
  getCurrentPosition,
  queryGeolocationPermission,
  readLocationAttachPref,
  reverseGeocodeNominatim,
  writeLocationAttachPref,
} from '../utils/location';

const HYPERDATA_SPLIT_REGEX = /[\n,]+/;

const slugifyHyperDataLabel = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'item';

const parseHyperDataAmount = (raw) => {
  const text = String(raw || '').trim();
  if (!text) return { ok: false, error: 'Missing amount' };
  const result = evaluateAmountExpression(text);
  if (!result.ok) return { ok: false, error: result.error || 'Invalid amount' };
  const value = Number(result.value);
  if (!Number.isFinite(value) || value <= 0) return { ok: false, error: 'Amount must be greater than 0' };
  return { ok: true, value: Math.round(value * 100) / 100 };
};

const parseHyperData = (rawValue) => {
  const raw = String(rawValue || '').trim();
  if (!raw) return { items: [], errors: [], total: 0 };

  const tokens = raw
    .split(HYPERDATA_SPLIT_REGEX)
    .map((part) => part.trim())
    .filter(Boolean);

  const items = [];
  const errors = [];

  tokens.forEach((token, index) => {
    let amount = null;
    let label = '';
    let found = false;

    for (let i = 1; i < token.length - 1; i++) {
      if (token[i] === '-' || token[i] === ' ') {
        const l = token.slice(0, i).trim();
        const r = token.slice(i + 1).trim();
        if (!l || !r) continue;

        const lAmt = parseHyperDataAmount(l);
        const rAmt = parseHyperDataAmount(r);

        if (lAmt.ok && !rAmt.ok) {
          amount = lAmt.value;
          label = r;
          found = true;
          break;
        } else if (!lAmt.ok && rAmt.ok) {
          amount = rAmt.value;
          label = l;
          found = true;
          break;
        }
      }
    }

    if (!found) {
      errors.push(`"${token}" is invalid. Use formats like "20 Chai" or "Grocery 500".`);
      return;
    }

    // Clean up common natural language fillers
    label = label.replace(/^(for|on)\s+/i, '').trim();

    if (!label) {
      errors.push(`"${token}" is missing a label.`);
      return;
    }

    items.push({
      id: `hyper-${index}-${slugifyHyperDataLabel(label)}`,
      label,
      amount,
      source: token,
    });
  });

  const total = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  return { items, errors, total: Math.round(total * 100) / 100 };
};

const serializeHyperDataItems = (items) =>
  (Array.isArray(items) ? items : [])
    .map((item) => `${formatAmountForInput(item.amount, { maxDecimals: 2 })}-${String(item.label || '').trim()}`)
    .filter(Boolean)
    .join(', ');

const buildHyperDataDescription = (items, type) => {
  const list = (Array.isArray(items) ? items : []).map((item) => String(item.label || '').trim()).filter(Boolean);
  if (list.length === 0) return '';
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} + ${list[1]}`;
  if (type === 'investment') return `Investment: ${list.slice(0, 2).join(', ')} +${list.length - 2} more`;
  return `${type === 'income' ? 'Income' : 'Expense'}: ${list.slice(0, 2).join(', ')} +${list.length - 2} more`;
};

const CategoryDropdown = ({ categories, value, disabled, onChange, dense = false }) => {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, (categories || []).findIndex((c) => c.id === value)));
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const idx = (categories || []).findIndex((c) => c.id === value);
    setActiveIndex(Math.max(0, idx));
  }, [categories, value]);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return undefined;
    const onDocMouseDown = (e) => {
      const t = e.target;
      if (buttonRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      close();
    };
    const onDocKeyDown = (e) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onDocKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onDocKeyDown);
    };
  }, [close, open]);

  const commit = (id) => {
    onChange?.(id);
    close();
    buttonRef.current?.focus?.();
  };

  const selected = (categories || []).find((c) => c.id === value);
  const label = selected?.name || 'Select category';

  const onButtonKeyDown = (e) => {
    if (disabled) return;
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(true);
    }
  };

  const onMenuKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min((categories || []).length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActiveIndex((categories || []).length - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const c = (categories || [])[activeIndex];
      if (c) commit(c.id);
    }
  };

  const button = (
    <button
      ref={buttonRef}
      type="button"
      disabled={disabled}
      onClick={() => !disabled && setOpen((v) => !v)}
      onKeyDown={onButtonKeyDown}
      aria-haspopup="listbox"
      aria-expanded={open}
      className={[
        'control-soft w-full text-left',
        dense ? 'py-2' : 'py-2.5',
        disabled ? 'cursor-not-allowed opacity-60 bg-slate-100 dark:bg-slate-900/30 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900/30' : '',
      ].join(' ')}
    >
      <span className="flex items-center gap-2 min-w-0">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
        <span className="truncate">{label}</span>
      </span>
      <svg className={`h-4 w-4 text-slate-500 dark:text-slate-300 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
      </svg>
    </button>
  );

  if (!open || disabled) return button;

  const rect = buttonRef.current?.getBoundingClientRect?.();
  const width = rect ? rect.width : 320;
  const top = rect ? rect.bottom + 8 : 0;
  const maxHeight = Math.min(320, Math.max(180, (window.innerHeight || 800) - top - 16));
  let left = rect ? rect.left : 0;
  left = Math.max(12, Math.min(left, (window.innerWidth || 1024) - width - 12));

  const menu = (
    <div
      ref={menuRef}
      role="listbox"
      tabIndex={-1}
      onKeyDown={onMenuKeyDown}
      aria-label="Category"
      className="fixed z-[10000] overflow-hidden rounded-2xl bg-white/95 dark:bg-slate-950/80 backdrop-blur-xl shadow-2xl ring-1 ring-slate-200/70 dark:ring-white/[0.12] flex flex-col"
      style={{ left, top, width, height: maxHeight }}
      onWheel={(e) => e.stopPropagation()}
    >
      <div className="flex-1 min-h-0 overflow-auto overscroll-contain scrollbar-hide p-1">
        {(categories || []).map((c, idx) => {
          const selectedOpt = c.id === value;
          const active = idx === activeIndex;
          return (
            <button
              key={c.id}
              type="button"
              role="option"
              aria-selected={selectedOpt}
              onMouseEnter={() => setActiveIndex(idx)}
              onClick={() => commit(c.id)}
              className={[
                'w-full text-left px-3 py-2 rounded-xl text-sm font-semibold transition-colors',
                selectedOpt
                  ? 'bg-indigo-600 text-white ring-1 ring-indigo-500/30'
                  : active
                    ? 'bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-slate-100'
                    : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/10',
              ].join(' ')}
            >
              {c.name}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      {button}
      {createPortal(menu, document.body)}
    </>
  );
};

const TransactionForm = ({ editTransaction = null, onClose, variant = 'card', compact = false, className = '' }) => {
  const { addTransaction, editTransaction: updateTransaction, categories, currencyCode } = useExpenseContext();
  const embedded = variant === 'embedded';
  const showCardShell = !embedded && !compact;
  const formSpacing = embedded ? 'space-y-0' : compact ? 'space-y-4' : 'space-y-5';
  const DRAFT_STORAGE_KEY = 'finvision.transactionDraft.v1';
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

  const investmentCategories = useMemo(
    () => [
      { id: 'Stocks', name: 'Stocks' },
      { id: 'Bonds', name: 'Bonds' },
      { id: 'FD', name: 'FD (Fixed Deposit)' },
      { id: 'Options', name: 'Options' },
      { id: 'Futures', name: 'Futures' },
      { id: 'SIP', name: 'SIP' },
      { id: 'Real Estate', name: 'Real Estate' },
      { id: 'Crypto', name: 'Crypto' },
      { id: 'Forex', name: 'Forex' },
      { id: 'Commodity', name: 'Commodity' },
    ],
    []
  );
  
  const initialFormState = useMemo(() => ({
    id: '',
    description: '',
    amount: '',
    hyperData: '',
    date: new Date().toISOString().split('T')[0],
    category: 'food',
    type: 'expense',
    investmentCategory: 'Stocks',
    name: '',
    quantity: '',
    entryPrice: '',
    exitPrice: '',
    currentPrice: '',
  }), []);

  const [formData, setFormData] = useState(initialFormState);
  const [hyperDataItems, setHyperDataItems] = useState([]);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [amountPreview, setAmountPreview] = useState(null); // { value:number } | null
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmDraft, setConfirmDraft] = useState(null); // { payload, summary } | null
  const [attachLocation, setAttachLocation] = useState(() => readLocationAttachPref());
  const [geoPermission, setGeoPermission] = useState(null); // 'granted' | 'prompt' | 'denied' | null
  const [locationPreview, setLocationPreview] = useState(null); // { lat, lng, accuracy, address, capturedAt } | null
  const [locationBusy, setLocationBusy] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [mapNonce, setMapNonce] = useState(0);
  const [dateText, setDateText] = useState(() => {
    const iso = initialFormState.date;
    const m = String(iso || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso || '');
  });
  const nativeDateRef = useRef(null);

  const isoToDdMmYyyy = useCallback((iso) => {
    const s = String(iso || '').trim();
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return s;
    return `${m[3]}/${m[2]}/${m[1]}`;
  }, []);

  const ddMmYyyyToIso = useCallback((text) => {
    const s = String(text || '').trim().replace(/[-.]/g, '/');
    const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return null;
    const dd = Number(m[1]);
    const mm = Number(m[2]);
    const yyyy = Number(m[3]);
    if (!Number.isFinite(dd) || !Number.isFinite(mm) || !Number.isFinite(yyyy)) return null;
    if (yyyy < 1900 || yyyy > 2200) return null;
    if (mm < 1 || mm > 12) return null;
    if (dd < 1 || dd > 31) return null;

    const dt = new Date(Date.UTC(yyyy, mm - 1, dd));
    if (!Number.isFinite(dt.getTime())) return null;
    if (dt.getUTCFullYear() !== yyyy || dt.getUTCMonth() !== mm - 1 || dt.getUTCDate() !== dd) return null;

    const pad2 = (n) => String(n).padStart(2, '0');
    return `${yyyy}-${pad2(mm)}-${pad2(dd)}`;
  }, []);

  // If editing, populate form with transaction data
  useEffect(() => {
    if (editTransaction) {
      console.log("Loading transaction for edit:", editTransaction);
      const initialHyperDataItems = Array.isArray(editTransaction.hyperDataItems) ? editTransaction.hyperDataItems : [];
      const initialHyperData = typeof editTransaction.hyperData === 'string'
        ? editTransaction.hyperData
        : serializeHyperDataItems(initialHyperDataItems);

      const next = {
        ...initialFormState,
        ...editTransaction,
        type: editTransaction.type || initialFormState.type,
        description: String(editTransaction.description || ''),
        category: String(editTransaction.category || initialFormState.category),
        amount: editTransaction.amount != null ? String(editTransaction.amount) : '',
        hyperData: initialHyperData,
      };

      if (editTransaction.type === 'investment') {
        next.investmentCategory = String(editTransaction.category || next.investmentCategory || 'Stocks');
        next.name = String(editTransaction.name || editTransaction.description || '').trim();
        next.quantity = editTransaction.quantity != null ? String(editTransaction.quantity) : '';
        next.entryPrice = editTransaction.entryPrice != null ? String(editTransaction.entryPrice) : '';
        next.exitPrice = editTransaction.exitPrice != null ? String(editTransaction.exitPrice) : '';
        next.currentPrice = editTransaction.currentPrice != null ? String(editTransaction.currentPrice) : '';
        // keep expense/income category untouched for later switching
        next.category = initialFormState.category;
        next.description = next.name;
        next.hyperData = '';
        next.hyperDataItems = [];
      }

      setFormData(next);
      if (editTransaction.type === 'investment') {
        setHyperDataItems([]);
      } else {
        setHyperDataItems(
          initialHyperDataItems.map((item, index) => ({
            id: item.id || `hyper-edit-${index}-${slugifyHyperDataLabel(item.label)}`,
            label: String(item.label || '').trim(),
            amount: Math.round((Number(item.amount) || 0) * 100) / 100,
          }))
        );
      }
    } else {
      setFormData(initialFormState);
      setHyperDataItems([]);
    }
    setLocationError('');
    if (editTransaction?.location && typeof editTransaction.location === 'object') {
      const lat = Number(editTransaction.location.lat);
      const lng = Number(editTransaction.location.lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        setLocationPreview({
          lat,
          lng,
          accuracy: Number.isFinite(Number(editTransaction.location.accuracy)) ? Number(editTransaction.location.accuracy) : undefined,
          address: typeof editTransaction.location.address === 'string' ? editTransaction.location.address : '',
          capturedAt: typeof editTransaction.location.capturedAt === 'string' ? editTransaction.location.capturedAt : '',
        });
      } else {
        setLocationPreview(null);
      }
    } else if (!editTransaction) {
      setLocationPreview(null);
    }
    setConfirmOpen(false);
    setConfirmDraft(null);
    const iso = (editTransaction?.date || initialFormState.date);
    setDateText(isoToDdMmYyyy(iso));
  }, [editTransaction, initialFormState, isoToDdMmYyyy]);

  useEffect(() => {
    let alive = true;
    queryGeolocationPermission().then((state) => {
      if (!alive) return;
      if (state) setGeoPermission(state);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (editTransaction) return;
    try {
      const raw = window.localStorage?.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const saved = parsed?.formData && typeof parsed.formData === 'object' ? parsed.formData : null;
      const savedDateText = typeof parsed?.dateText === 'string' ? parsed.dateText : null;
      const updatedAt = Number(parsed?.updatedAt);
      if (!saved) return;
      if (Number.isFinite(updatedAt)) {
        const ageMs = Date.now() - updatedAt;
        if (ageMs > 1000 * 60 * 60 * 24 * 7) return; // 7 days
      }

      setFormData((prev) => ({
        ...prev,
        ...saved,
        amount: typeof saved.amount === 'string' ? saved.amount : saved.amount != null ? String(saved.amount) : prev.amount,
      }));
      setHyperDataItems(
        Array.isArray(saved.hyperDataItems)
          ? saved.hyperDataItems.map((item, index) => ({
              id: item.id || `hyper-draft-${index}-${slugifyHyperDataLabel(item.label)}`,
              label: String(item.label || '').trim(),
              amount: Math.round((Number(item.amount) || 0) * 100) / 100,
            }))
          : []
      );

      if (savedDateText != null) {
        setDateText(savedDateText);
      } else if (typeof saved?.date === 'string') {
        setDateText(isoToDdMmYyyy(saved.date));
      }
    } catch {
      // ignore
    }
    // Only restore once on mount (fresh entry). Subsequent drafts are handled by the persist effect below.
    
  }, []);

  useEffect(() => {
    if (editTransaction) return;
    try {
      window.localStorage?.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({
          updatedAt: Date.now(),
          formData,
          dateText,
        })
      );
    } catch {
      // ignore
    }
  }, [DRAFT_STORAGE_KEY, dateText, editTransaction, formData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => {
      // Don't allow changing transaction type while editing an existing transaction.
      if (editTransaction && name === 'type') return prevData;
      const next = {
        ...prevData,
        [name]: value,
      };
      return next;
    });

    if (name === 'amount') {
      if (!hasMathOperators(value)) {
        setAmountPreview(null);
      } else {
        const out = evaluateAmountExpression(value);
        setAmountPreview(out.ok && Number.isFinite(out.value) ? { value: out.value } : null);
      }
    }
    
    // Clear error when field is updated
    if (errors[name]) {
      setErrors((prevErrors) => ({
        ...prevErrors,
        [name]: '',
      }));
    }
  };

  const hyperDataParse = useMemo(() => parseHyperData(formData.hyperData), [formData.hyperData]);
  const hyperDataSuggestedDescription = useMemo(
    () => buildHyperDataDescription(hyperDataItems, formData.type),
    [formData.type, hyperDataItems]
  );
  const hyperDataHasRows = hyperDataItems.length > 0;

  const round2 = useCallback((n) => Math.round((Number(n) || 0) * 100) / 100, []);

  const investmentNumbers = useMemo(() => {
    if (formData.type !== 'investment') {
      return {
        ok: false,
        amount: 0,
        profit: null,
        unrealizedProfit: null,
        status: 'active',
        quantity: null,
        entryPrice: null,
        exitPrice: null,
        currentPrice: null,
      };
    }

    const quantity = Number(String(formData.quantity || '').trim());
    const entryPrice = Number(String(formData.entryPrice || '').trim());
    const exitPriceRaw = String(formData.exitPrice || '').trim();
    const exitPrice = exitPriceRaw ? Number(exitPriceRaw) : null;
    const currentPriceRaw = String(formData.currentPrice || '').trim();
    const currentPrice = currentPriceRaw ? Number(currentPriceRaw) : null;

    const qtyOk = Number.isFinite(quantity) && quantity > 0;
    const entryOk = Number.isFinite(entryPrice) && entryPrice > 0;
    const exitOk = exitPrice == null || (Number.isFinite(exitPrice) && exitPrice >= 0);
    const currentOk = currentPrice == null || (Number.isFinite(currentPrice) && currentPrice >= 0);

    const amount = qtyOk && entryOk ? round2(quantity * entryPrice) : 0;
    const profit = qtyOk && entryOk && exitOk && exitPrice != null ? round2((exitPrice - entryPrice) * quantity) : null;
    const status = exitPrice != null && exitOk ? 'closed' : 'active';
    const unrealizedProfit =
      status === 'active' && qtyOk && entryOk && currentOk && currentPrice != null ? round2((currentPrice - entryPrice) * quantity) : null;

    return {
      ok: qtyOk && entryOk && exitOk && currentOk,
      amount,
      profit,
      unrealizedProfit,
      status,
      quantity: qtyOk ? quantity : null,
      entryPrice: entryOk ? entryPrice : null,
      exitPrice: exitOk ? exitPrice : null,
      currentPrice: currentOk ? currentPrice : null,
    };
  }, [formData.currentPrice, formData.entryPrice, formData.exitPrice, formData.quantity, formData.type, round2]);

  const validateForm = () => {
    const newErrors = {};

    if (formData.type === 'investment') {
      if (!String(formData.investmentCategory || '').trim()) {
        newErrors.investmentCategory = 'Category is required';
      }

      if (!String(formData.name || '').trim()) {
        newErrors.name = 'Investment name is required';
      }

      const quantity = Number(String(formData.quantity || '').trim());
      if (!String(formData.quantity || '').trim()) {
        newErrors.quantity = 'Quantity is required';
      } else if (!Number.isFinite(quantity) || quantity <= 0) {
        newErrors.quantity = 'Enter a valid quantity';
      }

      const entryPrice = Number(String(formData.entryPrice || '').trim());
      if (!String(formData.entryPrice || '').trim()) {
        newErrors.entryPrice = 'Entry price is required';
      } else if (!Number.isFinite(entryPrice) || entryPrice <= 0) {
        newErrors.entryPrice = 'Enter a valid entry price';
      }

      const exitText = String(formData.exitPrice || '').trim();
      if (exitText) {
        const exitPrice = Number(exitText);
        if (!Number.isFinite(exitPrice) || exitPrice < 0) {
          newErrors.exitPrice = 'Enter a valid exit price';
        }
      }

      const currentText = String(formData.currentPrice || '').trim();
      if (currentText) {
        const currentPrice = Number(currentText);
        if (!Number.isFinite(currentPrice) || currentPrice < 0) {
          newErrors.currentPrice = 'Enter a valid current price';
        }
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    }

    if (String(formData.hyperData || '').trim() && hyperDataParse.errors.length > 0) {
      newErrors.hyperData = hyperDataParse.errors[0];
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    const amountEval = evaluateAmountExpression(formData.amount);
    if (!formData.amount) {
      newErrors.amount = 'Amount is required';
    } else if (!amountEval.ok) {
      newErrors.amount = amountEval.error || 'Enter a valid amount';
    } else if (Number(amountEval.value) <= 0) {
      newErrors.amount = 'Amount must be a positive number';
    }
    
    const todayStr = new Date().toISOString().split('T')[0];
    if (formData.date > todayStr) {
      newErrors.date = 'Date cannot be in the future';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Keep category sensible when switching type.
  useEffect(() => {
    if (formData.type === 'investment') return;
    if (formData.type === 'income') {
      const isIncomeCategory = String(formData.category || '').startsWith('income_');
      if (!isIncomeCategory) {
        setFormData((prev) => ({ ...prev, category: incomeCategories[0]?.id || 'income_salary' }));
      }
      return;
    }

    const isIncomeCategory = String(formData.category || '').startsWith('income_');
    if (isIncomeCategory) {
      const fallback = (categories || [])[0]?.id || 'food';
      setFormData((prev) => ({ ...prev, category: fallback }));
    }
  }, [categories, formData.category, formData.type, incomeCategories]);

  useEffect(() => {
    if (!String(formData.hyperData || '').trim()) {
      if (hyperDataItems.length > 0) setHyperDataItems([]);
      return;
    }

    if (hyperDataParse.errors.length === 0) {
      setHyperDataItems((prev) => {
        if (
          prev.length === hyperDataParse.items.length &&
          prev.every((item, index) => item.label === hyperDataParse.items[index]?.label && Number(item.amount) === Number(hyperDataParse.items[index]?.amount))
        ) {
          return prev;
        }
        return hyperDataParse.items;
      });
    }
  }, [formData.hyperData, hyperDataItems.length, hyperDataParse.errors.length, hyperDataParse.items]);

  useEffect(() => {
    if (!String(formData.hyperData || '').trim()) return;
    if (hyperDataItems.length === 0) return;
    if (hyperDataParse.errors.length > 0) return;

    const totalText = formatAmountForInput(
      hyperDataItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
      { maxDecimals: 2 }
    );

    setFormData((prev) => (prev.amount === totalText ? prev : { ...prev, amount: totalText }));
  }, [formData.hyperData, hyperDataItems, hyperDataParse.errors.length]);

  const commitAmountExpression = useCallback(() => {
    const raw = formData.amount;
    if (!raw || !hasMathOperators(raw)) return true;
    const out = evaluateAmountExpression(raw);
    if (!out.ok) return false;
    const v = Number(out.value);
    if (!Number.isFinite(v) || v <= 0) return false;
    setFormData((prev) => ({ ...prev, amount: formatAmountForInput(v, { maxDecimals: 2 }) }));
    setAmountPreview(null);
    return true;
  }, [formData.amount]);

  const formatDateLabel = (key) => isoToDdMmYyyy(key);

  const syncHyperDataItems = useCallback((items) => {
    const normalized = (Array.isArray(items) ? items : [])
      .map((item, index) => ({
        id: item.id || `hyper-manual-${index}-${slugifyHyperDataLabel(item.label)}`,
        label: String(item.label || '').trim(),
        amount: Math.round((Number(item.amount) || 0) * 100) / 100,
      }))
      .filter((item) => item.label && Number.isFinite(item.amount) && item.amount > 0);

    setHyperDataItems(normalized);
    setFormData((prev) => ({
      ...prev,
      hyperData: serializeHyperDataItems(normalized),
      amount: normalized.length > 0 ? formatAmountForInput(normalized.reduce((sum, item) => sum + item.amount, 0), { maxDecimals: 2 }) : prev.amount,
    }));
    setErrors((prev) => ({ ...prev, hyperData: '' }));
  }, []);

  const handleHyperDataItemChange = useCallback((itemId, key, value) => {
    const next = hyperDataItems.map((item) => {
      if (item.id !== itemId) return item;
      if (key === 'label') return { ...item, label: value };
      const amountOut = parseHyperDataAmount(value);
      return { ...item, amount: amountOut.ok ? amountOut.value : item.amount };
    });
    syncHyperDataItems(next);
  }, [hyperDataItems, syncHyperDataItems]);

  const handleHyperDataItemDelete = useCallback((itemId) => {
    const next = hyperDataItems.filter((item) => item.id !== itemId);
    syncHyperDataItems(next);
  }, [hyperDataItems, syncHyperDataItems]);

  const applyHyperDataSuggestionToDescription = useCallback(() => {
    if (!hyperDataSuggestedDescription) return;
    setFormData((prev) => ({ ...prev, description: hyperDataSuggestedDescription }));
    setErrors((prev) => ({ ...prev, description: '' }));
  }, [hyperDataSuggestedDescription]);

  const buildPayloadAndSummary = () => {
    const dateKey = formData.date || new Date().toISOString().split('T')[0];

    if (formData.type === 'investment') {
      const currency = getCurrencySymbol(currencyCode);
      const categoryName = String(formData.investmentCategory || '').trim() || 'Investment';
      const name = String(formData.name || '').trim();
      const quantity = Number(String(formData.quantity || '').trim());
      const entryPrice = Number(String(formData.entryPrice || '').trim());
      const exitText = String(formData.exitPrice || '').trim();
      const exitPrice = exitText ? Number(exitText) : null;
      const currentText = String(formData.currentPrice || '').trim();
      const currentPrice = currentText ? Number(currentText) : null;

      const qtyOk = Number.isFinite(quantity) && quantity > 0;
      const entryOk = Number.isFinite(entryPrice) && entryPrice > 0;
      const exitOk = exitPrice == null || (Number.isFinite(exitPrice) && exitPrice >= 0);
      const currentOk = currentPrice == null || (Number.isFinite(currentPrice) && currentPrice >= 0);

      const amount = qtyOk && entryOk ? round2(quantity * entryPrice) : 0;
      const profit = qtyOk && entryOk && exitOk && exitPrice != null ? round2((exitPrice - entryPrice) * quantity) : null;
      const status = exitPrice != null && exitOk ? 'closed' : 'active';
      const unrealizedProfit =
        status === 'active' && qtyOk && entryOk && currentOk && currentPrice != null ? round2((currentPrice - entryPrice) * quantity) : null;

      const payload = {
        id: editTransaction ? editTransaction.id : formData.id,
        date: dateKey,
        type: 'investment',
        category: categoryName,
        name,
        description: name,
        quantity: qtyOk ? quantity : 0,
        entryPrice: entryOk ? entryPrice : 0,
        ...(exitText ? (exitOk ? { exitPrice } : {}) : { exitPrice: null }),
        ...(profit != null ? { profit } : { profit: null }),
        ...(currentText ? (currentOk ? { currentPrice } : {}) : { currentPrice: null }),
        ...(unrealizedProfit != null ? { unrealizedProfit } : { unrealizedProfit: null }),
        status,
        amount,
        hyperData: '',
        hyperDataItems: [],
      };

      const amountText = `-${currency} ${formatAmountForInput(amount, { maxDecimals: 2 })}`;
      const profitText = profit == null ? null : `${profit >= 0 ? '+' : '-'}${currency} ${formatAmountForInput(Math.abs(profit), { maxDecimals: 2 })}`;
      const unrealizedProfitText =
        unrealizedProfit == null
          ? null
          : `${unrealizedProfit >= 0 ? '+' : '-'}${currency} ${formatAmountForInput(Math.abs(unrealizedProfit), { maxDecimals: 2 })}`;

      return {
        payload,
        summary: {
          title: editTransaction ? 'Confirm changes' : 'Confirm transaction',
          typeLabel: 'Investment',
          categoryName,
          amountText,
          description: name || 'Investment',
          dateText: formatDateLabel(payload.date),
          statusLabel: status === 'closed' ? 'Closed' : 'Active',
          profitText,
          unrealizedProfitText,
          investment: {
            quantity: qtyOk ? quantity : null,
            entryPrice: entryOk ? entryPrice : null,
            exitPrice: exitPrice != null && exitOk ? exitPrice : null,
            currentPrice: currentPrice != null && currentOk ? currentPrice : null,
          },
        },
      };
    }

    const amountOut = evaluateAmountExpression(formData.amount);
    const amountValue = amountOut.ok ? Number(amountOut.value) : Number(formData.amount);
    const normalizedAmount = Math.round(Math.max(0, amountValue) * 100) / 100;

    const payload = {
      ...formData,
      amount: normalizedAmount,
      date: dateKey,
      id: editTransaction ? editTransaction.id : formData.id,
      hyperDataItems,
      hyperData: serializeHyperDataItems(hyperDataItems),
    };

    const isIncome = payload.type === 'income';
    const isInvestment = payload.type === 'investment';
    const categoryList = isIncome ? incomeCategories : categories;
    const categoryName = (categoryList || []).find((c) => c.id === payload.category)?.name || payload.category || 'Category';

    const currency = getCurrencySymbol(currencyCode);
    const signedAmountPrefix = isIncome ? '' : '-';
    const amountText = `${signedAmountPrefix}${currency} ${formatAmountForInput(normalizedAmount, { maxDecimals: 2 })}`;

    return {
      payload,
      summary: {
        title: editTransaction ? 'Confirm changes' : 'Confirm transaction',
        typeLabel: isIncome ? 'Income' : isInvestment ? 'Investment' : 'Expense',
        categoryName,
        amountText,
        description: payload.description || '',
        dateText: formatDateLabel(payload.date),
        hyperDataItems,
        hyperDataTotalText: `${signedAmountPrefix}${currency} ${formatAmountForInput(normalizedAmount, { maxDecimals: 2 })}`,
      },
    };
  };

  const refreshLocationPreview = useCallback(async () => {
    setLocationError('');
    if (!attachLocation) {
      setLocationPreview(null);
      return null;
    }

    setLocationBusy(true);
    const ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
    try {
      const pos = await getCurrentPosition({ timeoutMs: 12000, enableHighAccuracy: true, maximumAgeMs: 15000 });
      const lat = pos?.coords?.latitude;
      const lng = pos?.coords?.longitude;
      const accuracy = pos?.coords?.accuracy;
      const capturedAt = new Date(pos?.timestamp || Date.now()).toISOString();

      const out = {
        lat: Number(lat),
        lng: Number(lng),
        accuracy: Number.isFinite(Number(accuracy)) ? Number(accuracy) : undefined,
        capturedAt,
        address: '',
      };

      if (Number.isFinite(out.lat) && Number.isFinite(out.lng)) {
        const rev = await reverseGeocodeNominatim({ lat: out.lat, lng: out.lng, signal: ac?.signal });
        if (rev.ok) out.address = rev.address;
      }

      const perm = await queryGeolocationPermission();
      if (perm) setGeoPermission(perm);

      setLocationPreview(out);
      return out;
    } catch (e2) {
      const perm = await queryGeolocationPermission();
      if (perm) setGeoPermission(perm);
      const msg = e2?.message || (e2?.code === 1 ? 'Location permission denied' : 'Unable to get location');
      setLocationError(String(msg));
      setLocationPreview(null);
      return null;
    } finally {
      if (ac) ac.abort();
      setLocationBusy(false);
    }
  }, [attachLocation]);

  useEffect(() => {
    if (!attachLocation) return;
    if (locationBusy || isSubmitting) return;
    if (geoPermission === 'denied') return;

    const capturedAt = locationPreview?.capturedAt ? new Date(locationPreview.capturedAt).getTime() : 0;
    const fresh = Number.isFinite(capturedAt) && Date.now() - capturedAt < 2 * 60 * 1000; // 2 min
    if (fresh) return;

    // Auto-load a preview when the toggle is ON so the map appears without an extra click.
    const t = setTimeout(() => {
      refreshLocationPreview();
    }, 150);
    return () => clearTimeout(t);
  }, [attachLocation, geoPermission, isSubmitting, locationBusy, locationPreview?.capturedAt, refreshLocationPreview]);

  const maybeAttachLocationToTx = useCallback(
    async (tx) => {
      if (!attachLocation) return tx;

      // If we already have a fresh preview, reuse it.
      const existing = locationPreview;
      const isFresh =
        existing?.capturedAt && Date.now() - new Date(existing.capturedAt).getTime() < 2 * 60 * 1000; // 2 min
      const loc = isFresh ? existing : await refreshLocationPreview();
      if (!Number.isFinite(Number(loc?.lat)) || !Number.isFinite(Number(loc?.lng))) return tx;

      return {
        ...tx,
        location: {
          lat: loc.lat,
          lng: loc.lng,
          ...(Number.isFinite(Number(loc.accuracy)) ? { accuracy: loc.accuracy } : {}),
          ...(loc.address ? { address: loc.address } : {}),
          capturedAt: loc.capturedAt || new Date().toISOString(),
          provider: 'geolocation+nominatim',
        },
      };
    },
    [attachLocation, locationPreview, refreshLocationPreview]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    // If the user typed an expression, resolve it before validating/submitting.
    if (formData.type !== 'investment' && !commitAmountExpression()) {
      setErrors((prev) => ({ ...prev, amount: 'Enter a valid amount expression' }));
      return;
    }

    if (!validateForm()) return;

    const built = buildPayloadAndSummary();

    // Embedded modal flow: confirm with a summary before saving.
    if (embedded && !confirmOpen) {
      setConfirmDraft(built);
      setConfirmOpen(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const txBase = confirmDraft?.payload || built.payload;
      const tx = await maybeAttachLocationToTx(txBase);

      if (editTransaction) {
        console.log("Submitting updated transaction with ID:", tx.id);
        updateTransaction({ ...tx, id: editTransaction.id });
      } else {
        console.log("Submitting new transaction");
        addTransaction(tx);
        try {
          window.localStorage?.removeItem(DRAFT_STORAGE_KEY);
        } catch {
          // ignore
        }
      }

      setConfirmOpen(false);
      setConfirmDraft(null);

      if (!onClose) {
        setFormData(initialFormState);
        setHyperDataItems([]);
      } else {
        onClose();
      }
    } catch (error) {
      console.error("Error submitting transaction:", error);
      alert("There was an error processing your transaction. Please try again.");
      setConfirmOpen(false);
      setConfirmDraft(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData(initialFormState);
    setHyperDataItems([]);
    setErrors({});
    setAmountPreview(null);
    setDateText(isoToDdMmYyyy(initialFormState.date));
    try {
      window.localStorage?.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const openNativeDatePicker = useCallback(() => {
    const el = nativeDateRef.current;
    if (!el) return;
    // iOS Safari is picky about opening the native picker from a "hidden" input.
    // Ensure the input is focusable and has real layout (we keep it transparent).
    try {
      el.focus({ preventScroll: true });
    } catch {
      el.focus();
    }
    // showPicker() is supported in some Chromium-based browsers.
    if (typeof el.showPicker === 'function') el.showPicker();
    else el.click();
  }, []);

  const typeBadgeClass =
    formData.type === 'income'
      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/25 dark:text-emerald-100 ring-emerald-500/25'
      : formData.type === 'investment'
        ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/25 dark:text-blue-100 ring-blue-500/25'
        : 'bg-rose-100 text-rose-800 dark:bg-rose-500/25 dark:text-rose-100 ring-rose-500/25';

  const typeAccent =
    formData.type === 'income'
      ? {
          ring: 'ring-emerald-500/20 dark:ring-emerald-400/25',
          text: 'text-emerald-700 dark:text-emerald-200',
          bg: 'bg-emerald-500/10 dark:bg-emerald-500/10',
        }
      : formData.type === 'investment'
        ? {
            ring: 'ring-blue-500/20 dark:ring-blue-400/25',
            text: 'text-blue-700 dark:text-blue-200',
            bg: 'bg-blue-500/10 dark:bg-blue-500/10',
          }
        : {
            ring: 'ring-rose-500/20 dark:ring-rose-400/25',
            text: 'text-rose-700 dark:text-rose-200',
            bg: 'bg-rose-500/10 dark:bg-rose-500/10',
          };

  const typeLabel = formData.type === 'income' ? 'Income' : formData.type === 'investment' ? 'Investment' : 'Expense';
  const osmEmbedUrl = useMemo(() => {
    if (!locationPreview) return null;
    const base = buildOsmEmbedUrl({
      lat: locationPreview.lat,
      lng: locationPreview.lng,
      accuracyMeters: locationPreview.accuracy,
    });
    if (!base) return null;
    // Force reload when user hits "Recenter" even if coords didn't change.
    return `${base}${base.includes('?') ? '&' : '?'}t=${encodeURIComponent(String(mapNonce || 0))}`;
  }, [locationPreview, mapNonce]);

  // selectedCategory reserved for future (UI label lookup)

  return (
    <form
      onSubmit={handleSubmit}
      className={[
        formSpacing,
        showCardShell ? 'surface p-4 sm:p-6 transition-colors' : '',
        className,
      ].join(' ')}
    >
      {embedded && confirmOpen && confirmDraft?.summary ? (
        <div className="surface p-5">
          <div className="font-display text-lg font-extrabold text-slate-900 dark:text-white">
            {confirmDraft.summary.title}
          </div>
          <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">Review details, then confirm to save.</div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-2xl ring-1 ring-black/5 dark:ring-white/[0.10] bg-white/70 dark:bg-slate-950/20 px-4 py-3">
              <div className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">Type</div>
              <div className="mt-1 text-sm font-extrabold text-slate-900 dark:text-white">{confirmDraft.summary.typeLabel}</div>
            </div>
            <div className="rounded-2xl ring-1 ring-black/5 dark:ring-white/[0.10] bg-white/70 dark:bg-slate-950/20 px-4 py-3">
              <div className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">Category</div>
              <div className="mt-1 text-sm font-extrabold text-slate-900 dark:text-white">{confirmDraft.summary.categoryName}</div>
            </div>
            <div className="rounded-2xl ring-1 ring-black/5 dark:ring-white/[0.10] bg-white/70 dark:bg-slate-950/20 px-4 py-3">
              <div className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">Amount</div>
              <div className="mt-1 text-sm font-extrabold text-slate-900 dark:text-white tabular-nums">{confirmDraft.summary.amountText}</div>
            </div>
            <div className="rounded-2xl ring-1 ring-black/5 dark:ring-white/[0.10] bg-white/70 dark:bg-slate-950/20 px-4 py-3">
              <div className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">Date</div>
              <div className="mt-1 text-sm font-extrabold text-slate-900 dark:text-white tabular-nums">{confirmDraft.summary.dateText}</div>
            </div>
            {confirmDraft.summary.statusLabel ? (
              <div className="rounded-2xl ring-1 ring-black/5 dark:ring-white/[0.10] bg-white/70 dark:bg-slate-950/20 px-4 py-3">
                <div className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">Status</div>
                <div className="mt-1 text-sm font-extrabold text-slate-900 dark:text-white">{confirmDraft.summary.statusLabel}</div>
              </div>
            ) : null}
            {confirmDraft.summary.profitText ? (
              <div className="rounded-2xl ring-1 ring-black/5 dark:ring-white/[0.10] bg-white/70 dark:bg-slate-950/20 px-4 py-3">
                <div className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">P/L</div>
                <div
                  className={`mt-1 text-sm font-extrabold tabular-nums ${
                    String(confirmDraft.summary.profitText || '').trim().startsWith('-') || String(confirmDraft.summary.profitText || '').includes('−')
                      ? 'text-rose-700 dark:text-rose-200'
                      : 'text-emerald-700 dark:text-emerald-200'
                  }`}
                >
                  {confirmDraft.summary.profitText}
                </div>
              </div>
            ) : null}
            {confirmDraft.summary.unrealizedProfitText ? (
              <div className="rounded-2xl ring-1 ring-black/5 dark:ring-white/[0.10] bg-white/70 dark:bg-slate-950/20 px-4 py-3">
                <div className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">Unrealized P/L</div>
                <div
                  className={`mt-1 text-sm font-extrabold tabular-nums ${
                    String(confirmDraft.summary.unrealizedProfitText || '').trim().startsWith('-')
                      ? 'text-rose-700 dark:text-rose-200'
                      : 'text-emerald-700 dark:text-emerald-200'
                  }`}
                >
                  {confirmDraft.summary.unrealizedProfitText}
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-3 rounded-2xl ring-1 ring-black/5 dark:ring-white/[0.10] bg-white/70 dark:bg-slate-950/20 px-4 py-3">
            <div className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">Description</div>
            <div className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100 break-words">
              {confirmDraft.summary.description || '\u2014'}
            </div>
          </div>

          {confirmDraft.summary.hyperDataItems?.length ? (
            <div className="mt-3 rounded-2xl ring-1 ring-black/5 dark:ring-white/[0.10] bg-white/70 dark:bg-slate-950/20 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">HyperData</div>
                <div className="text-xs font-bold text-slate-700 dark:text-slate-200">{confirmDraft.summary.hyperDataTotalText}</div>
              </div>
              <div className="mt-3 space-y-2">
                {confirmDraft.summary.hyperDataItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-100/70 dark:bg-slate-900/50 px-3 py-2">
                    <div className="min-w-0 text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{item.label}</div>
                    <div className="shrink-0 text-sm font-extrabold text-slate-900 dark:text-white tabular-nums">
                      {getCurrencySymbol(currencyCode)} {formatAmountForInput(item.amount, { maxDecimals: 2 })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-5 flex flex-col sm:flex-row gap-2 sm:justify-end">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                setConfirmOpen(false);
                setConfirmDraft(null);
              }}
              className="w-full sm:w-auto px-4 py-2 bg-white/80 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-900/55 text-slate-800 dark:text-slate-100 font-semibold rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400/50 ring-1 ring-black/5 dark:ring-white/[0.12] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Edit
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full sm:w-auto px-5 py-2 text-white font-extrabold rounded-xl shadow-soft transition-colors focus:outline-none focus:ring-2 disabled:opacity-70 disabled:cursor-not-allowed ${
                confirmDraft.payload?.type === 'income'
                  ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 focus:ring-emerald-500/50'
                  : confirmDraft.payload?.type === 'investment'
                    ? 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 focus:ring-indigo-500/50'
                    : 'bg-gradient-to-r from-rose-600 to-fuchsia-600 hover:from-rose-700 hover:to-fuchsia-700 focus:ring-rose-500/50'
              }`}
            >
              {isSubmitting ? 'Saving\u2026' : editTransaction ? 'Confirm & Save' : 'Confirm & Add'}
            </button>
          </div>
        </div>
      ) : (
        <>
      {!embedded ? (
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-black/5 dark:border-white/10 pb-3 sm:pb-4 mb-4 sm:mb-6">
          <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2 sm:mb-0 tracking-tight">
            {editTransaction ? 'Edit Transaction' : 'Add Transaction'}
          </h2>
          <div className={`self-start sm:self-auto px-3 py-1 rounded-full text-xs font-semibold ring-1 ${typeBadgeClass}`}>
            {typeLabel}
          </div>
        </div>
      ) : null}
      
      <div className={embedded ? 'mb-3' : 'mb-4 sm:mb-6'}>
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">Transaction Type</div>
          {embedded ? (
            <div className={`px-3 py-1 rounded-full text-xs font-semibold ring-1 ${typeBadgeClass}`}>{typeLabel}</div>
          ) : null}
        </div>

        {editTransaction ? (
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Type is locked while editing.
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-2xl p-1 sm:p-1.5 ring-1 ring-slate-200/80 dark:ring-white/10 bg-slate-50 dark:bg-slate-900/40">
            <label className={`flex-1 flex justify-center items-center rounded-xl py-2 cursor-pointer transition-colors text-xs sm:text-sm ${
              formData.type === 'expense'
                ? `bg-white dark:bg-slate-950/40 shadow-sm ring-1 ring-slate-200/80 dark:ring-white/10 ${typeAccent.text}`
                : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-900/55'
            }`}>
              <input
                type="radio"
                className="sr-only"
                name="type"
                value="expense"
                checked={formData.type === 'expense'}
                onChange={handleChange}
              />
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              <span className="font-extrabold">Expense</span>
            </label>
            <label className={`flex-1 flex justify-center items-center rounded-xl py-2 cursor-pointer transition-colors text-xs sm:text-sm ${
              formData.type === 'income'
                ? `bg-white dark:bg-slate-950/40 shadow-sm ring-1 ring-slate-200/80 dark:ring-white/10 ${typeAccent.text}`
                : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-900/55'
            }`}>
              <input
                type="radio"
                className="sr-only"
                name="type"
                value="income"
                checked={formData.type === 'income'}
                onChange={handleChange}
              />
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              <span className="font-extrabold">Income</span>
            </label>
            <label className={`flex-1 flex justify-center items-center rounded-xl py-2 cursor-pointer transition-colors text-xs sm:text-sm ${
              formData.type === 'investment'
                ? `bg-white dark:bg-slate-950/40 shadow-sm ring-1 ring-slate-200/80 dark:ring-white/10 ${typeAccent.text}`
                : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-900/55'
            }`}>
              <input
                type="radio"
                className="sr-only"
                name="type"
                value="investment"
                checked={formData.type === 'investment'}
                onChange={handleChange}
              />
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path d="M11 2a1 1 0 00-1 1v6.586L7.707 7.293a1 1 0 00-1.414 1.414l3.999 4a1 1 0 001.414 0l4-4a1 1 0 00-1.414-1.414L12 9.586V3a1 1 0 00-1-1z" />
                <path d="M4 14a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1z" />
              </svg>
              <span className="font-extrabold">Investment</span>
            </label>
          </div>
        )}
      </div>

      {formData.type === 'investment' ? (
        <>
          <div className={embedded ? 'mb-3' : 'mb-4'}>
            <label htmlFor="investmentCategory" className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Category
            </label>
            <CategoryDropdown
              categories={investmentCategories}
              value={formData.investmentCategory}
              disabled={false}
              dense={embedded}
              onChange={(id) => {
                setFormData((prev) => ({ ...prev, investmentCategory: id }));
                if (errors.investmentCategory) {
                  setErrors((prev) => ({ ...prev, investmentCategory: '' }));
                }
              }}
            />
            {errors.investmentCategory && <p className="text-red-500 text-xs mt-1">{errors.investmentCategory}</p>}
          </div>

          <div className={embedded ? 'mb-3' : 'mb-4'}>
            <label htmlFor="name" className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Investment Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              className={[
                'input-soft',
                embedded ? 'py-2' : 'py-2.5',
                errors.name ? 'ring-2 ring-rose-500/30 focus:ring-rose-500/40' : '',
              ].join(' ')}
              placeholder="Enter asset name (e.g., TCS, BTC, Gold)"
              value={formData.name}
              onChange={handleChange}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          <div className={embedded ? 'mb-3' : 'mb-4'}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="quantity" className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  id="quantity"
                  name="quantity"
                  className={[
                    'input-soft tabular-nums',
                    embedded ? 'py-2' : 'py-2.5',
                    errors.quantity ? 'ring-2 ring-rose-500/30 focus:ring-rose-500/40' : '',
                  ].join(' ')}
                  placeholder="0.5"
                  value={formData.quantity}
                  onChange={handleChange}
                />
                {errors.quantity && <p className="text-red-500 text-xs mt-1">{errors.quantity}</p>}
              </div>

              <div>
                <label htmlFor="entryPrice" className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Entry Price
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                    <span className="text-gray-500 dark:text-gray-400">{getCurrencySymbol(currencyCode)}</span>
                  </div>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    id="entryPrice"
                    name="entryPrice"
                    className={[
                      'input-soft pl-8 pr-3 tabular-nums',
                      embedded ? 'py-2' : 'py-2.5',
                      errors.entryPrice ? 'ring-2 ring-rose-500/30 focus:ring-rose-500/40' : '',
                    ].join(' ')}
                    placeholder="0.00"
                    value={formData.entryPrice}
                    onChange={handleChange}
                  />
                </div>
                {errors.entryPrice && <p className="text-red-500 text-xs mt-1">{errors.entryPrice}</p>}
              </div>
            </div>
          </div>

          <div className={embedded ? 'mb-3' : 'mb-4'}>
            <label htmlFor="exitPrice" className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Exit Price <span className="text-xs font-medium text-slate-500 dark:text-slate-400">(optional)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                <span className="text-gray-500 dark:text-gray-400">{getCurrencySymbol(currencyCode)}</span>
              </div>
              <input
                type="number"
                inputMode="decimal"
                step="any"
                id="exitPrice"
                name="exitPrice"
                className={[
                  'input-soft pl-8 pr-3 tabular-nums',
                  embedded ? 'py-2' : 'py-2.5',
                  errors.exitPrice ? 'ring-2 ring-rose-500/30 focus:ring-rose-500/40' : '',
                ].join(' ')}
                placeholder="Leave blank for active investment"
                value={formData.exitPrice}
                onChange={handleChange}
              />
            </div>
            {errors.exitPrice && <p className="text-red-500 text-xs mt-1">{errors.exitPrice}</p>}

            <div className="mt-3">
              <label htmlFor="currentPrice" className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Current Price <span className="text-xs font-medium text-slate-500 dark:text-slate-400">(optional)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                  <span className="text-gray-500 dark:text-gray-400">{getCurrencySymbol(currencyCode)}</span>
                </div>
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  id="currentPrice"
                  name="currentPrice"
                  className={[
                    'input-soft pl-8 pr-3 tabular-nums',
                    embedded ? 'py-2' : 'py-2.5',
                    errors.currentPrice ? 'ring-2 ring-rose-500/30 focus:ring-rose-500/40' : '',
                  ].join(' ')}
                  placeholder="Optional: track unrealized P/L"
                  value={formData.currentPrice}
                  onChange={handleChange}
                />
              </div>
              {errors.currentPrice && <p className="text-red-500 text-xs mt-1">{errors.currentPrice}</p>}
              <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">For active investments only (doesn’t close the position).</div>
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 dark:bg-slate-950/20 ring-1 ring-slate-200/80 dark:ring-white/[0.10] px-3 py-2">
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Status: <span className={`font-extrabold ${investmentNumbers.status === 'closed' ? 'text-indigo-700 dark:text-indigo-200' : 'text-slate-700 dark:text-slate-200'}`}>{investmentNumbers.status === 'closed' ? 'Closed' : 'Active'}</span>
              </div>
              {investmentNumbers.profit != null ? (
                <div className={`text-xs font-extrabold tabular-nums ${investmentNumbers.profit >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                  {investmentNumbers.profit >= 0 ? 'Profit' : 'Loss'}:{' '}
                  {investmentNumbers.profit >= 0 ? '+' : '−'}
                  {getCurrencySymbol(currencyCode)} {formatAmountForInput(Math.abs(investmentNumbers.profit), { maxDecimals: 2 })}
                </div>
              ) : investmentNumbers.unrealizedProfit != null ? (
                <div className={`text-xs font-extrabold tabular-nums ${investmentNumbers.unrealizedProfit >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                  Unrealized {investmentNumbers.unrealizedProfit >= 0 ? 'Profit' : 'Loss'}:{' '}
                  {investmentNumbers.unrealizedProfit >= 0 ? '+' : '-'}
                  {getCurrencySymbol(currencyCode)} {formatAmountForInput(Math.abs(investmentNumbers.unrealizedProfit), { maxDecimals: 2 })}
                </div>
              ) : (
                <div className="text-xs text-slate-500 dark:text-slate-400">Add exit price (realized) or current price (unrealized) to preview P/L.</div>
              )}
            </div>
          </div>

          <div className={embedded ? 'mb-3' : 'mb-4'}>
            <label htmlFor="investmentAmount" className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Amount <span className="text-xs font-medium text-slate-500 dark:text-slate-400">(auto)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                <span className="text-gray-500 dark:text-gray-400">{getCurrencySymbol(currencyCode)}</span>
              </div>
              <input
                type="text"
                id="investmentAmount"
                name="investmentAmount"
                readOnly
                className={['input-soft pl-8 pr-3 tabular-nums', embedded ? 'py-2' : 'py-2.5', 'opacity-90'].join(' ')}
                value={investmentNumbers.amount ? formatAmountForInput(investmentNumbers.amount, { maxDecimals: 2 }) : ''}
                placeholder="Calculated from entry price × quantity"
              />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className={embedded ? 'mb-3' : 'mb-4'}>
            <label htmlFor="description" className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Description
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                </svg>
              </div>
              <input
                type="text"
                id="description"
                name="description"
                className={[
                  'input-soft pl-10 pr-3',
                  embedded ? 'py-2' : 'py-2.5',
                  errors.description ? 'ring-2 ring-rose-500/30 focus:ring-rose-500/40' : '',
                ].join(' ')}
                placeholder="Grocery shopping, Salary, etc."
                value={formData.description}
                onChange={handleChange}
              />
            </div>
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
          </div>
          
          <div className={embedded ? 'mb-3' : 'mb-4'}>
            <label htmlFor="category" className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Category
            </label>
            <CategoryDropdown
              categories={formData.type === 'income' ? incomeCategories : categories}
              value={formData.category}
              disabled={false}
              dense={embedded}
              onChange={(id) => setFormData((prev) => ({ ...prev, category: id }))}
            />
            {!embedded && formData.type === 'income' ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Optional: use income categories to organize your earnings.</p>
            ) : null}
          </div>

          <div className={embedded ? 'mb-3' : 'mb-4'}>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="hyperData" className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                HyperData
                <span className="inline-flex items-center gap-1 rounded bg-gradient-to-r from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/20 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500/20">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-purple-500">
                    <path d="M11.983 1.907a.75.75 0 00-1.292-.52l-8.5 9.5A.75.75 0 002.75 12h6.572l-1.305 6.093a.75.75 0 001.292.52l8.5-9.5A.75.75 0 0017.25 8h-6.572l1.305-6.093z" />
                  </svg>
                  SMART INPUT
                </span>
              </label>
            </div>
            <textarea
              id="hyperData"
              name="hyperData"
              rows={embedded ? 3 : 4}
              className={[
                'input-soft resize-y',
                embedded ? 'py-2' : 'py-2.5',
                errors.hyperData ? 'ring-2 ring-rose-500/30 focus:ring-rose-500/40' : '',
              ].join(' ')}
              placeholder={formData.type === 'income' ? 'Salary 5000, 1000 Stocks' : '20 Chai, 12 for Bus, 1000 Shopping'}
              value={formData.hyperData}
              onChange={handleChange}
            />
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>Type naturally (e.g. "20 Chai" or "Grocery 500").</span>
              <span>Separate items with commas or new lines.</span>
            </div>
            {hyperDataHasRows && !errors.hyperData ? (
              <div className="mt-3 rounded-2xl ring-1 ring-slate-200/70 dark:ring-white/[0.10] bg-white/80 dark:bg-slate-950/20 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-extrabold text-slate-900 dark:text-white">Parsed summary</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Edit any key/value pair before saving.</div>
                  </div>
                  <div className="text-sm font-extrabold text-slate-900 dark:text-white tabular-nums">
                    Total: {getCurrencySymbol(currencyCode)} {formatAmountForInput(hyperDataItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0), { maxDecimals: 2 })}
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  {hyperDataItems.map((item) => (
                    <div key={item.id} className="grid grid-cols-1 sm:grid-cols-[1fr_140px_auto] gap-2 items-center rounded-xl bg-slate-100/80 dark:bg-slate-900/50 p-2">
                      <input
                        type="text"
                        value={item.label}
                        onChange={(e) => handleHyperDataItemChange(item.id, 'label', e.target.value)}
                        className="w-full rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 dark:text-white bg-white dark:bg-slate-950/60 ring-1 ring-slate-200/80 dark:ring-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                        placeholder="Label"
                      />
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 dark:text-slate-400">
                          {getCurrencySymbol(currencyCode)}
                        </span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={formatAmountForInput(item.amount, { maxDecimals: 2 })}
                          onChange={(e) => handleHyperDataItemChange(item.id, 'amount', e.target.value)}
                          className="w-full rounded-lg pl-8 pr-3 py-2 text-sm font-semibold text-slate-900 dark:text-white bg-white dark:bg-slate-950/60 ring-1 ring-slate-200/80 dark:ring-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 tabular-nums"
                          placeholder="0.00"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleHyperDataItemDelete(item.id)}
                        className="rounded-lg px-3 py-2 text-sm font-bold text-rose-700 dark:text-rose-200 bg-rose-50 dark:bg-rose-500/10 ring-1 ring-rose-200 dark:ring-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/20"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>

                {hyperDataSuggestedDescription ? (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-100/80 dark:bg-slate-900/50 px-3 py-2.5">
                    <div className="text-xs text-slate-600 dark:text-slate-300">
                      Suggested description: <span className="font-bold text-slate-900 dark:text-white">{hyperDataSuggestedDescription}</span>
                    </div>
                    <button
                      type="button"
                      onClick={applyHyperDataSuggestionToDescription}
                      className="rounded-lg px-3 py-1.5 text-xs font-bold text-blue-700 dark:text-blue-200 bg-blue-50 dark:bg-blue-500/10 ring-1 ring-blue-200 dark:ring-blue-500/20 hover:bg-blue-100 dark:hover:bg-blue-500/20"
                    >
                      Use In Description
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
            {errors.hyperData && <p className="text-red-500 text-xs mt-1">{errors.hyperData}</p>}
          </div>

          <div className={embedded ? 'mb-3' : 'mb-4'}>
            <label htmlFor="amount" className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Amount
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 dark:text-gray-400">{getCurrencySymbol(currencyCode)}</span>
              </div>
              <input
                type="text"
                inputMode="decimal"
                id="amount"
                name="amount"
                className={[
                  'input-soft pl-8 pr-3 tabular-nums',
                  embedded ? 'py-2' : 'py-2.5',
                  errors.amount ? 'ring-2 ring-rose-500/30 focus:ring-rose-500/40' : '',
                ].join(' ')}
                placeholder="0.00 (you can type 97+81, 100*2, 200+10%)"
                value={formData.amount}
                onChange={handleChange}
                readOnly={hyperDataHasRows && hyperDataParse.errors.length === 0}
                onBlur={() => commitAmountExpression()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitAmountExpression();
                }}
              />
            </div>
            {hyperDataHasRows && hyperDataParse.errors.length === 0 ? (
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Amount is auto-calculated from HyperData.
              </div>
            ) : null}
            {amountPreview && !errors.amount ? (
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                = {formatAmountForInput(amountPreview.value, { maxDecimals: 2 })}
              </div>
            ) : null}
            {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
          </div>
        </>
      )}
      
      <div className={embedded ? 'mb-4' : 'mb-6'}>
        <label htmlFor="date" className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
          Date {!embedded ? <span className="text-xs font-medium text-slate-500 dark:text-slate-400">(optional)</span> : null}
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <input
            id="date"
            name="date"
            type="text"
            inputMode="numeric"
            placeholder="DD/MM/YYYY"
            className={['input-soft pl-10 pr-11 tabular-nums', embedded ? 'py-2' : 'py-2.5'].join(' ')}
            value={dateText}
            onChange={(e) => {
              const raw = e.target.value;
              // Keep digits + separators only.
              const cleaned = raw.replace(/[^\d/.-]/g, '').slice(0, 10);
              setDateText(cleaned);

              const iso = ddMmYyyyToIso(cleaned);
              if (iso) {
                setFormData((prev) => ({ ...prev, date: iso }));
                const todayStr = new Date().toISOString().split('T')[0];
                if (iso > todayStr) {
                  setErrors((prev) => ({ ...prev, date: 'Date cannot be in the future' }));
                } else {
                  setErrors((prev) => ({ ...prev, date: '' }));
                }
              }
            }}
            onBlur={() => {
              const iso = ddMmYyyyToIso(dateText);
              if (iso) {
                setDateText(isoToDdMmYyyy(iso));
              } else {
                // Revert to the last valid ISO date in state.
                setDateText(isoToDdMmYyyy(formData.date));
              }
            }}
          />
          <button
            type="button"
            onClick={openNativeDatePicker}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white transition-colors"
            aria-label="Open calendar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
          <input
            ref={nativeDateRef}
            type="date"
            tabIndex={-1}
            aria-hidden="true"
            className="absolute inset-0 h-full w-full opacity-0 pointer-events-none"
            value={formData.date}
            onChange={(e) => {
              const iso = e.target.value;
              setFormData((prev) => ({ ...prev, date: iso }));
              setDateText(isoToDdMmYyyy(iso));
              
              const todayStr = new Date().toISOString().split('T')[0];
              if (iso > todayStr) {
                setErrors((prev) => ({ ...prev, date: 'Date cannot be in the future' }));
              } else {
                setErrors((prev) => ({ ...prev, date: '' }));
              }
            }}
          />
        </div>
        {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
      </div>

      <div className={[embedded ? 'mb-3' : 'mb-4', embedded ? 'pt-3' : 'pt-5'].join(' ')}>
        <div className="flex items-center justify-between gap-3 min-w-0">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-none">Location</div>
          </div>
          <label className="flex-none inline-flex items-center justify-end gap-2 min-w-[96px] cursor-pointer select-none">
            <input
              type="checkbox"
              className="sr-only"
              checked={attachLocation}
              onChange={(e) => {
                const next = Boolean(e.target.checked);
                setAttachLocation(next);
                writeLocationAttachPref(next);
                setLocationError('');
                if (!next) setLocationPreview(null);
              }}
            />
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap leading-none">
              {attachLocation ? 'On' : 'Off'}
            </span>
            <span
              aria-hidden="true"
              className={[
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors ring-1 ring-black/5 dark:ring-white/[0.12]',
                attachLocation ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700',
              ].join(' ')}
            >
              <span
                className={[
                  'inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform',
                  attachLocation ? 'translate-x-5' : 'translate-x-1',
                ].join(' ')}
              />
            </span>
          </label>
        </div>
        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Attach your current location to this {editTransaction ? 'update' : 'transaction'}. Uses browser GPS / Wi-Fi and OpenStreetMap.
        </div>

        {attachLocation ? (
          <div className="mt-3 rounded-2xl ring-1 ring-slate-200/70 dark:ring-white/[0.12] bg-white/80 dark:bg-slate-950/20 p-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="text-xs text-slate-600 dark:text-slate-300">
                Permission:{' '}
                <span className="font-extrabold text-slate-900 dark:text-white">
                  {geoPermission || 'unknown'}
                </span>
                {geoPermission === 'denied' ? (
                  <span className="ml-2 text-rose-600 dark:text-rose-300 font-semibold">
                    Enable location access in your browser settings to attach it.
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => refreshLocationPreview()}
                  disabled={locationBusy || isSubmitting}
                  className="rounded-xl px-3 py-1.5 text-xs font-extrabold text-slate-800 dark:text-slate-100 bg-white/90 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-900/55 ring-1 ring-black/5 dark:ring-white/[0.12] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {locationBusy ? 'Getting location…' : locationPreview ? 'Update location' : 'Preview location'}
                </button>
                {/* Clear removed per request */}
              </div>
            </div>

            {locationError ? <div className="mt-2 text-xs font-semibold text-rose-600 dark:text-rose-300">{locationError}</div> : null}

            {locationPreview ? (
              <div className="mt-3 space-y-2">
                <div className="text-xs text-slate-600 dark:text-slate-300 break-words">
                  <span className="font-bold text-slate-900 dark:text-white">Saved preview:</span>{' '}
                  {locationPreview.address ? (
                    <span>{locationPreview.address}</span>
                  ) : (
                    <span className="font-semibold">
                      {Number(locationPreview.lat).toFixed(6)}, {Number(locationPreview.lng).toFixed(6)}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="font-semibold tabular-nums">
                    {Number(locationPreview.lat).toFixed(6)}, {Number(locationPreview.lng).toFixed(6)}
                  </span>
                  {Number.isFinite(Number(locationPreview.accuracy)) ? (
                    <span className="font-semibold tabular-nums">±{Math.round(Number(locationPreview.accuracy))}m</span>
                  ) : null}
                  {locationPreview.capturedAt ? <span>{new Date(locationPreview.capturedAt).toLocaleString()}</span> : null}
                </div>
                {osmEmbedUrl ? (
                  <div className="relative mt-2 overflow-hidden rounded-2xl ring-1 ring-black/5 dark:ring-white/[0.12] bg-slate-50 dark:bg-slate-900/30">
                    <button
                      type="button"
                      onClick={async () => {
                        await refreshLocationPreview();
                        setMapNonce(Date.now());
                      }}
                      disabled={locationBusy || isSubmitting || geoPermission === 'denied'}
                      className="absolute top-2 left-2 z-10 rounded-xl px-3 py-1.5 text-xs font-extrabold text-slate-800 dark:text-slate-100 bg-white/95 dark:bg-slate-900/70 hover:bg-white dark:hover:bg-slate-900/85 ring-1 ring-black/10 dark:ring-white/[0.14] shadow-sm backdrop-blur disabled:opacity-60 disabled:cursor-not-allowed"
                      title="Center the map on your current location"
                    >
                      Recenter
                    </button>
                    <iframe
                      title="Location map preview"
                      src={osmEmbedUrl}
                      className="block w-full h-44 bg-white dark:bg-slate-950 pointer-events-none"
                      style={{ border: 0 }}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                    <div className="px-3 py-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between gap-2">
                      <span>Map: OpenStreetMap</span>
                      <a
                        href={`https://www.openstreetmap.org/?mlat=${encodeURIComponent(locationPreview.lat)}&mlon=${encodeURIComponent(locationPreview.lng)}#map=18/${encodeURIComponent(locationPreview.lat)}/${encodeURIComponent(locationPreview.lng)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-blue-700 dark:text-blue-200 hover:underline"
                      >
                        Open
                      </a>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Tip: click “Preview location” once. On save, the latest location will be attached.
              </div>
            )}
          </div>
        ) : null}
      </div>
      
      {/* Show the transaction ID when editing (for debugging) */}
      {editTransaction && (
        <div className={`text-xs text-gray-500 dark:text-gray-400 ${embedded ? 'mb-3' : 'mb-4'} border-t dark:border-gray-700 pt-3 mt-4`}>
          <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-600 dark:text-gray-400 font-mono">ID: {formData.id}</span>
        </div>
      )}
      
      <div className={`pt-2 flex flex-col sm:flex-row gap-2 sm:gap-3 ${embedded ? 'sm:justify-end' : ''}`}>
        {embedded ? (
          <button
            type="button"
            onClick={onClose}
            className="btn-surface w-full sm:w-auto active:scale-95 transition-transform"
          >
            Cancel
          </button>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full sm:w-auto px-5 ${embedded ? 'py-2' : 'py-2.5'} text-white font-extrabold rounded-xl shadow-soft transition-[transform,box-shadow,background-color] duration-200 ease-out focus:outline-none focus:ring-2 disabled:opacity-70 disabled:cursor-not-allowed active:scale-[0.98] hover:shadow-[0_14px_34px_-26px_rgba(15,23,42,0.30)] ${
            formData.type === 'income'
              ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 focus:ring-emerald-500/50'
              : formData.type === 'investment'
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 focus:ring-indigo-500/50'
                : 'bg-gradient-to-r from-rose-600 to-fuchsia-600 hover:from-rose-700 hover:to-fuchsia-700 focus:ring-rose-500/50'
          }`}
        >
          {isSubmitting ? 'Saving…' : editTransaction ? 'Save Changes' : 'Save Transaction'}
        </button>

        {!embedded && !editTransaction ? (
          <button
            type="button"
            onClick={handleReset}
            className="btn-surface w-full sm:w-auto active:scale-95 transition-transform"
          >
            Clear
          </button>
        ) : null}
      </div>
        </>
      )}
    </form>
  );
};

export default TransactionForm; 
