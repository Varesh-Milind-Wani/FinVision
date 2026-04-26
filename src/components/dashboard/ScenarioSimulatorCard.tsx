import React, { useMemo, useState } from 'react';
import { useExpenseContext } from '../../contexts/ExpenseContext';
import { useCurrency } from '../../contexts/CurrencyContext';

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export default function ScenarioSimulatorCard() {
  const { netBalance } = useExpenseContext();
  const { formatFromBase } = useCurrency();
  const [monthly, setMonthly] = useState(5000);

  const projection = useMemo(() => {
    const base = Number(netBalance) || 0;
    const m = clamp(Number(monthly) || 0, 0, 50000);
    const year = base + m * 12;
    const six = base + m * 6;
    return { six, year };
  }, [monthly, netBalance]);

  return (
    <div className="surface surface-pad-sm surface-pressable">
      <div className="text-xs font-semibold text-slate-700">Scenario simulator</div>
      <div className="mt-1 text-[11px] text-slate-400">What if you save more each month?</div>

      <div className="mt-3 rounded-2xl bg-slate-50/60 ring-1 ring-black/[0.04] p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[12px] font-semibold text-slate-700">Extra savings / month</div>
          <div className="text-[12px] font-semibold text-slate-900">{formatFromBase(monthly)}</div>
        </div>
        <input
          type="range"
          min={0}
          max={50000}
          step={500}
          value={monthly}
          onChange={(e) => setMonthly(Number(e.target.value))}
          className="mt-3 w-full accent-emerald-600"
          aria-label="Monthly savings slider"
        />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-white ring-1 ring-black/[0.06] p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">6 months</div>
            <div className="mt-1 text-[14px] font-semibold text-slate-900">{formatFromBase(projection.six)}</div>
          </div>
          <div className="rounded-2xl bg-white ring-1 ring-black/[0.06] p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">12 months</div>
            <div className="mt-1 text-[14px] font-semibold text-slate-900">{formatFromBase(projection.year)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
