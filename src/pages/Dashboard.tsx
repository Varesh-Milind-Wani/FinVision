import React from 'react';
import BalanceCard from '../components/dashboard/BalanceCard';
import SummaryCard from '../components/dashboard/SummaryCard';
import DonutSummaryCard from '../components/dashboard/DonutSummaryCard';
import IncomeExpenseLineChart from '../components/dashboard/LineChart';
import ExpensePanel from '../components/dashboard/ExpensePanel';
import RetirementCard from '../components/dashboard/RetirementCard';
import { useExpenseContext } from '../contexts/ExpenseContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useAuth } from '../contexts/AuthContext';
import AIDailyBriefingCard from '../components/dashboard/AIDailyBriefingCard';
import AIForecastCard from '../components/dashboard/AIForecastCard';
import ExpenseExplanationCard from '../components/dashboard/ExpenseExplanationCard';
import BudgetSuggestionsCard from '../components/dashboard/BudgetSuggestionsCard';
import ActivityFeedCard from '../components/dashboard/ActivityFeedCard';
import FinancialHealthScoreCard from '../components/dashboard/FinancialHealthScoreCard';
import ScenarioSimulatorCard from '../components/dashboard/ScenarioSimulatorCard';
import InvestmentSummaryCard from '../components/dashboard/InvestmentSummaryCard';
import { getTimeGreeting } from '../utils/greeting';
import AnimatedKpiValue from '../components/dashboard/AnimatedKpiValue';

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

const buildInvestmentSparkline = (opts: { total: number; investAmount: number; transactions: any[] }) => {
  const safeTotal = Math.max(0, Number.isFinite(opts.total) ? opts.total : 0);
  const safeInvested = Math.max(0, Number.isFinite(opts.investAmount) ? opts.investAmount : 0);
  const tx = Array.isArray(opts.transactions) ? opts.transactions : [];

  if (tx.length === 0 || (safeTotal <= 0 && safeInvested <= 0)) return [0, 0, 0, 0];

  const byDate = new Map<string, number>();
  for (const t of tx) {
    const dateKey = typeof t?.date === 'string' ? t.date : '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) continue;

    const amount = Number(t?.amount);
    if (Number.isFinite(amount) && amount > 0) {
      byDate.set(dateKey, (byDate.get(dateKey) || 0) + amount);
      continue;
    }

    const qty = Number(t?.quantity);
    const entry = Number(t?.entryPrice);
    if (Number.isFinite(qty) && qty > 0 && Number.isFinite(entry) && entry > 0) {
      byDate.set(dateKey, (byDate.get(dateKey) || 0) + qty * entry);
    }
  }

  // Produce a daily time series (length 120) ending today with "step" moves on transaction days.
  const days = 120;
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));

  // Sum flows within window to estimate how much invested existed before the window.
  let windowFlows = 0;
  for (let i = 0; i < days; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    windowFlows += Number(byDate.get(key) || 0);
  }

  const factor = safeInvested > 0 ? safeTotal / safeInvested : 1;
  const priorInvested = Math.max(0, safeInvested - windowFlows);
  let runningInvested = priorInvested;

  const out: number[] = [];
  for (let i = 0; i < days; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    runningInvested += Number(byDate.get(key) || 0);
    out.push(Math.max(0, round2(runningInvested * factor)));
  }

  if (out.length > 0) out[out.length - 1] = safeTotal || out[out.length - 1];
  return out;
};

const buildIncomeTrend = (transactions: any[]) => {
  const tx = Array.isArray(transactions) ? transactions : [];
  const daily = new Map<string, number>();

  const toNum = (v: any) => {
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : NaN;
  };

  for (const t of tx) {
    if (t?.type !== 'income') continue;
    const dateKey = typeof t?.date === 'string' ? t.date : '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) continue;
    const amount = Math.abs(toNum(t?.amount) || 0);
    if (!Number.isFinite(amount) || amount === 0) continue;
    daily.set(dateKey, (daily.get(dateKey) || 0) + amount);
  }

  const maxDays = 1825;
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(end);
  start.setDate(start.getDate() - (maxDays - 1));

  const out: Array<{ ts: number; value: number; delta: number }> = [];
  for (let i = 0; i < maxDays; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const key = `${y}-${m}-${day}`;
    const v = Number(daily.get(key) || 0);
    out.push({ ts: d.getTime(), value: v, delta: v });
  }

  return out;
};

