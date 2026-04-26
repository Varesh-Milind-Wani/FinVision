import React from 'react';

const RetirementCard = () => {
  return (
    <div className="rounded-2xl ring-1 ring-black/[0.06] shadow-[0_8px_24px_-18px_rgba(15,23,42,0.35)] overflow-hidden">
      <div className="p-5 bg-gradient-to-r from-[#7aa63a] via-[#5ea33f] to-[#2f7a2e] relative">
        <div className="absolute inset-0 opacity-25">
          <div className="absolute -left-10 top-6 h-40 w-40 rounded-full bg-white/30 blur-2xl" />
          <div className="absolute right-0 bottom-0 h-32 w-32 rounded-full bg-black/20 blur-2xl" />
        </div>

        <div className="relative">
          <div className="text-white text-[14px] leading-[18px] font-semibold">
            Secure Your Future with Our
            <br />
            Comprehensive Retirement
            <br />
            Plans!
          </div>
          <button
            type="button"
            className="mt-4 h-8 px-4 rounded-lg bg-white text-slate-800 text-[11px] font-semibold shadow-[0_12px_22px_-16px_rgba(0,0,0,0.55)]"
          >
            Learn more
          </button>
        </div>
      </div>
    </div>
  );
};

export default RetirementCard;

