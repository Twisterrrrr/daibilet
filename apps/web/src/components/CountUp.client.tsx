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
 * Shows the real value on SSR / first paint (so home city cards are not stuck on «0»).
 * Optionally counts 0→N once when the node enters the viewport.
 */
export function CountUp({ value, durationMs = 900, className, format }: CountUpProps) {
  const target = Math.max(0, Math.round(value || 0));
  const [display, setDisplay] = useState(target);
  const ref = useRef<HTMLSpanElement>(null);
  const animatedRef = useRef(false);

  useEffect(() => {
    setDisplay(target);
    animatedRef.current = false;
  }, [target]);

  useEffect(() => {
    const el = ref.current;
    if (!el || target === 0 || animatedRef.current) return;

    let frame = 0;
    const run = () => {
      if (animatedRef.current) return;
      animatedRef.current = true;
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / durationMs);
        const eased = 1 - (1 - t) ** 3;
        setDisplay(Math.round(eased * target));
        if (t < 1) frame = requestAnimationFrame(tick);
        else setDisplay(target);
      };
      setDisplay(0);
      frame = requestAnimationFrame(tick);
    };

    if (typeof IntersectionObserver === 'undefined') {
      run();
      return () => cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        run();
      },
      // Loose thresholds: horizontal city rail on mobile often missed 0.35 + negative rootMargin.
      { threshold: 0.05, rootMargin: '64px 48px' },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [target, durationMs]);

  const text = format ? format(display) : formatNumber(display);
  const finalText = format ? format(target) : formatNumber(target);

  return (
    <span ref={ref} className={className} aria-label={finalText}>
      <span aria-hidden>{text}</span>
    </span>
  );
}