const Dashboard = () => {
  const { transactions, categories, getMonthlyData } = useExpenseContext();
  const { formatFromBase } = useCurrency();
  const { currentUser } = useAuth();
  const kpiDelayMs = 1000;
  const kpiDurationMs = 7000;
  const [incomeLoading, setIncomeLoading] = React.useState(true);

  const firstName = React.useMemo(() => {
    const name = typeof currentUser?.name === 'string' ? currentUser.name.trim() : '';
    return name ? name.split(/\s+/)[0] : 'Varesh';
  }, [currentUser?.name]);

  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    // Keep greeting in sync with local time (updates around hour boundaries).
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const greeting = React.useMemo(() => {
    return getTimeGreeting(now);
  }, [now]);

  const monthCompare = React.useMemo(() => {
    const months = (typeof getMonthlyData === 'function' ? getMonthlyData() : []) || [];
    const sorted = months.slice().sort((a: any, b: any) => (a?.ts || 0) - (b?.ts || 0));
    const last = sorted[sorted.length - 1] || null;
    const prev = sorted[sorted.length - 2] || null;

    const lastIncome = Number(last?.income) || 0;
    const prevIncome = Number(prev?.income) || 0;
    const lastExpense = Number(last?.expense) || 0;
    const prevExpense = Number(prev?.expense) || 0;

    const incomeDeltaPct = prevIncome > 0 ? ((lastIncome - prevIncome) / prevIncome) * 100 : 0;
    const expenseDeltaPct = prevExpense > 0 ? ((lastExpense - prevExpense) / prevExpense) * 100 : 0;

    return {
      lastIncome,
      lastExpense,
      incomeDeltaPct,
      expenseDeltaPct,
    };
  }, [getMonthlyData]);

  const investment = React.useMemo(() => {
    const list = (transactions || []).filter((t: any) => {
      if (t?.type !== 'investment') return false;
      const status = typeof t?.status === 'string' ? t.status.trim().toLowerCase() : '';
      const exit = Number(t?.exitPrice);
      const isClosed = status === 'closed' || (t?.exitPrice != null && Number.isFinite(exit) && exit >= 0);
      return !isClosed;
    });
    if (list.length === 0) {
      return { total: 0, investAmount: 0, spark: buildInvestmentSparkline({ total: 0, investAmount: 0, transactions: [] }) };
    }

    const invested = list.reduce((sum: number, t: any) => {
      const amount = Number(t?.amount);
      if (Number.isFinite(amount) && amount > 0) return sum + amount;
      const qty = Number(t?.quantity);
      const entry = Number(t?.entryPrice);
      if (Number.isFinite(qty) && qty > 0 && Number.isFinite(entry) && entry > 0) return sum + qty * entry;
      return sum;
    }, 0);

    const totalValue = list.reduce((sum: number, t: any) => {
      const qty = Number(t?.quantity);
      const exit = Number(t?.exitPrice);
      if (Number.isFinite(qty) && qty > 0 && Number.isFinite(exit) && exit > 0) return sum + qty * exit;

      const current = Number(t?.currentPrice);
      if (Number.isFinite(qty) && qty > 0 && Number.isFinite(current) && current >= 0) return sum + qty * current;

      const entry = Number(t?.entryPrice);
      if (Number.isFinite(qty) && qty > 0 && Number.isFinite(entry) && entry > 0) return sum + qty * entry;

      const amount = Number(t?.amount);
      if (Number.isFinite(amount) && amount > 0) return sum + amount;
      return sum;
    }, 0);

    const investAmount = round2(invested);
    const total = round2(totalValue);
    const spark = buildInvestmentSparkline({ total, investAmount, transactions: list });
    return { total, investAmount, spark };
  }, [transactions]);

  const aiInsights = React.useMemo(() => {
    const catById = new Map<string, any>();
    for (const c of categories || []) catById.set(c.id, c);
    const totals = new Map<string, number>();
    let weekend = 0;
    let weekday = 0;

    for (const t of transactions || []) {
      if (t?.type !== 'expense') continue;
      const amount = Number(t?.amount) || 0;
      const cat = String(t?.category || 'other');
      totals.set(cat, (totals.get(cat) || 0) + amount);
      const dt = new Date(t?.date);
      const day = dt.getDay();
      if (day === 0 || day === 6) weekend += amount;
      else weekday += amount;
    }

    let top: { id: string; amount: number } | null = null;
    for (const [id, amount] of totals.entries()) if (!top || amount > top.amount) top = { id, amount };
    const topName = top ? (catById.get(top.id)?.name || top.id) : '—';

    const weekendPct = weekend + weekday > 0 ? (weekend / (weekend + weekday)) * 100 : 0;
    const subLike = Array.from(totals.entries()).find(([id]) => String(id).includes('unneeded') || String(id).includes('subscription'));
    const subSave = subLike ? Math.round((subLike[1] || 0) * 0.25) : 0;

    return [
      {
        tone: 'warning',
        label: 'Top category',
        text: top ? `${topName} is your highest spend at ${formatFromBase(top.amount)}.` : 'Add expenses to unlock insights.',
      },
      {
        tone: weekendPct >= 45 ? 'warning' : 'positive',
        label: 'Weekend pattern',
        text: weekendPct > 0 ? `About ${weekendPct.toFixed(0)}% of spend happens on weekends.` : 'No spend pattern detected yet.',
      },
      {
        tone: subSave > 0 ? 'positive' : 'neutral',
        label: 'Subscription saving',
        text: subSave > 0 ? `Potential savings: ${formatFromBase(subSave)}/month by trimming subscriptions.` : 'No subscription spikes detected.',
      },
    ];
  }, [categories, formatFromBase, transactions]);

  const incomeTrend = React.useMemo(() => buildIncomeTrend(transactions as any[]), [transactions]);

  return (
    <div className="min-h-0 bg-transparent">
      <main className="py-6 w-full">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="finvision-fade-in text-[30px] leading-[36px] sm:text-[38px] sm:leading-[46px] font-semibold text-slate-950 tracking-tight">
              {greeting}, {firstName}
            </div>
            <div className="mt-1 text-[13px] sm:text-[14px] text-slate-600">This is your finance report</div>
          </div>
        </div>

        <section className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          <div className="min-w-0">
            <BalanceCard />
          </div>

          <div className="min-w-0">
            <SummaryCard
              title="Monthly income"
              value={
                <AnimatedKpiValue
                  value={monthCompare.lastIncome}
                  formatValue={formatFromBase}
                  delayMs={kpiDelayMs}
                  durationMs={kpiDurationMs}
                  onPhaseChange={(p) => setIncomeLoading(p === 'loading')}
                />
              }
              deltaLabel={`${monthCompare.incomeDeltaPct >= 0 ? '+' : '-'}${Math.abs(monthCompare.incomeDeltaPct).toFixed(1)}% compared to last month`}
              deltaTone={monthCompare.incomeDeltaPct >= 0 ? 'up' : 'down'}
              deltaVariant="badge"
              iconTone="emerald"
              isLoading={incomeLoading}
              emptyRightLabel={null}
              modal={{
                title: 'Income trend',
                subtitle: 'Daily income (sum of income transactions)',
                data: incomeTrend,
                valueFormatter: (n) => formatFromBase(Number(n) || 0),
                valueLabel: 'Income',
              }}
            />
          </div>

          <div className="min-w-0">
            <InvestmentSummaryCard total={investment.total} investAmount={investment.investAmount} series={investment.spark} />
          </div>

          <div className="min-w-0">
            <DonutSummaryCard />
          </div>
        </section>

        <section className="mt-5">
          <AIDailyBriefingCard />
        </section>

        <section className="mt-5">
          <AIForecastCard transactions={transactions as any[]} formatAmount={formatFromBase} />
        </section>

        <section className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          <div className="lg:col-span-9 space-y-4">
            <IncomeExpenseLineChart />
            <ActivityFeedCard />
          </div>

          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white rounded-2xl ring-1 ring-black/[0.06] shadow-[0_8px_24px_-18px_rgba(15,23,42,0.35)] p-4 md:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-slate-700">AI Insights</div>
                  <div className="mt-1 text-[11px] text-slate-400">Local, privacy-first recommendations</div>
                </div>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('finvision:navigate', { detail: { tab: 'insights' } }))}
                  className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  View all
                </button>
              </div>
              <div className="mt-3 space-y-2.5">
                {aiInsights.map((i) => (
                  <div key={i.label} className="flex items-start gap-2">
                    <span
                      className={`mt-1 h-2 w-2 rounded-full ${
                        i.tone === 'positive' ? 'bg-emerald-500' : i.tone === 'warning' ? 'bg-rose-500' : 'bg-slate-400'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold text-slate-700">{i.label}</div>
                      <div className="text-[11px] text-slate-500 leading-5">{i.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <ExpenseExplanationCard />
            <BudgetSuggestionsCard />
            <FinancialHealthScoreCard />
            <ScenarioSimulatorCard />
            <ExpensePanel />
            <RetirementCard />
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
