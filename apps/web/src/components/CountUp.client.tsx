'use client';

import { useEffect, useRef, useState } from 'react';

import { formatNumber } from '@/lib/format';

type CountUpProps = {
  value: number;
  /** ms for the count animation */
  durationMs?: number;
  className?: string;
  /** Called with the live animated integer (for pluralization wrappers). */
  format?: (n: number) => string;
};

/**
 * Light rAF counter: animates 0→N once when the element enters the viewport.
 */
export function CountUp({ value, durationMs = 900, className, format }: CountUpProps) {
  const target = Math.max(0, Math.round(value || 0));
  const [display, setDisplay] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || started) return;

    if (typeof IntersectionObserver === 'undefined') {
      setDisplay(target);
      setStarted(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        setStarted(true);
      },
      { threshold: 0.35, rootMargin: '0px 0px -8% 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [started, target]);

  useEffect(() => {
    if (!started) return;
    if (target === 0) {
      setDisplay(0);
      return;
    }

    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // easeOutCubic
      const eased = 1 - (1 - t) ** 3;
      setDisplay(Math.round(eased * target));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [started, target, durationMs]);

  const text = format ? format(display) : formatNumber(display);

  return (
    <span ref={ref} className={className} aria-label={format ? format(target) : formatNumber(target)}>
      <span aria-hidden>{text}</span>
    </span>
  );
}
