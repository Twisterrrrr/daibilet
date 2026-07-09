import { FLEXIBLE_SCHEDULE_LABEL, isFlexibleScheduleSession, isOpenDate } from '@/lib/event-card-meta';
import { BRIDGES_POPULAR_MATCHERS, BRIDGES_TOUR_META } from '@/data/bridges-landing';
import { resolvePseudoRating } from '@/lib/event-card-meta';
import {
  parseSessionStartsAt,
  resolveSessionDate,
  resolveSessionTime,
} from '@/lib/datetime';
import { eventHref } from '@/routes';
import type { PublicSession } from '@/types';
import { formatStreetAddress } from '@/lib/address';
import { formatPublicVenueTitle } from '@/lib/venue-meta';

export type BridgesScheduleRow = {
  key: string;
  title: string;
  venue: string;
  pierLabel: string;
  nevaBank: string;
  priceFrom: number | null;
  priceTo: number | null;
  timeLabel: string;
  dateLabel: string;
  duration: string | null;
  bridgeHint: string | null;
  href: string;
  badges: string[];
  score: number;
};

export type BridgesEventGroup = {
  key: string;
  title: string;
  venue: string;
  tags: string[];
  representative: PublicSession;
  sessions: PublicSession[];
  priceFrom?: number | null;
  priceTo?: number | null;
  firstStartsAt?: string | null;
};

export type BridgesRouteKind = 'neva' | 'canals' | 'mixed';

export type BridgesFeatureTag = 'warm' | 'blankets' | 'bar' | 'disco' | 'guide';

const OFF_NEVA_PIER_PATTERN =
  /фонтанк|мойк|карповк|крюков|обводн|грибоедов|наб\.?\s*реки\s+фонтанк|наб\.?\s*реки\s+мойк|наб\.?\s*реки\s+карповк|наб\.?\s*фонтанк|наб\.?\s*мойк|петроградск/i;

/** Рейсы по Большой Неве — даже если в описании упоминаются каналы или «Петроградская сторона». */
const NEVA_ROUTE_OVERRIDES = [/дискотека\s+под\s+разводн/i];

export function resolveBridgesTourMeta(title: string) {
  return BRIDGES_TOUR_META.find((item) => item.match(title)) ?? null;
}

export function resolveBridgesRating(title: string, fallbackKey = title): number {
  const meta = resolveBridgesTourMeta(title);
  if (meta) return meta.rating;
  return resolvePseudoRating(fallbackKey);
}

export function resolveBridgesDisplayTitle(title: string): string {
  return resolveBridgesTourMeta(title)?.displayTitle ?? title;
}

/** Берег Невы для сравнения причалов. */
export function resolveNevaBankLabel(venue: string, title = ''): string {
  const text = `${venue} ${title}`.toLowerCase();
  if (/карповк|университетск/i.test(text)) return 'Правый берег';
  return 'Левый берег';
}

function extractPierHouseNumber(text: string): string | null {
  const cleaned = text.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  const afterComma = cleaned.match(/,\s*(?:д\.?\s*)?(\d[\d\-/]*(?:\s*лит\.?\s*[\p{L}\d]+)?)/iu);
  if (afterComma) return afterComma[1].replace(/\s+/g, '');
  const afterNab = cleaned.match(/(?:наб\.?|набережная)\s*,?\s*(\d[\d\-/]*)/iu);
  if (afterNab) return afterNab[1];
  const trailing = cleaned.match(/(\d[\d\-/]*)\s*$/u);
  return trailing ? trailing[1] : null;
}

