import type { PublicLandingPageDto } from '@daibilet/contracts/public';
import { buildPublicLandingPageDto } from '@daibilet/backend/public-read';

import { resolveSessionPriceRange } from '@/lib/event-card-meta';
import { landingFetchCandidates } from '@/lib/landing-constants';
import { filterSessionsByCity, filterSessionsByGenre, resolveLandingCityName } from '@/lib/landing-city';

export async function fetchLandingPageDto(
  slug: string,
  citySlug?: string | null,
): Promise<PublicLandingPageDto | null> {
  for (const candidate of landingFetchCandidates(slug)) {
    const payload = await buildPublicLandingPageDto(candidate, false, citySlug);
    if (!payload?.landing) continue;
    if (candidate === slug) return payload;
    return {
      ...payload,
      landing: { ...payload.landing, slug },
    };
  }
  return null;
}

export function finalizeLandingPayload(
  payload: PublicLandingPageDto,
  slug: string,
  citySlug?: string | null,
  genre?: string | null,
): PublicLandingPageDto {
  const cityName = resolveLandingCityName(citySlug);
  let sessions = filterSessionsByCity(payload.sessions, cityName, citySlug);
  sessions = filterSessionsByGenre(sessions, genre);
  const { priceFrom, priceTo } = resolveSessionPriceRange(sessions);
  // SSR grid is capped (48). Keep API uncapped matchCount when finalize did not drop rows
  // (national page, or city already scoped in buildPublicLandingPage*).
  const apiEvents = Number(payload.stats?.events);
  const filteredSame = sessions.length === payload.sessions.length;
  const useApiCount = Number.isFinite(apiEvents) && apiEvents >= sessions.length && filteredSame;
  const eventCount = useApiCount ? apiEvents : sessions.length;

  return {
    ...payload,
    landing: {
      ...(payload.landing.slug === slug ? payload.landing : { ...payload.landing, slug }),
      events: eventCount,
    },
    sessions,
    stats: {
      ...payload.stats,
      events: eventCount,
      sessions: eventCount,
      priceFrom,
      priceTo,
    },
  };
}
