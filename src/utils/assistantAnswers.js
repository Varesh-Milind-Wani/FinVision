const normalize = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

const looksLikeGreeting = (q) => {
  const s = normalize(q);
  return /^(hi|hello|hey|good (morning|afternoon|evening)|how are you|thanks|thank you)\b/.test(s);
};

const isQuestion = (q) => {
  const s = String(q || '').trim();
  if (!s) return false;
  if (/[?]$/.test(s)) return true;
  return /\b(what|why|how|when|where|which|who|can you|could you|should i|help me|explain)\b/i.test(s);
};

const toDateMs = (iso) => {
  const s = String(iso || '').trim();
  if (!s) return NaN;
  // Expect YYYY-MM-DD; fall back to Date parse.
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return Date.parse(`${s}T00:00:00`);
  return Date.parse(s);
};

const sumTransactions = (transactions, predicate = () => true) => {
  let sum = 0;
  for (const t of transactions || []) {
    if (!predicate(t)) continue;
    sum += Number(t?.amount) || 0;
  }
  return sum;
};

const topExpenseCategory = (transactions, categories) => {
  const totals = new Map();
  for (const t of transactions || []) {
    if (t?.type !== 'expense') continue;
    const cat = String(t?.category || 'other');
    totals.set(cat, (totals.get(cat) || 0) + (Number(t?.amount) || 0));
  }
  let top = null;
  for (const [id, amount] of totals.entries()) {
    if (!top || amount > top.amount) top = { id, amount };
  }
  if (!top) return null;
  const meta = (categories || []).find((c) => c?.id === top.id);
  return { id: top.id, name: meta?.name || top.id, amount: top.amount };
};

const spendLastNDays = (transactions, nDays) => {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime(); // exclusive
  const start = end - Math.max(1, Number(nDays) || 7) * 24 * 60 * 60 * 1000;
  return sumTransactions(transactions, (t) => {
    if (t?.type !== 'expense') return false;
    const ms = toDateMs(t?.date);
    return Number.isFinite(ms) && ms >= start && ms < end;
  });
};

const countByType = (transactions) => {
  let income = 0;
  let expense = 0;
  for (const t of transactions || []) {
    if (t?.type === 'income') income += 1;
    else if (t?.type === 'expense') expense += 1;
  }
  return { income, expense };
};

const formatPct = (n) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return '0%';
  return `${(Math.round(v * 10) / 10).toFixed(1)}%`;
};

const buildClarifyingQuestions = (q) => {
  const s = normalize(q);
  if (/\b(invest|investment|mutual fund|stock|sip|etf)\b/.test(s)) {
    return ['What country are you in (tax rules)?', 'Time horizon (1–3y, 3–7y, 7y+)?', 'Risk level (low/medium/high)?'];
  }
  if (/\b(debt|loan|credit card|emi)\b/.test(s)) {
    return ['What is the APR/interest rate?', 'Minimum monthly payment?', 'Any other debts?'];
  }
  if (/\b(budget|save|saving)\b/.test(s)) {
    return ['What is your monthly income?', 'Fixed expenses (rent/EMI)?', 'Your savings goal and deadline?'];
  }
  return ['What’s your goal?', 'Any constraints (time, budget, risk)?', 'Do you want a quick answer or a step-by-step plan?'];
};

