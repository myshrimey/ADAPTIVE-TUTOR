'use client';

import { useEffect, useRef, useState } from 'react';

// Animates a number counting up from 0 to `value` once, on mount — used for
// the dashboard's stat tiles so they feel alive instead of static text.
// Respects prefers-reduced-motion by just showing the final value instantly.
export function CountUp({ value, durationMs = 900, decimals = 0, suffix = '' }: { value: number; durationMs?: number; decimals?: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setDisplay(value);
      return;
    }

    const start = performance.now();
    let frame: number;
    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / durationMs);
      // ease-out cubic — fast start, gentle settle, rather than a linear tick
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(value * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <span>
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
}
