import React, { useMemo, useState } from 'react';
import { CopyIcon } from './icons';
import { useExpenseContext } from '../../contexts/ExpenseContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import AnimatedKpiValue from './AnimatedKpiValue';

const BalanceCard = () => {
  const { netBalance, getMonthlyData } = useExpenseContext();
  const { formatFromBase } = useCurrency();
  const accounts = useMemo(() => ['6549', '7329', '9821', '2472'], []);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const delta = useMemo(() => {
    const months = (typeof getMonthlyData === 'function' ? getMonthlyData() : []) || [];
    const sorted = months.slice().sort((a: any, b: any) => (a?.ts || 0) - (b?.ts || 0));
    const last = sorted[sorted.length - 1] || null;
    const prev = sorted[sorted.length - 2] || null;
    const lastNet = (Number(last?.income) || 0) - (Number(last?.expense) || 0);
    const prevNet = (Number(prev?.income) || 0) - (Number(prev?.expense) || 0);
    const pct = prevNet !== 0 ? ((lastNet - prevNet) / Math.abs(prevNet)) * 100 : 0;
    return { pct, positive: pct >= 0 };
  }, [getMonthlyData]);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(accounts.join(' '));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 900);
    } catch {
      // ignore
    }
  };

  return (
    <div className="kpi-card">
      <div className="kpi-header">
        <div className="kpi-title">My balance</div>
        {isLoading ? (
          <span className="chip bg-slate-100 text-slate-500 ring-black/5">Loading</span>
        ) : (
          <span className={`chip ${delta.positive ? 'chip-good' : 'chip-bad'}`}>
            {delta.pct >= 0 ? '+' : '-'}
            {Math.abs(delta.pct).toFixed(1)}%
          </span>
        )}
      </div>

      <div className="kpi-value flex items-center min-h-[40px]">
        <AnimatedKpiValue
          value={Number(netBalance) || 0}
          formatValue={formatFromBase}
          delayMs={1000}
          durationMs={7000}
          onPhaseChange={(p) => setIsLoading(p === 'loading')}
        />
      </div>
      <div className="kpi-sub text-slate-500">vs last month</div>

      <div className="mt-3 flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
          {accounts.map((a) => (
            <span key={a} className="tracking-[0.08em]">
              {a}
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={onCopy}
          className="ml-auto inline-flex items-center gap-1 text-[12px] font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
        >
          <CopyIcon className="h-3.5 w-3.5" />
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <div className="mt-auto pt-3 flex items-center gap-2">
        <button
          type="button"
          className={`btn-chip ${
            isLoading
              ? 'bg-slate-100 text-slate-700 ring-black/5 hover:bg-slate-100'
              : 'bg-emerald-50 text-emerald-800 ring-emerald-500/20 hover:bg-emerald-50/80'
          }`}
        >
          Send
        </button>
        <button type="button" className={`btn-chip ${isLoading ? 'bg-slate-100 text-slate-700 ring-black/5 hover:bg-slate-100' : 'bg-white/70 text-slate-700 hover:bg-white'}`}>
          Request
        </button>
      </div>
    </div>
  );
};

export default BalanceCard;