export const buildAssistantAnswer = ({
  text,
  transactions = [],
  categories = [],
  totals = { income: 0, expense: 0, net: 0 },
  formatMoney = (n) => String(n),
}) => {
  const q = String(text || '').trim();
  const qn = normalize(q);

  if (!q) return { text: "Tell me what you'd like help with." };

  if (looksLikeGreeting(q)) {
    return {
      text:
        "Hi! I can:\n" +
        "- add income/expenses from chat (e.g., \"Food-45, Travel-100\", \"Income Salary 50000\")\n" +
        "- summarize your spending/income\n" +
        "- help with budgets, saving plans, debt payoff, and investing basics\n\n" +
        "Ask anything—share your goal and I'll tailor the answer.",
    };
  }

  // App help
  if (/\b(how to|help|use|add|edit|delete|import|export)\b/.test(qn) && /\b(transaction|income|expense|category|data)\b/.test(qn)) {
    return {
      text:
        "In FinVision you can:\n" +
        "- Add via chat: \"Expense Food-45, Travel-100\" or \"Income Salary 50000\"\n" +
        "- Edit right in the chat summary card (Edit → Save)\n" +
        "- Or use Transactions tab for full edit/history\n\n" +
        'Tell me what you want to do (add / edit / import) and I’ll guide step-by-step.',
    };
  }

  // Summary / overview
  if (/\b(summary|overview|report|status)\b/.test(qn)) {
    const counts = countByType(transactions);
    const top = topExpenseCategory(transactions, categories);
    const last7 = spendLastNDays(transactions, 7);
    const saveRate = totals.income > 0 ? (totals.net / totals.income) * 100 : 0;

    return {
      text:
        `Summary\n` +
        `- Income: ${formatMoney(totals.income)}\n` +
        `- Expenses: ${formatMoney(totals.expense)}\n` +
        `- Net: ${formatMoney(totals.net)} (savings rate ~${formatPct(saveRate)})\n` +
        `- Transactions: ${counts.income} incomes, ${counts.expense} expenses\n` +
        `- Last 7 days spend: ${formatMoney(last7)}\n` +
        (top ? `- Top category: ${top.name} (${formatMoney(top.amount)})\n` : '') +
        `\nIf any entry looks wrong, edit it in the chat summary card.`,
    };
  }

  // Top category
  if (/\b(top|highest|most)\b/.test(qn) && /\b(category|spend|expense)\b/.test(qn)) {
    const top = topExpenseCategory(transactions, categories);
    return {
      text: top
        ? `Your top spending category is ${top.name} at about ${formatMoney(top.amount)} (based on saved transactions).`
        : "I don't have enough expense transactions yet to determine a top category.",
    };
  }

  // Budgeting / saving plan
  if (/\b(budget|saving|save more|plan|cut|reduce)\b/.test(qn)) {
    const income = Number(totals.income) || 0;
    const expense = Number(totals.expense) || 0;
    const net = Number(totals.net) || 0;

    const cutSuggestion = Math.round(clamp(expense * 0.08, 50, 500));
    const needs = income > 0 ? income * 0.5 : 0;
    const wants = income > 0 ? income * 0.3 : 0;
    const savings = income > 0 ? income * 0.2 : 0;

    const top = topExpenseCategory(transactions, categories);
    const last7 = spendLastNDays(transactions, 7);

    return {
      text:
        "A practical plan (local estimate):\n" +
        `1) Set a simple target: try saving +${formatMoney(Math.max(0, cutSuggestion))}/month.\n` +
        `2) Use a 50/30/20 baseline (if your income is stable):\n` +
        `   - Needs ~ ${formatMoney(needs)}\n` +
        `   - Wants ~ ${formatMoney(wants)}\n` +
        `   - Savings ~ ${formatMoney(savings)}\n` +
        (top ? `3) Start with your biggest lever: ${top.name} (${formatMoney(top.amount)} total).\n` : '') +
        `4) Quick check: last 7 days spend is ${formatMoney(last7)}.\n` +
        `\nCurrent net balance: ${formatMoney(net)}.\n` +
        "If you tell me your goal amount + deadline, I’ll convert this into a weekly plan.",
    };
  }

  // Investing basics
  if (/\b(invest|investment|sip|mutual fund|etf|stock|bonds?)\b/.test(qn)) {
    const questions = buildClarifyingQuestions(q).map((x) => `- ${x}`).join('\n');
    return {
      text:
        "Investing basics (high level):\n" +
        "1) Build an emergency fund (3–6 months expenses) before taking big risk.\n" +
        "2) Pay off very high-interest debt first (often > 12–15% APR).\n" +
        "3) For long-term goals, diversify (index funds/ETFs are a common default).\n" +
        "4) Automate (SIP) and rebalance occasionally.\n\n" +
        "To make this precise for you:\n" +
        questions,
    };
  }

  // Debt payoff
  if (/\b(debt|loan|emi|credit card|apr|interest rate)\b/.test(qn)) {
    const questions = buildClarifyingQuestions(q).map((x) => `- ${x}`).join('\n');
    return {
      text:
        "Debt payoff strategy:\n" +
        "1) Always pay minimums on everything.\n" +
        "2) Then pick one method:\n" +
        "   - Avalanche: extra payments to highest APR first (cheapest overall)\n" +
        "   - Snowball: extra payments to smallest balance first (fast motivation)\n" +
        "3) Automate payments and avoid new high-APR debt.\n\n" +
        "To calculate the best plan, tell me:\n" +
        questions,
    };
  }

  // Generic fallback (still helpful)
  if (isQuestion(q)) {
    const clarifiers = buildClarifyingQuestions(q).map((x) => `- ${x}`).join('\n');
    return {
      text:
        "I can help with that. Here's what I need to be precise:\n" +
        `${clarifiers}\n\n` +
        "If you want, paste any numbers/constraints and I’ll answer in a detailed step-by-step way.",
    };
  }

  // Non-question text fallback
  return {
    text:
      "Got it. If you want to add a transaction, paste like:\n" +
      '- "Expense Food-45, Travel-100"\n' +
      '- "Income Salary 50000"\n\n' +
      'Or ask a question like "summary", "budget plan", "investing basics", etc.',
  };
};
