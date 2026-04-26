import React from 'react';

const Footer = () => {
  const year = new Date().getFullYear();
  return (
    <footer className="relative mt-12">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200/70 to-transparent dark:via-slate-800/80" />
      <div className="mx-auto w-full max-w-[1520px] px-2 sm:px-5 lg:px-6 py-8">
        <div className="rounded-2xl bg-white/50 dark:bg-slate-950/30 backdrop-blur ring-1 ring-black/5 dark:ring-white/[0.12] px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-display font-extrabold tracking-tight text-slate-900 dark:text-white">FinVision</span>
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-black/5 dark:ring-white/[0.12] text-slate-600 dark:text-slate-300 bg-white/60 dark:bg-slate-900/40">
                  Local-first
                </span>
              </div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Saved on this device. No account required.
              </div>
            </div>

            <div className="flex flex-col sm:items-end gap-2">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                © {year} FinVision. All rights reserved.
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ring-1 ring-black/5 dark:ring-white/[0.12] bg-white/60 dark:bg-slate-900/40 text-slate-700 dark:text-slate-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Offline storage
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ring-1 ring-black/5 dark:ring-white/[0.12] bg-white/60 dark:bg-slate-900/40 text-slate-700 dark:text-slate-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  Real-time FX display
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
