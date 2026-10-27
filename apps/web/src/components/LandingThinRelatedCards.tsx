'use client';

import * as React from 'react';

import { EventCard } from '@/components/EventCard';
import { cityToPrepositional } from '@/lib/city-declension';
import { filterSessionsByCity, resolveLandingCityName } from '@/lib/landing-city';
import { resolveRelatedLandingCardTargets } from '@/lib/seo-internal-links';
import { shouldShowThinRelatedCards } from '@/lib/seo-listing-meta';
import type { PublicLandingPageDto, PublicSessionDto } from '@daibilet/contracts/public';

type LandingThinRelatedCardsProps = {
  landingSlug: string;
  citySlug: string;
  cityName: string;
  offerCount: number;
  /** SSR seed (если уже загружены на сервере). */
  initialSessions?: PublicSessionDto[];
};

function pickSessionForCard(sessions: PublicSessionDto[]): PublicSessionDto | null {
  if (!sessions.length) return null;
  const ranked = [...sessions].sort((a, b) => {
    const priceA = typeof a.priceFrom === 'number' && a.priceFrom >= 100 ? a.priceFrom : 50_000;
    const priceB = typeof b.priceFrom === 'number' && b.priceFrom >= 100 ? b.priceFrom : 50_000;
    const imgA = a.imageUrl ? 0 : 1;
    const imgB = b.imageUrl ? 0 : 1;
    return imgA - imgB || priceA - priceB;
  });
  return ranked[0] || null;
}

/**
 * Thin-content trick: при ровно 6–7 офферах на indexable CHPU -
 * карточки смежных категорий того же города (доп. к текстовому «Смотрите также»).
 */
export function LandingThinRelatedCards({
  landingSlug,
  citySlug,
  cityName,
  offerCount,
  initialSessions = [],
}: LandingThinRelatedCardsProps) {
  const enabled = shouldShowThinRelatedCards(offerCount) && Boolean(citySlug && cityName);
  const seedKey = initialSessions.map((s) => s.id || s.slug).join('|');
  const [cards, setCards] = React.useState<PublicSessionDto[]>(
    () => (enabled && initialSessions.length >= 3 ? initialSessions.slice(0, 4) : []),
  );

  React.useEffect(() => {
    if (!enabled) {
      setCards([]);
      return;
    }
    if (initialSessions.length >= 3) {
      setCards(initialSessions.slice(0, 4));
      return;
    }

    let disposed = false;
    const targets = resolveRelatedLandingCardTargets(landingSlug, citySlug, 4);
    const cityLabel = resolveLandingCityName(citySlug) || cityName;

    (async () => {
      const next: PublicSessionDto[] = [];
      const seen = new Set<string>();

      for (const target of targets) {
        if (next.length >= 4) break;
        try {
          const response = await fetch(`/api/public/landings/${encodeURIComponent(target.slug)}`);
          if (!response.ok) continue;
          const data = (await response.json()) as PublicLandingPageDto | null;
          if (!data?.sessions?.length) continue;
          const citySessions = filterSessionsByCity(data.sessions, cityLabel, citySlug);
          const pick = pickSessionForCard(citySessions);
          if (!pick) continue;
          const key = pick.groupKey || pick.id || pick.slug;
          if (!key || seen.has(key)) continue;
          seen.add(key);
          next.push(pick);
        } catch {
          // skip failed related landing
        }
      }

      if (!disposed) {
        if (next.length >= 3) {
          setCards(next.slice(0, 4));
          return;
        }
        // Fallback: popular catalog for the city (thin cities often lack sibling landings).
        try {
          const response = await fetch(
            `/api/public/events?city=${encodeURIComponent(cityLabel)}&limit=40&sort=popular`,
          );
          if (response.ok) {
            const data = (await response.json()) as { items?: PublicSessionDto[] };
            for (const item of data.items || []) {
              if (next.length >= 4) break;
              const key = item.groupKey || item.id || item.slug;
              if (!key || seen.has(key)) continue;
              seen.add(key);
              next.push(item);
            }
          }
        } catch {
          // optional
        }
        setCards(next.length >= 3 ? next.slice(0, 4) : []);
      }
    })();

    return () => {
      disposed = true;
    };
  }, [enabled, landingSlug, citySlug, cityName, seedKey]);

  if (!enabled || cards.length < 3) return null;

  const cityPrep = cityToPrepositional(cityName);

  return (
    <section
      className="border-t border-slate-100 py-8"
      aria-label={`Другие интересные события в ${cityPrep}`}
    >
      <h2 className="text-xl font-semibold text-slate-900 md:text-2xl">
        Другие интересные события в {cityPrep}
      </h2>
      <ul className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {cards.slice(0, 4).map((session) => (
          <li key={`${session.id}-${session.startsAt || session.slug}`}>
            <EventCard session={session} suppressPurchaseAnchors />
          </li>
        ))}
      </ul>
    </section>
  );
}
