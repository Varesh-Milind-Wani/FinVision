const normalize = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\u2010-\u2015]/g, '-') // unicode dashes -> hyphen
    .replace(/[^a-z0-9\s:+\-./,]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const stripDiacritics = (value) => {
  try {
    return String(value || '')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '');
  } catch {
    return String(value || '');
  }
};

const pad2 = (n) => String(n).padStart(2, '0');

const toIsoDate = (date) => {
  try {
    const d = date instanceof Date ? date : new Date(date);
    if (!Number.isFinite(d.getTime())) return null;
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  } catch {
    return null;
  }
};

const MONTHS = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

const parseAmountToken = (raw) => {
  const token = String(raw || '').trim();
  if (!token) return null;

  const cleaned = token.replace(/[₹$€£¥,\s]/g, '').toLowerCase();
  const m = cleaned.match(/^([+-]?\d+(?:\.\d+)?)([km])?$/);
  if (!m) return null;

  let n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  const suffix = m[2];
  if (suffix === 'k') n *= 1000;
  if (suffix === 'm') n *= 1000000;
  return n;
};

const extractAmount = (text) => {
  const s = String(text || '');
  // pick last numeric token (handles "Food -45" and "Salary: 50,000 INR")
  const re = /([+-]?\s*(?:₹|\$|€|£|¥)?\s*(?:\d{1,3}(?:,\d{3})*|\d+)(?:\.\d+)?\s*(?:[kKmM])?)/g;
  let match = null;
  let last = null;
  while ((match = re.exec(s))) last = match;
  if (!last) return { amount: null, rest: s };

  const rawToken = last[1];
  const parsed = parseAmountToken(rawToken);
  if (!Number.isFinite(parsed)) return { amount: null, rest: s };

  const before = s.slice(0, last.index);
  const after = s.slice(last.index + rawToken.length);
  const rest = `${before} ${after}`.replace(/\s+/g, ' ').trim();
  return { amount: parsed, rest };
};

const extractDate = (text, now = new Date()) => {
  const s = String(text || '');
  const lowered = normalize(s);
  if (!lowered) return { date: null, rest: s };

  const today = toIsoDate(now);
  const yesterday = toIsoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));

  if (/\btoday\b/.test(lowered)) {
    return { date: today, rest: s.replace(/today/gi, '').replace(/\s+/g, ' ').trim() };
  }
  if (/\byesterday\b/.test(lowered)) {
    return { date: yesterday, rest: s.replace(/yesterday/gi, '').replace(/\s+/g, ' ').trim() };
  }

  const isoMatch = s.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoMatch) {
    const iso = `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    return { date: iso, rest: s.replace(isoMatch[0], '').replace(/\s+/g, ' ').trim() };
  }

  const dmyMatch = s.match(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\b/);
  if (dmyMatch) {
    const dd = Number(dmyMatch[1]);
    const mm = Number(dmyMatch[2]);
    const yyyy = Number(dmyMatch[3]);
    if (yyyy >= 1900 && yyyy <= 2200 && mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
      const dt = new Date(Date.UTC(yyyy, mm - 1, dd));
      const ok =
        Number.isFinite(dt.getTime()) &&
        dt.getUTCFullYear() === yyyy &&
        dt.getUTCMonth() === mm - 1 &&
        dt.getUTCDate() === dd;
      if (ok) {
        const iso = `${yyyy}-${pad2(mm)}-${pad2(dd)}`;
        return { date: iso, rest: s.replace(dmyMatch[0], '').replace(/\s+/g, ' ').trim() };
      }
    }
  }

  // Month name dates: "30 June", "30 Jun 2026", "June 30", "June 30, 2026"
  const monthName = Object.keys(MONTHS).join('|');
  const dMonY = s.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${monthName})(?:\\s+(\\d{2,4}))?\\b`, 'i'));
  if (dMonY) {
    const dd = Number(dMonY[1]);
    const mm = MONTHS[String(dMonY[2] || '').toLowerCase()] || 0;
    let yyyy = dMonY[3] ? Number(dMonY[3]) : now.getFullYear();
    if (yyyy < 100) yyyy += 2000;
    if (yyyy >= 1900 && yyyy <= 2200 && mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
      const dt = new Date(Date.UTC(yyyy, mm - 1, dd));
      const ok =
        Number.isFinite(dt.getTime()) &&
        dt.getUTCFullYear() === yyyy &&
        dt.getUTCMonth() === mm - 1 &&
        dt.getUTCDate() === dd;
      if (ok) {
        const iso = `${yyyy}-${pad2(mm)}-${pad2(dd)}`;
        return { date: iso, rest: s.replace(dMonY[0], '').replace(/\s+/g, ' ').trim() };
      }
    }
  }

  const monDCommaY = s.match(new RegExp(`\\b(${monthName})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:\\s*,?\\s*(\\d{2,4}))?\\b`, 'i'));
  if (monDCommaY) {
    const mm = MONTHS[String(monDCommaY[1] || '').toLowerCase()] || 0;
    const dd = Number(monDCommaY[2]);
    let yyyy = monDCommaY[3] ? Number(monDCommaY[3]) : now.getFullYear();
    if (yyyy < 100) yyyy += 2000;
    if (yyyy >= 1900 && yyyy <= 2200 && mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
      const dt = new Date(Date.UTC(yyyy, mm - 1, dd));
      const ok =
        Number.isFinite(dt.getTime()) &&
        dt.getUTCFullYear() === yyyy &&
        dt.getUTCMonth() === mm - 1 &&
        dt.getUTCDate() === dd;
      if (ok) {
        const iso = `${yyyy}-${pad2(mm)}-${pad2(dd)}`;
        return { date: iso, rest: s.replace(monDCommaY[0], '').replace(/\s+/g, ' ').trim() };
      }
    }
  }

  return { date: null, rest: s };
};

