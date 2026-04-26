import React, { useCallback, useMemo, useState } from 'react';
import { useExpenseContext } from '../contexts/ExpenseContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useAmountsVisibility } from '../contexts/AmountsVisibilityContext';
import GoalTracker from './GoalTracker';

const STORAGE_KEY = 'finvision.goals.v1';

const safeParse = (raw) => {
  try {
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const normalizeGoal = (g) => {
  const title = typeof g?.title === 'string' ? g.title : 'Goal';
  return {
    id: String(g?.id || `goal_${Math.random().toString(16).slice(2)}`),
    title,
    target: Number.isFinite(Number(g?.target)) ? Number(g.target) : 0,
    saved: Number.isFinite(Number(g?.saved)) ? Number(g.saved) : 0,
    monthlySaving: Number.isFinite(Number(g?.monthlySaving)) ? Number(g.monthlySaving) : 0,
  };
};

export default function Goals() {
  const { dashboardPrefs } = useExpenseContext();
  const { formatFromBase } = useCurrency();
  const { amountsHidden } = useAmountsVisibility();

  const [goals, setGoals] = useState(() => {
    const stored = safeParse(window.localStorage?.getItem?.(STORAGE_KEY));
    if (stored?.length) return stored.map(normalizeGoal);
    return [
      {
        id: 'trip_goal',
        title: 'Trip Goal',
        target: 5000,
        saved: 3000,
        monthlySaving: 500,
      },
    ].map(normalizeGoal);
  });

  const persist = useCallback((next) => {
    setGoals(next);
    try {
      window.localStorage?.setItem?.(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  const primary = goals[0];

  const formatAmount = useCallback(
    (value) => {
      const n = Number(value) || 0;
      return formatFromBase(n);
    },
    [formatFromBase]
  );

  const monthlyRecommendation = useMemo(() => {
    const saved = Number(primary?.saved) || 0;
    const target = Number(primary?.target) || 0;
    if (!target) return 'Set a target amount to unlock recommendations.';
    const remaining = Math.max(0, target - saved);
    const horizonMonths = Math.max(1, Number(dashboardPrefs?.forecastWindowMonths) || 6);
    const suggested = Math.ceil((remaining / horizonMonths) * 10) / 10;
    if (!Number.isFinite(suggested) || suggested <= 0) return 'You are fully funded. Create a new goal.';
    return `Recommended pace: ${formatAmount(suggested)}/month for the next ${horizonMonths} months.`;
  }, [dashboardPrefs?.forecastWindowMonths, formatAmount, primary?.saved, primary?.target]);

  return (
    <div className="p-5 sm:p-6">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2">
          <GoalTracker
            goal={primary}
            masked={!!amountsHidden}
            formatAmount={formatAmount}
            onEdit={() => {
              const title = window.prompt('Goal name', primary?.title || 'Goal');
              if (title === null) return;
              const target = window.prompt('Target amount', String(primary?.target ?? 0));
              if (target === null) return;
              const monthlySaving = window.prompt('Monthly saving pace', String(primary?.monthlySaving ?? 0));
              if (monthlySaving === null) return;
              const next = goals.map((g) =>
                g.id === primary.id
                  ? normalizeGoal({ ...g, title, target: Number(target), monthlySaving: Number(monthlySaving) })
                  : g
              );
              persist(next);
            }}
            onAddSavings={() => {
              const add = window.prompt('Add savings amount', '100');
              if (add === null) return;
              const delta = Math.max(0, Number(add) || 0);
              const next = goals.map((g) => (g.id === primary.id ? normalizeGoal({ ...g, saved: (Number(g.saved) || 0) + delta }) : g));
              persist(next);
            }}
          />
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl bg-white/80 dark:bg-slate-950/35 ring-1 ring-black/5 dark:ring-white/[0.12] p-5">
            <div className="text-xs font-extrabold tracking-wide text-slate-700 dark:text-slate-200 uppercase">
              Monthly Recommendation
            </div>
            <div className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-6">{monthlyRecommendation}</div>
          </div>

          <div className="rounded-2xl bg-white/80 dark:bg-slate-950/35 ring-1 ring-black/5 dark:ring-white/[0.12] p-5">
            <div className="text-xs font-extrabold tracking-wide text-slate-700 dark:text-slate-200 uppercase">More Goals</div>
            <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Add more goals when you’re ready — this page is built to scale without clutter.
            </div>
            <button
              type="button"
              onClick={() => {
                const title = window.prompt('Goal name', 'New Goal');
                if (!title) return;
                const target = window.prompt('Target amount', '1000');
                if (target === null) return;
                const monthlySaving = window.prompt('Monthly saving pace', '100');
                if (monthlySaving === null) return;
                persist([...goals, normalizeGoal({ title, target: Number(target), monthlySaving: Number(monthlySaving), saved: 0 })]);
              }}
              className="mt-4 inline-flex items-center justify-center w-full px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-extrabold shadow-soft ring-1 ring-blue-500/30"
            >
              Add Goal
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
