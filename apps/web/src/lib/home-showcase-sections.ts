import { parseSessionStartsAt } from './datetime';
import { isHomeRailTabooSession } from './home-rail-taboos';
import {
  collectSessionImageDedupeKeys,
  sessionHasCoverImage,
  spreadCatalogSessionsByCoverImage,
  spreadSessionsForGrid,
} from './session-cover-image';
import type { PublicSessionDto } from '@daibilet/contracts/public';

type PublicSession = PublicSessionDto;

export type SessionFamilySource = {
  groupKey?: string | null;
  venueId?: string | null;
  venueSlug?: string | null;
  venue?: string | null;
  title?: string | null;
};

export function isComboSessionTitle(title: string | null | undefined): boolean {
  const value = String(title || '').trim().toLowerCase();
  if (!value) return false;
  if (/^комбо(?:\s|$|[-–—\d])/i.test(value) || /(?:^|[\s([{«"'])комбо\s*\d+/i.test(value)) {
    return true;
  }
  if (/\d/.test(value)) {
    const stem = value.replace(/\d+/g, '#').replace(/\s+/g, ' ').trim();
    return /^комбо(?:\s*#|\s|$)/.test(stem);
  }
  return false;
}

export const HOME_SHOWCASE_LIMIT = 8;
export const HOME_POPULAR_LIMIT = 6;

/** Soft mix so «Мероприятия» / museums are not drowned by excursion clones. */
const EDITORS_CATEGORY_CYCLE = [
  'Мероприятия',
  'Экскурсии',
  'Музеи и арт',
  'Концерты',
  'Театр',
  'Речные прогулки',
  'Активный отдых',
  'Развлечения',
] as const;

const EDITORS_MAX_PER_CATEGORY = 3;

export type HomePickState = {
  seenIds: Set<string>;
  seenTitles: Set<string>;
  seenImages: Set<string>;
  seenFamilies: Set<string>;
  seenThemes: Set<string>;
  /** URL → content fingerprint (etag:...), from HEAD at home build time. */
  fingerprints: Map<string, string>;
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
export function sessionFamilyKey(event: SessionFamilySource): string {
  const groupKey = String(event.groupKey || '').trim().toLowerCase();
  if (groupKey.startsWith('merge|')) return `merge:${groupKey}`;

  const venueKey = String(event.venueId || event.venueSlug || event.venue || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

  // «Комбо 1», «Комбо 7», «Комбо …» на одной площадке → одна карточка
  if (venueKey && isComboSessionTitle(event.title)) {
    return `combo-venue:${venueKey}`;
  }

  return sessionDedupeKey(event as PublicSession);
}

/** Keep the first combo ticket per venue; leave unrelated events untouched. */
export function collapseCatalogComboFamilies<T extends SessionFamilySource>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = sessionFamilyKey(item);
    if (!key.startsWith('combo-venue:')) {
      out.push(item);
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export function createHomePickState(seed?: Partial<HomePickState>): HomePickState {
  return {
    seenIds: new Set(seed?.seenIds),
    seenTitles: new Set(seed?.seenTitles),
    seenImages: new Set(seed?.seenImages),
    seenFamilies: new Set(seed?.seenFamilies),
    seenThemes: new Set(seed?.seenThemes),
    fingerprints: seed?.fingerprints ?? new Map(),
  };
}

/**
 * Collapse near-identical tourist products that reuse the same stock Hermitage /
 * night-city flyer under different CDN asset ids (fingerprints often missing client-side).
 */
export function sessionEditorsThemeKey(event: Pick<PublicSession, 'title' | 'category'>): string | null {
  const title = String(event.title || '')
    .toLowerCase()
    .replace(/[«»""„]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!title) return null;

  if (/ночн\w*\s+петербург|вечерн\w*\s+петербург|петербург.*лахат|лахта.*петербург|магия огней|от классики до футури/i.test(title)) {
    return 'theme:spb-night-tour';
  }
  if (/пушкин|царск\w*\s+сел/i.test(title)) {
    return 'theme:spb-pushkin-tour';
  }
  if (/ночн\w*\s+москв|вечерн\w*\s+москв|москва\s+ситив\w*\s+огнях/i.test(title)) {
    return 'theme:msk-night-tour';
  }
  return null;
}

function sessionCategoryKey(event: PublicSession): string {
  const raw = String(event.category || '').trim();
  return raw || 'Прочее';
}

function sessionCoverKeys(event: PublicSession, state: HomePickState): string[] {
  const keys = collectSessionImageDedupeKeys(event.imageUrl);
  const url = String(event.imageUrl || '').trim();
  const fingerprint = url ? state.fingerprints.get(url) : undefined;
  if (fingerprint) keys.push(fingerprint);
  return keys;
}

function canTakeSession(event: PublicSession, state: HomePickState): boolean {
  if (!sessionHasCoverImage(event)) return false;
  if (isHomeRailTabooSession(event)) return false;
  const dedupeKey = sessionDedupeKey(event);
  const familyKey = sessionFamilyKey(event);
  if (state.seenIds.has(event.id) || state.seenTitles.has(dedupeKey) || state.seenFamilies.has(familyKey)) {
    return false;
  }
  const themeKey = sessionEditorsThemeKey(event);
  if (themeKey && state.seenThemes.has(themeKey)) return false;
  const imageKeys = sessionCoverKeys(event, state);
  if (imageKeys.some((key) => state.seenImages.has(key))) return false;
  return true;
}

function markTaken(event: PublicSession, state: HomePickState): void {
  state.seenIds.add(event.id);
  state.seenTitles.add(sessionDedupeKey(event));
  state.seenFamilies.add(sessionFamilyKey(event));
  const themeKey = sessionEditorsThemeKey(event);
  if (themeKey) state.seenThemes.add(themeKey);
  for (const key of sessionCoverKeys(event, state)) state.seenImages.add(key);
}

function takeUnique(events: PublicSession[], max: number, state: HomePickState): PublicSession[] {
  const result: PublicSession[] = [];
  for (const event of events) {
    if (!canTakeSession(event, state)) continue;
    markTaken(event, state);
    result.push(event);
    if (result.length >= max) break;
  }
  return result;
}

function takeCategoryDiverse(
  events: PublicSession[],
  max: number,
  state: HomePickState,
): PublicSession[] {
  if (max <= 0) return [];

  const byCategory = new Map<string, PublicSession[]>();
  for (const event of events) {
    if (!canTakeSession(event, state)) continue;
    const key = sessionCategoryKey(event);
    const list = byCategory.get(key) || [];
    list.push(event);
    byCategory.set(key, list);
  }
  for (const list of byCategory.values()) {
    list.sort((a, b) => popularScore(b) - popularScore(a));
  }

  const categoryCounts = new Map<string, number>();
  const result: PublicSession[] = [];
  const preferred = new Set<string>(EDITORS_CATEGORY_CYCLE);
  const cycle = [
    ...EDITORS_CATEGORY_CYCLE.filter((name) => byCategory.has(name)),
    ...[...byCategory.keys()].filter((name) => !preferred.has(name)),
  ];

  let guard = 0;
  while (result.length < max && guard < max * cycle.length + 8) {
    guard += 1;
    let progressed = false;
    for (const category of cycle) {
      if (result.length >= max) break;
      const used = categoryCounts.get(category) || 0;
      if (used >= EDITORS_MAX_PER_CATEGORY) continue;
      const bucket = byCategory.get(category);
      if (!bucket?.length) continue;
      const next = bucket.find((event) => canTakeSession(event, state));
      if (!next) continue;
      markTaken(next, state);
      categoryCounts.set(category, used + 1);
      result.push(next);
      progressed = true;
    }
    if (!progressed) break;
  }

  if (result.length < max) {
    const rest = [...events].sort((a, b) => popularScore(b) - popularScore(a));
    result.push(...takeUnique(rest, max - result.length, state));
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
  // Pin first (taboo / standup / image-dupes skipped), then category-diverse fill.
  const pinned = [...sessions.filter(isFeaturedEvent)].sort((a, b) => popularScore(b) - popularScore(a));
  const picked = takeUnique(pinned, limit, state);
  if (picked.length >= limit) return picked;

  const rest = [...sessions].sort((a, b) => popularScore(b) - popularScore(a));
  return picked.concat(takeCategoryDiverse(rest, limit - picked.length, state));
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
  const fingerprints = state.fingerprints;
  const editorsPick = spreadCatalogSessionsByCoverImage(
    buildEditorsPickEvents(sessions, HOME_SHOWCASE_LIMIT, state),
    fingerprints,
  );
  const thisWeek = spreadCatalogSessionsByCoverImage(
    buildThisWeekEvents(sessions, HOME_SHOWCASE_LIMIT, state),
    fingerprints,
  );
  const popular = spreadSessionsForGrid(
    buildPopularEvents(sessions, HOME_POPULAR_LIMIT, state),
    3,
    fingerprints,
  );
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
