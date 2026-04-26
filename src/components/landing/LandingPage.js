import React, { useEffect, useMemo, useRef, useState } from 'react';
import LandingHeader from './LandingHeader';
import HeroSection from './HeroSection';
import ProductSection from './ProductSection';
import FeaturesBento from './FeaturesBento';
import HowItWorks from './HowItWorks';
import PricingCTA from './PricingCTA';
import FinalCTA from './FinalCTA';
import LandingFooter from './LandingFooter';
import { cx, GradientOrb, usePrefersReducedMotion, useRevealOnScroll } from './ui';

export default function LandingPage({ onGetStarted }) {
  const reducedMotion = usePrefersReducedMotion();
  useRevealOnScroll(!reducedMotion);

  const scrollRef = useRef(null);
  const [scrollPct, setScrollPct] = useState(0);

  const links = useMemo(
    () => [
      { id: 'product', label: 'Product' },
      { id: 'features', label: 'Features' },
      { id: 'how', label: 'How it works' },
      { id: 'security', label: 'Security' },
      { id: 'pricing', label: 'Pricing' },
    ],
    []
  );

  useEffect(() => {
    document.documentElement.classList.add('landing-root-lock');
    document.body.classList.add('landing-root-lock');
    return () => {
      document.documentElement.classList.remove('landing-root-lock');
      document.body.classList.remove('landing-root-lock');
    };
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const onScroll = () => {
      const denom = Math.max(1, el.scrollHeight - el.clientHeight);
      setScrollPct(el.scrollTop / denom);
    };
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id) => {
    const el = scrollRef.current;
    if (!el) return;
    if (id === 'top') {
      el.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }
    const node = el.querySelector(`#${id}`);
    if (!node) return;
    node.scrollIntoView({ behavior: 'auto', block: 'start' });
  };

  return (
    <div className="landing-theme relative overflow-x-hidden bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-white">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
        <div
          className={cx('absolute inset-0 opacity-[0.08]')}
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(148, 163, 184, 0.65) 1px, transparent 0)',
            backgroundSize: '22px 22px',
          }}
        />
        <GradientOrb className="parallax-orb-a h-[34rem] w-[34rem] -top-36 -left-44 bg-gradient-to-br from-[var(--landing-accent)]/30 to-[var(--landing-accent-2)]/15" />
        <GradientOrb className="parallax-orb-b h-[38rem] w-[38rem] top-16 -right-52 bg-gradient-to-br from-emerald-400/20 to-cyan-400/14" />
        <GradientOrb className="parallax-orb-c h-[28rem] w-[28rem] bottom-0 left-1/3 bg-gradient-to-br from-amber-400/14 to-rose-400/10" />
        <div className={cx('absolute inset-0 opacity-60', 'animate-aurora')} />
      </div>

      <LandingHeader
        links={links}
        onNav={scrollTo}
        onGetStarted={onGetStarted}
        onViewDemo={() => scrollTo('product')}
        scrollPct={scrollPct}
        reducedMotion={reducedMotion}
      />

      <div
        ref={scrollRef}
        className="landing-scroll-container"
        style={{ paddingTop: 'calc(5rem + var(--safe-area-inset-top))' }}
      >
        <main>
          <HeroSection onGetStarted={onGetStarted} onExplore={() => scrollTo('product')} reducedMotion={reducedMotion} />
          <ProductSection />
          <FeaturesBento />
          <HowItWorks />
          <PricingCTA onGetStarted={onGetStarted} />
          <FinalCTA onGetStarted={onGetStarted} onNav={scrollTo} />
          <LandingFooter />
        </main>
      </div>

      <style>
        {`
          :root { --mx: 0; --my: 0; }
          .parallax-orb-a { transform: translate3d(calc(var(--mx) * 14px), calc(var(--my) * 10px), 0); }
          .parallax-orb-b { transform: translate3d(calc(var(--mx) * -18px), calc(var(--my) * 12px), 0); }
          .parallax-orb-c { transform: translate3d(calc(var(--mx) * 10px), calc(var(--my) * -14px), 0); }

          .reveal { opacity: 0; transform: translateY(10px); }
          .reveal-in { opacity: 1; transform: translateY(0); transition: opacity 520ms cubic-bezier(.2,.9,.2,1), transform 520ms cubic-bezier(.2,.9,.2,1); }
          @media (prefers-reduced-motion: reduce) { .reveal { opacity: 1; transform: none; } }

          @keyframes pulseSoft {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.25); opacity: 0.7; }
          }
          .animate-pulse-soft { animation: pulseSoft 2.2s ease-in-out infinite; }

          @keyframes ringSlow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .animate-ring-slow { animation: ringSlow 70s linear infinite; }

          @keyframes floatA {
            0%, 100% { transform: translate3d(0, 0, 0); }
            50% { transform: translate3d(0, -10px, 0); }
          }
          @keyframes floatB {
            0%, 100% { transform: translate3d(0, 0, 0); }
            50% { transform: translate3d(0, 12px, 0); }
          }
          .animate-float-a { animation: floatA 5.4s ease-in-out infinite; }
          .animate-float-b { animation: floatB 4.6s ease-in-out infinite; }
          @media (prefers-reduced-motion: reduce) {
            .animate-ring-slow, .animate-float-a, .animate-float-b, .animate-pulse-soft { animation: none !important; }
          }

          .animate-aurora {
            background:
              radial-gradient(1200px 700px at 20% 10%, rgba(0,82,255,0.11), transparent 60%),
              radial-gradient(1100px 650px at 80% 20%, rgba(77,124,255,0.10), transparent 60%),
              radial-gradient(900px 600px at 50% 90%, rgba(52,211,153,0.08), transparent 60%);
          }
        `}
      </style>
    </div>
  );
}
