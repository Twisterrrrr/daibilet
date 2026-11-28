import { normalizeCityHubSlug } from './city-hub-config.ts';

export type HubAfficheSession = {
  id?: string | number | null;
  slug?: string | null;
  title?: string | null;
  category?: string | null;
  eventTitle?: string | null;
  venue?: string | null;
  venueSlug?: string | null;
  subcategories?: string[] | null;
  tags?: string[] | null;
  startsAt?: string | null;
  upcomingSlots?: Array<{ startsAt?: string | null }> | null;
};

export type HubAfficheRow<T extends HubAfficheSession = HubAfficheSession> =
  | { kind: 'event'; session: T }
  | { kind: 'standup'; sessions: T[]; venueName: string };

function sessionStartMs(session: HubAfficheSession): number {
  const values = [session.startsAt, ...(session.upcomingSlots || []).map((slot) => slot.startsAt)]
    .map((value) => (value ? Date.parse(value) : Number.NaN))
    .filter(Number.isFinite);
  return values.length ? Math.min(...values) : Number.POSITIVE_INFINITY;
}

/** Put the next dated session first; undated rows follow dated ones. */
export function sortCityHubSessionsChronologically<T extends HubAfficheSession>(sessions: T[]): T[] {
  return [...sessions].sort((left, right) => sessionStartMs(left) - sessionStartMs(right));
}

/** Grouped stand-up rows are placed by their first session date too. */
export function sortCityHubAfficheRows<T extends HubAfficheSession>(rows: HubAfficheRow<T>[]): HubAfficheRow<T>[] {
  const rowStartMs = (row: HubAfficheRow<T>) =>
    row.kind === 'event'
      ? sessionStartMs(row.session)
      : Math.min(...row.sessions.map(sessionStartMs));
  return [...rows].sort((left, right) => rowStartMs(left) - rowStartMs(right));
}

const TOURIST_AFFICHE_SLUGS = new Set([
  'perm',
  'kaliningrad',
  'nizhny-novgorod',
  'saint-petersburg',
  'moscow',
  'ekaterinburg',
  'kazan',
  'samara',
  'krasnodar',
  'krasnoyarsk',
]);

const CHIP_ORDER = [
  'Экскурсии',
  'Речные прогулки',
  'Концерты',
  'Спектакли',
  'Фестивали',
  'Шоу и встречи',
  'Юмор',
  'Музеи и арт',
  'Активный отдых',
  'Развлечения',
  'Другие события',
];

const MUSEUM_TAB_MIN = 3;
const STANDUP_GROUP_MIN = 3;

export function isCityHubTouristAffiche(slug: string | null | undefined): boolean {
  const normalized = normalizeCityHubSlug(slug);
  return Boolean(normalized) && TOURIST_AFFICHE_SLUGS.has(normalized);
}

export function sessionHaystack(session: HubAfficheSession): string {
  return [
    session.category,
    session.title,
    session.eventTitle,
    session.venue,
    ...(session.tags || []),
    ...(session.subcategories || []),
  ].filter(Boolean).join(' ').toLowerCase();
}

/** Split generic «Мероприятия» source buckets into visitor-facing types. */
export function hubAfficheCategory(session: HubAfficheSession): string {
  const category = String(session.category || '').trim();
  if (/^театр(?:\b|\s)/i.test(category)) return 'Спектакли';
  if (/^(юмор|стендап|stand[\s-]?up)$/i.test(category)) return 'Юмор';
  if (!/^(мероприятия|события|развлечения)$/i.test(category)) return category;

  const hay = sessionHaystack(session);
  const title = `${session.title || ''} ${session.eventTitle || ''}`.toLowerCase();
  if (/фестивал|\bфест\b|\bfest\b|festival|историческ.{0,12}реконструкц|косплей/.test(hay)) return 'Фестивали';
  if (/спектакл|премьера|балет|опера|мюзикл|театр|драматическ/.test(hay)) return 'Спектакли';
  if (/концерт|оркестр|симфон|филармон/.test(title)) return 'Концерты';
  if (/стендап|stand[\s-]?up|юмор|комеди|квиз/.test(hay)) return 'Юмор';
  if (/встреча|вечер|шоу|цирк|иллюзион/.test(title)) return 'Шоу и встречи';
  if (/поп|рок|панк|металл|джаз|эстрад|ska|live/.test(hay)) return 'Концерты';
  return 'Другие события';
}

