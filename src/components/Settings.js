import React, { useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useExpenseContext } from '../contexts/ExpenseContext';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useAmountsVisibility } from '../contexts/AmountsVisibilityContext';
import {
  getAuthSessionStorageKey,
  getAuthUsersStorageKey,
  getExpenseStorageKeyForUser,
} from '../utils/authStorage';
import CategoriesList from './CategoriesList';
import CategoryForm from './CategoryForm';
import ExportImport from './ExportImport';
import { useBodyScrollLock } from '../utils/scrollLock';

const commonCurrencies = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'SGD'];

const Section = ({ title, subtitle, children, right }) => (
  <section className="p-6 sm:p-8 border-b border-slate-200/70 dark:border-slate-800/70">
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <div className="min-w-0">
        <div className="font-display text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">{title}</div>
        {subtitle ? <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{subtitle}</div> : null}
      </div>
      {right ? <div className="w-full sm:w-auto">{right}</div> : null}
    </div>
    <div className="mt-5">{children}</div>
  </section>
);

const Toggle = ({ checked, onChange, label, sub }) => (
  <label className="flex items-start justify-between gap-4 rounded-2xl ring-1 ring-black/5 dark:ring-white/[0.10] bg-white/70 dark:bg-slate-950/20 px-4 py-3">
    <div className="min-w-0">
      <div className="text-sm font-extrabold text-slate-900 dark:text-white">{label}</div>
      {sub ? <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">{sub}</div> : null}
    </div>
    <button
      type="button"
      onClick={() => onChange?.(!checked)}
      aria-pressed={checked}
      className={[
        'shrink-0 relative inline-flex h-6 w-11 items-center rounded-full ring-1 transition-colors',
        checked
          ? 'bg-blue-600 ring-blue-500/30'
          : 'bg-slate-200 dark:bg-slate-800 ring-black/10 dark:ring-white/10',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40',
      ].join(' ')}
    >
      <span
        className={[
          'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0.5',
        ].join(' ')}
      />
    </button>
  </label>
);

const Select = ({ label, value, onChange, options, sub }) => (
  <div className="rounded-2xl ring-1 ring-black/5 dark:ring-white/[0.10] bg-white/70 dark:bg-slate-950/20 px-4 py-3">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="text-sm font-extrabold text-slate-900 dark:text-white">{label}</div>
        {sub ? <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">{sub}</div> : null}
      </div>
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="shrink-0 rounded-xl px-3 py-2 text-sm font-semibold bg-white/90 dark:bg-slate-900/60 text-slate-900 dark:text-white ring-1 ring-black/10 dark:ring-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  </div>
);

const Modal = ({ open, title, onClose, children }) => {
  useBodyScrollLock(open);
  if (!open) return null;
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-50">
      <div aria-hidden="true" className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative h-full w-full flex items-center justify-center p-4 sm:p-6">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="w-[min(520px,92vw)] max-h-[calc(100dvh-3rem)] sm:max-h-[calc(100dvh-5rem)] overflow-hidden rounded-3xl bg-white/90 dark:bg-slate-950/70 backdrop-blur-xl shadow-2xl ring-1 ring-black/10 dark:ring-white/[0.12] flex flex-col"
        >
          <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-black/5 dark:border-white/10">
            <div className="min-w-0">
              <div className="font-display text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white truncate">{title}</div>
              <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Saved locally {'\u2022'} Applies instantly
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
          <div className="px-6 py-5 flex-1 min-h-0 overflow-auto scrollbar-hide">{children}</div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default function Settings() {
  const { dashboardPrefs, setDashboardPrefs, categories, transactions } = useExpenseContext();
  const { currentUser, logout, updateProfile } = useAuth();
  const { baseCurrencyCode, displayCurrencyCode, setDisplayCurrencyCode, fxStatus, fxError, fxFetchedAt, rate, refreshRates } = useCurrency();
  const { amountsHidden, setAmountsHidden, appPinEnabled, beginPinSetup, beginPinChange, beginPinRemove } = useAmountsVisibility();

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [redirectBusy, setRedirectBusy] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileForm, setProfileForm] = useState(() => ({
    name: currentUser?.name || '',
    phone: currentUser?.phone || '',
    age: currentUser?.age || '',
    address: currentUser?.address || '',
    occupation: currentUser?.occupation || '',
    income: currentUser?.income || 0,
    accountType: currentUser?.accountType === 'business' ? 'business' : 'individual',
  }));

  React.useEffect(() => {
    setProfileForm({
      name: currentUser?.name || '',
      phone: currentUser?.phone || '',
      age: currentUser?.age || '',
      address: currentUser?.address || '',
      occupation: currentUser?.occupation || '',
      income: currentUser?.income || 0,
      accountType: currentUser?.accountType === 'business' ? 'business' : 'individual',
    });
  }, [currentUser]);

  const goToLanding = useCallback(() => {
    setRedirectBusy(true);
    try {
      window.localStorage?.setItem('finvision.entryMode', 'landing');
    } catch {
      // ignore
    }
    window.location.reload();
  }, []);

  const showWidgets = useMemo(() => {
    const defaults = {
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
    const raw = dashboardPrefs?.showWidgets && typeof dashboardPrefs.showWidgets === 'object' ? dashboardPrefs.showWidgets : {};
    return { ...defaults, ...raw };
  }, [dashboardPrefs?.showWidgets]);

  const setWidget = useCallback(
    (key, enabled) => {
      setDashboardPrefs({ showWidgets: { ...showWidgets, [key]: !!enabled } });
    },
    [setDashboardPrefs, showWidgets]
  );

  const resetApp = useCallback(() => {
    const ok = window.confirm('Reset FinVision? This will remove ALL local data and settings for this browser.');
    if (!ok) return;

    const keys = [
      'expenseTrackerData',
      'finvision_amounts_hidden',
      'finvision.displayCurrencyCode',
      'finvision.activeTab',
      'finvision.fxRates.v1:USD',
      'finvision.fxRates.v1:EUR',
      'finvision.fxRates.v1:GBP',
      'finvision.fxRates.v1:INR',
      'finvision.fxRates.v1:JPY',
      'finvision.fxRates.v1:CAD',
      'finvision.fxRates.v1:AUD',
      'finvision.fxRates.v1:CHF',
      'finvision.fxRates.v1:CNY',
      'finvision.fxRates.v1:SGD',
      getAuthUsersStorageKey(),
      getAuthSessionStorageKey(),
      getExpenseStorageKeyForUser(currentUser?.id || 'guest'),
    ];

    try {
      keys.forEach((k) => window.localStorage.removeItem(k));
    } catch {
      // ignore
    }

    window.location.reload();
  }, [currentUser?.id]);

  const saveProfile = useCallback(
    (e) => {
      e.preventDefault();
      const result = updateProfile({
        ...profileForm,
        income: Number(profileForm.income),
        age: Number(profileForm.age),
      });
      setProfileMsg(result?.ok ? 'Profile saved locally.' : result?.error || 'Could not save profile.');
    },
    [profileForm, updateProfile]
  );

  const totals = useMemo(() => {
    let txCount = 0;
    let catCount = 0;
    try {
      txCount = (transactions || []).length;
      catCount = (categories || []).length;
    } catch {
      // ignore
    }
    return { txCount, catCount };
  }, [categories, transactions]);

  return (
    <div className="divide-y divide-slate-200/70 dark:divide-slate-800/70">
      <Section
        title="Account"
        subtitle="This app currently stores data locally (no server)."
        right={
          <div className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 ring-1 ring-black/5 dark:ring-white/[0.10] bg-white/70 dark:bg-slate-950/20">
            <span className="h-8 w-8 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white grid place-items-center font-extrabold">
              {String(currentUser?.name || 'U')
                .trim()
                .split(/\s+/)
                .slice(0, 2)
                .map((part) => part[0]?.toUpperCase() || '')
                .join('') || 'U'}
            </span>
            <div className="min-w-0">
              <div className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight">{currentUser?.name || 'User'}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">{currentUser?.email || 'Local profile'}</div>
            </div>
          </div>
        }
      >
        <form className="grid grid-cols-1 lg:grid-cols-2 gap-3" onSubmit={saveProfile}>
          <div className="rounded-2xl ring-1 ring-black/5 dark:ring-white/[0.10] bg-white/70 dark:bg-slate-950/20 px-4 py-3">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">Full name</div>
            <input value={profileForm.name} onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))} className="mt-2 w-full rounded-xl px-3 py-2 text-sm font-semibold bg-white/90 dark:bg-slate-900/60 text-slate-900 dark:text-white ring-1 ring-black/10 dark:ring-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
          </div>
          <div className="rounded-2xl ring-1 ring-black/5 dark:ring-white/[0.10] bg-white/70 dark:bg-slate-950/20 px-4 py-3">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">Phone</div>
            <input value={profileForm.phone} onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))} className="mt-2 w-full rounded-xl px-3 py-2 text-sm font-semibold bg-white/90 dark:bg-slate-900/60 text-slate-900 dark:text-white ring-1 ring-black/10 dark:ring-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
          </div>
          <div className="rounded-2xl ring-1 ring-black/5 dark:ring-white/[0.10] bg-white/70 dark:bg-slate-950/20 px-4 py-3">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">Age</div>
            <input type="number" min="18" max="120" value={profileForm.age} onChange={(e) => setProfileForm((p) => ({ ...p, age: e.target.value }))} className="mt-2 w-full rounded-xl px-3 py-2 text-sm font-semibold bg-white/90 dark:bg-slate-900/60 text-slate-900 dark:text-white ring-1 ring-black/10 dark:ring-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
          </div>
          <div className="rounded-2xl ring-1 ring-black/5 dark:ring-white/[0.10] bg-white/70 dark:bg-slate-950/20 px-4 py-3">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">Account Type</div>
            <select value={profileForm.accountType} onChange={(e) => setProfileForm((p) => ({ ...p, accountType: e.target.value }))} className="mt-2 w-full rounded-xl px-3 py-2 text-sm font-semibold bg-white/90 dark:bg-slate-900/60 text-slate-900 dark:text-white ring-1 ring-black/10 dark:ring-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/40">
              <option value="individual">Individual</option>
              <option value="business">Business</option>
            </select>
          </div>
          <div className="rounded-2xl ring-1 ring-black/5 dark:ring-white/[0.10] bg-white/70 dark:bg-slate-950/20 px-4 py-3">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">{profileForm.accountType === 'business' ? 'Business Income' : 'Monthly Income'}</div>
            <input type="number" min="0" step="0.01" value={profileForm.income} onChange={(e) => setProfileForm((p) => ({ ...p, income: e.target.value }))} className="mt-2 w-full rounded-xl px-3 py-2 text-sm font-semibold bg-white/90 dark:bg-slate-900/60 text-slate-900 dark:text-white ring-1 ring-black/10 dark:ring-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
          </div>
          <div className="rounded-2xl ring-1 ring-black/5 dark:ring-white/[0.10] bg-white/70 dark:bg-slate-950/20 px-4 py-3">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">Occupation</div>
            <input value={profileForm.occupation} onChange={(e) => setProfileForm((p) => ({ ...p, occupation: e.target.value }))} className="mt-2 w-full rounded-xl px-3 py-2 text-sm font-semibold bg-white/90 dark:bg-slate-900/60 text-slate-900 dark:text-white ring-1 ring-black/10 dark:ring-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
          </div>
          <div className="rounded-2xl ring-1 ring-black/5 dark:ring-white/[0.10] bg-white/70 dark:bg-slate-950/20 px-4 py-3 lg:col-span-2">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">Address</div>
            <input value={profileForm.address} onChange={(e) => setProfileForm((p) => ({ ...p, address: e.target.value }))} className="mt-2 w-full rounded-xl px-3 py-2 text-sm font-semibold bg-white/90 dark:bg-slate-900/60 text-slate-900 dark:text-white ring-1 ring-black/10 dark:ring-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
          </div>
          <div className="rounded-2xl ring-1 ring-black/5 dark:ring-white/[0.10] bg-white/70 dark:bg-slate-950/20 px-4 py-3">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">Storage</div>
            <div className="mt-1 text-sm font-extrabold text-slate-900 dark:text-white">Browser localStorage</div>
          </div>
          <div className="rounded-2xl ring-1 ring-black/5 dark:ring-white/[0.10] bg-white/70 dark:bg-slate-950/20 px-4 py-3">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">Transactions</div>
            <div className="mt-1 text-sm font-extrabold text-slate-900 dark:text-white tabular-nums">{totals.txCount}</div>
          </div>
          <div className="rounded-2xl ring-1 ring-black/5 dark:ring-white/[0.10] bg-white/70 dark:bg-slate-950/20 px-4 py-3">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">Categories</div>
            <div className="mt-1 text-sm font-extrabold text-slate-900 dark:text-white tabular-nums">{totals.catCount}</div>
          </div>
          <div className="flex flex-wrap items-center gap-3 lg:col-span-2">
            <button type="submit" className="px-4 py-2.5 rounded-2xl text-sm font-extrabold bg-blue-600 hover:bg-blue-700 text-white ring-1 ring-blue-500/30 focus:outline-none focus:ring-2 focus:ring-blue-500/40">
              Save profile
            </button>
            <button type="button" onClick={() => logout?.()} className="px-4 py-2.5 rounded-2xl text-sm font-extrabold bg-white/70 hover:bg-white/90 dark:bg-slate-950/20 dark:hover:bg-slate-950/35 text-slate-900 dark:text-white ring-1 ring-black/10 dark:ring-white/[0.12] focus:outline-none focus:ring-2 focus:ring-indigo-500/40">
              Logout
            </button>
            {profileMsg ? <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">{profileMsg}</div> : null}
          </div>
        </form>
      </Section>

      <Section title="Preferences" subtitle="Privacy and appearance controls suitable for shared screens.">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Toggle
            checked={amountsHidden}
            onChange={(v) => setAmountsHidden(!!v, { reason: 'Enter your PIN to reveal amounts.' })}
            label="Hide amounts"
            sub="Masks currency values across the UI (Ctrl+Shift hotkey also works)."
          />
        </div>
      </Section>

      <Section title="Product" subtitle="Marketing and onboarding experience.">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="rounded-2xl ring-1 ring-black/5 dark:ring-white/[0.10] bg-white/70 dark:bg-slate-950/20 px-4 py-4">
            <div className="text-sm font-extrabold text-slate-900 dark:text-white">Return to landing page</div>
            <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              Opens the product landing page (same URL) so you can view the showcase again.
            </div>
            <div className="mt-4">
              <button
                type="button"
                disabled={redirectBusy}
                onClick={goToLanding}
                className="px-4 py-2.5 rounded-2xl text-sm font-extrabold bg-white/70 hover:bg-white/90 dark:bg-slate-950/20 dark:hover:bg-slate-950/35 text-slate-900 dark:text-white ring-1 ring-black/10 dark:ring-white/[0.12] focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                View landing page
              </button>
            </div>
          </div>

          <div className="rounded-2xl ring-1 ring-black/5 dark:ring-white/[0.10] bg-white/70 dark:bg-slate-950/20 px-4 py-4">
            <div className="text-sm font-extrabold text-slate-900 dark:text-white">Tip</div>
            <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              You can also clear <span className="font-semibold">finvision.entryMode</span> from browser localStorage to show the landing page again.
            </div>
          </div>
        </div>
      </Section>

      <Section title="Security" subtitle="Protect sensitive amounts and exports with an app PIN (numeric only).">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="rounded-2xl ring-1 ring-black/5 dark:ring-white/[0.10] bg-white/70 dark:bg-slate-950/20 px-4 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-slate-900 dark:text-white">App Password (PIN)</div>
                <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                  {appPinEnabled
                    ? `Enabled \u2022 Required to reveal amounts and export data`
                    : `Not set \u2022 Optional but recommended`}
                </div>
              </div>
              <span
                className={[
                  'inline-flex items-center px-2 py-1 rounded-full text-[11px] font-semibold ring-1',
                  appPinEnabled
                    ? 'bg-emerald-100/80 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-400/15 dark:text-emerald-100 dark:ring-emerald-300/20'
                    : 'bg-slate-100/70 text-slate-700 ring-black/10 dark:bg-slate-900/40 dark:text-slate-200 dark:ring-white/10',
                ].join(' ')}
              >
                {appPinEnabled ? 'On' : 'Off'}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {!appPinEnabled ? (
                <button
                  type="button"
                  onClick={() => beginPinSetup?.()}
                  className="px-4 py-2.5 rounded-2xl text-sm font-extrabold bg-blue-600 hover:bg-blue-700 text-white ring-1 ring-blue-500/30 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                >
                  Set PIN
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => beginPinChange?.()}
                    className="px-4 py-2.5 rounded-2xl text-sm font-extrabold bg-blue-600 hover:bg-blue-700 text-white ring-1 ring-blue-500/30 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  >
                    Change PIN
                  </button>
                  <button
                    type="button"
                    onClick={() => beginPinRemove?.()}
                    className="px-4 py-2.5 rounded-2xl text-sm font-extrabold bg-white/70 hover:bg-white/90 dark:bg-slate-950/20 dark:hover:bg-slate-950/35 text-rose-700 dark:text-rose-300 ring-1 ring-rose-500/20 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                  >
                    Remove
                  </button>
                </>
              )}
            </div>

            <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              Note: the PIN is stored locally in this browser (no server).
            </div>
          </div>

          <div className="rounded-2xl ring-1 ring-black/5 dark:ring-white/[0.10] bg-white/70 dark:bg-slate-950/20 px-4 py-4">
            <div className="text-sm font-extrabold text-slate-900 dark:text-white">What is protected</div>
            <ul className="mt-2 text-xs text-slate-600 dark:text-slate-300 space-y-1 list-disc pl-5">
              <li>Revealing amounts (Ctrl+Shift or Settings toggle)</li>
              <li>Export/download data (JSON/CSV)</li>
            </ul>
          </div>
        </div>
      </Section>

      <Section
        title="Currency"
        subtitle="Choose the currency used for UI and rate conversions."
        right={
          <button
            type="button"
            onClick={() => refreshRates?.()}
            className="px-4 py-2 rounded-2xl text-sm font-extrabold ring-1 ring-black/5 dark:ring-white/[0.12] bg-white/70 dark:bg-slate-950/20 hover:bg-white/90 dark:hover:bg-slate-950/30 transition-colors"
          >
            Refresh rates
          </button>
        }
      >
        <Select
          label="Display currency"
          value={displayCurrencyCode}
          options={commonCurrencies}
          onChange={(v) => setDisplayCurrencyCode(v)}
          sub="Used for UI display and analytics conversions."
        />

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
          <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 ring-1 ring-black/5 dark:ring-white/[0.10] bg-white/60 dark:bg-slate-950/20">
            FX <span className="font-semibold">{fxStatus}</span>
          </span>
          {fxError ? <span className="text-rose-600 dark:text-rose-300">({fxError})</span> : null}
          <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 ring-1 ring-black/5 dark:ring-white/[0.10] bg-white/60 dark:bg-slate-950/20 tabular-nums">
            1 {baseCurrencyCode} ≈ {Number.isFinite(rate) ? rate.toFixed(4) : '1.0000'} {displayCurrencyCode}
          </span>
          {typeof fxFetchedAt === 'number' ? (
            <span className="text-slate-500 dark:text-slate-400">
              Updated {new Date(fxFetchedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
            </span>
          ) : null}
        </div>
      </Section>

      <Section title="Dashboard" subtitle="Fine-grained control over which widgets show on the Dashboard.">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {Object.entries(showWidgets).map(([key, enabled]) => (
            <Toggle
              key={key}
              checked={!!enabled}
              onChange={(v) => setWidget(key, v)}
              label={key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())}
              sub=""
            />
          ))}
        </div>
      </Section>

      <Section
        title="Categories"
        subtitle="Manage categories and colors. Used across transactions, charts, and budgets."
        right={
          <button
            type="button"
            onClick={() => setCategoryModalOpen(true)}
            className="inline-flex items-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-2xl transition-all duration-200 shadow-soft hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
            New Category
          </button>
        }
      >
        <CategoriesList />

        <Modal open={categoryModalOpen} title="Add Category" onClose={() => setCategoryModalOpen(false)}>
          <CategoryForm onClose={() => setCategoryModalOpen(false)} />
        </Modal>
      </Section>

      <Section title="Data & Compliance" subtitle="Export, import, and reset. Keep your own backups.">
        <div className="space-y-4">
          <div className="rounded-2xl ring-1 ring-black/5 dark:ring-white/[0.10] bg-white/70 dark:bg-slate-950/20 overflow-hidden">
            <ExportImport />
          </div>

          <div className="rounded-2xl ring-1 ring-rose-500/20 bg-rose-50/70 dark:bg-rose-500/10 px-4 py-3 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm font-extrabold text-rose-800 dark:text-rose-200">Reset application</div>
              <div className="mt-0.5 text-xs text-rose-700/90 dark:text-rose-200/80">
                Removes all local transactions, categories, and settings for this browser.
              </div>
            </div>
            <button
              type="button"
              onClick={resetApp}
              className="shrink-0 px-4 py-2 rounded-2xl text-sm font-extrabold bg-rose-600 hover:bg-rose-700 text-white ring-1 ring-rose-500/30 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
            >
              Reset
            </button>
          </div>
        </div>
      </Section>
    </div>
  );
}
