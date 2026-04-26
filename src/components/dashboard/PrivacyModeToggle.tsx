import React, { useEffect, useState } from 'react';

const STORAGE_KEY = 'finvision.aiPrivacyMode.v1';

export default function PrivacyModeToggle() {
  const [enabled, setEnabled] = useState(() => {
    try {
      return window.localStorage?.getItem?.(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      window.localStorage?.setItem?.(STORAGE_KEY, enabled ? '1' : '0');
    } catch {
      // ignore
    }
  }, [enabled]);

  return (
    <button
      type="button"
      onClick={() => setEnabled((v) => !v)}
      className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-[12px] font-semibold ring-1 ring-black/[0.10] bg-white hover:bg-slate-50 transition-colors"
      aria-pressed={enabled}
      aria-label="AI Privacy Mode"
      title="AI Privacy Mode (mock)"
    >
      <span className={`h-2.5 w-2.5 rounded-full ${enabled ? 'bg-emerald-500' : 'bg-slate-300'}`} />
      AI Privacy Mode
    </button>
  );
}

