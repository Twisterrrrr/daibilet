/**
 * Soft type labels for My Day «Типы точек» filter (Lovable-style pills).
 * Prefer catalog/must-see venue type; fall back to contextual heuristics.
 */

import {
  isNoteDayRouteStop,
  isTextDayRouteStop,
  type DayRouteVenueItem,
} from './day-route';

/** Lovable dwell minutes by category tag. */
const DWELL_BY_TAG: Record<string, number> = {
  Музей: 60,
  Театр: 120,
  Еда: 45,
  'Арт-объект': 15,
  Прогулка: 30,
  Смотровая: 40,
  Архитектура: 30,
  Парк: 30,
  Пригород: 90,
  Событие: 90,
  'Своё место': 45,
};

export function dayRouteStopTypeTag(
  venue: DayRouteVenueItem,
  /**
   * Catalog / must-see short label (Музей, Театр, …) when known.
   * Applied after note/text/suburb/event contextual rules.
   */
  placeTypeTag?: string | null,
): string {
  if (isNoteDayRouteStop(venue)) return 'Заметка';
  if (isTextDayRouteStop(venue)) return 'Своё место';
  if (venue.isSuburb) return 'Пригород';
  const placeLabel = String(placeTypeTag || '').trim() || editorialTagFromTitle(venue.title);
  if (placeLabel) return placeLabel;
  if (Boolean(venue.eventId || venue.eventSlug)) return 'Событие';
  return 'Место';
}

/** Lovable editorial tags from stop title when catalog tag is missing. */
export function editorialTagFromTitle(title: string | null | undefined): string | null {
  const t = String(title || '').toLowerCase();
  if (!t) return null;
  if (/театр|спектакл|опera|opera|балет/.test(t)) return 'Театр';
  if (/музей|галере|выстав|экспоз/.test(t)) return 'Музей';
  if (/^(?:государственный\s+)?эрмитаж$/.test(t)) return 'Музей';
  if (/скulpt|скульпт|арт-объект|стрит|инстал/.test(t)) return 'Арт-объект';
  if (/ресторан|кафе|бар|гастро|кухн|посикун|обед/.test(t)) return 'Еда';
  if (/парк|сквер|сад|набереж|прогул|бульвар/.test(t)) return 'Прогулка';
  if (/собор|храм|монаст|церк|лавр/.test(t)) return 'Храм';
  if (/смотров|панорам|обзор|колон/.test(t)) return 'Смотровая';
  if (/кремл|собор|дворец|особняк|архит/.test(t)) return 'Архитектура';
  return null;
}

const FREE_OUTDOOR_TITLE_RE =
  /площад|сквер|мост|набереж|бульвар|проспект|улица|переул|аллея|всадник|стрелка|лини[ияю]/i;
const PAID_ENTRY_TITLE_RE =
  /собор|храм|колоннад|дворец|дворца\b|музей|эрмитаж|театр|галере|особняк|замок|крепост|смотров|палацц|выстав|ботаническ|оранжерей|зоопарк|океанариум|планетари|петергоф|павловск|царск|кусков|царицын|гатчин|ораниенбаум|меншиков|лахта|канатно|телебашн|останкин|бункер|ледокол|аквапарк|дельфин|\bцирк|некропол|макет|усадьб|павильон|аврора|крейсер|лицей|аттракцион|диво-остров|дендрар|аптекарск/i;
const PAID_ENTRY_TAGS = new Set(['Музей', 'Храм', 'Театр', 'Событие', 'Еда', 'Особняк']);

function isLikelyPaidEntry(venue: DayRouteVenueItem, typeTag?: string | null): boolean {
  if (PAID_ENTRY_TITLE_RE.test(String(venue.title || ''))) return true;
  const tag = String(typeTag || dayRouteStopTypeTag(venue)).trim();
  return PAID_ENTRY_TAGS.has(tag);
}

function isLikelyFreeOutdoor(venue: DayRouteVenueItem, typeTag?: string | null): boolean {
  if (isLikelyPaidEntry(venue, typeTag)) return false;
  return FREE_OUTDOOR_TITLE_RE.test(String(venue.title || ''));
}

/** Soft price chip. Do not invent «Вход свободный» for interiors (Исаакий, колоннада, музей). */
export function dayRouteStopPriceChipLabel(
  venue: DayRouteVenueItem,
  typeTag?: string | null,
): string {
  if (venue.ticketBought) return 'Билет отмечен';
  const session = String(venue.sessionLabel || '').trim();
  if (session && /сеанс|вечерн|\d{1,2}:\d{2}/i.test(session)) {
    return session.startsWith('Сеанс') ? session : `Сеанс ${session}`;
  }
  if (
    venue.ticketUrl ||
    venue.eventId ||
    venue.eventSlug ||
    (typeof venue.priceFromRub === 'number' && venue.priceFromRub > 0)
  ) {
    return 'Можно купить билет';
  }
  if (isLikelyPaidEntry(venue, typeTag)) return '';
  if (isLikelyFreeOutdoor(venue, typeTag)) return 'Вход свободный';
  return '';
}

export function formatDayRouteSoftMinutes(min: number): string {
  const n = Math.max(0, Math.round(min));
  const h = Math.floor(n / 60);
  const m = n % 60;
  if (h && m) return `${h} ч ${m} мин`;
  if (h) return `${h} ч`;
  return `${m} мин`;
}

export function dayRouteStopDwellChipLabel(
  venue: DayRouteVenueItem,
  typeTag?: string | null,
): string {
  const tag = dayRouteStopTypeTag(venue, typeTag);
  let minutes = DWELL_BY_TAG[tag] ?? 60;
  if (venue.ticketBought || venue.ticketUrl || venue.eventId || venue.eventSlug) {
    minutes = Math.max(minutes, 90);
  }
  return `~${formatDayRouteSoftMinutes(minutes)} на месте`;
}

export function buildDayRouteTypeCounts(
  venues: DayRouteVenueItem[],
  resolveTag?: (venue: DayRouteVenueItem) => string | null | undefined,
): Array<{ tag: string; count: number }> {
  const map = new Map<string, number>();
  for (const venue of venues) {
    if (isNoteDayRouteStop(venue)) continue;
    const tag = dayRouteStopTypeTag(venue, resolveTag?.(venue) || null);
    map.set(tag, (map.get(tag) || 0) + 1);
  }
  return [...map.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'ru'));
}

export function estimateDayRouteDwellMinutes(venues: DayRouteVenueItem[]): number {
  let total = 0;
  for (const venue of venues) {
    if (isNoteDayRouteStop(venue)) continue;
    const tag = dayRouteStopTypeTag(venue);
    let minutes = DWELL_BY_TAG[tag] ?? 60;
    if (venue.ticketBought || venue.ticketUrl || venue.eventId || venue.eventSlug) {
      minutes = Math.max(minutes, 90);
    }
    total += minutes;
  }
  return total;
}
