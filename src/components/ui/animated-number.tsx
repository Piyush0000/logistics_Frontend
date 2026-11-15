'use client';

import { useEffect, useRef, useState } from 'react';

const DURATION_MS = 700;

/**
 * Counts up to `value` the first time it scrolls into view. The server render and reduced-motion users
 * get the final value straight away, so nothing ever shows a wrong number for long.
 */
const FORMATS = {
  /** 3902 */
  plain: (n: number) => String(Math.round(n)),
  /** 3,902 (Indian grouping) */
  grouped: (n: number) => Math.round(n).toLocaleString('en-IN'),
} as const;

/** A format name, not a function, so server components can pass it. */
export function AnimatedNumber({
  value,
  format = 'grouped',
}: {
  value: number;
  format?: keyof typeof FORMATS;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState<number | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || !Number.isFinite(value)) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / DURATION_MS);
        const eased = 1 - (1 - t) ** 3;
        setShown(t >= 1 ? null : value * eased);
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);

  return (
    <span ref={ref} className="tabular-nums">
      {FORMATS[format](shown ?? value)}
    </span>
  );
}
