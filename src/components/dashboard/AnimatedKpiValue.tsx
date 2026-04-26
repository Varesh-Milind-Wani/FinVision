import React from 'react';
import { useDelayedCountUp } from '../../hooks/useDelayedCountUp';

export default function AnimatedKpiValue({
  value,
  formatValue,
  delayMs = 450,
  durationMs = 1400,
  onPhaseChange,
}: {
  value: number;
  formatValue: (amount: number) => string;
  delayMs?: number;
  durationMs?: number;
  onPhaseChange?: (phase: 'loading' | 'counting' | 'done') => void;
}) {
  const { value: v, phase } = useDelayedCountUp(Number(value) || 0, { delayMs, durationMs, startValue: 0 });
  React.useEffect(() => {
    onPhaseChange?.(phase);
  }, [onPhaseChange, phase]);
  return (
    <span className={`flex-1 min-w-0 flex items-center ${phase === 'loading' ? 'justify-center' : 'justify-start'}`}>
      {phase === 'loading' ? <span className="kpi-loader" aria-label="Loading" /> : formatValue(v)}
    </span>
  );
}
