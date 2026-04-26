import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useBodyScrollLock } from '../utils/scrollLock';

const STORAGE_KEY = 'finvision_amounts_hidden';
const PIN_KEY = 'finvision_app_pin_v1';
const PIN_LEN = 6;

const AmountsVisibilityContext = createContext(null);

const isTypingTarget = (target) => {
  if (!target || typeof target !== 'object') return false;
  const el = target instanceof Element ? target : null;
  if (!el) return false;
  return !!el.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""], [role="textbox"]');
};

export const AmountsVisibilityProvider = ({ children }) => {
  const [amountsHidden, setAmountsHidden] = useState(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });

  const [appPin, setAppPinState] = useState(() => {
    try {
      const raw = window.localStorage.getItem(PIN_KEY);
      return typeof raw === 'string' && /^\d{6}$/.test(raw) ? raw : null;
    } catch {
      return null;
    }
  });

  const appPinEnabled = !!appPin;

  const persistPin = useCallback((nextPin) => {
    try {
      if (!nextPin) window.localStorage.removeItem(PIN_KEY);
      else window.localStorage.setItem(PIN_KEY, nextPin);
    } catch {
      // ignore
    }
  }, []);

  const setAppPin = useCallback((nextPin) => {
    const normalized = typeof nextPin === 'string' ? nextPin.trim() : '';
    const valid = normalized ? (/^\d{6}$/.test(normalized) ? normalized : null) : null;
    setAppPinState(valid);
    persistPin(valid);
    return !!valid;
  }, [persistPin]);

  const modalResolveRef = useRef(null);
  const modalRejectRef = useRef(null);
  const [pinModal, setPinModal] = useState({
    open: false,
    mode: 'verify', // verify | setup | confirm | verify_then_setup | remove
    title: 'Enter App PIN',
    reason: '',
    error: '',
    digits: '',
    firstPin: '',
  });

  useBodyScrollLock(pinModal.open);

  const closePinModal = useCallback((result) => {
    setPinModal((s) => ({ ...s, open: false, error: '', digits: '', firstPin: '' }));
    const resolve = modalResolveRef.current;
    modalResolveRef.current = null;
    modalRejectRef.current = null;
    if (resolve) resolve(!!result);
  }, []);

  const openPinModal = useCallback((next) => {
    return new Promise((resolve) => {
      modalResolveRef.current = resolve;
      modalRejectRef.current = null;
      setPinModal({
        open: true,
        mode: next.mode,
        title: next.title,
        reason: next.reason || '',
        error: '',
        digits: '',
        firstPin: '',
      });
    });
  }, []);

  const requestPin = useCallback(async ({ reason = '' } = {}) => {
    if (!appPinEnabled) return true;
    return openPinModal({
      mode: 'verify',
      title: 'Enter App PIN',
      reason: reason || 'Enter your PIN to continue.',
    });
  }, [appPinEnabled, openPinModal]);

  const beginPinSetup = useCallback(async () => {
    return openPinModal({
      mode: 'setup',
      title: 'Set App PIN',
      reason: `Choose a ${PIN_LEN}-digit PIN. You'll need it to reveal amounts and export data.`,
    });
  }, [openPinModal]);

  const beginPinChange = useCallback(async () => {
    if (!appPinEnabled) return beginPinSetup();
    return openPinModal({
      mode: 'verify_then_setup',
      title: 'Change App PIN',
      reason: 'Enter your current PIN to set a new one.',
    });
  }, [appPinEnabled, beginPinSetup, openPinModal]);

  const beginPinRemove = useCallback(async () => {
    if (!appPinEnabled) return true;
    return openPinModal({
      mode: 'remove',
      title: 'Remove App PIN',
      reason: 'Enter your PIN to remove protection.',
    });
  }, [appPinEnabled, openPinModal]);

  const guardedSetAmountsHidden = useCallback(
    async (nextHidden, { reason = '' } = {}) => {
      const next = !!nextHidden;
      if (next === amountsHidden) return true;

      // Only protect revealing amounts (hidden -> visible), not hiding.
      if (amountsHidden && !next && appPinEnabled) {
        const ok = await requestPin({ reason: reason || 'Enter your PIN to reveal amounts.' });
        if (!ok) return false;
      }

      setAmountsHidden(next);
      return true;
    },
    [amountsHidden, appPinEnabled, requestPin]
  );

  const toggleAmountsHidden = useCallback(async () => {
    return guardedSetAmountsHidden(!amountsHidden, {
      reason: amountsHidden ? 'Enter your PIN to reveal amounts.' : '',
    });
  }, [amountsHidden, guardedSetAmountsHidden]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, amountsHidden ? '1' : '0');
    } catch {
      // ignore
    }
  }, [amountsHidden]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (!e) return;
      if (e.repeat) return;
      if (e.metaKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;

      const isCombo = (e.key === 'Shift' && e.ctrlKey) || (e.key === 'Control' && e.shiftKey);
      if (!isCombo) return;

      e.preventDefault();
      toggleAmountsHidden();
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [toggleAmountsHidden]);

  // PIN modal interaction
  const submitPinModal = useCallback(() => {
    if (!pinModal.open) return;
    if (pinModal.digits.length !== PIN_LEN) return;

    const entered = pinModal.digits;

    const fail = (msg) => {
      setPinModal((s) => ({ ...s, error: msg, digits: '' }));
    };

    if (pinModal.mode === 'verify') {
      if (entered === appPin) closePinModal(true);
      else fail('Incorrect PIN. Try again.');
      return;
    }

    if (pinModal.mode === 'remove') {
      if (entered !== appPin) {
        fail('Incorrect PIN. Try again.');
        return;
      }
      setAppPin(null);
      closePinModal(true);
      return;
    }

    if (pinModal.mode === 'verify_then_setup') {
      if (entered !== appPin) {
        fail('Incorrect PIN. Try again.');
        return;
      }
      setPinModal((s) => ({
        ...s,
        mode: 'setup',
        title: 'Set New App PIN',
        reason: `Choose a new ${PIN_LEN}-digit PIN.`,
        error: '',
        digits: '',
        firstPin: '',
      }));
      return;
    }

    if (pinModal.mode === 'setup') {
      setPinModal((s) => ({
        ...s,
        mode: 'confirm',
        title: 'Confirm App PIN',
        reason: 'Re-enter the same PIN to confirm.',
        error: '',
        digits: '',
        firstPin: entered,
      }));
      return;
    }

    if (pinModal.mode === 'confirm') {
      if (entered !== pinModal.firstPin) {
        setPinModal((s) => ({
          ...s,
          mode: 'setup',
          title: 'Set App PIN',
          reason: `Choose a ${PIN_LEN}-digit PIN.`,
          error: 'PINs did not match. Please try again.',
          digits: '',
          firstPin: '',
        }));
        return;
      }
      setAppPin(entered);
      closePinModal(true);
    }
  }, [appPin, closePinModal, pinModal.digits, pinModal.firstPin, pinModal.mode, pinModal.open, setAppPin]);

  useEffect(() => {
    if (!pinModal.open) return undefined;

    const onKeyDown = (e) => {
      if (!e) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        closePinModal(false);
        return;
      }
      if (e.key === 'Enter') {
        if (pinModal.digits.length === PIN_LEN) {
          e.preventDefault();
          submitPinModal();
        }
        return;
      }
      if (e.key === 'Backspace') {
        e.preventDefault();
        setPinModal((s) => ({ ...s, digits: s.digits.slice(0, -1), error: '' }));
        return;
      }
      if (/^\d$/.test(e.key)) {
        e.preventDefault();
        setPinModal((s) => {
          if (s.digits.length >= PIN_LEN) return s;
          return { ...s, digits: `${s.digits}${e.key}`, error: '' };
        });
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [closePinModal, pinModal.digits.length, pinModal.open, submitPinModal]);

  const value = useMemo(
    () => ({
      amountsHidden,
      setAmountsHidden: (next, opts) => guardedSetAmountsHidden(next, opts),
      toggleAmountsHidden,
      maskedText: '******',
      appPinEnabled,
      beginPinSetup,
      beginPinChange,
      beginPinRemove,
      requestPin,
    }),
    [amountsHidden, appPinEnabled, beginPinChange, beginPinRemove, beginPinSetup, guardedSetAmountsHidden, requestPin, toggleAmountsHidden]
  );

  return (
    <AmountsVisibilityContext.Provider value={value}>
      {children}

      {pinModal.open ? (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
            onMouseDown={() => closePinModal(false)}
          />

          <div className="relative w-[min(460px,94vw)]">
            <div aria-hidden="true" className="absolute -inset-1 rounded-[28px] bg-gradient-to-br from-indigo-500/20 via-sky-500/10 to-transparent blur-xl" />
            <div className="relative rounded-[28px] p-px bg-gradient-to-br from-slate-900/10 via-slate-900/5 to-transparent dark:from-white/18 dark:via-white/8 dark:to-white/5">
              <div className="relative rounded-[27px] bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(248,250,252,0.96))] dark:bg-[linear-gradient(180deg,rgba(2,6,23,0.80),rgba(15,23,42,0.62))] text-slate-900 dark:text-slate-100 backdrop-blur-xl shadow-[0_26px_80px_-46px_rgba(2,6,23,0.65)] dark:shadow-[0_30px_90px_-52px_rgba(0,0,0,0.85)] ring-1 ring-black/10 dark:ring-white/[0.12] overflow-hidden">
                <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                  <div className="absolute -top-28 -right-28 h-72 w-72 rounded-full bg-indigo-500/8 blur-3xl" />
                  <div className="absolute -bottom-28 -left-28 h-72 w-72 rounded-full bg-sky-500/8 blur-3xl" />
                  <div className="absolute inset-0 opacity-[0.035] dark:opacity-[0.08]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(148, 163, 184, 0.55) 1px, transparent 0)', backgroundSize: '22px 22px' }} />
                </div>

                <div className="relative px-6 py-5 border-b border-black/5 dark:border-white/10 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white grid place-items-center ring-1 ring-white/20 shadow-sm">
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c1.657 0 3-1.343 3-3S13.657 5 12 5 9 6.343 9 8s1.343 3 3 3z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 20v-1a4 4 0 00-4-4H9a4 4 0 00-4 4v1" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <div className="font-display text-lg font-extrabold text-slate-900 dark:text-white truncate">{pinModal.title}</div>
                        <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">{pinModal.reason}</div>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => closePinModal(false)}
                    className="shrink-0 h-10 w-10 rounded-2xl ring-1 ring-black/10 dark:ring-white/[0.12] bg-slate-50/80 dark:bg-slate-900/25 hover:bg-slate-100/90 dark:hover:bg-slate-900/45 transition-colors grid place-items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                    aria-label="Close"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-700 dark:text-slate-200" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </div>

                <div className="relative px-6 py-5">
              <div
                className={[
                  'flex justify-center gap-2',
                  pinModal.error ? 'animate-[wiggle_180ms_ease-in-out_0s_2]' : '',
                ].join(' ')}
              >
                {Array.from({ length: PIN_LEN }).map((_, i) => {
                  const filled = i < pinModal.digits.length;
                  return (
                    <div
                      key={i}
                      className={[
                        'h-11 w-10 rounded-2xl ring-1 grid place-items-center transition-colors',
                        filled
                          ? 'ring-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10'
                          : 'ring-slate-200/80 dark:ring-white/[0.12] bg-slate-50/70 dark:bg-slate-900/25',
                      ].join(' ')}
                      aria-label={`PIN digit ${i + 1}`}
                    >
                      <div
                        className={[
                          'h-2.5 w-2.5 rounded-full transition-transform',
                          filled ? 'bg-indigo-600 dark:bg-white scale-100' : 'bg-transparent scale-50',
                        ].join(' ')}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 min-h-[20px] text-center" aria-live="polite">
                {pinModal.error ? (
                  <div className="inline-flex items-center gap-2 rounded-2xl px-3 py-1.5 text-sm font-semibold bg-rose-50/80 dark:bg-rose-500/10 text-rose-700 dark:text-rose-200 ring-1 ring-rose-500/20">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                    {pinModal.error}
                  </div>
                ) : (
                  <div className="text-xs text-slate-600 dark:text-slate-300">Tip: you can type numbers on your keyboard</div>
                )}
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2.5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() =>
                      setPinModal((s) => (s.digits.length >= PIN_LEN ? s : { ...s, digits: `${s.digits}${n}`, error: '' }))
                    }
                    disabled={pinModal.digits.length >= PIN_LEN}
                    className="h-12 rounded-2xl text-lg font-extrabold text-slate-900 dark:text-white ring-1 ring-slate-200/80 dark:ring-white/[0.12] bg-white/95 dark:bg-slate-900/25 hover:bg-white dark:hover:bg-slate-900/40 shadow-[0_1px_0_rgba(0,0,0,0.06),0_16px_30px_-24px_rgba(2,6,23,0.25)] dark:shadow-[0_16px_30px_-24px_rgba(0,0,0,0.65)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
                  >
                    {n}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setPinModal((s) => ({ ...s, digits: '', error: '' }))}
                  disabled={pinModal.digits.length === 0}
                  className="h-12 rounded-2xl text-sm font-extrabold text-slate-700 dark:text-slate-200 ring-1 ring-slate-200/80 dark:ring-white/[0.12] bg-slate-50/80 dark:bg-slate-900/20 hover:bg-slate-100/80 dark:hover:bg-slate-900/35 shadow-[0_1px_0_rgba(0,0,0,0.05)] dark:shadow-none transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Clear
                </button>

                <button
                  type="button"
                  onClick={() => setPinModal((s) => (s.digits.length >= PIN_LEN ? s : { ...s, digits: `${s.digits}0`, error: '' }))}
                  disabled={pinModal.digits.length >= PIN_LEN}
                  className="h-12 rounded-2xl text-lg font-extrabold text-slate-900 dark:text-white ring-1 ring-slate-200/80 dark:ring-white/[0.12] bg-white/95 dark:bg-slate-900/25 hover:bg-white dark:hover:bg-slate-900/40 shadow-[0_1px_0_rgba(0,0,0,0.06),0_16px_30px_-24px_rgba(2,6,23,0.25)] dark:shadow-[0_16px_30px_-24px_rgba(0,0,0,0.65)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
                >
                  0
                </button>

                <button
                  type="button"
                  onClick={() => setPinModal((s) => ({ ...s, digits: s.digits.slice(0, -1), error: '' }))}
                  disabled={pinModal.digits.length === 0}
                  className="h-12 rounded-2xl text-sm font-extrabold text-slate-700 dark:text-slate-200 ring-1 ring-slate-200/80 dark:ring-white/[0.12] bg-slate-50/80 dark:bg-slate-900/20 hover:bg-slate-100/80 dark:hover:bg-slate-900/35 shadow-[0_1px_0_rgba(0,0,0,0.05)] dark:shadow-none transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Backspace"
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    <span aria-hidden="true"></span>
                    <span className="hidden sm:inline">Back</span>
                  </span>
                </button>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => closePinModal(false)}
                  className="px-4 py-2.5 rounded-2xl text-sm font-extrabold text-slate-800 dark:text-slate-100 ring-1 ring-slate-200/80 dark:ring-white/[0.12] bg-slate-50/80 dark:bg-slate-900/20 hover:bg-slate-100/80 dark:hover:bg-slate-900/35 shadow-[0_1px_0_rgba(0,0,0,0.05)] dark:shadow-none transition-colors"
                >
                  Cancel
                </button>
                {pinModal.digits.length === PIN_LEN ? (
                  <button
                    type="button"
                    onClick={submitPinModal}
                    className={[
                      'px-5 py-2.5 rounded-2xl text-sm font-extrabold ring-1 transition-colors',
                      'bg-indigo-600 hover:bg-indigo-700 text-white ring-indigo-500/30 shadow-[0_14px_30px_-22px_rgba(79,70,229,0.85)]',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40',
                    ].join(' ')}
                  >
                    {pinModal.mode === 'setup' ? 'Next' : pinModal.mode === 'confirm' ? 'Confirm' : 'Submit'}
                  </button>
                ) : (
                  <div className="px-5 py-2.5" />
                )}
              </div>

              <style>{'@keyframes wiggle{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}'}</style>
            </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AmountsVisibilityContext.Provider>
  );
};

export const useAmountsVisibility = () => {
  const ctx = useContext(AmountsVisibilityContext);
  if (!ctx) throw new Error('useAmountsVisibility must be used within AmountsVisibilityProvider');
  return ctx;
};
