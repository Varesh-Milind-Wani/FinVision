import React, { useEffect, useMemo, useRef, useState } from 'react';

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const milestonePercents = [25, 50, 75];

const polarToCartesian = (cx, cy, r, angleDeg) => {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
};

export default function GoalTracker({
  goal,
  formatAmount = (value) => String(value),
  masked = false,
  maskedText = '****',
  onEdit,
  onAddSavings,
}) {
  const target = Math.max(0, Number(goal?.target) || 0);
  const saved = clamp(Number(goal?.saved) || 0, 0, Math.max(1, target || 1));
  const monthlySaving = Math.max(0, Number(goal?.monthlySaving) || 0);
  const remaining = Math.max(0, target - saved);
  const progress = target > 0 ? clamp((saved / target) * 100, 0, 100) : 0;
  const percentage = Math.round(progress);
  const etaMonthsRaw = monthlySaving > 0 ? remaining / monthlySaving : null;
  const etaMonths = etaMonthsRaw !== null ? Math.max(0, etaMonthsRaw) : null;
  const etaDays = etaMonths !== null ? Math.max(0, Math.round(etaMonths * 30.4)) : null;
  const suggestionDelta = monthlySaving > 0 && remaining > 0 ? Math.max(500, Math.ceil((monthlySaving * 0.2) / 500) * 500) : 0;
  const fasterMonths = monthlySaving + suggestionDelta > 0 ? remaining / (monthlySaving + suggestionDelta) : null;
  const monthsEarlier = etaMonths !== null && fasterMonths !== null ? Math.max(0, Math.round(etaMonths - fasterMonths)) : 0;

  const [displayProgress, setDisplayProgress] = useState(0);
  const rafRef = useRef(0);

  useEffect(() => {
    let start = 0;
    const duration = 1000;
    const tick = (ts) => {
      if (!start) start = ts;
      const t = clamp((ts - start) / duration, 0, 1);
      setDisplayProgress(progress * easeOutCubic(t));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    setDisplayProgress(0);
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
  }, [progress]);

  const motivation = useMemo(() => {
    if (remaining <= 0) return 'Goal complete. You are ready for the next milestone.';
    if (etaDays !== null && etaDays <= 120) return `At your current pace, you'll reach your goal in ${etaDays} days.`;
    if (monthsEarlier > 0) {
      return `Increase savings by ${formatAmount(suggestionDelta)}/month to reach your goal ${monthsEarlier} month${monthsEarlier > 1 ? 's' : ''} earlier.`;
    }
    if (etaMonths !== null) return `Stay consistent and you'll get there in about ${Math.max(1, Math.round(etaMonths))} months.`;
    return 'Add a monthly savings pace to unlock your forecast.';
  }, [etaDays, etaMonths, formatAmount, monthsEarlier, remaining, suggestionDelta]);

  const ring = useMemo(() => {
    const size = 176;
    const stroke = 14;
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference * (1 - displayProgress / 100);
    return { size, stroke, radius, circumference, dashOffset };
  }, [displayProgress]);

  return (
    <section className="rounded-3xl bg-slate-950/35 ring-1 ring-white/[0.12] p-5 sm:p-6">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] bg-slate-950/20 text-slate-100 ring-1 ring-white/[0.12]">
                <span className="text-xs">📱</span>
                Goal Tracking
              </div>
              <div className="mt-3 text-2xl font-extrabold tracking-tight text-white">{goal?.title || 'Goal'}</div>
              <div className="mt-1 text-sm text-slate-300">
                {masked ? maskedText : `${formatAmount(saved)} / ${formatAmount(target)}`}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-extrabold ring-1 transition-colors bg-slate-950/20 text-slate-100 ring-white/[0.12] hover:bg-slate-950/30"
              >
                Edit Goal
              </button>
              <button
                type="button"
                onClick={onAddSavings}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-extrabold ring-1 transition-colors bg-blue-600 hover:bg-blue-700 text-white ring-blue-500/30"
              >
                Add Savings
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-950/25 ring-1 ring-white/[0.10] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Target</div>
              <div className="mt-2 text-xl font-extrabold text-white">{masked ? maskedText : formatAmount(target)}</div>
            </div>
            <div className="rounded-2xl bg-slate-950/25 ring-1 ring-white/[0.10] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Saved</div>
              <div className="mt-2 text-xl font-extrabold text-emerald-300">{masked ? maskedText : formatAmount(saved)}</div>
            </div>
            <div className="rounded-2xl bg-slate-950/25 ring-1 ring-white/[0.10] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">ETA</div>
              <div className="mt-2 text-xl font-extrabold text-white">
                {etaMonths !== null ? `≈ ${Math.max(1, Math.round(etaMonths))} months` : 'Set pace'}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-slate-950/25 ring-1 ring-white/[0.10] p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">AI Motivation</div>
            <div className="mt-2 text-sm font-semibold leading-6 text-slate-100">{motivation}</div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[300px] shrink-0 xl:mx-0">
          <div className="relative grid place-items-center">
            <svg viewBox={`0 0 ${ring.size} ${ring.size}`} className="h-[220px] w-[220px]">
              <defs>
                <linearGradient id="goal-tracker-ring" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#818cf8" />
                  <stop offset="55%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#22d3ee" />
                </linearGradient>
                <filter id="goal-tracker-glow">
                  <feGaussianBlur stdDeviation="2.8" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <circle
                cx={ring.size / 2}
                cy={ring.size / 2}
                r={ring.radius}
                stroke="rgba(148,163,184,0.18)"
                strokeWidth={ring.stroke}
                fill="none"
              />
              {milestonePercents.map((mark) => {
                const angle = (mark / 100) * 360;
                const point = polarToCartesian(ring.size / 2, ring.size / 2, ring.radius, angle);
                return (
                  <circle
                    key={mark}
                    cx={point.x}
                    cy={point.y}
                    r="4.5"
                    fill={progress >= mark ? '#93c5fd' : 'rgba(100,116,139,0.45)'}
                    stroke="rgba(15,23,42,0.95)"
                    strokeWidth="2"
                  />
                );
              })}
              <circle
                cx={ring.size / 2}
                cy={ring.size / 2}
                r={ring.radius}
                stroke="url(#goal-tracker-ring)"
                strokeWidth={ring.stroke}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={ring.circumference}
                strokeDashoffset={ring.dashOffset}
                transform={`rotate(-90 ${ring.size / 2} ${ring.size / 2})`}
                filter="url(#goal-tracker-glow)"
              />
            </svg>

            <div className="absolute inset-0 grid place-items-center">
              <div className="grid h-[128px] w-[128px] place-items-center rounded-full bg-slate-950/70 ring-1 ring-white/[0.12] shadow-soft">
                <div className="text-center">
                  <div className="text-4xl font-extrabold tracking-tight text-white">{masked ? '--' : `${percentage}%`}</div>
                  <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Completed</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {milestonePercents.map((mark) => (
              <div key={mark} className="rounded-2xl bg-slate-950/25 ring-1 ring-white/[0.10] px-3 py-2.5 text-center">
                <div className={`text-sm font-extrabold ${progress >= mark ? 'text-white' : 'text-slate-400'}`}>{mark}%</div>
                <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Milestone</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