const detectType = (text) => {
  const q = normalize(stripDiacritics(text));
  if (!q) return null;
  if (/\b(income|earned|earn|salary|wage|stipend|bonus|interest|dividend|rent|freelance|contract|received)\b/.test(q)) return 'income';
  if (/\b(expense|spent|spend|pay|paid|purchase|bought|bill|rent|emi|fee|charges?)\b/.test(q)) return 'expense';
  return null;
};

const INCOME_CATEGORIES = [
  { id: 'income_salary', name: 'Salary', synonyms: ['salary', 'wage', 'payroll', 'payslip'] },
  { id: 'income_freelance', name: 'Freelance / Contract', synonyms: ['freelance', 'contract', 'gig', 'consulting'] },
  { id: 'income_business', name: 'Business Income', synonyms: ['business', 'sale', 'sales', 'revenue'] },
  { id: 'income_investment', name: 'Investment Income', synonyms: ['investment', 'dividend', 'stock', 'mf', 'mutual fund'] },
  { id: 'income_rental', name: 'Rental Income', synonyms: ['rent', 'rental', 'tenant'] },
  { id: 'income_bonus', name: 'Bonus / Incentives', synonyms: ['bonus', 'incentive'] },
  { id: 'income_interest', name: 'Interest Income', synonyms: ['interest'] },
  { id: 'income_gifts', name: 'Gifts', synonyms: ['gift', 'gifts'] },
  { id: 'income_other', name: 'Other', synonyms: ['other'] },
];

const guessIncomeCategory = (label) => {
  const q = normalize(stripDiacritics(label));
  if (!q) return 'income_other';
  for (const cat of INCOME_CATEGORIES) {
    if (q === normalize(cat.name)) return cat.id;
    if (cat.synonyms.some((s) => q.includes(s))) return cat.id;
  }
  return 'income_other';
};

const DEFAULT_EXPENSE_SYNONYMS = [
  { id: 'food', synonyms: ['food', 'restaurant', 'dinner', 'lunch', 'breakfast', 'snack', 'coffee', 'zomato', 'swiggy'] },
  { id: 'transportation', synonyms: ['travel', 'transport', 'transportation', 'uber', 'ola', 'bus', 'train', 'metro', 'taxi', 'fuel', 'petrol', 'diesel', 'parking', 'toll'] },
  { id: 'utilities', synonyms: ['utility', 'utilities', 'electric', 'electricity', 'water', 'gas', 'internet', 'wifi', 'mobile', 'phone', 'recharge'] },
  { id: 'entertainment', synonyms: ['movie', 'netflix', 'spotify', 'entertainment', 'game', 'gaming'] },
  { id: 'basic_needs', synonyms: ['grocery', 'groceries', 'medicine', 'medical', 'pharmacy', 'health', 'rent', 'emi'] },
  { id: 'unneeded_products', synonyms: ['shopping', 'amazon', 'flipkart', 'fashion', 'unneeded', 'impulse'] },
  { id: 'other', synonyms: ['other', 'misc', 'miscellaneous'] },
];

