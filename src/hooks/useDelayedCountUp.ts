import * as React from 'react';

type Options = {
  delayMs?: number;
  durationMs?: number;
  startValue?: number;
};

export function useDelayedCountUp(targetValue: number, { delayMs = 3000, durationMs = 7000, startValue = 0 }: Options = {}) {
  const [value, setValue] = React.useState(startValue);
  const [phase, setPhase] = React.useState<'loading' | 'counting' | 'done'>('loading');

  React.useEffect(() => {
    let rafId = 0;
    let timeoutId = 0;
    let lastCommitTs = 0;
    const frameMs = 1000 / 30; // throttle renders (~30fps) to avoid jank on heavy dashboards

    setPhase('loading');
    setValue(startValue);

    timeoutId = window.setTimeout(() => {
      setPhase('counting');
      const startTs = performance.now();

      const tick = (ts: number) => {
        const t = Math.min(1, (ts - startTs) / Math.max(1, durationMs));
        // Smooth and steady over the whole duration (ease-in-out)
        const eased = 0.5 - 0.5 * Math.cos(Math.PI * t);
        const next = startValue + (targetValue - startValue) * eased;
        if (t >= 1 || ts - lastCommitTs >= frameMs) {
          lastCommitTs = ts;
          setValue(next);
        }
        if (t < 1) rafId = window.requestAnimationFrame(tick);
        else {
          setValue(targetValue);
          setPhase('done');
        }
      };

      rafId = window.requestAnimationFrame(tick);
    }, Math.max(0, delayMs));

    return () => {
      window.clearTimeout(timeoutId);
      window.cancelAnimationFrame(rafId);
    };
  }, [delayMs, durationMs, startValue, targetValue]);

  return { value, phase, isLoading: phase === 'loading', isDone: phase === 'done' };
}
