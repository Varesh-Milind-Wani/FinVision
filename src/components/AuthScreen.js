import React, { useMemo, useState } from 'react';
import finvisionMark from '../assets/finvision-mark.svg';
import { useAuth } from '../contexts/AuthContext';

const initialRegisterState = {
  name: '',
  email: '',
  password: '',
  phone: '',
  age: '',
  address: '',
  occupation: '',
  income: '',
  accountType: 'individual',
};

const initialLoginState = {
  email: '',
  password: '',
};

const Input = ({ label, sub, ...props }) => (
  <label className="block">
    <div className="text-sm font-bold text-slate-900 dark:text-white">{label}</div>
    {sub ? <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{sub}</div> : null}
    <input
      {...props}
      className="mt-2 w-full rounded-[8px] border border-black/10 dark:border-white/10 bg-white/90 dark:bg-slate-950/35 px-3 py-3 text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/40"
    />
  </label>
);

const Select = ({ label, sub, children, ...props }) => (
  <label className="block">
    <div className="text-sm font-bold text-slate-900 dark:text-white">{label}</div>
    {sub ? <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{sub}</div> : null}
    <select
      {...props}
      className="mt-2 w-full rounded-[8px] border border-black/10 dark:border-white/10 bg-white/90 dark:bg-slate-950/35 px-3 py-3 text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/40"
    >
      {children}
    </select>
  </label>
);

export default function AuthScreen() {
  const { authError, clearAuthError, login, register, users } = useAuth();
  const [mode, setMode] = useState('login');
  const [loginForm, setLoginForm] = useState(initialLoginState);
  const [registerForm, setRegisterForm] = useState(initialRegisterState);
  const [busy, setBusy] = useState(false);

  const helperText = useMemo(() => {
    if (mode === 'login' && users.length === 0) return 'No account found yet. Create one to continue.';
    return mode === 'login'
      ? 'Use your email and password to open your local account.'
      : 'Create a local account. All profile and finance data stays in this browser.';
  }, [mode, users.length]);

  const submitLogin = async (e) => {
    e.preventDefault();
    setBusy(true);
    clearAuthError();
    login(loginForm);
    setBusy(false);
  };

  const submitRegister = async (e) => {
    e.preventDefault();
    setBusy(true);
    clearAuthError();
    register({
      ...registerForm,
      income: Number(registerForm.income),
    });
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 px-4 py-8 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-6xl items-center">
        <div className="grid w-full gap-8 lg:grid-cols-[1.05fr,0.95fr]">
          <section className="rounded-[8px] border border-black/5 bg-white/80 p-6 shadow-soft dark:border-white/10 dark:bg-slate-950/40 sm:p-8 lg:p-10">
            <div className="flex items-center gap-3">
              <img src={finvisionMark} alt="FinVision" className="h-10 w-10" />
              <div>
                <div className="font-display text-2xl font-extrabold text-slate-900 dark:text-white">FinVision</div>
                <div className="text-sm text-slate-600 dark:text-slate-300">Local account access</div>
              </div>
            </div>

            <div className="mt-8 max-w-xl">
              <div className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {mode === 'login' ? 'Welcome back' : 'Create your account'}
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{helperText}</p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[8px] border border-black/5 bg-slate-50/80 px-4 py-4 dark:border-white/10 dark:bg-slate-950/25">
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Storage</div>
                <div className="mt-2 text-lg font-extrabold text-slate-900 dark:text-white">Browser localStorage</div>
              </div>
              <div className="rounded-[8px] border border-black/5 bg-slate-50/80 px-4 py-4 dark:border-white/10 dark:bg-slate-950/25">
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Accounts</div>
                <div className="mt-2 text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">{users.length}</div>
              </div>
            </div>
          </section>

          <section className="rounded-[8px] border border-black/5 bg-white/90 p-6 shadow-soft dark:border-white/10 dark:bg-slate-950/55 sm:p-8">
            <div className="inline-flex rounded-[8px] border border-black/5 bg-slate-100/80 p-1 dark:border-white/10 dark:bg-slate-900/50">
              <button
                type="button"
                onClick={() => {
                  clearAuthError();
                  setMode('login');
                }}
                className={`rounded-[8px] px-4 py-2 text-sm font-extrabold ${mode === 'login' ? 'bg-blue-600 text-white' : 'text-slate-700 dark:text-slate-200'}`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => {
                  clearAuthError();
                  setMode('register');
                }}
                className={`rounded-[8px] px-4 py-2 text-sm font-extrabold ${mode === 'register' ? 'bg-blue-600 text-white' : 'text-slate-700 dark:text-slate-200'}`}
              >
                Create Account
              </button>
            </div>

            {authError ? (
              <div className="mt-4 rounded-[8px] border border-rose-500/20 bg-rose-50/80 px-4 py-3 text-sm font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">
                {authError}
              </div>
            ) : null}

            {mode === 'login' ? (
              <form className="mt-6 space-y-4" onSubmit={submitLogin}>
                <Input
                  label="Email"
                  type="email"
                  autoComplete="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="name@example.com"
                />
                <Input
                  label="Password"
                  type="password"
                  autoComplete="current-password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter password"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-[8px] bg-blue-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-60"
                >
                  Login
                </button>
              </form>
            ) : (
              <form className="mt-6 grid gap-4" onSubmit={submitRegister}>
                <Input
                  label="Full Name"
                  autoComplete="name"
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter full name"
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Email"
                    type="email"
                    autoComplete="email"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="name@example.com"
                  />
                  <Input
                    label="Password"
                    type="password"
                    autoComplete="new-password"
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm((prev) => ({ ...prev, password: e.target.value }))}
                    placeholder="At least 6 characters"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Phone Number"
                    autoComplete="tel"
                    value={registerForm.phone}
                    onChange={(e) => setRegisterForm((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="10-digit number"
                  />
                  <Input
                    label="Age"
                    type="number"
                    min="18"
                    max="120"
                    value={registerForm.age}
                    onChange={(e) => setRegisterForm((prev) => ({ ...prev, age: e.target.value }))}
                    placeholder="18+"
                  />
                </div>
                <Input
                  label="Address"
                  autoComplete="street-address"
                  value={registerForm.address}
                  onChange={(e) => setRegisterForm((prev) => ({ ...prev, address: e.target.value }))}
                  placeholder="Enter address"
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Occupation"
                    value={registerForm.occupation}
                    onChange={(e) => setRegisterForm((prev) => ({ ...prev, occupation: e.target.value }))}
                    placeholder="Occupation or business role"
                  />
                  <Select
                    label="Account Type"
                    value={registerForm.accountType}
                    onChange={(e) => setRegisterForm((prev) => ({ ...prev, accountType: e.target.value }))}
                  >
                    <option value="individual">Individual</option>
                    <option value="business">Business</option>
                  </Select>
                </div>
                <Input
                  label={registerForm.accountType === 'business' ? 'Business Income' : 'Monthly Income'}
                  sub={registerForm.accountType === 'business' ? 'Current business income' : 'Current monthly income'}
                  type="number"
                  min="0"
                  step="0.01"
                  value={registerForm.income}
                  onChange={(e) => setRegisterForm((prev) => ({ ...prev, income: e.target.value }))}
                  placeholder="0.00"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="mt-2 w-full rounded-[8px] bg-blue-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-60"
                >
                  Create Account
                </button>
              </form>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
