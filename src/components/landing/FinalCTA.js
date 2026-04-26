import React from 'react';
import { PrimaryButton, SectionLabel, cx } from './ui';

export default function FinalCTA({ onGetStarted, onNav }) {
  return (
    <section id="security" className="container mx-auto max-w-7xl px-4 py-14 sm:py-20">
      <div className="rounded-[42px] bg-slate-950/55 ring-1 ring-white/12 overflow-hidden shadow-[0_30px_120px_-90px_rgba(0,0,0,0.95)]" data-reveal>
        <div aria-hidden="true" className="relative">
          <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(248,250,252,0.9) 1px, transparent 0)', backgroundSize: '28px 28px' }} />
          <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[var(--landing-accent)]/15 blur-[140px]" />
          <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-[var(--landing-accent-2)]/12 blur-[140px]" />
        </div>

        <div className="relative p-7 sm:p-10 lg:p-12 grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-10 items-center">
          <div>
            <SectionLabel>Security</SectionLabel>
            <h2 className="mt-6 font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-[1.1]">
              Your data stays <span className="bg-gradient-to-r from-[var(--landing-accent)] to-[var(--landing-accent-2)] bg-clip-text text-transparent">yours</span>.
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-200/80 leading-relaxed max-w-[60ch]">
              FinVision is privacy-first: local storage, optional PIN protection, and instant “hide amounts” mode for shared screens.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <PrimaryButton as="button" onClick={onGetStarted}>
                Get started
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
                </svg>
              </PrimaryButton>
              <button
                type="button"
                onClick={() => onNav?.('pricing')}
                className={cx(
                  'inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-extrabold tracking-tight',
                  'bg-white/10 text-white ring-1 ring-white/15',
                  'hover:bg-white/14 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30'
                )}
              >
                View pricing
              </button>
            </div>
          </div>

          <div className="rounded-3xl bg-white/6 ring-1 ring-white/10 p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="font-mono text-[11px] uppercase tracking-[0.15em] text-white/75">Live status</div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/8 ring-1 ring-white/10 px-3 py-1 text-[11px] font-extrabold text-white">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse-soft" aria-hidden="true" />
                Private mode ready
              </span>
            </div>
            <div className="mt-6 space-y-4">
              {[
                { k: 'Storage', v: 'Local (browser)' },
                { k: 'Exports', v: 'CSV / JSON' },
                { k: 'Control', v: 'Mask amounts + PIN' },
              ].map((r) => (
                <div key={r.k} className="flex items-center justify-between gap-3 rounded-2xl bg-white/6 ring-1 ring-white/10 px-4 py-3">
                  <div className="text-sm font-extrabold text-white/90">{r.k}</div>
                  <div className="text-sm font-semibold text-slate-200/75">{r.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

