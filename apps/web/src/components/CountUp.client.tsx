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

function animateValue(
  start: number,
  end: number,
  durationMs: number,
  onFrame: (n: number) => void,
): () => void {
  if (start === end) {
    onFrame(end);
    return () => undefined;
  }
  let frame = 0;
  let startTs: number | null = null;
  const step = (ts: number) => {
    if (startTs == null) startTs = ts;
    const progress = Math.min(1, (ts - startTs) / durationMs);
    // easeOutCubic
    const eased = 1 - (1 - progress) ** 3;
    onFrame(Math.round(start + (end - start) * eased));
    if (progress < 1) frame = window.requestAnimationFrame(step);
    else onFrame(end);
  };
  frame = window.requestAnimationFrame(step);
  return () => window.cancelAnimationFrame(frame);
}

/**
 * Real count on SSR / first paint (no stuck «0 событий» on home city rail).
 * Animates 0→N once when the node enters the viewport (carousel-safe IO).
 */
export function CountUp({ value, durationMs = 1000, className, format }: CountUpProps) {
  const target = Math.max(0, Math.round(value || 0));
  // Critical: initial state = target so SSR and first client frame show the truth.
  const [count, setCount] = useState(target);
  const elementRef = useRef<HTMLSpanElement>(null);
  const hasAnimatedRef = useRef(false);
  const cancelAnimRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setCount(target);
    hasAnimatedRef.current = false;
  }, [target]);

  useEffect(() => {
    if (target === 0 || hasAnimatedRef.current) return;
    const el = elementRef.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      hasAnimatedRef.current = true;
      cancelAnimRef.current = animateValue(0, target, durationMs, setCount);
      return () => cancelAnimRef.current?.();
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || hasAnimatedRef.current) continue;
          hasAnimatedRef.current = true;
          cancelAnimRef.current?.();
          cancelAnimRef.current = animateValue(0, target, durationMs, setCount);
          observer.unobserve(entry.target);
        }
      },
      {
        // Horizontal rail: trigger a bit before the card is fully on screen (mobile swipe).
        rootMargin: '0px 50px 0px 50px',
        threshold: 0.01,
      },
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimRef.current?.();
    };
  }, [target, durationMs]);

  const text = format ? format(count) : formatNumber(count);
  const finalText = format ? format(target) : formatNumber(target);

  return (
    <span ref={elementRef} className={className} aria-label={finalText}>
      <span aria-hidden>{text}</span>
    </span>
  );
}