const guessExpenseCategory = (label, expenseCategories = []) => {
  const q = normalize(stripDiacritics(label));
  if (!q) return 'other';

  const normalizedByName = new Map();
  for (const c of expenseCategories || []) {
    normalizedByName.set(normalize(stripDiacritics(c?.name)), c?.id);
    normalizedByName.set(normalize(stripDiacritics(c?.id)), c?.id);
  }
  if (normalizedByName.has(q)) return normalizedByName.get(q) || 'other';

  for (const preset of DEFAULT_EXPENSE_SYNONYMS) {
    if (preset.synonyms.some((s) => q.includes(s))) return preset.id;
  }

  // soft match: contains category name
  for (const [name, id] of normalizedByName.entries()) {
    if (name && q.includes(name)) return id || 'other';
  }

  return 'other';
};

const cleanLabel = (text) => {
  const s = String(text || '')
    .replace(/\b(income|expense)\b/gi, ' ')
    .replace(/\b(add|added|save|saved|log|logged|record|recorded)\b/gi, ' ')
    .replace(/[:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return s;
};

const splitSegments = (raw) => {
  const s = String(raw || '').trim();
  if (!s) return [];

  // Turn newline/semicolons/slashes into commas, but keep hyphen (used in "Food-45").
  const rough = s.replace(/[\n;/|]+/g, ',');
  return rough
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
};

export const parseTransactionMessage = (rawText, { expenseCategories = [], now = new Date() } = {}) => {
  const text = String(rawText || '').trim();
  if (!text) return null;

  const globalType = detectType(text);
  const segments = splitSegments(text);
  if (segments.length === 0) return null;

  let inheritedType = globalType;
  const entries = [];

  for (const segmentRaw of segments) {
    const segType = detectType(segmentRaw) || inheritedType;
    const { date, rest: afterDate } = extractDate(segmentRaw, now);
    const { amount, rest: afterAmount } = extractAmount(afterDate);
    if (!Number.isFinite(amount)) continue;

    const label = cleanLabel(afterAmount);

    // Infer type when not explicit (default to expense for most labels).
    let type = segType;
    if (!type) {
      if (amount < 0) {
        type = 'expense';
      } else {
        const q = normalize(stripDiacritics(label));
        const incomeHint =
          detectType(label) === 'income' ||
          /\b(salary|wage|freelance|contract|bonus|interest|dividend|rental|rent|stipend)\b/.test(q);
        type = incomeHint ? 'income' : 'expense';
      }
    }

    const finalDescription = label || (type === 'income' ? 'Income' : 'Expense');

    const numeric = Math.round(Math.abs(Number(amount)) * 100) / 100;
    if (!Number.isFinite(numeric) || numeric <= 0) continue;

    const category =
      type === 'income'
        ? guessIncomeCategory(finalDescription)
        : guessExpenseCategory(finalDescription, expenseCategories);

    entries.push({
      type,
      description: finalDescription,
      category,
      amount: numeric,
      date: date || toIsoDate(now) || undefined,
    });

    inheritedType = type;
  }

  if (entries.length === 0) return null;
  // Guard against accidentally parsing normal questions as transactions.
  // If the message is very long and only one amount appears, prefer treating as a question.
  const totalChars = text.length;
  if (totalChars > 140 && entries.length === 1) return null;

  return { entries };
};

export const getIncomeCategories = () => INCOME_CATEGORIES.map(({ id, name }) => ({ id, name }));

export const getDefaultIncomeCategoryForType = (type) => (type === 'income' ? 'income_salary' : 'other');

export const coerceCategoryForType = (type, category, expenseCategories = []) => {
  const t = type === 'income' ? 'income' : 'expense';
  const cat = String(category || '').trim();
  if (t === 'income') {
    if (cat.startsWith('income_')) return cat;
    return guessIncomeCategory(cat);
  }
  if (!cat || cat.startsWith('income_')) return guessExpenseCategory(cat, expenseCategories);
  const exists = (expenseCategories || []).some((c) => c?.id === cat);
  return exists ? cat : guessExpenseCategory(cat, expenseCategories);
};

export const formatTxCount = (entries) => {
  const income = entries.filter((e) => e.type === 'income').length;
  const expense = entries.filter((e) => e.type === 'expense').length;
  if (income && expense) return `${income} income${income === 1 ? '' : 's'} and ${expense} expense${expense === 1 ? '' : 's'}`;
  if (income) return `${income} income${income === 1 ? '' : 's'}`;
  return `${expense} expense${expense === 1 ? '' : 's'}`;
};

export const sumByType = (entries) => {
  const income = entries.reduce((s, e) => s + (e.type === 'income' ? Number(e.amount) || 0 : 0), 0);
  const expense = entries.reduce((s, e) => s + (e.type === 'expense' ? Number(e.amount) || 0 : 0), 0);
  return {
    income: Math.round(income * 100) / 100,
    expense: Math.round(expense * 100) / 100,
  };
};
