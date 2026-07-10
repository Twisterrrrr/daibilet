import type { PublicLandingPageDto } from '@daibilet/contracts/public';
import { buildPublicLandingPageDto } from '@daibilet/backend/public-read';

import { landingFetchCandidates } from '@/lib/landing-constants';
import { filterSessionsByCity, filterSessionsByGenre, resolveLandingCityName } from '@/lib/landing-city';

export async function fetchLandingPageDto(slug: string): Promise<PublicLandingPageDto | null> {
  for (const candidate of landingFetchCandidates(slug)) {
    const payload = await buildPublicLandingPageDto(candidate);
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
  let sessions = filterSessionsByCity(payload.sessions, cityName);
  sessions = filterSessionsByGenre(sessions, genre);

  return {
    ...payload,
    landing: payload.landing.slug === slug ? payload.landing : { ...payload.landing, slug },
    sessions,
    stats: {
      ...payload.stats,
      events: sessions.length,
      sessions: sessions.length,
    },
  };
}
