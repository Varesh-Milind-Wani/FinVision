export type ThemeMode = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'finvision.theme.mode';

const DARK_VARS = {
  '--bg-color': '#0F172A',
  '--card-color': '#1E293B',
  '--text-color': '#E2E8F0',
  '--accent-color': '#22C55E',
} as const;

const LIGHT_VARS = {
  '--bg-color': '#F8FAFC',
  '--card-color': '#FFFFFF',
  '--text-color': '#0F172A',
  '--accent-color': '#16A34A',
} as const;

export const readStoredThemeMode = (): ThemeMode => {
  try {
    const raw = window?.localStorage?.getItem?.(STORAGE_KEY);
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  } catch {
    // ignore
  }
  return 'system';
};

export const writeStoredThemeMode = (mode: ThemeMode) => {
  try {
    window?.localStorage?.setItem?.(STORAGE_KEY, mode);
  } catch {
    // ignore
  }
};

export const getSystemPrefersDark = (): boolean => {
  try {
    return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false;
  } catch {
    return false;
  }
};

export const applyTheme = (mode: ThemeMode) => {
  const root = document.documentElement;
  const prefersDark = getSystemPrefersDark();
  const isDark = mode === 'dark' || (mode === 'system' && prefersDark);
  const vars = isDark ? DARK_VARS : LIGHT_VARS;

  for (const [k, v] of Object.entries(vars)) {
    root.style.setProperty(k, v);
  }

  root.classList.toggle('dark', isDark);
  root.dataset.theme = isDark ? 'dark' : 'light';
  root.dataset.themeMode = mode;
};

