/**
 * Keep score regex in sync with apps/web/src/lib/city-hub-affiche.ts
 */

const TOURIST_AFFICHE_SLUGS = new Set([
  'perm',
  'kaliningrad',
  'nizhny-novgorod',
  'saint-petersburg',
  'moscow',
  'moskva',
  'sankt-peterburg',
  'nizhniy-novgorod',
]);

type RankableSession = {
  category?: string | null;
  title?: string | null;
  eventTitle?: string | null;
  venue?: string | null;
};

export function isTouristAfficheCity(slug: string | null | undefined): boolean {
  const normalized = String(slug || '')
    .trim()
    .toLowerCase();
  return Boolean(normalized) && TOURIST_AFFICHE_SLUGS.has(normalized);
}

function haystack(session: RankableSession): string {
  return `${session.category || ''} ${session.title || ''} ${session.eventTitle || ''} ${session.venue || ''}`.toLowerCase();
}

export function cityHubSessionHitScore(session: RankableSession): number {
  const hay = haystack(session);
  if (/стендап|stand[\s-]?up|standup|comedy|юмор|квиз/.test(hay)) return 1;
  if (/экскур|речн|теплоход|круиз|прогулк|кама|волг|нева/.test(hay)) return 6;
  if (/театр|опер|балет|симфон|филармон/.test(hay)) return 5;
  if (/музе|галере|выставк/.test(hay)) return 4;
  if (/концерт|concert|фестиваль|live/.test(hay)) return 3;
  return 2;
}

export function pickCityHubFeedSessions<T extends RankableSession>(
  sessions: T[],
  slug: string | null | undefined,
  limit: number,
): T[] {
  const cap = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 0;
  if (!cap) return [];
  if (!isTouristAfficheCity(slug)) return sessions.slice(0, cap);
  return [...sessions]
    .sort((a, b) => cityHubSessionHitScore(b) - cityHubSessionHitScore(a))
    .slice(0, cap);
}
