import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Header from './Header';
import TransactionForm from './TransactionForm';
import CategoryForm from './CategoryForm';
import Footer from './Footer';
import { forceUnlockBodyScroll, useBodyScrollLock } from '../utils/scrollLock';

const loadDashboard = () => import('./Dashboard');
const loadTransactionList = () => import('./TransactionList');
const loadExpenseChart = () => import('./ExpenseChart');
const loadNetworth = () => import('./Networth');
const loadExportImport = () => import('./ExportImport');
const loadSettings = () => import('./Settings');
const loadGoals = () => import('./Goals');
const loadInsights = () => import('./AIInsights');
const loadAIChatAssistant = () => import('./AIChatAssistant');
const loadBudgets = () => import('./Budgets');

const Dashboard = React.lazy(loadDashboard);
const TransactionList = React.lazy(loadTransactionList);
const ExpenseChart = React.lazy(loadExpenseChart);
const Networth = React.lazy(loadNetworth);
const ExportImport = React.lazy(loadExportImport);
const Settings = React.lazy(loadSettings);
const Goals = React.lazy(loadGoals);
const AIInsights = React.lazy(loadInsights);
const AIChatAssistant = React.lazy(loadAIChatAssistant);
const Budgets = React.lazy(loadBudgets);
const TransactionMap = React.lazy(() => import('./TransactionMap'));

const TAB_STORAGE_KEY = 'finvision.activeTab';
const LAYOUT_UI_STORAGE_KEY = 'finvision.layoutUi.v1';
const ALLOWED_TABS = new Set(['dashboard', 'transactions', 'categories', 'charts', 'networth', 'goals', 'insights', 'settings', 'budgets']);
const FAB_POS_STORAGE_KEY = 'finvision.fabPos.v1';

