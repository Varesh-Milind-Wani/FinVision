import React from 'react';

export default function LandingFooter() {
  return (
    <footer className="border-t border-white/10">
      <div className="container mx-auto max-w-7xl px-4 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="font-display text-lg font-extrabold tracking-tight text-white">FinVision</div>
          <div className="mt-1 text-sm text-slate-200/70">Private-first personal finance in your browser.</div>
        </div>
        <div className="flex items-center gap-4 text-sm font-semibold text-slate-200/70">
          <span>© {new Date().getFullYear()}</span>
          <span className="h-1 w-1 rounded-full bg-white/25" aria-hidden="true" />
          <span>Built with care</span>
        </div>
      </div>
    </footer>
  );
}

