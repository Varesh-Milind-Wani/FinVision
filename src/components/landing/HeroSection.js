import React from 'react';
import ProductMock from './ProductMock';
import { Pill, PrimaryButton, SecondaryButton, SectionLabel, cx } from './ui';

const Stat = ({ k, v }) => (
  <div className="rounded-3xl bg-white/6 ring-1 ring-white/10 p-4">
    <div className="text-[11px] font-semibold text-slate-200/70">{k}</div>
    <div className="mt-1 font-display text-xl font-extrabold tracking-tight text-white">{v}</div>
  </div>
);

export default function HeroSection({ onGetStarted, onExplore, reducedMotion = false }) {
  return (
    <section id="top" className="container mx-auto max-w-7xl px-4 pt-10 sm:pt-14 pb-14 sm:pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
        <div data-reveal className="reveal">
          <SectionLabel>Private by design · Built for speed</SectionLabel>

          <h1 className="mt-6 font-display text-[2.75rem] leading-[1.05] sm:text-6xl font-extrabold tracking-tight text-white">
            Know where your money goes —
            <span className="block bg-gradient-to-r from-[var(--landing-accent)] to-[var(--landing-accent-2)] bg-clip-text text-transparent">
              instantly, every day.
            </span>
          </h1>

          <p className="mt-5 text-base sm:text-lg text-slate-200/85 leading-relaxed max-w-xl">
            FinVision turns raw transactions into clean budgets, trends, net worth, and AI insights — with a dashboard that feels like a premium product.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <PrimaryButton as="button" onClick={onGetStarted}>
              Get started free
            </PrimaryButton>
            <SecondaryButton as="button" onClick={onExplore}>
              View demo
            </SecondaryButton>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-2">
            <Pill tone="good">Smart expense tracking</Pill>
            <Pill tone="good">Budget automation</Pill>
            <Pill tone="good">Net worth</Pill>
            <Pill tone="warn">AI insights</Pill>
            <Pill>Email alerts</Pill>
          </div>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Stat k="Time saved" v="10+ hrs/month" />
            <Stat k="Setup" v="2 minutes" />
            <Stat k="Reports" v="Monthly + email" />
          </div>
        </div>

        <div data-reveal className="reveal">
          <div className="relative">
            <div
              aria-hidden="true"
              className={cx(
                'absolute -top-10 -right-10 h-32 w-32 rounded-full border border-white/10',
                'before:absolute before:inset-0 before:rounded-full before:border before:border-dashed before:border-white/25',
                reducedMotion ? '' : 'animate-ring-slow'
              )}
            />

            <div
              className={cx(
                'relative rounded-[42px] bg-white/[0.92] text-slate-900 ring-1 ring-black/10 shadow-[0_30px_120px_rgba(0,0,0,0.35)] overflow-hidden',
                reducedMotion ? '' : 'animate-float-a'
              )}
            >
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-white to-slate-50" />
              <div
                aria-hidden="true"
                className="absolute inset-0 opacity-[0.16]"
                style={{
                  backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(15, 23, 42, 0.14) 1px, transparent 0)',
                  backgroundSize: '26px 26px',
                }}
              />

              <div className="relative p-5 sm:p-7">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[var(--landing-accent)] to-[var(--landing-accent-2)] grid place-items-center text-white font-extrabold shadow-[0_10px_26px_rgba(0,82,255,0.30)]">
                      FV
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-extrabold text-slate-900 truncate">FinVision</div>
                      <div className="text-[11px] text-slate-500 truncate">Dashboard preview (interactive feel)</div>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-[11px] font-semibold text-slate-600">Private mode ready</span>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4">
                  <ProductMock title="Today" subtitle="Pace, budgets, and clarity" variant="dashboard" accent="indigo" className="bg-slate-950/90" />
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Private by design
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-indigo-500" />
                    No ads · No tracking
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-sky-500" />
                    Monthly reports
                  </div>
                </div>
              </div>
            </div>

            <div
              aria-hidden="true"
              className={cx(
                'absolute -bottom-8 -left-8 hidden lg:block h-32 w-32 rounded-3xl',
                'bg-gradient-to-br from-[var(--landing-accent)]/20 to-transparent ring-1 ring-white/10',
                reducedMotion ? '' : 'animate-float-b'
              )}
            />

            <div aria-hidden="true" className="absolute -right-10 bottom-10 hidden xl:grid grid-cols-3 gap-2">
              {Array.from({ length: 9 }).map((_, i) => (
                <span key={i} className="h-2 w-2 rounded-full bg-white/20" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

