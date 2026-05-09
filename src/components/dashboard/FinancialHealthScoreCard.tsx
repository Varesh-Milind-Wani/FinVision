import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useExpenseContext } from '../../contexts/ExpenseContext';

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export default function FinancialHealthScoreCard() {
  const { totalIncome, totalExpenses, netBalance } = useExpenseContext();

  const score = useMemo(() => {
    const income = Number(totalIncome) || 0;
    const expense = Number(totalExpenses) || 0;
    const net = Number(netBalance) || 0;
    const savingsRate = income > 0 ? clamp((income - expense) / income, -0.25, 0.6) : 0;
    const stability = clamp(0.55 + Math.tanh(net / 20000) * 0.25, 0, 1);
    const spending = clamp(1 - expense / Math.max(1, income), 0, 1);
    const raw = (savingsRate * 0.45 + stability * 0.35 + spending * 0.2) * 100;
    return clamp(Math.round(raw), 0, 100);
  }, [netBalance, totalExpenses, totalIncome]);

  const breakdown = useMemo(() => {
    const income = Number(totalIncome) || 0;
    const expense = Number(totalExpenses) || 0;
    const savings = income > 0 ? clamp(((income - expense) / income) * 100, -100, 100) : 0;
    const spending = income > 0 ? clamp((expense / income) * 100, 0, 200) : 0;
    const stability = clamp(50 + Math.tanh((Number(netBalance) || 0) / 20000) * 30, 0, 100);
    return [
      { label: 'Savings', value: Math.round(savings), tone: savings >= 0 ? 'text-emerald-700' : 'text-rose-600' },
      { label: 'Spending', value: Math.round(spending), tone: spending <= 70 ? 'text-emerald-700' : 'text-rose-600' },
      { label: 'Stability', value: Math.round(stability), tone: stability >= 60 ? 'text-emerald-700' : 'text-amber-600' },
    ];
  }, [netBalance, totalExpenses, totalIncome]);

  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    let start = 0;
    const duration = 900;
    const from = display;
    const tick = (ts: number) => {
      if (!start) start = ts;
      const t = clamp((ts - start) / duration, 0, 1);
      const v = from + (score - from) * easeOut(t);
      setDisplay(v);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
    
  }, [score]);

  const pct = Math.round(display);
  const ring = useMemo(() => {
    const size = 132;
    const stroke = 12;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const offset = c * (1 - pct / 100);
    return { size, stroke, r, c, offset };
  }, [pct]);

  return (
    <div className="surface surface-pad-sm surface-pressable">
      <div className="text-xs font-semibold text-slate-700">Financial Health</div>
      <div className="mt-1 text-[11px] text-slate-400">Score & key drivers</div>

      <div className="mt-3 flex items-center gap-4">
        <div className="relative">
          <svg width={ring.size} height={ring.size} viewBox={`0 0 ${ring.size} ${ring.size}`}>
            <defs>
              <linearGradient id="fh-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="60%" stopColor="#60a5fa" />
                <stop offset="100%" stopColor="#a78bfa" />
              </linearGradient>
            </defs>
            <circle cx={ring.size / 2} cy={ring.size / 2} r={ring.r} stroke="rgba(15,23,42,0.08)" strokeWidth={ring.stroke} fill="none" />
            <circle
              cx={ring.size / 2}
              cy={ring.size / 2}
              r={ring.r}
              stroke="url(#fh-gradient)"
              strokeWidth={ring.stroke}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={ring.c}
              strokeDashoffset={ring.offset}
              transform={`rotate(-90 ${ring.size / 2} ${ring.size / 2})`}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              <div className="text-[22px] font-semibold text-slate-900">{pct}</div>
              <div className="text-[11px] text-slate-400 -mt-0.5">/ 100</div>
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="grid grid-cols-3 gap-2">
            {breakdown.map((b) => (
              <div key={b.label} className="rounded-2xl bg-slate-50/60 ring-1 ring-black/[0.04] p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{b.label}</div>
                <div className={`mt-1 text-[14px] font-semibold ${b.tone}`}>{b.value}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
