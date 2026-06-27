import React, { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  const initials = useMemo(() => {
    const name = String(currentUser?.name || 'User').trim();
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'U';
  }, [currentUser?.name]);

  // 5 most-used tabs
  const navItems = useMemo(
    () => [
      { id: 'dashboard', label: 'Home', desktopLabel: 'Dashboard' },
      { id: 'transactions', label: 'New', desktopLabel: 'Transactions' },
      { id: 'budgets', label: 'Budgets', desktopLabel: 'Budgets' },
      { id: 'charts', label: 'Analytics', desktopLabel: 'Analytics' },
      { id: 'goals', label: 'Goals', desktopLabel: 'Goals' },
    ],
    []
  );
  // Desktop uses full labels
  const desktopNavItems = useMemo(() => navItems.map(i => ({ ...i, label: i.desktopLabel })), [navItems]);

  // Premium dual-state (outline / filled) icons — Lucide / SF-Symbol style
  const NAV_ICONS = {
    dashboard: {
      outline: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
          <path d="M9 21V12h6v9" />
        </svg>
      ),
      filled: (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.1L2 9.4V21a1 1 0 001 1h5v-9h8v9h5a1 1 0 001-1V9.4L12 2.1z" />
        </svg>
      ),
    },
    transactions: {
      outline: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 3L4 7l4 4M4 7h16" />
          <path d="M16 21l4-4-4-4m4 4H4" />
        </svg>
      ),
      filled: (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M8.707 2.293a1 1 0 00-1.414 0l-4 4a1 1 0 001.414 1.414L7 5.414V17a1 1 0 002 0V5.414l2.293 2.293a1 1 0 001.414-1.414l-4-4zM16 7a1 1 0 011 1v11.586l2.293-2.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L15 19.586V8a1 1 0 011-1z" />
        </svg>
      ),
    },
    budgets: {
      outline: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M2 10h20" />
          <path d="M6 15h2M10 15h2" />
        </svg>
      ),
      filled: (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path fillRule="evenodd" d="M2 7a3 3 0 013-3h14a3 3 0 013 3v10a3 3 0 01-3 3H5a3 3 0 01-3-3V7zm0 3h20v7a1 1 0 01-1 1H3a1 1 0 01-1-1v-7zm3 4a1 1 0 011-1h2a1 1 0 010 2H6a1 1 0 01-1-1zm6 0a1 1 0 011-1h2a1 1 0 010 2h-2a1 1 0 01-1-1z" clipRule="evenodd" />
        </svg>
      ),
    },
    charts: {
      outline: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 20V13m4 7V9m4 11V5m4 15v-7" />
          <path d="M2 20h20" />
        </svg>
      ),
      filled: (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 20a1 1 0 001 1h16a1 1 0 001-1v-1H3v1zM4 12h2v7H4v-7zm5-4h2v11H9V8zm5 5h2v6h-2v-6zm5-8h2v14h-2V5z" />
        </svg>
      ),
    },
    goals: {
      outline: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
        </svg>
      ),

      filled: (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="9" opacity=".25" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2.3" fill="white" />
        </svg>
      ),
    },
  };

  const mobileBottomNav = (
    <div
      className="md:hidden fixed left-0 right-0 bottom-0 z-[100] pointer-events-none"
      style={{
        paddingBottom: 'max(16px, calc(12px + env(safe-area-inset-bottom)))',
        paddingLeft: '14px',
        paddingRight: '14px',
      }}
    >
      {/* Soft ambient background bloom */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(248,250,255,0.72) 0%, rgba(255,255,255,0.18) 70%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Floating pill */}
      <div
        className="pointer-events-auto"
        style={{
          height: '72px',
          borderRadius: '34px',
          background: 'linear-gradient(170deg, rgba(255,255,255,0.94) 0%, rgba(246,248,255,0.90) 100%)',
          backdropFilter: 'blur(48px) saturate(240%) brightness(1.05)',
          WebkitBackdropFilter: 'blur(48px) saturate(240%) brightness(1.05)',
          border: '1px solid rgba(255,255,255,0.80)',
          boxShadow: [
            '0 1px 3px rgba(0,0,0,0.04)',
            '0 6px 20px rgba(0,0,0,0.08)',
            '0 20px 44px rgba(0,0,0,0.07)',
            'inset 0 1.5px 0 rgba(255,255,255,1)',
            'inset 0 -1px 0 rgba(0,0,0,0.03)',
          ].join(', '),
          display: 'flex',
          alignItems: 'center',
          padding: '0 8px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Top shimmer line */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            left: '8%',
            right: '8%',
            height: '1px',
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.95) 35%, rgba(255,255,255,1) 50%, rgba(255,255,255,0.95) 65%, transparent 100%)',
            borderRadius: '999px',
            pointerEvents: 'none',
          }}
        />

        {navItems.map((item) => {
          const active = item.id === activeTab;
          const icons = NAV_ICONS[item.id];
          return (
            <button
              key={item.id}
              onClick={() => onNavigate?.(item.id)}
              onMouseEnter={() => onPreload?.(item.id)}
              onTouchStart={() => onPreload?.(item.id)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '8px 4px 6px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
                outline: 'none',
                position: 'relative',
                transition: 'transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                transform: active ? 'translateY(-2px) scale(1.06)' : 'translateY(0) scale(1)',
              }}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
            >
              {/* Soft active glow */}
              {active && (
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    top: '6px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '40px',
                    height: '32px',
                    borderRadius: '14px',
                    background: 'radial-gradient(ellipse at center, rgba(79,107,255,0.18) 0%, transparent 72%)',
                    filter: 'blur(6px)',
                    pointerEvents: 'none',
                    transition: 'opacity 220ms ease',
                  }}
                />
              )}

              {/* Icon */}
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  zIndex: 1,
                  color: active ? '#4F6BFF' : '#9B9BA0',
                  filter: active ? 'drop-shadow(0 2px 6px rgba(79,107,255,0.38))' : 'none',
                  transition: 'color 220ms ease, filter 220ms ease, transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                  transform: active ? 'scale(1.14)' : 'scale(1)',
                }}
              >
                {active ? icons.filled : icons.outline}
              </div>

              {/* Label */}
              <span
                style={{
                  fontSize: '10px',
                  lineHeight: '1',
                  letterSpacing: '-0.01em',
                  fontWeight: active ? '700' : '500',
                  color: active ? '#4F6BFF' : '#9B9BA0',
                  transition: 'color 220ms ease',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif',
                  userSelect: 'none',
                  maxWidth: '58px',
                  textAlign: 'center',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                {item.label}
              </span>


            </button>
          );
        })}
      </div>
    </div>
  );


  return (
    <>
      <header className="fixed inset-x-0 top-0 z-30 border-b border-black/[0.06] bg-white/70 supports-[backdrop-filter]:bg-white/55 backdrop-blur-2xl supports-[backdrop-filter]:backdrop-saturate-150 ring-1 ring-black/[0.04] shadow-[0_14px_40px_-28px_rgba(15,23,42,0.45)] transition-colors duration-200">
        <div className="mx-auto w-full max-w-[1520px] px-3 sm:px-5 lg:px-6 py-3 sm:py-3.5 grid grid-cols-2 md:grid-cols-[auto,1fr,auto] items-center gap-3">
          <div className="flex items-center gap-3 justify-self-start">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 grid place-items-center shadow-soft ring-1 ring-black/5 dark:ring-white/10">
              <img src={finvisionMark} alt="FinVision" className="h-5 w-5 invert brightness-0" />
            </div>
            <h1 className="font-display text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              FinVision
            </h1>
          </div>

          <div className="hidden md:flex justify-center justify-self-center">
            <CapsuleNav navItems={desktopNavItems} activeTab={activeTab} onNavigate={onNavigate} onPreload={onPreload} />
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 justify-end justify-self-end">
            <button
              type="button"
              onClick={() => onNavigate?.('settings')}
              className="md:hidden h-9 w-9 rounded-full bg-blue-600 text-sm font-extrabold text-white grid place-items-center shadow-sm ring-1 ring-black/5"
              aria-label="Open settings"
            >
              {initials}
            </button>

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
              className="hidden md:inline-flex p-2 rounded-xl text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/60 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
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
      </header>

      {mobileBottomNav}
    </>
  );
};

export default Header; 