/** Короткий адрес причала для таблицы сравнения: улица и дом. */
export function formatBridgesComparisonPier(
  venue: string,
  venueAddress?: string | null,
  city = 'Санкт-Петербург',
): string {
  const name = formatPublicVenueTitle(venue);
  const address = formatStreetAddress(venueAddress, { city }) || formatStreetAddress(name, { city }) || name;
  const combined = `${name} ${address}`.toLowerCase();

  if (/карповк/i.test(combined)) {
    return 'наб.реки Карповки (Льва Толстого, 6-8)';
  }

  const house = extractPierHouseNumber(address) || extractPierHouseNumber(name);
  if (/университетск/i.test(combined) && house) return `Университетская, ${house}`;
  if (/фонтанк/i.test(combined) && house) return `Фонтанки, ${house}`;
  if (/мойк/i.test(combined) && house) return `Мойки, ${house}`;
  if (/адмиралтейск/i.test(combined) && house) return `Адмиралтейская, ${house}`;
  if (/английск/i.test(combined) && house) return `Английская, ${house}`;
  if (/синопск/i.test(combined) && house) return `Синопская, ${house}`;
  if (/дворцов/i.test(combined) && house) return `Дворцовая, ${house}`;
  if (/сенатск/i.test(combined) && house) return `Сенатская, ${house}`;

  if (house) {
    const street = address
      .replace(/,\s*\d[\d\-/]*.*$/u, '')
      .replace(/^(?:наб(?:ережная)?\.?\s+реки\s+|набережная\s+реки\s+)/iu, '')
      .replace(/\s+наб(?:ережная)?\.?$/iu, '')
      .trim();
    if (street && street.length <= 40) return `${street}, ${house}`;
  }

  return address || name;
}

export function classifyBridgesRoute(
  title: string,
  tags: string[],
  venue = '',
  description = '',
): BridgesRouteKind {
  if (NEVA_ROUTE_OVERRIDES.some((pattern) => pattern.test(title))) return 'neva';

  const fullText = [title, venue, description, ...(tags || [])].join(' ').toLowerCase();
  // Старт с каналов/малых рек — по названию, причалу и тегам (не по описанию маршрута).
  const pierText = [title, venue, ...(tags || [])].join(' ').toLowerCase();

  if (/залив/i.test(fullText)) return 'mixed';
  if (OFF_NEVA_PIER_PATTERN.test(pierText)) return 'canals';
  return 'neva';
}

export function extractBridgeNames(title: string, tags: string[]): string[] {
  const known = ['Дворцовый', 'Троицкий', 'Литейный', 'Большеохтинский', 'Биржевой', 'Александра Невского'];
  const text = [title, ...(tags || [])].join(' ');
  const found = known.filter((bridge) => text.toLowerCase().includes(bridge.toLowerCase().slice(0, 6)));
  if (found.length) return [...new Set(found)].slice(0, 5);

  const count = title.match(/(\d+)\s*развод/i) || title.match(/(\d+)\s*мост/i);
  if (count) {
    const n = Number(count[1]);
    if (n >= 5) return ['Дворцовый', 'Троицкий', 'Литейный', 'Большеохтинский'];
    if (n >= 3) return ['Дворцовый', 'Троицкий', 'Биржевой'];
  }
  return ['Дворцовый', 'Троицкий'];
}

export function extractBridgesFeatureTags(title: string, tags: string[]): BridgesFeatureTag[] {
  const text = [title, ...(tags || [])].join(' ').toLowerCase();
  const result: BridgesFeatureTag[] = [];
  if (/тёпл|тепл|закрыт|салон|панорам/i.test(text)) result.push('warm');
  if (/плед/i.test(text)) result.push('blankets');
  if (/бар|чай|напит/i.test(text)) result.push('bar');
  if (/дискотек|dj/i.test(text)) result.push('disco');
  if (/гид|экскурсовод/i.test(text)) result.push('guide');
  return result.slice(0, 4);
}

function extractDuration(title: string, tags: string[]): string | null {
  if (/пять\s+разводных\s+мостов|5\s+разводных/i.test(title)) {
    return '120 мин';
  }
  return (tags || []).find((tag) => /\d+\s*(мин|ч|час)/i.test(tag)) || null;
}

function extractBridgeHint(title: string, tags: string[]): string | null {
  const fromTitle = title.match(/(\d+)\s*развод/i) || title.match(/(\d+)\s*мост/i);
  if (fromTitle) return `${fromTitle[1]} мостов`;
  const tag = (tags || []).find((item) => /мост/i.test(item));
  return tag || null;
}