export function filterHubAfficheCategory<T extends HubAfficheSession>(sessions: T[], category: string): T[] {
  if (category === 'all') return sessions;
  return sessions.filter((session) => hubAfficheCategory(session) === category);
}

export function isStandupSession(session: HubAfficheSession): boolean {
  return /стендап|stand[\s-]?up|standup|comedy|юмор|квиз/.test(sessionHaystack(session));
}

export function isMuseumCategoryName(name: string): boolean {
  return /музе/i.test(name);
}

export function cityHubSessionHitScore(session: HubAfficheSession): number {
  const hay = sessionHaystack(session);
  if (isStandupSession(session)) return 1;
  if (/экскур|речн|теплоход|круиз|прогулк|кама|волг|нева/.test(hay)) return 6;
  if (/театр|опер|балет|симфон|филармон/.test(hay)) return 5;
  if (/музе|галере|выставк/.test(hay)) return 4;
  if (/концерт|concert|фестиваль|live/.test(hay)) return 3;
  return 2;
}

export function rankCityHubSessions<T extends HubAfficheSession>(sessions: T[]): T[] {
  return [...sessions].sort((a, b) => {
    const score = cityHubSessionHitScore(b) - cityHubSessionHitScore(a);
    if (score !== 0) return score;
    return String(a.id || a.slug || '').localeCompare(String(b.id || b.slug || ''));
  });
}

export function visibleAfficheCategories(
  sessions: HubAfficheSession[],
  options?: { tourist?: boolean },
): Array<[string, number]> {
  const counts = new Map<string, number>();
  for (const session of sessions) {
    const name = hubAfficheCategory(session);
    if (!name) continue;
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  const entries = Array.from(counts.entries()).filter(([name, count]) => {
    if (isMuseumCategoryName(name) && count < MUSEUM_TAB_MIN) return false;
    return true;
  });
  if (!options?.tourist) {
    return entries.sort((a, b) => b[1] - a[1]);
  }
  return entries.sort((a, b) => {
    const ai = chipOrderIndex(a[0]);
    const bi = chipOrderIndex(b[0]);
    if (ai !== bi) return ai - bi;
    return b[1] - a[1];
  });
}

export function preferredAfficheCategory(
  _categories: Array<[string, number]>,
  _options?: { tourist?: boolean },
): string {
  // Hub default: chip «Все». Tourist feed still demotes standup via filterStandupFromAllFeed.
  return 'all';
}

/** «Все» on tourist hubs: hide standup/comedy flood; open chips still show those categories. */
export function filterStandupFromAllFeed<T extends HubAfficheSession>(
  sessions: T[],
  category: string,
  options?: { tourist?: boolean },
): T[] {
  if (!options?.tourist || category !== 'all') return sessions;
  return sessions.filter((session) => !isStandupSession(session));
}

export function groupStandupInHubFeed<T extends HubAfficheSession>(sessions: T[]): HubAfficheRow<T>[] {
  const standup = sessions.filter((session) => isStandupSession(session));
  const rest = sessions.filter((session) => !isStandupSession(session));
  const rows: HubAfficheRow<T>[] = rest.map((session) => ({ kind: 'event', session }));
  if (standup.length >= STANDUP_GROUP_MIN) {
    rows.push({
      kind: 'standup',
      sessions: standup,
      venueName: dominantVenueName(standup) || 'Стендап',
    });
    return rows;
  }
  for (const session of standup) {
    rows.push({ kind: 'event', session });
  }
  return rows;
}

function chipOrderIndex(name: string): number {
  const exact = CHIP_ORDER.indexOf(name);
  if (exact >= 0) return exact;
  if (/стендап|мероприят/i.test(name)) return CHIP_ORDER.length + 2;
  return CHIP_ORDER.length;
}

function dominantVenueName(sessions: HubAfficheSession[]): string {
  const counts = new Map<string, number>();
  for (const session of sessions) {
    const name = String(session.venue || '').trim();
    if (!name) continue;
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  let best = '';
  let bestCount = 0;
  for (const [name, count] of counts) {
    if (count > bestCount) {
      best = name;
      bestCount = count;
    }
  }
  return best;
}
