import React from 'react';

type PortfolioGraphData = number[] | { value: number }[];

export type PortfolioCardProps = {
  portfolioTitle: string;
  totalBalance: number | string;
  growthPercentage: number | string;
  month: string;
  year: number | string;
  secondaryAmount: number | string;
  graphData: PortfolioGraphData;
  onDeposit?: () => void;
};

const isTemplatePlaceholder = (v: unknown) => typeof v === 'string' && v.includes('{{') && v.includes('}}');

const formatINR = (value: number | string) => {
  if (isTemplatePlaceholder(value)) {
    const raw = String(value);
    return raw.includes('₹') ? raw : `₹${raw}`;
  }
  if (typeof value === 'string') return value;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);
};

const toSeries = (graphData: PortfolioGraphData): number[] => {
  if (Array.isArray(graphData)) {
    const arr = (graphData as any[]).map((p) => (typeof p === 'number' ? p : Number(p?.value)));
    const clean = arr.filter((n) => Number.isFinite(n)) as number[];
    return clean.length >= 2 ? clean : clean.length === 1 ? [clean[0], clean[0]] : [];
  }
  return [];
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

// Catmull-Rom to cubic Bezier path for smooth "premium" curves.
const buildSmoothPath = (points: { x: number; y: number }[]) => {
  if (points.length < 2) return '';
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

  const tension = 0.85;
  const d: string[] = [`M ${points[0].x} ${points[0].y}`];

  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    const cp1x = p1.x + ((p2.x - p0.x) / 6) * tension;
    const cp1y = p1.y + ((p2.y - p0.y) / 6) * tension;
    const cp2x = p2.x - ((p3.x - p1.x) / 6) * tension;
    const cp2y = p2.y - ((p3.y - p1.y) / 6) * tension;
    d.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`);
  }

  return d.join(' ');
};

const PortfolioCard = ({
  portfolioTitle,
  totalBalance,
  growthPercentage,
  month,
  year,
  secondaryAmount,
  graphData,
  onDeposit,
}: PortfolioCardProps) => {
  const series = React.useMemo(() => toSeries(graphData), [graphData]);

  const chart = React.useMemo(() => {
    const width = 560;
    const height = 160;
    const padX = 14;
    const padTop = 18;
    const padBottom = 28;
    const innerW = width - padX * 2;
    const innerH = height - padTop - padBottom;

    if (!series.length) {
      return {
        width,
        height,
        lineD: '',
        areaD: '',
        points: [] as { x: number; y: number }[],
      };
    }

    const min = Math.min(...series);
    const max = Math.max(...series);
    const range = max - min || 1;
    const softPad = range * 0.12;
    const yMin = min - softPad;
    const yMax = max + softPad;
    const safeRange = yMax - yMin || 1;

    const points = series.map((v, i) => {
      const t = series.length === 1 ? 0 : i / (series.length - 1);
      const x = padX + innerW * t;
      const yNorm = (v - yMin) / safeRange;
      const y = padTop + innerH * (1 - clamp(yNorm, 0, 1));
      return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
    });

    const lineD = buildSmoothPath(points);
    const areaD =
      lineD && points.length
        ? `${lineD} L ${points[points.length - 1].x} ${height - padBottom} L ${points[0].x} ${height - padBottom} Z`
        : '';

    return { width, height, lineD, areaD, points };
  }, [series]);

  const highlight = chart.points.length ? chart.points[chart.points.length - 1] : null;

  return (
    <section
      className="relative w-full overflow-hidden rounded-[28px] bg-gradient-to-b from-slate-50 to-white ring-1 ring-black/[0.06] shadow-[0_18px_40px_-26px_rgba(15,23,42,0.55)]"
      aria-label={portfolioTitle}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full bg-gradient-to-br from-slate-200/70 to-transparent blur-2xl" />
        <div className="absolute -bottom-16 -left-16 h-44 w-44 rounded-full bg-gradient-to-tr from-emerald-200/40 to-transparent blur-2xl" />
        <div className="absolute inset-0 bg-white/50 backdrop-blur-md" />
      </div>

      <div className="relative p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[12px] font-semibold tracking-tight text-slate-700">{portfolioTitle}</div>
            <div className="mt-2">
              <div className="text-[30px] leading-[34px] sm:text-[34px] sm:leading-[38px] font-extrabold tracking-tight text-slate-950">
                {formatINR(totalBalance)}
              </div>

              {(() => {
                const placeholder = isTemplatePlaceholder(growthPercentage);
                const parsed = Number(growthPercentage);
                const hasNumber = !placeholder && Number.isFinite(parsed);
                const positive = hasNumber ? parsed >= 0 : true;
                const pctText = placeholder
                  ? String(growthPercentage)
                  : `${positive ? '+' : '−'}${Math.abs(parsed || 0).toFixed(1)}%`;

                return (
                  <div
                    className={[
                      'mt-2 inline-flex items-start gap-2 rounded-2xl px-3 py-2 ring-1 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.55)]',
                      positive ? 'bg-emerald-50/80 ring-emerald-200/70' : 'bg-rose-50/80 ring-rose-200/70',
                    ].join(' ')}
                    aria-label="Compared to previous month"
                  >
                    <span
                      className={[
                        'mt-[1px] grid h-6 w-6 place-items-center rounded-xl ring-1',
                        positive ? 'bg-emerald-600 text-white ring-emerald-500/40' : 'bg-rose-600 text-white ring-rose-500/40',
                      ].join(' ')}
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                        {positive ? (
                          <path fill="currentColor" d="M7 14l5-5 5 5 1.4-1.4-6.4-6.4-6.4 6.4L7 14z" />
                        ) : (
                          <path fill="currentColor" d="M7 10l5 5 5-5 1.4 1.4-6.4 6.4-6.4-6.4L7 10z" />
                        )}
                      </svg>
                    </span>
                    <div className="min-w-0">
                      <div className={['text-[12px] font-extrabold tracking-tight', positive ? 'text-emerald-800' : 'text-rose-800'].join(' ')}>
                        {pctText}
                      </div>
                      <div className={['text-[10px] font-semibold', positive ? 'text-emerald-700/90' : 'text-rose-700/90'].join(' ')}>
                        Compared to previous month
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500">
              <div className="font-semibold text-slate-600">
                {month}, {year}
              </div>
              <span className="h-1 w-1 rounded-full bg-slate-300" aria-hidden="true" />
              <div className="font-semibold text-slate-700">{formatINR(secondaryAmount)}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={onDeposit}
            className="shrink-0 inline-flex items-center gap-2 rounded-full bg-slate-950 text-white px-4 py-2 text-[12px] font-semibold shadow-[0_12px_26px_-18px_rgba(0,0,0,0.9)] hover:bg-black focus:outline-none focus:ring-2 focus:ring-slate-400/40"
          >
            <span className="grid h-5 w-5 place-items-center rounded-full bg-white/12 ring-1 ring-white/10">
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                <path fill="currentColor" d="M11 5h2v14h-2z" />
                <path fill="currentColor" d="M5 11h14v2H5z" />
              </svg>
            </span>
            Deposit
          </button>
        </div>

        <div className="mt-4 rounded-2xl bg-white/55 ring-1 ring-black/[0.05] shadow-[0_12px_28px_-22px_rgba(15,23,42,0.5)] overflow-hidden">
          <div className="relative h-[150px] sm:h-[168px]">
            <svg
              viewBox={`0 0 ${chart.width} ${chart.height}`}
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="portfolio-line" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="rgba(15,23,42,0.20)" />
                  <stop offset="35%" stopColor="rgba(15,23,42,0.62)" />
                  <stop offset="100%" stopColor="rgba(15,23,42,0.35)" />
                </linearGradient>
                <linearGradient id="portfolio-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(16,185,129,0.20)" />
                  <stop offset="70%" stopColor="rgba(16,185,129,0.06)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                </linearGradient>
                <filter id="portfolio-glow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="2.2" result="blur" />
                  <feColorMatrix
                    in="blur"
                    type="matrix"
                    values="
                      1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      0 0 0 0.35 0
                    "
                    result="glow"
                  />
                  <feMerge>
                    <feMergeNode in="glow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {chart.areaD ? <path d={chart.areaD} fill="url(#portfolio-area)" /> : null}
              {chart.lineD ? <path d={chart.lineD} fill="none" stroke="url(#portfolio-line)" strokeWidth="3.2" filter="url(#portfolio-glow)" /> : null}

              {highlight ? (
                <>
                  <circle cx={highlight.x} cy={highlight.y} r="9" fill="rgba(16,185,129,0.16)" />
                  <circle cx={highlight.x} cy={highlight.y} r="5" fill="#ffffff" stroke="rgba(16,185,129,0.92)" strokeWidth="2.5" />
                </>
              ) : null}
            </svg>

            <div className="absolute inset-x-0 bottom-0 px-5 pb-4">
              <div className="flex items-end justify-between gap-4">
                <div className="text-[10px] font-semibold text-slate-500">Performance</div>
                <div className="text-[10px] font-semibold text-slate-500">Live analytics</div>
              </div>
              <div className="mt-2 h-px w-full bg-gradient-to-r from-transparent via-slate-200/90 to-transparent" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PortfolioCard;
