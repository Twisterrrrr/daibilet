import type { PublicLandingPageDto } from '@daibilet/contracts/public';

import { resolveSessionPriceRange } from '@/lib/event-card-meta';
import { landingFetchCandidates } from '@/lib/landing-constants';
import {
  isSessionInsideLandingWindow,
  resolveLandingEventWindow,
} from '@/lib/landing-event-windows';
import { filterSessionsByCity, filterSessionsByGenre, resolveLandingCityName } from '@/lib/landing-city';
import { resolveSessionTimeZoneForSession } from '@/lib/datetime';
import { fetchPublicApiJson } from '@/server/public-api-client';

function collectStartsAt(session: PublicLandingPageDto['sessions'][number]): Array<string | null | undefined> {
  const slots = Array.isArray(session.upcomingSlots) ? session.upcomingSlots : [];
  return [session.startsAt, ...slots.map((slot) => slot?.startsAt)];
}

function filterSessionsByLandingEventWindow(
  sessions: PublicLandingPageDto['sessions'],
  landingSlug: string,
): PublicLandingPageDto['sessions'] {
  const window = resolveLandingEventWindow(landingSlug);
  if (!window) return sessions;
  return sessions.filter((session) => {
    const times = collectStartsAt(session).filter(Boolean);
    if (!times.length) return false;
    const timeZone = resolveSessionTimeZoneForSession(session);
    return times.some((startsAt) => isSessionInsideLandingWindow(startsAt, window, timeZone));
  });
}

export async function fetchLandingPageDto(
  slug: string,
  citySlug?: string | null,
): Promise<PublicLandingPageDto | null> {
  for (const candidate of landingFetchCandidates(slug)) {
    try {
      const payload = await fetchPublicApiJson<PublicLandingPageDto | null>(
        `/api/public/landings/${encodeURIComponent(candidate)}`,
        {
          searchParams: citySlug ? { city: citySlug } : null,
          timeoutMs: 5_000,
          notFoundAsNull: true,
        },
      );
      if (!payload?.landing) continue;
      if (candidate === slug) return payload;
      return {
        ...payload,
        landing: { ...payload.landing, slug },
      };
    } catch (error) {
      console.warn(`[landing-page] soft-fail candidate=${candidate} during fetch:`, error);
    }
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
  sessions = filterSessionsByLandingEventWindow(sessions, slug);
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
