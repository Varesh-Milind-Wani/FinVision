import React from 'react';
import { SectionLabel, cx } from './ui';

const FeatureCard = ({ title, desc, icon, tone = 'blue', wide = false }) => {
  const grad =
    tone === 'emerald'
      ? 'from-emerald-500 to-cyan-400'
      : tone === 'amber'
        ? 'from-amber-400 to-rose-400'
        : 'from-[var(--landing-accent)] to-[var(--landing-accent-2)]';

  return (
    <div
      className={cx(
        'group relative rounded-3xl bg-white/6 ring-1 ring-white/10 p-6 overflow-hidden',
        'shadow-[0_18px_56px_-44px_rgba(0,0,0,0.85)]',
        wide ? 'lg:col-span-2' : ''
      )}
      data-reveal
    >
      <div aria-hidden="true" className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
      </div>
      <div className="relative flex items-start gap-4">
        <div className={cx('h-12 w-12 rounded-2xl bg-gradient-to-br shadow-[0_10px_26px_-16px_rgba(0,82,255,0.55)] ring-1 ring-white/10 grid place-items-center', grad)}>
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-lg font-extrabold tracking-tight text-white">{title}</div>
          <p className="mt-2 text-sm leading-6 text-slate-200/80 max-w-[52ch]">{desc}</p>
        </div>
      </div>
    </div>
  );
};

export default function FeaturesBento() {
  return (
    <section id="features" className="container mx-auto max-w-7xl px-4 py-14 sm:py-20">
      <div className="max-w-3xl">
        <SectionLabel>Features</SectionLabel>
        <h2 className="mt-6 font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-[1.1]">
          Minimal controls. <span className="bg-gradient-to-r from-[var(--landing-accent)] to-[var(--landing-accent-2)] bg-clip-text text-transparent">Maximum clarity.</span>
        </h2>
        <p className="mt-4 text-base sm:text-lg text-slate-200/80 leading-relaxed">
          Everything is built to feel premium: sharp typography, generous spacing, and analytics that explain “why”, not just “what”.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-5">
        <FeatureCard
          wide
          tone="blue"
          title="Instant dashboard overview"
          desc="Track income, expenses, pace, and budget health in one glance—no clutter, no noise."
          icon={
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V5m6 14V9m6 10V7m6 12V11" />
            </svg>
          }
        />
        <FeatureCard
          tone="emerald"
          title="Private-first by default"
          desc="All of your data stays in your browser. No ads. No tracking. Just focus."
          icon={
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c1.657 0 3-1.343 3-3S13.657 5 12 5 9 6.343 9 8s1.343 3 3 3z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 20a7 7 0 0114 0" />
            </svg>
          }
        />
        <FeatureCard
          tone="amber"
          title="AI insights that make sense"
          desc="Local recommendations highlight patterns, spikes, and opportunities without sending data anywhere."
          icon={
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364l-1.414 1.414M7.05 16.95l-1.414 1.414m12.728 0l-1.414-1.414M7.05 7.05L5.636 5.636" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12a3 3 0 106 0 3 3 0 00-6 0z" />
            </svg>
          }
        />
      </div>
    </section>
  );
}