const TabFallback = ({ label }) => (
  <div className="p-6 text-sm text-slate-600 dark:text-slate-300">{label || 'Loading…'}</div>
);

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch() {}
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-[60vh] p-6">
          <div className="max-w-3xl rounded-2xl bg-white ring-1 ring-black/[0.08] shadow-soft p-5">
            <div className="text-sm font-semibold text-slate-900">Dashboard crashed</div>
            <div className="mt-2 text-xs text-slate-600 break-words">
              {String(this.state.error?.message || this.state.error)}
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const FloatingActionButton = ({ onClick }) => {
  const buttonRef = useRef(null);
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, baseLeft: 0, baseTop: 0, moved: false, pointerId: null });
  const [pos, setPos] = useState(null); // { left, top }
  const [dragging, setDragging] = useState(false);

  const readSafeAreaInsets = useCallback(() => {
    try {
      const style = window.getComputedStyle(document.documentElement);
      const readPx = (name) => {
        const raw = style.getPropertyValue(name);
        const n = parseFloat(String(raw || '').trim());
        return Number.isFinite(n) ? n : 0;
      };
      return {
        top: readPx('--safe-area-inset-top'),
        right: readPx('--safe-area-inset-right'),
        bottom: readPx('--safe-area-inset-bottom'),
        left: readPx('--safe-area-inset-left'),
      };
    } catch {
      return { top: 0, right: 0, bottom: 0, left: 0 };
    }
  }, []);

  const clampPos = useCallback((next, rect, viewport) => {
    const pad = 16;
    const safe = readSafeAreaInsets();
    const w = Math.max(48, Math.round(rect?.width || 64));
    const h = Math.max(48, Math.round(rect?.height || 64));
    const vw = Math.max(320, Math.round(viewport?.w || window.innerWidth || 1024));
    const vh = Math.max(320, Math.round(viewport?.h || window.innerHeight || 768));

    const minLeft = Math.max(0, pad + (safe.left || 0));
    const minTop = Math.max(0, pad + (safe.top || 0));
    const maxLeft = Math.max(minLeft, vw - pad - (safe.right || 0) - w);
    const maxTop = Math.max(minTop, vh - pad - (safe.bottom || 0) - h);
    const left = Math.max(minLeft, Math.min(Math.round(next.left), maxLeft));
    const top = Math.max(minTop, Math.min(Math.round(next.top), maxTop));
    return { left, top };
  }, [readSafeAreaInsets]);

  const readStoredPos = useCallback(() => {
    try {
      const raw = window?.localStorage?.getItem?.(FAB_POS_STORAGE_KEY);
      if (!raw) return null;
      const p = JSON.parse(raw);
      if (!p || !Number.isFinite(Number(p.left)) || !Number.isFinite(Number(p.top))) return null;
      return { left: Number(p.left), top: Number(p.top) };
    } catch {
      return null;
    }
  }, []);

  const writeStoredPos = useCallback((p) => {
    try {
      window?.localStorage?.setItem?.(FAB_POS_STORAGE_KEY, JSON.stringify({ left: Math.round(p.left), top: Math.round(p.top) }));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const el = buttonRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const stored = readStoredPos();
    const vw = window.innerWidth || 1024;
    const vh = window.innerHeight || 768;
    const safe = readSafeAreaInsets();

    const defaultLeft = vw - 32 - (safe.right || 0) - rect.width; // bottom-8/right-8 (+ safe area)
    const defaultTop = vh - 32 - (safe.bottom || 0) - rect.height;

    const initial = stored || { left: defaultLeft, top: defaultTop };
    const clamped = clampPos(initial, rect, { w: vw, h: vh });
    setPos(clamped);

    const onResize = () => {
      const r = buttonRef.current?.getBoundingClientRect?.();
      if (!r) return;
      const cur = readStoredPos() || clamped;
      const next = clampPos(cur, r, { w: window.innerWidth || 1024, h: window.innerHeight || 768 });
      setPos(next);
      writeStoredPos(next);
    };

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [clampPos, readSafeAreaInsets, readStoredPos, writeStoredPos]);

  const onPointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    const el = buttonRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cur = pos || { left: rect.left, top: rect.top };

    dragRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      baseLeft: cur.left,
      baseTop: cur.top,
      moved: false,
      pointerId: e.pointerId,
    };
    setDragging(true);

    try {
      el.setPointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }
  };

  const onPointerMove = (e) => {
    if (!dragRef.current.dragging) return;
    if (dragRef.current.pointerId !== null && e.pointerId !== dragRef.current.pointerId) return;

    const el = buttonRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;

    if (!dragRef.current.moved && Math.hypot(dx, dy) >= 6) dragRef.current.moved = true;

    const next = clampPos(
      { left: dragRef.current.baseLeft + dx, top: dragRef.current.baseTop + dy },
      rect,
      { w: window.innerWidth || 1024, h: window.innerHeight || 768 }
    );
    setPos(next);
  };

  const endDrag = (e) => {
    if (!dragRef.current.dragging) return;
    if (dragRef.current.pointerId !== null && e?.pointerId !== dragRef.current.pointerId) return;

    const el = buttonRef.current;
    try {
      if (el && dragRef.current.pointerId !== null) el.releasePointerCapture?.(dragRef.current.pointerId);
    } catch {
      // ignore
    }

    const moved = !!dragRef.current.moved;
    dragRef.current.dragging = false;
    dragRef.current.pointerId = null;
    setDragging(false);

    if (pos) writeStoredPos(pos);
    if (moved) {
      setTimeout(() => {
        dragRef.current.moved = false;
      }, 0);
    }
  };

  const onButtonClick = (e) => {
    if (dragRef.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onClick?.();
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onButtonClick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className={[
        'fixed w-14 h-14 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-full shadow-soft ring-1 ring-black/10 dark:ring-white/10 flex items-center justify-center z-[9999]',
        'focus:outline-none focus:ring-2 focus:ring-indigo-400/50',
        'touch-none select-none',
        dragging ? 'cursor-grabbing' : 'cursor-pointer',
        dragging ? '' : 'transition-transform duration-200 ease-out hover:scale-[1.08] active:scale-[0.96]',
      ].join(' ')}
      style={
        pos
          ? { left: `${pos.left}px`, top: `${pos.top}px` }
          : {
              right: 'calc(1.5rem + var(--safe-area-inset-right))',
              bottom: 'calc(1.5rem + var(--safe-area-inset-bottom))',
            }
      }
      aria-label="Add new transaction"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
    </button>
  );
};

const SectionTitle = ({ title, actionButton, subtitle }) => (
  <div className="mb-3 animate-float-in">
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
      <div>
        <h2 className="font-display text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          {title}
        </h2>
        {subtitle ? (
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">{subtitle}</p>
        ) : null}
      </div>
      {actionButton ? <div>{actionButton}</div> : null}
    </div>
    <div className="mt-2 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-slate-700" />
  </div>
);

