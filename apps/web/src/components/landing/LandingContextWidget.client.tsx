'use client';

import * as React from 'react';

import type { LandingContextWidgetConfig } from '@/data/landing-context-widgets';

type Props = {
  config: LandingContextWidgetConfig;
  /** When provided, chips act as soft client filters (text match). */
  activeChip?: string | null;
  onChipSelect?: (match: string | null) => void;
};

/**
 * Text-first context block for CHPU landings (Clean UI).
 * No fake ratings, no icon clusters, no card-heavy layout.
 */
export function LandingContextWidget({ config, activeChip = null, onChipSelect }: Props) {
  const interactive = typeof onChipSelect === 'function';

  return (
    <section className="border-t border-border py-10" aria-labelledby={`landing-context-${config.slug}`}>
      <h2 id={`landing-context-${config.slug}`} className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
        {config.title}
      </h2>
      <p className="mt-3 max-w-3xl text-base leading-relaxed text-muted-foreground">{config.lead}</p>

      {config.chips.length ? (
        <div className="mt-5 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {interactive ? (
            <button
              type="button"
              onClick={() => onChipSelect?.(null)}
              className={`shrink-0 whitespace-nowrap rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                !activeChip
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
              }`}
            >
              Все темы
            </button>
          ) : null}
          {config.chips.map((chip) => {
            const key = chip.match || chip.label;
            const selected = Boolean(activeChip && chip.match && activeChip === chip.match);
            const className = `shrink-0 whitespace-nowrap rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
              selected
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-foreground hover:border-primary/40 hover:text-primary'
            }`;
            if (interactive && chip.match) {
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onChipSelect?.(selected ? null : chip.match!)}
                  className={className}
                >
                  {chip.label}
                </button>
              );
            }
            return (
              <span key={key} className="shrink-0 whitespace-nowrap rounded-lg border border-border bg-surface-muted/60 px-3 py-1.5 text-sm font-medium text-graphite-muted">
                {chip.label}
              </span>
            );
          })}
        </div>
      ) : null}

      {config.tips.length ? (
        <ol className="mt-8 max-w-3xl space-y-4">
          {config.tips.map((tip, index) => (
            <li key={tip.title} className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
                {index + 1}
              </span>
              <div>
                <div className="text-sm font-semibold text-foreground">{tip.title}</div>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{tip.text}</p>
              </div>
            </li>
          ))}
        </ol>
      ) : null}

      {config.audience?.length ? (
        <div className="mt-8 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Кому подойдёт</p>
          <p className="mt-2 text-sm leading-relaxed text-foreground">{config.audience.join(' · ')}</p>
        </div>
      ) : null}
    </section>
  );
}
