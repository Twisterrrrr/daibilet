import type { PublicSessionDto } from '@daibilet/contracts/public';

import { filterSessionsByCity, resolveLandingCityName } from '@/lib/landing-city';
import { resolveRelatedLandingCardTargets } from '@/lib/seo-internal-links';
import { shouldShowThinRelatedCards } from '@/lib/seo-listing-meta';
import { fetchLandingPageDto } from '@/server/landing-page';

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

/** SSR thin-cards: 3–4 сессии смежных категорий того же города при 6–7 офферах. */
export async function loadThinRelatedCardSessions(input: {
  landingSlug: string;
  citySlug?: string | null;
  offerCount: number;
}): Promise<PublicSessionDto[]> {
  if (!shouldShowThinRelatedCards(input.offerCount)) return [];
  const citySlug = String(input.citySlug || '').trim();
  if (!citySlug) return [];

  const cityLabel = resolveLandingCityName(citySlug);
  const targets = resolveRelatedLandingCardTargets(input.landingSlug, citySlug, 4);
  const next: PublicSessionDto[] = [];
  const seen = new Set<string>();

  for (const target of targets) {
    if (next.length >= 4) break;
    try {
      const payload = await fetchLandingPageDto(target.slug);
      if (!payload?.sessions?.length) continue;
      const citySessions = filterSessionsByCity(payload.sessions, cityLabel, citySlug);
      const pick = pickSessionForCard(citySessions);
      if (!pick) continue;
      const key = pick.groupKey || pick.id || pick.slug;
      if (seen.has(key)) continue;
      seen.add(key);
      next.push(pick);
    } catch {
      // skip failed related landing
    }
  }

  return next.length >= 3 ? next.slice(0, 4) : [];
}
