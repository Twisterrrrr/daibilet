import React from 'react';
import type { CityFaqItem } from '@/lib/city-faq';

/** Native disclosure keeps every question and answer in initial HTML and works without JS. */
export function CityFaqServer({ cityName, items }: { cityName: string; items: CityFaqItem[] }) {
  if (!items.length) return null;
  return (
    <section id="faq" className="scroll-mt-28 border-t border-zinc-200 bg-white py-10 sm:py-12 lg:py-14">
      <div className="container-page max-w-4xl">
        <h2 className="font-display text-2xl font-bold text-zinc-950">Частые вопросы о {cityName}</h2>
        <div className="mt-6 space-y-2">
          {items.map((item, index) => (
            <details key={`${item.question}:${index}`} open={index === 0} className="group rounded-xl border border-zinc-200 bg-white">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-sm font-medium text-zinc-900 [&::-webkit-details-marker]:hidden">
                <span>{item.question}</span>
                <span aria-hidden="true" className="shrink-0 transition-transform group-open:rotate-180">▾</span>
              </summary>
              <div className="px-4 pb-4 text-sm leading-relaxed text-zinc-600">{item.answer}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
