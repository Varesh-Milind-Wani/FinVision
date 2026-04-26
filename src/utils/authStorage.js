const AUTH_USERS_STORAGE_KEY = 'finvision.auth.users.v1';
const AUTH_SESSION_STORAGE_KEY = 'finvision.auth.session.v1';
const LEGACY_EXPENSE_STORAGE_KEY = 'expenseTrackerData';

const safeParseJson = (text) => {
  if (typeof text !== 'string' || !text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const slugify = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'user';

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

const normalizePhone = (value) => String(value || '').replace(/[^\d+]/g, '').slice(0, 20);

const makeUserId = (email) => `user_${slugify(normalizeEmail(email).replace(/@/g, '-at-'))}`;

const maskPassword = (password) => String(password || '');

export const getAuthUsersStorageKey = () => AUTH_USERS_STORAGE_KEY;
export const getAuthSessionStorageKey = () => AUTH_SESSION_STORAGE_KEY;

export const getExpenseStorageKeyForUser = (userId) => `expenseTrackerData:${String(userId || 'guest')}`;

export const readStoredUsers = () => {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  const parsed = safeParseJson(window.localStorage.getItem(AUTH_USERS_STORAGE_KEY));
  return Array.isArray(parsed) ? parsed : [];
};

export const writeStoredUsers = (users) => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  window.localStorage.setItem(AUTH_USERS_STORAGE_KEY, JSON.stringify(Array.isArray(users) ? users : []));
};

export const readStoredSession = () => {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  const parsed = safeParseJson(window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY));
  return parsed && typeof parsed === 'object' ? parsed : null;
};

export const writeStoredSession = (session) => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  if (!session) {
    window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
};

export const normalizeAuthProfileInput = (input) => {
  const accountType = input?.accountType === 'business' ? 'business' : 'individual';
  const income = Number(input?.income);
  return {
    name: String(input?.name || '').trim(),
    email: normalizeEmail(input?.email),
    password: maskPassword(input?.password),
    phone: normalizePhone(input?.phone),
    age: String(input?.age || '').trim(),
    address: String(input?.address || '').trim(),
    occupation: String(input?.occupation || '').trim(),
    accountType,
    income: Number.isFinite(income) && income >= 0 ? income : 0,
  };
};

export const validateAuthProfileInput = (input, { requirePassword = true } = {}) => {
  const profile = normalizeAuthProfileInput(input);
  if (!profile.name || profile.name.length < 2) return 'Enter a valid full name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) return 'Enter a valid email address.';
  if (requirePassword && profile.password.length < 6) return 'Password must be at least 6 characters.';
  if (!profile.phone || profile.phone.replace(/[^\d]/g, '').length < 10) return 'Enter a valid phone number.';
  const age = Number(profile.age);
  if (!Number.isFinite(age) || age < 18 || age > 120) return 'Age must be between 18 and 120.';
  if (!profile.address || profile.address.length < 5) return 'Enter a valid address.';
  if (!profile.occupation || profile.occupation.length < 2) return 'Enter your occupation.';
  if (!Number.isFinite(profile.income) || profile.income < 0) return 'Enter a valid monthly or business income.';
  return '';
};

export const createStoredUser = (input) => {
  const profile = normalizeAuthProfileInput(input);
  const timestamp = new Date().toISOString();
  return {
    id: makeUserId(profile.email),
    name: profile.name,
    email: profile.email,
    password: profile.password,
    phone: profile.phone,
    age: Number(profile.age),
    address: profile.address,
    occupation: profile.occupation,
    accountType: profile.accountType,
    income: profile.income,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};

export const sanitizeUser = (user) => {
  if (!user || typeof user !== 'object') return null;
  const {
    password,
    ...safe
  } = user;
  void password;
  return safe;
};

export const readLegacyExpenseState = () => {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  return safeParseJson(window.localStorage.getItem(LEGACY_EXPENSE_STORAGE_KEY));
};

export const clearLegacyExpenseState = () => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  window.localStorage.removeItem(LEGACY_EXPENSE_STORAGE_KEY);
};
