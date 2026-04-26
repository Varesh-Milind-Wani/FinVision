import React from 'react';
import { SectionLabel, cx } from './ui';

const Step = ({ n, title, desc, last = false }) => (
  <div className="relative rounded-3xl bg-white/6 ring-1 ring-white/10 p-6 shadow-[0_18px_56px_-44px_rgba(0,0,0,0.85)]" data-reveal>
    <div className="flex items-start gap-4">
      <div className="shrink-0 h-12 w-12 rounded-2xl bg-gradient-to-br from-[var(--landing-accent)] to-[var(--landing-accent-2)] ring-1 ring-white/10 shadow-[0_10px_26px_-16px_rgba(0,82,255,0.55)] grid place-items-center">
        <span className="text-white text-sm font-extrabold">{n}</span>
      </div>
      <div className="min-w-0">
        <div className="text-lg font-extrabold tracking-tight text-white">{title}</div>
        <p className="mt-2 text-sm leading-6 text-slate-200/80">{desc}</p>
      </div>
    </div>

    {!last ? (
      <div aria-hidden="true" className="hidden md:block absolute -right-6 top-1/2 -translate-y-1/2">
        <div className="h-10 w-10 rounded-2xl bg-white/6 ring-1 ring-white/10 grid place-items-center">
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-white/70" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
          </svg>
        </div>
      </div>
    ) : null}
  </div>
);

export default function HowItWorks() {
  return (
    <section id="how" className="container mx-auto max-w-7xl px-4 py-14 sm:py-20">
      <div className="max-w-3xl">
        <SectionLabel>How it works</SectionLabel>
        <h2 className="mt-6 font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-[1.1]">
          From transactions to <span className="bg-gradient-to-r from-[var(--landing-accent)] to-[var(--landing-accent-2)] bg-clip-text text-transparent">confidence</span>.
        </h2>
        <p className="mt-4 text-base sm:text-lg text-slate-200/80 leading-relaxed">
          Add transactions, categorize in seconds, and let the dashboard do the explaining.
        </p>
      </div>

      <div className={cx('mt-10 grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6')}>
        <Step n="01" title="Add or import" desc="Quick entry with categories, notes, and smart defaults. Keep it fast." />
        <Step n="02" title="Track pace + budgets" desc="Understand month-end outcomes early, not after it’s too late." />
        <Step n="03" title="Get insights" desc="Local AI tips highlight patterns, spikes, and savings opportunities." last />
      </div>
    </section>
  );
}

