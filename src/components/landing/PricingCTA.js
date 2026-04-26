import React from 'react';
import { PrimaryButton, SectionLabel, cx } from './ui';

const Tier = ({ title, price, desc, bullets, featured = false }) => (
  <div className={cx(featured ? 'rounded-3xl bg-gradient-to-br from-[var(--landing-accent)] via-[var(--landing-accent-2)] to-[var(--landing-accent)] p-[2px] shadow-[0_18px_56px_-34px_rgba(0,82,255,0.45)]' : '')} data-reveal>
    <div
      className={cx(
        'h-full rounded-3xl bg-white/6 ring-1 ring-white/10 p-6',
        featured ? 'bg-slate-950/55 ring-white/15' : 'shadow-[0_18px_56px_-44px_rgba(0,0,0,0.85)]'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-extrabold text-white">{title}</div>
          <div className="mt-2 text-3xl font-extrabold tracking-tight text-white">{price}</div>
        </div>
        {featured ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 ring-1 ring-white/15 px-3 py-1 text-[11px] font-extrabold text-white">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse-soft" aria-hidden="true" />
            Recommended
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-200/80">{desc}</p>
      <div className="mt-5 space-y-2">
        {bullets.map((b) => (
          <div key={b} className="flex items-start gap-3">
            <span className="mt-1 h-2 w-2 rounded-full bg-[var(--landing-accent)]" aria-hidden="true" />
            <div className="text-sm text-slate-200/80 leading-6">{b}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default function PricingCTA({ onGetStarted }) {
  return (
    <section id="pricing" className="container mx-auto max-w-7xl px-4 py-14 sm:py-20">
      <div className="flex items-end justify-between gap-6 flex-wrap">
        <div className="max-w-3xl">
          <SectionLabel>Pricing</SectionLabel>
          <h2 className="mt-6 font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-[1.1]">
            Simple. Transparent. <span className="bg-gradient-to-r from-[var(--landing-accent)] to-[var(--landing-accent-2)] bg-clip-text text-transparent">Local-first.</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-200/80 leading-relaxed">
            FinVision runs in your browser. Start free, stay private.
          </p>
        </div>
        <div className="w-full sm:w-auto">
          <PrimaryButton as="button" onClick={onGetStarted}>
            Get started
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
            </svg>
          </PrimaryButton>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        <Tier
          title="Starter"
          price="Free"
          desc="Everything you need to get clarity."
          bullets={['Dashboard overview', 'Transactions + categories', 'Budgets + net worth']}
        />
        <Tier
          featured
          title="Pro"
          price="₹0 (Local)"
          desc="The premium feel—without the cloud."
          bullets={['AI insights (local)', 'Forecasting widgets', 'Mask amounts + PIN protection']}
        />
        <Tier
          title="Teams"
          price="Custom"
          desc="For shared workflows and exports."
          bullets={['Role-based exports', 'Custom templates', 'Bulk import support']}
        />
      </div>
    </section>
  );
}

