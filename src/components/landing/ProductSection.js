import React from 'react';
import ProductMock from './ProductMock';
import { SectionLabel } from './ui';

export default function ProductSection() {
  return (
    <section id="product" className="container mx-auto max-w-7xl px-4 py-14 sm:py-20">
      <div className="max-w-3xl">
        <SectionLabel>Product</SectionLabel>
        <h2 className="mt-6 font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-[1.1]">
          A dashboard that feels <span className="bg-gradient-to-r from-[var(--landing-accent)] to-[var(--landing-accent-2)] bg-clip-text text-transparent">premium</span>.
        </h2>
        <p className="mt-4 text-base sm:text-lg text-slate-200/80 leading-relaxed">
          Preview the core surfaces—dashboards, insights, and privacy controls—without leaving the landing page.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        <div data-reveal className="reveal">
          <ProductMock title="Today" subtitle="Pace, budgets, and clarity" variant="dashboard" accent="indigo" className="bg-slate-950/72 shadow-[0_30px_100px_-80px_rgba(0,0,0,0.95)]" />
        </div>
        <div data-reveal className="reveal">
          <ProductMock title="Insights" subtitle="Patterns + opportunities" variant="insights" accent="emerald" className="bg-slate-950/72 shadow-[0_30px_100px_-80px_rgba(0,0,0,0.95)]" />
        </div>
        <div data-reveal className="reveal">
          <ProductMock title="Privacy" subtitle="Mask + secure exports" variant="privacy" accent="amber" className="bg-slate-950/72 shadow-[0_30px_100px_-80px_rgba(0,0,0,0.95)]" />
        </div>
      </div>
    </section>
  );
}

