import React, { useEffect, useState } from 'react';

export const cx = (...xs) => xs.filter(Boolean).join(' ');

export const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(!!mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);

  return reduced;
};

export const useRevealOnScroll = (enabled = true) => {
  useEffect(() => {
    if (!enabled) return undefined;
    if (typeof window === 'undefined') return undefined;

    const nodes = Array.from(document.querySelectorAll('[data-reveal]'));
    if (nodes.length === 0) return undefined;

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add('reveal-in');
          obs.unobserve(e.target);
        });
      },
      { root: null, rootMargin: '0px 0px -10% 0px', threshold: 0.12 }
    );

    nodes.forEach((n) => obs.observe(n));
    return () => obs.disconnect();
  }, [enabled]);
};

export const GradientOrb = ({ className = '', style }) => (
  <div aria-hidden="true" className={cx('pointer-events-none absolute rounded-full blur-3xl opacity-60', className)} style={style} />
);

export const SectionLabel = ({ children, className = '', dot = true }) => (
  <div
    className={cx(
      'inline-flex items-center gap-3 rounded-full border border-white/12 bg-white/6 px-5 py-2',
      'shadow-[0_10px_28px_-22px_rgba(0,0,0,0.65)]',
      className
    )}
  >
    {dot ? <span className="h-2 w-2 rounded-full bg-[var(--landing-accent)] animate-pulse-soft" aria-hidden="true" /> : null}
    <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-white/80">{children}</span>
  </div>
);

export const Pill = ({ children, tone = 'neutral', className = '' }) => {
  const toneCls =
    tone === 'good'
      ? 'bg-emerald-500/10 text-emerald-200 ring-emerald-400/20'
    : tone === 'warn'
        ? 'bg-amber-500/10 text-amber-100 ring-amber-400/25'
        : 'bg-white/8 text-slate-100 ring-white/10';

  return (
    <span className={cx('inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-extrabold ring-1', toneCls, className)}>
      {children}
    </span>
  );
};

export const PrimaryButton = ({ children, onClick, className = '', as = 'button', href, type = 'button' }) => {
  const Comp = as;
  return (
    <Comp
      href={href}
      type={as === 'button' ? type : undefined}
      onClick={onClick}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-extrabold tracking-tight',
        'bg-gradient-to-r from-[var(--landing-accent)] to-[var(--landing-accent-2)] text-white shadow-[0_8px_24px_rgba(0,82,255,0.28)] ring-1 ring-white/10',
        'hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-200 ease-out',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--landing-accent)]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
        className
      )}
    >
      {children}
    </Comp>
  );
};

export const SecondaryButton = ({ children, onClick, className = '', as = 'button', href, type = 'button' }) => {
  const Comp = as;
  return (
    <Comp
      href={href}
      type={as === 'button' ? type : undefined}
      onClick={onClick}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-extrabold tracking-tight',
        'bg-white/10 text-white ring-1 ring-white/15 shadow-[0_8px_22px_rgba(0,0,0,0.25)]',
        'hover:bg-white/14 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-200 ease-out',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/35 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
        className
      )}
    >
      {children}
    </Comp>
  );
};

export const GlassButton = ({ children, onClick, className = '', as = 'button', href, type = 'button' }) => {
  const Comp = as;
  return (
    <Comp
      href={href}
      type={as === 'button' ? type : undefined}
      onClick={onClick}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-extrabold',
        'bg-white/8 ring-1 ring-white/12 text-white/90 backdrop-blur-xl supports-[backdrop-filter]:backdrop-saturate-150',
        'hover:bg-white/12 hover:text-white transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
        className
      )}
    >
      {children}
    </Comp>
  );
};

export const CheckItem = ({ children }) => (
  <div className="flex items-start gap-3">
    <span className="mt-0.5 h-6 w-6 rounded-xl bg-emerald-400/15 ring-1 ring-emerald-300/20 grid place-items-center shrink-0">
      <svg viewBox="0 0 24 24" className="h-4 w-4 text-emerald-200" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </span>
    <div className="text-sm text-slate-200/85 leading-relaxed">{children}</div>
  </div>
);