function sessionBadges(session: PublicSession): string[] {
  const text = [session.title, ...(session.tags || [])].join(' ').toLowerCase();
  const badges: string[] = [];
  if (/гид|экскурсовод|audio|аудио/i.test(text)) badges.push('С гидом');
  if (/открыт|палуб/i.test(text)) badges.push('Открытая палуба');
  if (/перв/i.test(text) || /дворцов|троиц/i.test(text)) badges.push('Классика');
  if (/пять|5\s*мост|пяти/i.test(text)) badges.push('5 мостов');
  return badges.slice(0, 3);
}

function groupScore(group: BridgesEventGroup): number {
  const price = group.priceFrom ?? 99999;
  const sessions = group.sessions.length;
  const title = group.title.toLowerCase();
  let bonus = 0;
  if (/дворцов|троиц|пять|5\s*мост/i.test(title)) bonus += 40;
  if (/гид|экскурсовод/i.test(title)) bonus += 10;
  return price - sessions * 30 - bonus;
}

export function mapBridgesGroups(groups: BridgesEventGroup[]): BridgesScheduleRow[] {
  return groups.map((group) => {
    const session = group.representative;
    const slot = session.upcomingSlots?.[0];
    const flexible = isFlexibleScheduleSession(session);
    return {
      key: group.key,
      title: resolveBridgesDisplayTitle(group.title),
      venue: group.venue,
      pierLabel: formatBridgesComparisonPier(
        group.venue,
        session.venueAddress,
        session.city,
      ),
      nevaBank: resolveNevaBankLabel(group.venue, group.title),
      priceFrom: group.priceFrom ?? null,
      priceTo: group.priceTo ?? group.priceFrom ?? null,
      timeLabel: flexible ? FLEXIBLE_SCHEDULE_LABEL : resolveSessionTime(session, slot),
      dateLabel: flexible ? '' : resolveSessionDate(session, slot),
      duration: extractDuration(group.title, session.tags),
      bridgeHint: extractBridgeHint(group.title, session.tags),
      href: eventHref(session),
      badges: sessionBadges(session),
      score: groupScore(group),
    };
  });
}

export function pickPopularBridgesRows(rows: BridgesScheduleRow[]): BridgesScheduleRow[] {
  const picked: BridgesScheduleRow[] = [];
  for (const matcher of BRIDGES_POPULAR_MATCHERS) {
    const match = rows.find((row) => matcher(row.title) && !picked.some((item) => item.key === row.key));
    if (match) picked.push(match);
  }
  return picked;
}

export function pickFeaturedBridgesRows(rows: BridgesScheduleRow[], limit = 5): BridgesScheduleRow[] {
  const withTime = rows.filter((row) => row.timeLabel && row.timeLabel !== FLEXIBLE_SCHEDULE_LABEL);
  const byTime = [...withTime].sort((a, b) => a.timeLabel.localeCompare(b.timeLabel));
  const cheapest = [...rows].sort((a, b) => (a.priceFrom ?? 99999) - (b.priceFrom ?? 99999))[0];
  const best = [...rows].sort((a, b) => a.score - b.score)[0];

  const picked = new Map<string, BridgesScheduleRow>();
  for (const row of byTime.slice(0, 3)) picked.set(row.key, row);
  if (cheapest) picked.set(cheapest.key, cheapest);
  if (best) picked.set(best.key, best);

  return [...picked.values()].slice(0, limit);
}

export function pickComparisonRows(rows: BridgesScheduleRow[], limit = 8): BridgesScheduleRow[] {
  return [...rows]
    .sort((a, b) => {
      const ta = a.timeLabel.match(/^\d{2}:\d{2}/)?.[0] || '99:99';
      const tb = b.timeLabel.match(/^\d{2}:\d{2}/)?.[0] || '99:99';
      return ta.localeCompare(tb) || (a.priceFrom ?? 99999) - (b.priceFrom ?? 99999);
    })
    .slice(0, limit);
}

export function filterUpcomingBridgeGroups(groups: BridgesEventGroup[]): BridgesEventGroup[] {
  const now = Date.now();
  return groups.filter((group) => {
    const session = group.representative;
    if (isOpenDate(session)) return true;
    if (!session.startsAt) return false;
    return parseSessionStartsAt(session.startsAt).getTime() >= now - 6 * 60 * 60 * 1000;
  });
}
