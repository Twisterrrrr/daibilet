'use client';

import Link from 'next/link';
import { Search } from 'lucide-react';

import { EventCard } from '@/components/EventCard';
import { cityToPrepositional } from '@/lib/city-declension';
import type { SeoLink } from '@/lib/seo-internal-links';
import type { PublicSessionDto } from '@daibilet/contracts/public';

export type LandingEmptyKind = 'zero' | 'filtered';

type LandingEmptyStateProps = {
  kind: LandingEmptyKind;
  cityName?: string | null;
  relatedSessions?: PublicSessionDto[];
  relatedLinks?: SeoLink[];
  onReset?: () => void;
  /** Seasonal off-season stub (salute-9-may): page stays 200 year-round. */
  offSeasonStub?: boolean;
};

/**
 * Empty / thin landing schedule: never dead-end.
 * Related hits - реальные сессии смежных CHPU / bestsellers города (без fake events).
 */
export function LandingEmptyState({
  kind,
  cityName,
  relatedSessions = [],
  relatedLinks = [],
  onReset,
  offSeasonStub = false,
}: LandingEmptyStateProps) {
  const cityPrep = cityName ? cityToPrepositional(cityName) : null;
  const hits = relatedSessions.slice(0, 4);
  const showHits = hits.length >= 1;

  const title =
    kind === 'zero' && offSeasonStub
      ? 'Праздник уже прошел - ждём следующий сезон'
      : kind === 'zero'
        ? 'Сейчас в этой секции нет активных туров'
        : 'По этим фильтрам вариантов нет';

  const subtitle =
    kind === 'zero' && offSeasonStub
      ? cityPrep
        ? `Программы к салюту 9 мая появятся ближе к майским праздникам. Пока посмотрите популярное в ${cityPrep}.`
        : 'Программы к салюту 9 мая появятся ближе к майским праздникам. Пока посмотрите популярное рядом.'
      : kind === 'zero'
        ? cityPrep
          ? `Но посмотрите ТОП популярных в ${cityPrep} - речные прогулки и хиты города рядом.`
          : 'Но посмотрите ТОП популярных рядом - речные прогулки и хиты города.'
        : 'Снимите город, формат или дату - или смотрите популярные рядом.';

  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-xl text-center">
        <Search className="mx-auto h-7 w-7 text-slate-300" aria-hidden />
        <h3 className="mt-3 text-base font-semibold text-slate-950 sm:text-lg">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p>
        {kind === 'filtered' && onReset ? (
          <button
            type="button"
            onClick={onReset}
            className="mt-4 inline-flex h-10 items-center justify-center rounded-xl border border-primary-200 bg-white px-4 text-sm font-semibold text-primary-700 transition hover:border-primary-300 hover:bg-primary-50"
          >
            Сбросить фильтры
          </button>
        ) : null}
        {relatedLinks.length ? (
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Также смотрите:{' '}
            {relatedLinks.slice(0, 4).map((link, index) => (
              <span key={link.href}>
                {index > 0 ? ', ' : null}
                <Link href={link.href} className="font-medium text-primary-700 underline-offset-2 hover:underline">
                  {link.label}
                </Link>
              </span>
            ))}
            .
          </p>
        ) : null}
      </div>

      {showHits ? (
        <div className="mt-8">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {cityPrep ? `Популярное в ${cityPrep}` : 'Популярное рядом'}
          </h4>
          <ul className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {hits.map((session) => (
              <li key={`${session.id}-${session.startsAt || session.slug}`}>
                <EventCard session={session} compact suppressPurchaseAnchors />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
