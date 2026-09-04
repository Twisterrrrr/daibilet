'use client';

import * as React from 'react';

import { formatNumber } from '@/lib/format';

type StatItem = {
  value: number;
  label: string;
  hint: string;
};

function useCountUp(target: number, active: boolean, durationMs = 1100) {
  const [value, setValue] = React.useState(0);

  React.useEffect(() => {
    if (!active || target <= 0) {
      setValue(active ? target : 0);
      return;
    }

    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - progress) ** 3;
      setValue(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, durationMs, target]);

  return value;
}

function StatCard({ item, active, staggerMs }: { item: StatItem; active: boolean; staggerMs: number }) {
  const [ready, setReady] = React.useState(false);
  const display = useCountUp(item.value, ready);

  React.useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(() => setReady(true), staggerMs);
    return () => window.clearTimeout(timer);
  }, [active, staggerMs]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
      <p className="text-4xl font-extrabold tracking-tight text-slate-900 md:text-5xl">
        {formatNumber(display)}
        <span className="text-primary-600">+</span>
      </p>
      <p className="mt-2 text-base font-bold text-slate-900">{item.label}</p>
      <p className="mt-1 text-sm leading-6 text-slate-500">{item.hint}</p>
    </div>
  );
}

export function PartnershipStatCounters({ items }: { items: StatItem[] }) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const [active, setActive] = React.useState(false);

  React.useEffect(() => {
    const node = rootRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setActive(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={rootRef} className="grid gap-4 sm:grid-cols-3">
      {items.map((item, index) => (
        <StatCard key={item.label} item={item} active={active} staggerMs={index * 120} />
      ))}
    </div>
  );
}