const TransactionsPanel = React.memo(function TransactionsPanel({ onOpenTransactionModal, onOpenMapModal }) {
  return (
    <div className="flex flex-col mb-12 w-full animate-float-in">
      <Suspense fallback={<TabFallback label="Loading transactions…" />}>
        <TransactionList 
          onOpenTransactionModal={onOpenTransactionModal} 
          onOpenMapModal={onOpenMapModal} 
        />
      </Suspense>
    </div>
  );
});

const SettingsPanel = React.memo(function SettingsPanel() {
  return (
    <div className="surface overflow-hidden mb-12">
      <Suspense fallback={<TabFallback label="Loading settings..." />}>
        <Settings />
      </Suspense>
    </div>
  );
});

const MainLayout = () => {
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(() => {
    try {
      const raw = window.localStorage?.getItem(LAYOUT_UI_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed?.isTransactionModalOpen === true;
    } catch {
      return false;
    }
  });
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(() => {
    try {
      const raw = window.localStorage?.getItem(LAYOUT_UI_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed?.isCategoryModalOpen === true;
    } catch {
      return false;
    }
  });
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const raw = window.localStorage?.getItem(TAB_STORAGE_KEY);
      if (raw === 'categories') return 'settings';
      if (raw === 'ai') return 'insights';
      return ALLOWED_TABS.has(raw) ? raw : 'dashboard';
    } catch {
      return 'dashboard';
    }
  }); // 'dashboard', 'transactions', 'categories', 'charts', 'networth'

  const preloadTab = useMemo(() => {
    const byId = {
      dashboard: loadDashboard,
      transactions: loadTransactionList,
      budgets: loadBudgets,
      charts: loadExpenseChart,
      networth: loadNetworth,
      goals: loadGoals,
      insights: loadInsights,
      settings: loadSettings,
    };
    return (id) => {
      const fn = byId[id];
      if (typeof fn === 'function') fn();
    };
  }, []);

  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  const openTransactionModal = useCallback(() => setIsTransactionModalOpen(true), []);
  const openMapModal = useCallback(() => setIsMapModalOpen(true), []);

  useEffect(() => {
    try {
      window.localStorage?.setItem(
        LAYOUT_UI_STORAGE_KEY,
        JSON.stringify({
          isTransactionModalOpen: !!isTransactionModalOpen,
          isCategoryModalOpen: !!isCategoryModalOpen,
        })
      );
    } catch {
      // ignore
    }
  }, [isCategoryModalOpen, isTransactionModalOpen]);

  const handleNavigate = useCallback((next) => {
    const tab = ALLOWED_TABS.has(next) ? next : 'dashboard';

    // Prefetch first to reduce suspense/transition time and avoid "flash" indicators.
    preloadTab(tab);

    // Switch immediately. (Inactive tab content is unmounted to keep the app snappy.)
    setActiveTab(tab);

    try {
      window.localStorage?.setItem(TAB_STORAGE_KEY, tab);
    } catch {
      // ignore
    }

    // URL sync (lightweight routing without extra deps).
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.pushState({ tab }, '', url.toString());
    } catch {
      // ignore
    }
  }, [preloadTab]);

  useEffect(() => {
    const onNavigateEvent = (e) => {
      const tab = e?.detail?.tab;
      if (!tab) return;
      handleNavigate(tab);
    };
    window.addEventListener('finvision:navigate', onNavigateEvent);
    return () => window.removeEventListener('finvision:navigate', onNavigateEvent);
  }, [handleNavigate]);

  useEffect(() => {
    // Back/forward buttons support.
    const onPop = (e) => {
      const tabFromState = e?.state?.tab;
      if (tabFromState && ALLOWED_TABS.has(tabFromState)) {
        handleNavigate(tabFromState);
        return;
      }
      try {
        const url = new URL(window.location.href);
        const tab = url.searchParams.get('tab');
        if (tab && ALLOWED_TABS.has(tab)) handleNavigate(tab);
      } catch {
        // ignore
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [handleNavigate]);

  useEffect(() => {
    // Initial URL sync on first mount.
    try {
      const url = new URL(window.location.href);
      const tab = url.searchParams.get('tab');
      if (tab && ALLOWED_TABS.has(tab)) handleNavigate(tab);
    } catch {
      // ignore
    }
    
  }, []);

  useEffect(() => {
    if (!isTransactionModalOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      if (isTransactionModalOpen) setIsTransactionModalOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isTransactionModalOpen]);

  useEffect(() => {
    // Background prefetch once the UI settles; helps make future tab switches feel instant.
    const t = window.setTimeout(() => {
      for (const tab of ['transactions', 'budgets', 'charts', 'networth', 'goals', 'insights', 'settings']) {
        if (tab === activeTab) continue;
        preloadTab(tab);
      }
    }, 1200);
    return () => window.clearTimeout(t);
  }, [activeTab, preloadTab]);

  useBodyScrollLock(isTransactionModalOpen || isCategoryModalOpen || isMapModalOpen);

  useEffect(() => {
    // Ensure landing-page scroll lock never leaks into the app shell.
    if (typeof document === 'undefined') return;
    document.documentElement.classList.remove('landing-root-lock');
    document.body.classList.remove('landing-root-lock');

    if (isTransactionModalOpen || isCategoryModalOpen || isMapModalOpen) return;

    // Safety net: if a modal/overlay leaves the body locked, force unlock.
    forceUnlockBodyScroll();
  }, [isCategoryModalOpen, isTransactionModalOpen, isMapModalOpen]);

  useEffect(() => {
    // iOS Safari occasionally needs a reflow/resize to paint below-the-fold content after initial mount.
    const id = window.setTimeout(() => {
      try {
        window.dispatchEvent(new Event('resize'));
      } catch {
        // ignore
      }
    }, 150);
    return () => window.clearTimeout(id);
  }, [activeTab]);

  useEffect(() => {
    // Extra safety net for iOS Safari: if scroll gets "stuck" due to a leaked scroll-lock,
    // force-unlock when the app is visible and no modal is open.
    const shouldRecover = () => !isTransactionModalOpen && !isCategoryModalOpen;

    const recover = () => {
      if (!shouldRecover()) return;
      const body = document.body;
      const top = String(body?.style?.top || '').trim();
      const overflow = String(body?.style?.overflow || '').trim();
      const position = String(body?.style?.position || '').trim();
      if (position === 'fixed' || overflow === 'hidden' || top) {
        forceUnlockBodyScroll();
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') recover();
    };

    window.addEventListener('focus', recover);
    window.addEventListener('pageshow', recover);
    document.addEventListener('visibilitychange', onVisibility);

    // Attempt once after initial mount too.
    const t = window.setTimeout(recover, 250);

    return () => {
      window.removeEventListener('focus', recover);
      window.removeEventListener('pageshow', recover);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearTimeout(t);
    };
  }, [isCategoryModalOpen, isTransactionModalOpen]);

  return (
    <div className="relative min-h-[var(--app-height,100vh)] overflow-x-hidden bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 transition-colors duration-200">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 opacity-[0.06] dark:opacity-[0.08]"
             style={{
               backgroundImage:
                 'radial-gradient(circle at 1px 1px, rgba(15, 23, 42, 0.35) 1px, transparent 0)',
               backgroundSize: '22px 22px',
             }}
        />
        <div className="absolute -top-28 -left-28 h-96 w-96 rounded-full bg-gradient-to-br from-sky-300/40 to-indigo-300/30 blur-3xl dark:from-sky-500/20 dark:to-indigo-500/10" />
        <div className="absolute top-32 -right-28 h-[34rem] w-[34rem] rounded-full bg-gradient-to-br from-emerald-200/40 to-cyan-200/30 blur-3xl dark:from-emerald-500/10 dark:to-cyan-500/10" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-gradient-to-br from-amber-200/20 to-rose-200/15 blur-3xl dark:from-amber-500/10 dark:to-rose-500/10" />
      </div>
      <Header activeTab={activeTab} onNavigate={handleNavigate} onPreload={preloadTab} />
      
      <main className="mx-auto w-full max-w-[1520px] px-2 sm:px-5 lg:px-6 pt-16 pb-28 md:pb-6">
        <div className="rounded-[10px] bg-transparent p-1 sm:p-2">
        {activeTab === 'dashboard' ? (
          <section>
            <div className="hidden" aria-hidden="true">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2">
                <div>
                  <h2 className="font-display text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Dashboard</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                    A live overview of income, expenses, and trends.
                  </p>
                </div>
              </div>
            </div>
            <ErrorBoundary>
              <Suspense fallback={<TabFallback label="Loading dashboard…" />}>
                <Dashboard />
              </Suspense>
            </ErrorBoundary>
          </section>
        ) : null}
        
        {/* Transaction Management Section */}
        {activeTab === 'transactions' ? (
          <section className="pt-4">
            <TransactionsPanel onOpenTransactionModal={openTransactionModal} onOpenMapModal={openMapModal} />
            {/*
              <>
                <SectionTitle 
              title="Transaction Manager" 
              subtitle="Add, edit, and filter transactions. Your data stays in sync with Charts and Net Worth."
              actionButton={
                <button
                  onClick={() => setIsTransactionModalOpen(true)}
                  className="inline-flex items-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors duration-150 shadow-soft hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  New Transaction
                </button>
              }
            />
            
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-12">
                <div className="xl:col-span-2 flex flex-col">
                  <div className="surface overflow-hidden flex-1 flex flex-col">
                    <Suspense fallback={<TabFallback label="Loading transactions…" />}>
                      <TransactionList />
                    </Suspense>
                  </div>
                </div>
              
              <div className="xl:sticky xl:top-4 space-y-6 flex flex-col">
                <div className="surface surface-pad flex-shrink-0">
                  <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    Quick Add
                  </h3>
                  <TransactionForm compact={true} />
                </div>
                
                <div id="export-import-container" className="bg-transparent overflow-hidden flex-shrink-0">
                  <Suspense fallback={<TabFallback label="Loading tools…" />}>
                    <ExportImport />
                  </Suspense>
                </div>
              </div>
            </div>
              </>
            */}
          </section>
        ) : null}
        
        {/* Categories Section */}
        {activeTab === 'categories' && (
          <>
            <SectionTitle 
              title="Categories" 
              subtitle="Organize expenses with custom categories and colors."
              actionButton={
                <button
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="inline-flex items-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors duration-150 shadow-soft hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  New Category
                </button>
              }
            />
            
            <div className="surface surface-pad-sm mb-12">
              <div className="text-sm font-semibold text-slate-700">Categories</div>
              <div className="mt-1 text-xs text-slate-500">Create categories while adding a transaction.</div>
            </div>
          </>
        )}
        
        {/* Settings Section */}
        {activeTab === 'settings' ? (
          <section className="pt-4">
            <SectionTitle title="Settings" subtitle="Enterprise-grade preferences, privacy, and data management." />

            <SettingsPanel />
          </section>
        ) : null}

        {/* Budgets Section */}
        {activeTab === 'budgets' ? (
          <section className="pt-4">
            <Suspense fallback={<TabFallback label="Loading budgets…" />}>
              <Budgets />
            </Suspense>
          </section>
        ) : null}

        {/* Charts Section */}
        {activeTab === 'charts' ? (
          <section className="pt-4">
            <SectionTitle title="Analytics" subtitle="Interactive charts and drilldowns powered by your transactions." />
            
            <div className="surface overflow-hidden mb-4">
              <Suspense fallback={<TabFallback label="Loading charts…" />}>
                <ExpenseChart />
              </Suspense>
            </div>
          </section>
        ) : null}

        {/* Net Worth Section */}
        {activeTab === 'networth' ? (
          <section className="pt-4">
            <SectionTitle title="Net Worth" subtitle="Track monthly snapshots and see your net worth trend synced with cashflow." />
            <div className="surface overflow-hidden mb-4">
              <Suspense fallback={<TabFallback label="Loading net worth…" />}>
                <Networth />
              </Suspense>
            </div>
          </section>
        ) : null}

        {/* Goals Section */}
        {activeTab === 'goals' ? (
          <section className="pt-4">
            <SectionTitle title="Goals" subtitle="Set targets, track progress, and get AI-powered recommendations." />
            <div className="surface overflow-hidden mb-4">
              <Suspense fallback={<TabFallback label="Loading goals…" />}>
                <Goals />
              </Suspense>
            </div>
          </section>
        ) : null}

        {/* AI Insights Section */}
        {activeTab === 'insights' ? (
          <section className="pt-4">
            <SectionTitle title="AI Insights" subtitle="Actionable patterns, smart alerts, and recommendations." />
            <div className="surface overflow-hidden mb-4">
              <Suspense fallback={<TabFallback label="Loading AI insights…" />}>
                <AIInsights />
              </Suspense>
            </div>
          </section>
        ) : null}
        </div>
      </main>
      
      {!isTransactionModalOpen && !isCategoryModalOpen && (
        <FloatingActionButton onClick={openTransactionModal} />
      )}

      {!isTransactionModalOpen && !isCategoryModalOpen && activeTab === 'dashboard' ? (
        <Suspense fallback={null}>
          <AIChatAssistant />
        </Suspense>
      ) : null}
      
      {/* Transaction Modal */}
      {isTransactionModalOpen && (
        <div className="fixed inset-0 z-[100]">
          <div aria-hidden="true" className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setIsTransactionModalOpen(false)} />
          <div className="absolute inset-0 overflow-y-auto pointer-events-none">
            <div className="min-h-full flex flex-col items-center justify-end sm:justify-center p-0 sm:p-4">
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Add transaction"
                className="w-full sm:w-[min(800px,96vw)] shrink-0 mt-auto sm:my-auto flex flex-col max-h-[90dvh] sm:max-h-[calc(85dvh-2rem)] overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl shadow-2xl ring-1 ring-black/10 dark:ring-white/[0.12] pointer-events-auto transition-transform mx-auto"
              >
                {/* Mobile Handle */}
                <div className="w-full flex justify-center pt-3 pb-1 sm:hidden shrink-0" aria-hidden="true">
                  <div className="w-12 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700/60" />
                </div>
                
                <div className="flex items-start justify-between gap-4 px-5 sm:px-6 py-3 sm:py-4 border-b border-black/5 dark:border-white/10 shrink-0">
                  <div className="min-w-0">
                    <div className="font-display text-xl sm:text-xl font-extrabold text-slate-900 dark:text-white truncate">Add Transaction</div>
                    <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      Saved locally {'\u2022'} No data leaves your browser
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsTransactionModalOpen(false)}
                    className="shrink-0 h-9 w-9 rounded-2xl ring-1 ring-black/5 dark:ring-white/[0.12] bg-slate-50/80 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-900/55 transition-colors grid place-items-center"
                    aria-label="Close"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-700 dark:text-slate-200" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </div>
                <div className="px-5 sm:px-6 py-4 flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-hide pb-[max(1rem,env(safe-area-inset-bottom))]">
                  <TransactionForm variant="embedded" onClose={() => setIsTransactionModalOpen(false)} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-[100]">
          <div aria-hidden="true" className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setIsCategoryModalOpen(false)} />
          <div className="absolute inset-0 overflow-y-auto pointer-events-none">
            <div className="min-h-full flex flex-col items-center justify-end sm:justify-center p-0 sm:p-4">
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Add category"
                className="w-full sm:w-[min(520px,92vw)] shrink-0 mt-auto sm:my-auto flex flex-col max-h-[92dvh] sm:max-h-[calc(100dvh-2rem)] overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl shadow-2xl ring-1 ring-black/10 dark:ring-white/[0.12] pointer-events-auto transition-transform mx-auto"
              >
                {/* Mobile Handle */}
                <div className="w-full flex justify-center pt-3 pb-1 sm:hidden shrink-0" aria-hidden="true">
                  <div className="w-12 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700/60" />
                </div>

                <div className="flex items-start justify-between gap-4 px-5 sm:px-6 py-3 sm:py-5 border-b border-black/5 dark:border-white/10 shrink-0">
                  <div className="min-w-0">
                    <div className="font-display text-xl sm:text-xl font-extrabold text-slate-900 dark:text-white truncate">Add Category</div>
                    <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      Saved locally {'\u2022'} Used for charts and budgets
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCategoryModalOpen(false)}
                    className="shrink-0 h-9 w-9 rounded-2xl ring-1 ring-black/5 dark:ring-white/[0.12] bg-slate-50/80 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-900/55 transition-colors grid place-items-center"
                    aria-label="Close"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-700 dark:text-slate-200" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </div>
                <div className="px-5 sm:px-6 py-4 flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-hide pb-[max(1rem,env(safe-area-inset-bottom))]">
                  <CategoryForm onClose={() => setIsCategoryModalOpen(false)} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Map Modal */}
      {isMapModalOpen && (
        <Suspense fallback={null}>
          <TransactionMap onClose={() => setIsMapModalOpen(false)} />
        </Suspense>
      )}

      <Footer />
    </div>
  );
};

export default MainLayout; 
