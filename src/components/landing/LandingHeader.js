import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import finvisionMark from '../../assets/finvision-mark.svg';
import { useCurrency } from '../../contexts/CurrencyContext';
import { PrimaryButton, GlassButton, cx } from './ui';

export default function LandingHeader({ links, onNav, onGetStarted, onViewDemo, scrollPct = 0, reducedMotion = false }) {
  const { displayCurrencyCode, setDisplayCurrencyCode, fxStatus } = useCurrency();
  const currencyOptions = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD', 'CAD'];
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  useEffect(() => {
    const el = document.querySelector('.landing-scroll-container');
    if (!el) return undefined;
    const prev = el.style.overflowY;
    if (menuOpen) el.style.overflowY = 'hidden';
    return () => {
      el.style.overflowY = prev;
    };
  }, [menuOpen]);

  const mobileMenu = menuOpen
    ? createPortal(
        <div className="fixed inset-0 z-[10010] md:hidden">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm touch-none"
            onClick={() => setMenuOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Landing navigation"
            className="absolute inset-x-0 top-0 bg-slate-950/92 ring-1 ring-white/10 shadow-2xl backdrop-blur-2xl supports-[backdrop-filter]:backdrop-saturate-150"
            style={{ paddingTop: 'calc(0.75rem + var(--safe-area-inset-top))' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 pb-4">
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onNav?.('top');
                    setMenuOpen(false);
                  }}
                  className="flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40 rounded-2xl px-2 py-1"
                >
                  <img src={finvisionMark} alt="FinVision" className="h-8 w-8" />
                  <div className="font-display text-lg font-extrabold tracking-tight text-white">FinVision</div>
                </button>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="h-10 w-10 rounded-2xl ring-1 ring-white/10 bg-white/5 hover:bg-white/10 transition-colors grid place-items-center"
                  aria-label="Close menu"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>

              <div className="mt-4 grid gap-2">
                {links.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => {
                      onNav?.(l.id);
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 rounded-2xl text-sm font-extrabold text-white/90 hover:text-white hover:bg-white/5 ring-1 ring-white/10 transition-colors"
                  >
                    {l.label}
                  </button>
                ))}
              </div>

              <div className="mt-4 rounded-2xl bg-white/5 ring-1 ring-white/10 px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-mono text-[11px] uppercase tracking-[0.15em] text-slate-200/70">Currency</div>
                  <div className={cx('mt-1 text-xs font-semibold', fxStatus === 'loading' ? 'text-slate-200/50' : 'text-slate-200/70')}>
                    {reducedMotion ? '' : fxStatus === 'loading' ? 'Syncing' : 'Live rates'}
                  </div>
                </div>
                <select
                  value={displayCurrencyCode}
                  onChange={(e) => setDisplayCurrencyCode(e.target.value)}
                  className="shrink-0 rounded-xl px-3 py-2 bg-white/10 text-sm font-extrabold text-white outline-none ring-1 ring-white/10"
                  aria-label="Select currency"
                >
                  {currencyOptions.map((c) => (
                    <option key={c} value={c} className="text-slate-900">
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <GlassButton as="button" onClick={() => { onViewDemo?.(); setMenuOpen(false); }} className="justify-center">
                  View demo
                </GlassButton>
                <PrimaryButton
                  as="button"
                  onClick={() => {
                    onGetStarted?.();
                    setMenuOpen(false);
                  }}
                  className="justify-center"
                >
                  Get started
                </PrimaryButton>
              </div>
            </div>
            <div style={{ height: 'calc(0.75rem + var(--safe-area-inset-bottom))' }} aria-hidden="true" />
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <header
      className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-slate-950/70 supports-[backdrop-filter]:bg-slate-950/55 backdrop-blur-2xl supports-[backdrop-filter]:backdrop-saturate-150"
      style={{ paddingTop: 'var(--safe-area-inset-top)' }}
    >
      <div
        aria-hidden="true"
        className="absolute left-0 top-0 h-[2px] bg-gradient-to-r from-[var(--landing-accent)] to-[var(--landing-accent-2)]"
        style={{ width: `${Math.round(scrollPct * 100)}%`, opacity: reducedMotion ? 0 : 0.9 }}
      />

      <div className="container mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => onNav?.('top')}
          className="flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40 rounded-2xl px-2 py-1"
        >
          <img src={finvisionMark} alt="FinVision" className="h-8 w-8" />
          <div className="font-display text-lg font-extrabold tracking-tight text-white">FinVision</div>
        </button>

        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => onNav?.(l.id)}
              className={cx(
                'px-3 py-2 rounded-2xl text-sm font-extrabold text-slate-100/90 hover:text-white hover:bg-white/5 ring-1 ring-transparent hover:ring-white/10',
                'transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20'
              )}
            >
              {l.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="md:hidden h-10 w-10 rounded-2xl ring-1 ring-white/10 bg-white/5 hover:bg-white/10 transition-colors grid place-items-center"
            aria-label="Open menu"
            aria-expanded={menuOpen}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <label className="hidden sm:flex items-center gap-3 rounded-2xl bg-white/6 ring-1 ring-white/12 px-3 py-2">
            <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-slate-200/70">Currency</span>
            <select
              value={displayCurrencyCode}
              onChange={(e) => setDisplayCurrencyCode(e.target.value)}
              className="bg-transparent text-xs font-extrabold text-white outline-none"
              aria-label="Select currency"
            >
              {currencyOptions.map((c) => (
                <option key={c} value={c} className="text-slate-900">
                  {c}
                </option>
              ))}
            </select>
            <span className="flex items-center gap-2">
              <span className={cx('h-2 w-2 rounded-full', fxStatus === 'loading' ? 'bg-slate-400' : 'bg-emerald-400')} aria-hidden="true" />
              <span className={cx('text-[11px] font-semibold', fxStatus === 'loading' ? 'text-slate-200/50' : 'text-slate-200/70')}>
                {reducedMotion ? '' : fxStatus === 'loading' ? 'Syncing' : 'Live'}
              </span>
            </span>
          </label>

          <GlassButton as="button" onClick={onViewDemo} className="hidden sm:inline-flex">
            View demo
          </GlassButton>

          <PrimaryButton as="button" onClick={onGetStarted} className="hidden sm:inline-flex">
            Get started
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
            </svg>
          </PrimaryButton>
        </div>
      </div>

      {mobileMenu}
    </header>
  );
}
