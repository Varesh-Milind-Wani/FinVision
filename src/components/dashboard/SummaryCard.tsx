import React from 'react';

type Props = {
  title: string;
  value: React.ReactNode;
  deltaLabel: string;
  deltaTone: 'up' | 'down' | 'neutral';
  iconTone: 'emerald' | 'orange' | 'violet';
  isLoading?: boolean;
  sparkline?: number[];
  sparklineLabel?: string;
  footerLabel?: string | null;
  sparklineVariant?: 'footer' | 'inline';
};

const toneStyles = {
  up: 'text-emerald-600',
  down: 'text-rose-500',
  neutral: 'text-slate-500',
} as const;

const iconStyles = {
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  orange: 'bg-orange-50 text-orange-700 ring-orange-100',
  violet: 'bg-violet-50 text-violet-700 ring-violet-100',
} as const;

const SummaryCard = ({
  title,
  value,
  deltaLabel,
  deltaTone,
  iconTone,
  isLoading = false,
  sparkline,
  sparklineLabel,
  footerLabel,
  sparklineVariant = 'footer',
}: Props) => {
  const sparkStroke =
    iconTone === 'violet'
      ? '#7c3aed'
      : deltaTone === 'down'
        ? '#f97316'
        : deltaTone === 'up'
          ? '#16a34a'
          : '#64748b';
  const sparkFill =
    iconTone === 'violet'
      ? 'rgba(124,58,237,0.10)'
      : deltaTone === 'down'
        ? 'rgba(249,115,22,0.12)'
        : deltaTone === 'up'
          ? 'rgba(22,163,74,0.12)'
          : 'rgba(100,116,139,0.10)';

  const spark = (() => {
    const values = (sparkline || []).map((v) => Number(v) || 0).slice(-10);
    if (values.length < 2) return null;

    const w = sparklineVariant === 'inline' ? 200 : 140;
    const h = sparklineVariant === 'inline' ? 74 : 40;
    const padX = 4;
    const padY = sparklineVariant === 'inline' ? 14 : 3; // reserve space for the inline label
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = Math.max(1e-9, max - min);

    const pts = values.map((v, i) => {
      const x = padX + (i * (w - padX * 2)) / (values.length - 1);
      const y = padY + (1 - (v - min) / span) * (h - padY - 6);
      return { x, y };
    });

    const toSmoothPath = (points: Array<{ x: number; y: number }>) => {
      if (points.length < 2) return '';
      if (points.length === 2) return `M${points[0]!.x},${points[0]!.y} L${points[1]!.x},${points[1]!.y}`;

      // Catmull-Rom to Bezier (uniform). Produces a smooth "dashboard" sparkline.
      const d: string[] = [`M${points[0]!.x.toFixed(2)},${points[0]!.y.toFixed(2)}`];
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i - 1] || points[i];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[i + 2] || p2;

        const c1x = p1!.x + (p2!.x - p0!.x) / 6;
        const c1y = p1!.y + (p2!.y - p0!.y) / 6;
        const c2x = p2!.x - (p3!.x - p1!.x) / 6;
        const c2y = p2!.y - (p3!.y - p1!.y) / 6;

        d.push(`C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2!.x.toFixed(2)},${p2!.y.toFixed(2)}`);
      }
      return d.join(' ');
    };

    const d = toSmoothPath(pts);
    const floor = h - 4;
    const area = `${d} L${pts[pts.length - 1]!.x.toFixed(2)},${floor.toFixed(2)} L${pts[0]!.x.toFixed(2)},${floor.toFixed(2)} Z`;

    const mid = pts[Math.floor(pts.length * 0.45)];
    return { d, area, w, h, mid };
  })();

  return (
    <div className="kpi-card">
      <div className="kpi-header">
        <div className="min-w-0">
          <div className="kpi-title">{title}</div>
          <div className="kpi-value min-h-[40px] flex items-center">{value}</div>
          {isLoading ? (
            <div className="mt-1 h-3 w-[72%] max-w-[220px] rounded-full bg-slate-100 ring-1 ring-black/5 animate-pulse" aria-hidden="true" />
          ) : deltaLabel ? (
            <div className={`kpi-sub ${toneStyles[deltaTone]}`}>{deltaLabel}</div>
          ) : null}
        </div>

        <div
          className={`h-10 w-10 rounded-2xl ring-1 grid place-items-center ${
            isLoading ? 'bg-slate-100 text-slate-500 ring-black/5' : iconStyles[iconTone]
          }`}
        >
          <div className={`h-3.5 w-3.5 rounded ${isLoading ? 'bg-slate-400/60' : 'bg-current opacity-90'}`} />
        </div>
      </div>

      {sparklineVariant === 'inline' && spark ? (
        <div className="mt-3 flex justify-end">
          <svg width={spark.w} height={spark.h} viewBox={`0 0 ${spark.w} ${spark.h}`} className="shrink-0" aria-hidden="true">
            <path d={spark.area} fill={sparkFill} />
            <path d={spark.d} fill="none" stroke={sparkStroke} strokeWidth="2.4" strokeLinecap="round" />
            {spark.mid ? <circle cx={spark.mid.x} cy={spark.mid.y} r="3.2" fill={sparkStroke} opacity="0.9" /> : null}
            {sparklineLabel ? (
              <text x={spark.mid?.x || spark.w / 2} y={Math.max(12, (spark.mid?.y || 28) - 10)} textAnchor="middle" className="fill-slate-500" fontSize="10" fontWeight="600">
                {sparklineLabel}
              </text>
            ) : null}
          </svg>
        </div>
      ) : (
        <div className={`mt-auto pt-3 flex items-end gap-3 ${footerLabel === null ? 'justify-end' : 'justify-between'}`}>
          {footerLabel === null ? null : <span className="chip">{footerLabel || 'Last 30 days'}</span>}
          {spark ? (
            <svg width={spark.w} height={spark.h} viewBox={`0 0 ${spark.w} ${spark.h}`} className="shrink-0" aria-hidden="true">
              {sparklineLabel ? (
                <text x="6" y="12" className="fill-slate-500" fontSize="9" fontWeight="600">
                  {sparklineLabel}
                </text>
              ) : null}
              <path d={spark.area} fill={sparkFill} />
              <path d={spark.d} fill="none" stroke={sparkStroke} strokeWidth="2.25" strokeLinecap="round" />
            </svg>
          ) : (
            <span className="chip">Updated today</span>
          )}
        </div>
      )}
    </div>
  );
};

export default SummaryCard;
