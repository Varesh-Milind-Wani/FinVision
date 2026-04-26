import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import finvisionMark from '../assets/finvision-mark.svg';
import { useBodyScrollLock } from '../utils/scrollLock';

const CapsuleNav = ({ navItems, activeTab, onNavigate, onPreload, size = 'md' }) => {
  const containerRef = useRef(null);
  const buttonRefs = useRef(new Map());
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });
  const [animateIndicator, setAnimateIndicator] = useState(false);
  const measureRafRef = useRef(0);
  const hasActive = useMemo(() => navItems.some((i) => i.id === activeTab), [activeTab, navItems]);

  const measure = useCallback(() => {
    if (!hasActive) {
      setIndicator((prev) => (prev.ready || prev.left || prev.width ? { left: 0, width: 0, ready: false } : prev));
      return;
    }
    const container = containerRef.current;
    const btn = buttonRefs.current.get(activeTab);
    if (!container || !btn) {
      setIndicator((prev) => (prev.ready || prev.left || prev.width ? { left: 0, width: 0, ready: false } : prev));
      return;
    }
    const c = container.getBoundingClientRect();
    const b = btn.getBoundingClientRect();
    const nextLeft = Math.max(0, b.left - c.left);
    const nextWidth = Math.max(0, b.width);

    setIndicator((prev) => {
      if (prev.ready && prev.left === nextLeft && prev.width === nextWidth) return prev;
      return { left: nextLeft, width: nextWidth, ready: true };
    });
  }, [activeTab, hasActive]);

  const scheduleMeasure = useCallback(() => {
    if (measureRafRef.current) cancelAnimationFrame(measureRafRef.current);
    measureRafRef.current = requestAnimationFrame(() => {
      measureRafRef.current = 0;
      measure();
    });
  }, [measure]);

  // Measure after paint and whenever selection changes (avoid blocking tab switch).
  useEffect(() => {
    scheduleMeasure();
  }, [scheduleMeasure]);

  // Avoid the "blue capsule slides in" effect on refresh while fonts/CSS settle.
  useEffect(() => {
    const t = window.setTimeout(() => setAnimateIndicator(true), 700);
    return () => window.clearTimeout(t);
  }, []);

  // Keep indicator correct on resize.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onResize = () => scheduleMeasure();
    window.addEventListener('resize', onResize);

    let ro;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      ro = new ResizeObserver(() => scheduleMeasure());
      ro.observe(containerRef.current);
    }

    // Fonts can shift metrics after load.
    const t = window.setTimeout(() => scheduleMeasure(), 50);

    return () => {
      window.removeEventListener('resize', onResize);
      window.clearTimeout(t);
      if (measureRafRef.current) cancelAnimationFrame(measureRafRef.current);
      measureRafRef.current = 0;
      if (ro) ro.disconnect();
    };
  }, [scheduleMeasure]);

  const pad = size === 'sm' ? 'px-1.5 py-1' : 'px-2.5 py-2';
  const btnPad = size === 'sm' ? 'px-3.5 py-2' : 'px-5 py-2.5';

  return (
    <div className="relative w-fit">
      <div
        ref={containerRef}
        className={[
          'relative flex items-center gap-1.5 whitespace-nowrap rounded-full',
          pad,
          // Match the app’s glassy “surface” style.
          'bg-white/65 dark:bg-slate-950/35',
          'backdrop-blur-xl',
          'ring-1 ring-black/5 dark:ring-white/[0.12]',
          'shadow-[0_12px_30px_-24px_rgba(2,6,23,0.22)] dark:shadow-[0_16px_40px_-28px_rgba(0,0,0,0.55)]',
        ].join(' ')}
      >
        <div
          aria-hidden="true"
          className={[
            'absolute top-1 bottom-1 left-0 rounded-full',
            'transform-gpu will-change-transform',
            'bg-gradient-to-r from-blue-600 to-indigo-600',
            'shadow-[0_10px_22px_-16px_rgba(37,99,235,0.55)]',
            animateIndicator
              ? 'transition-[transform,width] duration-260 ease-[cubic-bezier(0.2,0.9,0.2,1)] motion-reduce:transition-none'
              : 'transition-none',
            indicator.ready ? 'opacity-100' : 'opacity-0',
          ].join(' ')}
          style={{
            transformOrigin: 'left center',
            transform: `translate3d(${indicator.left}px,0,0)`,
            width: indicator.width,
          }}
        />

        {navItems.map((item) => (
          <button
            key={item.id}
            ref={(el) => {
              if (!el) {
                buttonRefs.current.delete(item.id);
                return;
              }
              buttonRefs.current.set(item.id, el);
            }}
            type="button"
            onClick={() => onNavigate?.(item.id)}
            onMouseEnter={() => onPreload?.(item.id)}
            onFocus={() => onPreload?.(item.id)}
            className={[
              'relative z-10 font-display rounded-full text-sm font-extrabold tracking-tight',
              btnPad,
              'transition-all duration-150 motion-reduce:transition-none',
              'active:scale-[0.98]',
              activeTab === item.id
                ? 'text-white'
                : 'text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white hover:bg-slate-900/[0.04] dark:hover:bg-white/[0.06]',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40',
            ].join(' ')}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
};

const Header = ({ activeTab = 'dashboard', onNavigate, onPreload }) => {
  const { currentUser, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const initials = useMemo(() => {
    const name = String(currentUser?.name || 'User').trim();
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'U';
  }, [currentUser?.name]);

  useBodyScrollLock(menuOpen);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  const navItems = useMemo(
    () => [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'transactions', label: 'Transactions' },
      { id: 'charts', label: 'Analytics' },
      { id: 'networth', label: 'Net Worth' },
      { id: 'goals', label: 'Goals' },
    ],
    []
  );

  const mobileMenu = menuOpen
    ? createPortal(
        <div className="fixed inset-0 z-[10010] md:hidden">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="absolute right-0 top-0 h-full w-[min(360px,92vw)] bg-white/90 dark:bg-slate-950/80 backdrop-blur-xl shadow-2xl ring-1 ring-black/10 dark:ring-white/[0.12]"
            style={{
              paddingTop: 'calc(1rem + var(--safe-area-inset-top))',
              paddingBottom: 'calc(1rem + var(--safe-area-inset-bottom))',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  onNavigate?.('settings');
                  setMenuOpen(false);
                }}
                className="flex items-center gap-3 min-w-0 text-left rounded-2xl p-2 -ml-2 hover:bg-white/60 dark:hover:bg-slate-900/35 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                aria-label="Open settings"
                title="Settings"
              >
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-600 text-sm font-extrabold text-white">
                  {initials}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-extrabold text-slate-900 dark:text-white">{currentUser?.name || 'User'}</div>
                  <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">{currentUser?.email || 'Local session'}</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="h-10 w-10 rounded-2xl ring-1 ring-black/5 dark:ring-white/[0.12] bg-white/70 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-900/55 transition-colors grid place-items-center"
                aria-label="Close menu"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-700 dark:text-slate-200" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <div className="mt-4 px-4">
              <div className="rounded-2xl ring-1 ring-black/5 dark:ring-white/[0.12] bg-white/70 dark:bg-slate-950/25 overflow-hidden">
                {navItems.map((item) => {
                  const active = item.id === activeTab;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onNavigate?.(item.id);
                        setMenuOpen(false);
                      }}
                      onMouseEnter={() => onPreload?.(item.id)}
                      className={[
                        'w-full text-left px-4 py-3 flex items-center justify-between gap-3',
                        'transition-colors',
                        active
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-800 dark:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-900/40',
                      ].join(' ')}
                    >
                      <span className="text-sm font-extrabold">{item.label}</span>
                      {active ? (
                        <span className="text-[11px] font-extrabold bg-white/15 rounded-full px-2 py-0.5 ring-1 ring-white/20">
                          Active
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 px-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  onNavigate?.('settings');
                  setMenuOpen(false);
                }}
                className="px-4 py-3 rounded-2xl text-sm font-extrabold ring-1 ring-black/5 dark:ring-white/[0.12] bg-white/70 dark:bg-slate-950/25 hover:bg-white dark:hover:bg-slate-950/35 transition-colors"
              >
                Settings
              </button>
              <button
                type="button"
                onClick={() => {
                  logout?.();
                  setMenuOpen(false);
                }}
                className="px-4 py-3 rounded-2xl text-sm font-extrabold ring-1 ring-black/5 dark:ring-white/[0.12] bg-white/70 dark:bg-slate-950/25 hover:bg-white dark:hover:bg-slate-950/35 transition-colors text-rose-700 dark:text-rose-300"
              >
                Logout
              </button>
            </div>

          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <header className="fixed inset-x-0 top-0 z-30 border-b border-black/[0.06] bg-white/70 supports-[backdrop-filter]:bg-white/55 backdrop-blur-2xl supports-[backdrop-filter]:backdrop-saturate-150 ring-1 ring-black/[0.04] shadow-[0_14px_40px_-28px_rgba(15,23,42,0.45)] transition-colors duration-200">
      <div className="mx-auto w-full max-w-[1520px] px-2 sm:px-5 lg:px-6 py-3 sm:py-3.5 grid grid-cols-[1fr_auto_1fr] md:grid-cols-[auto,1fr,auto] items-center gap-3">
        <div className="flex items-center gap-2 flex-shrink-0 justify-self-start">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="md:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/60 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            aria-label="Open menu"
            aria-expanded={menuOpen}
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="hidden md:flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 grid place-items-center shadow-soft ring-1 ring-black/5 dark:ring-white/10">
              <img src={finvisionMark} alt="FinVision" className="h-5 w-5 invert brightness-0" />
            </div>
            <h1 className="font-display text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              FinVision
            </h1>
          </div>
        </div>

        <div className="flex justify-center justify-self-center">
          <div className="md:hidden flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 grid place-items-center shadow-soft ring-1 ring-black/5 dark:ring-white/10">
              <img src={finvisionMark} alt="FinVision" className="h-5 w-5 invert brightness-0" />
            </div>
            <div className="font-display text-base font-extrabold tracking-tight text-slate-900 dark:text-white">FinVision</div>
          </div>
          <div className="hidden md:flex justify-center">
            <CapsuleNav navItems={navItems} activeTab={activeTab} onNavigate={onNavigate} onPreload={onPreload} />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 justify-end justify-self-end">
          <button
            type="button"
            onClick={() => onNavigate?.('settings')}
            className="hidden lg:flex items-center gap-3 rounded-[8px] border border-black/5 dark:border-white/10 bg-white/60 dark:bg-slate-950/30 px-3 py-2 text-left hover:bg-white/80 dark:hover:bg-slate-900/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
            aria-label="Open settings"
            title="Settings"
          >
            <div className="grid h-9 w-9 place-items-center rounded-[8px] bg-blue-600 text-sm font-extrabold text-white">
              {initials}
            </div>
            <div className="min-w-0 max-w-[12rem]">
              <div className="truncate text-sm font-extrabold text-slate-900 dark:text-white">{currentUser?.name || 'User'}</div>
              <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">{currentUser?.email || 'Local session'}</div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => logout?.()}
            className="hidden sm:inline-flex p-2 rounded-xl text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/60 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            aria-label="Logout"
            title="Logout"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 17l5-5-5-5" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H3" />
            </svg>
          </button>
        </div>
      </div>

      {mobileMenu}
    </header>
  );
};

export default Header; 
