import React, { useMemo } from 'react';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useExpenseContext } from '../../contexts/ExpenseContext';
import { useCurrency } from '../../contexts/CurrencyContext';

const CustomTooltip = ({ active, payload }: any) => {
  const { formatFromBase } = useCurrency();
  if (!active || !payload?.length) return null;
  const value = payload[0].value;
  const date = payload[0].payload.m;
  
  return (
    <div className="rounded-xl bg-white dark:bg-slate-900 px-4 py-3 ring-1 ring-black/[0.08] dark:ring-white/10 shadow-lg">
      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">{date}</div>
      <div className="flex items-center gap-2 text-[13px] font-extrabold text-slate-900 dark:text-white">
        <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
        {formatFromBase(Number(value || 0))}
      </div>
    </div>
  );
};

const NetWorthTrendWidget = () => {
  const { getMonthlyData } = useExpenseContext() as any;
  const { formatFromBase } = useCurrency();

  const { data, currentValue, deltaPct, isUp } = useMemo(() => {
    const months = (typeof getMonthlyData === 'function' ? getMonthlyData() : []) || [];
    
    // Calculate a mock net worth by accumulating income - expense over time
    // In a real app, this would come from the backend or a dedicated context
    let runningNetWorth = 50000; // Starting baseline
    
    const sorted = months
      .slice()
      .sort((a: any, b: any) => (a?.ts || 0) - (b?.ts || 0));
      
    const chartData = sorted.map((m: any) => {
      const net = (Number(m?.income) || 0) - (Number(m?.expense) || 0);
      runningNetWorth += net;
      return {
        m: typeof m?.label === 'string' && m.label ? m.label.split(' ')[0].substring(0, 3) : '—',
        value: runningNetWorth,
      };
    }).slice(-6); // Last 6 months

    if (chartData.length === 0) {
      chartData.push({ m: 'Jan', value: 50000 });
      chartData.push({ m: 'Feb', value: 52000 });
      chartData.push({ m: 'Mar', value: 51000 });
    }

    const current = chartData[chartData.length - 1]?.value || 0;
    const prev = chartData.length > 1 ? chartData[chartData.length - 2]?.value : current;
    
    const delta = prev > 0 ? ((current - prev) / prev) * 100 : 0;
    
    return { 
      data: chartData, 
      currentValue: current,
      deltaPct: delta,
      isUp: delta >= 0
    };
  }, [getMonthlyData]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[24px] p-5 md:p-6 shadow-soft ring-1 ring-slate-200/50 dark:ring-white/10 h-full flex flex-col group overflow-hidden relative">
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div>
          <div className="font-display text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Net Worth</div>
          <div className="mt-1 flex items-center gap-2">
            <span className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight tabular-nums">
              {formatFromBase(currentValue)}
            </span>
            <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold ${isUp ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
              {isUp ? '+' : ''}{deltaPct.toFixed(1)}%
            </span>
          </div>
        </div>
        <div className="h-10 w-10 rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 grid place-items-center ring-1 ring-blue-500/10 transition-transform duration-300 group-hover:scale-110">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </div>
      </div>

      <div className="mt-4 flex-1 min-h-[200px] -mx-5 md:-mx-6 -mb-5 md:-mb-6 relative z-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 20, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="m" hide />
            <YAxis hide domain={['dataMin - 5000', 'dataMax + 5000']} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(59,130,246,0.2)', strokeWidth: 2, strokeDasharray: '4 4' }} />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke="#3b82f6" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorNetWorth)" 
              activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 3 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default NetWorthTrendWidget;
