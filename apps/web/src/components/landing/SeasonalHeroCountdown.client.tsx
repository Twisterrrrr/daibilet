'use client';

import { Clock } from 'lucide-react';
import * as React from 'react';

import {
  daysUntilLocal,
  formatDaysRu,
  resolveSeasonalCountdownKind,
  resolveSeasonalCountdownTarget,
  seasonalCountdownLabel,
  type SeasonalCountdownKind,
} from '@/lib/seasonal-hero-countdown';

export type { SeasonalCountdownKind };
export { resolveSeasonalCountdownKind };

export function useSeasonalDaysCountdown(kind: SeasonalCountdownKind) {
  const [days, setDays] = React.useState(() => daysUntilLocal(resolveSeasonalCountdownTarget(kind)));

  React.useEffect(() => {
    const tick = () => setDays(daysUntilLocal(resolveSeasonalCountdownTarget(kind)));
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [kind]);

  return { days, label: seasonalCountdownLabel(kind), isToday: days === 0 };
}

/**
 * Days countdown for dated/seasonal landings.
 * Inspired by bridges hero card chrome - NOT palace-bridge hours.
 */
export function SeasonalHeroCountdown({
  kind,
  onViewSchedule,
}: {
  kind: SeasonalCountdownKind;
  onViewSchedule?: () => void;
}) {
  const { days, label, isToday } = useSeasonalDaysCountdown(kind);

  return (
    <div className="mt-2 space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-4 rounded-2xl border border-primary-foreground/20 bg-primary-foreground/10 px-5 py-4 shadow-lg backdrop-blur-md">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-foreground/15 text-primary-foreground">
            <Clock className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary-foreground/60">{label}</p>
            <p className="mt-0.5 text-2xl font-semibold tabular-nums text-primary-foreground">
              {isToday ? 'сегодня' : formatDaysRu(days)}
            </p>
          </div>
        </div>
        {onViewSchedule ? (
          <button
            type="button"
            onClick={onViewSchedule}
            className="inline-flex items-center rounded-full border border-primary-foreground/25 px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary-foreground/10"
          >
            Смотреть расписание
          </button>
        ) : null}
      </div>
    </div>
  );
}
