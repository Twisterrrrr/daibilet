import { parseSessionStartsAt } from '@/lib/datetime';
import { isHomeRailTabooSession } from '@/lib/home-rail-taboos';
import { normalizeSessionImageKey, sessionHasCoverImage, spreadCatalogSessionsByCoverImage, spreadSessionsForGrid } from '@/lib/session-cover-image';
import type { PublicSessionDto } from '@daibilet/contracts/public';

type PublicSession = PublicSessionDto;

export const HOME_SHOWCASE_LIMIT = 8;
export const HOME_POPULAR_LIMIT = 6;

export type HomePickState = {
  seenIds: Set<string>;
  seenTitles: Set<string>;
  seenImages: Set<string>;
  seenFamilies: Set<string>;
};

function isFeaturedEvent(event: PublicSession): boolean {
  return event.manualLandingStatus === 'PINNED';
}

function popularScore(event: PublicSession): number {
  let score = (event.sessionCount || 1) * 1000;
  if (isFeaturedEvent(event)) score += 1_000_000;
  if (Number.isFinite(event.priceFrom) && event.priceFrom! > 0) {
    score += Math.max(0, 5000 - event.priceFrom!);
  }
  return score;
}

function sessionDedupeKey(event: PublicSession): string {
  const groupKey = String(event.groupKey || '').trim().toLowerCase();
  if (groupKey) return `group:${groupKey}`;
  return `title:${String(event.title || '').trim().toLowerCase()}`;
}

/**
 * Family key for showcase rails: collapse near-duplicate ticket products
 * (e.g. «Комбо 1/2/5/7» at the same venue) into one card.
 */
export function sessionFamilyKey(event: PublicSession): string {
  const groupKey = String(event.groupKey || '').trim().toLowerCase();
  if (groupKey.startsWith('merge|')) return `merge:${groupKey}`;

  const venueKey = String(event.venueId || event.venueSlug || event.venue || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  const title = String(event.title || '').trim().toLowerCase();

  // «Комбо 1», «Комбо 7», «Комбо …» на одной площадке → одна карточка
  // Не используем \b: в JS граница слова не работает с кириллицей.
  if (venueKey && (/^комбо(?:\s|$|[-–—\d])/i.test(title) || /(?:^|[\s([{«"'])комбо\s*\d+/i.test(title))) {
    return `combo-venue:${venueKey}`;
  }

  // Одинаковая площадка + «комбо #» после нормализации цифр
  if (venueKey && title && /\d/.test(title)) {
    const stem = title.replace(/\d+/g, '#').replace(/\s+/g, ' ').trim();
    if (/^комбо(?:\s*#|\s|$)/.test(stem)) {
      return `combo-venue:${venueKey}`;
    }
  }

  return sessionDedupeKey(event);
}

export function createHomePickState(seed?: Partial<HomePickState>): HomePickState {
  return {
    seenIds: new Set(seed?.seenIds),
    seenTitles: new Set(seed?.seenTitles),
    seenImages: new Set(seed?.seenImages),
    seenFamilies: new Set(seed?.seenFamilies),
  };
}

function takeUnique(events: PublicSession[], max: number, state: HomePickState): PublicSession[] {
  const result: PublicSession[] = [];
  for (const event of events) {
    if (!sessionHasCoverImage(event)) continue;
    if (isHomeRailTabooSession(event)) continue;
    const dedupeKey = sessionDedupeKey(event);
    const familyKey = sessionFamilyKey(event);
    if (state.seenIds.has(event.id) || state.seenTitles.has(dedupeKey) || state.seenFamilies.has(familyKey)) continue;
    const imageKey = normalizeSessionImageKey(event.imageUrl);
    if (imageKey && state.seenImages.has(imageKey)) continue;

    state.seenIds.add(event.id);
    state.seenTitles.add(dedupeKey);
    state.seenFamilies.add(familyKey);
    if (imageKey) state.seenImages.add(imageKey);
    result.push(event);
    if (result.length >= max) break;
  }
  return result;
}

function isWithinNextDays(event: PublicSession, days: number): boolean {
  const isos = [event.startsAt, ...(event.upcomingSlots || []).map((slot) => slot.startsAt)].filter(Boolean) as string[];
  const now = Date.now();
  const horizon = now + days * 24 * 60 * 60 * 1000;
  return isos.some((iso) => {
    const time = parseSessionStartsAt(iso).getTime();
    return Number.isFinite(time) && time >= now - 60_000 && time <= horizon;
  });
}

export function buildEditorsPickEvents(
  sessions: PublicSession[],
  limit = HOME_SHOWCASE_LIMIT,
  state = createHomePickState(),
): PublicSession[] {
  // Pin first (taboo / image-dupes skipped), then fill from the rest so rails stay full.
  const pinned = [...sessions.filter(isFeaturedEvent)].sort((a, b) => popularScore(b) - popularScore(a));
  const picked = takeUnique(pinned, limit, state);
  if (picked.length >= limit) return picked;

  const rest = [...sessions].sort((a, b) => popularScore(b) - popularScore(a));
  return picked.concat(takeUnique(rest, limit - picked.length, state));
}

export function buildThisWeekEvents(
  sessions: PublicSession[],
  limit = HOME_SHOWCASE_LIMIT,
  state = createHomePickState(),
): PublicSession[] {
  const candidates = [...sessions]
    .filter((event) => !state.seenIds.has(event.id) && isWithinNextDays(event, 7))
    .sort((a, b) => parseSessionStartsAt(a.startsAt).getTime() - parseSessionStartsAt(b.startsAt).getTime());
  return takeUnique(candidates, limit, state);
}

export function buildPopularEvents(
  sessions: PublicSession[],
  limit = HOME_POPULAR_LIMIT,
  state = createHomePickState(),
): PublicSession[] {
  const candidates = [...sessions]
    .filter((event) => !state.seenIds.has(event.id))
    .sort((a, b) => popularScore(b) - popularScore(a));
  return takeUnique(candidates, limit, state);
}

export function buildHomeShowcaseBundles(sessions: PublicSession[], state = createHomePickState()) {
  const editorsPick = spreadCatalogSessionsByCoverImage(
    buildEditorsPickEvents(sessions, HOME_SHOWCASE_LIMIT, state),
  );
  const thisWeek = spreadCatalogSessionsByCoverImage(
    buildThisWeekEvents(sessions, HOME_SHOWCASE_LIMIT, state),
  );
  const popular = spreadSessionsForGrid(buildPopularEvents(sessions, HOME_POPULAR_LIMIT, state), 3);
  return { editorsPick, thisWeek, popular };
}

export function isEditorsPickEvent(event: PublicSession): boolean {
  return isFeaturedEvent(event);
}

function recommendBadgeBucket(eventId: string): number {
  let hash = 0;
  for (let i = 0; i < eventId.length; i += 1) {
    hash = (hash * 31 + eventId.charCodeAt(i)) >>> 0;
  }
  return hash % 10;
}

/** Бейдж «Рекомендуем» — примерно 1 карточка из 10 среди сильных кандидатов. */
export function isRecommendBadgeEvent(event: PublicSession): boolean {
  if (recommendBadgeBucket(event.id) !== 0) return false;
  if (isFeaturedEvent(event)) return true;
  return (event.sessionCount || 0) >= 8 && (event.landingSlugs?.length || 0) > 0;
}

export function isHitEvent(event: PublicSession): boolean {
  if (isRecommendBadgeEvent(event)) return false;
  return (event.sessionCount || 0) >= 4 || (event.landingSlugs?.length || 0) > 0;
}
