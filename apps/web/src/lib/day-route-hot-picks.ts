/**
 * Hot Picks («Выбор Дайбилет») for /my-day: curated tabs + dual CTA offer rules.
 * Paid cards never pin «сегодня HH:MM» without a trip date - affiche stub or open-date.
 */

import type { CityMustSeeItem } from './cityInfo';
import {
  classifyMustSeePlace,
  type MustSeeClassifyInput,
  type MustSeeFilterId,
} from './must-see-filters';
import { encodeDayRouteShareTime, type DayRouteVenueItem } from './day-route';
import { dayRouteHookLine } from './day-route-from-place';
import { eventHref } from './routes';
import { formatPriceFrom } from './format';

export const HOT_PICKS_MAX = 6;

export type HotPickTabId = 'tips' | 'culture' | 'food';

export type HotPickDayPart = 'morning' | 'day' | 'evening';

export type HotPickOfferKind = 'free' | 'affiche' | 'open_date';

export type HotPickOffer = {
  kind: HotPickOfferKind;
  /** Micro-badge on card (not a concrete trip date). */
  badge: string;
  ctaLabel: string;
  /** Preferred timeline bucket after add. */
  dayPart: HotPickDayPart;
  ticketUrl?: string | null;
  /** Soft session label without calendar day (affiche). */
  sessionLabel?: string | null;
  /** Never set concrete startsAt for affiche/open_date MVP. */
  eventId?: string | null;
  eventSlug?: string | null;
  priceFromRub?: number | null;
};

export type HotPickEventStub = {
  id: string;
  slug?: string | null;
  title?: string | null;
  venueSlug?: string | null;
  venue?: string | null;
  venueKind?: string | null;
  startsAt?: string | null;
  dateLabel?: string | null;
  timeLabel?: string | null;
  priceFromRub?: number | null;
  imageUrl?: string | null;
};

export type HotPickCard = {
  key: string;
  place: CityMustSeeItem & MustSeeClassifyInput;
  item: DayRouteVenueItem;
  hook: string | null;
  category: MustSeeFilterId;
  offer: HotPickOffer;
  /** Display title (may prefer event title for affiche). */
  title: string;
};

export const HOT_PICK_TABS: Array<{ id: HotPickTabId; label: string }> = [
  { id: 'tips', label: 'Советы' },
  { id: 'culture', label: 'Культура' },
  { id: 'food', label: 'Еда и бары' },
];

const ENTERTAINMENT_RE =
  /стендап|standup|концерт|шоу|спектакл|театр|комеди|джаз|вечерн|квиз|камеди|клуб|party|диско/i;

function isEntertainmentEvent(event: HotPickEventStub): boolean {
  const hay = `${event.title || ''} ${event.venue || ''} ${event.venueKind || ''}`;
  return ENTERTAINMENT_RE.test(hay);
}

function isAdmissionMuseumPlace(place: MustSeeClassifyInput): boolean {
  const cat = classifyMustSeePlace(place);
  return cat === 'museum';
}

/** Match city event to must-see / venue slug (venue-first). */
export function findHotPickEventForPlace(
  place: MustSeeClassifyInput & { name?: string | null },
  item: Pick<DayRouteVenueItem, 'slug' | 'title'>,
  events: HotPickEventStub[],
): HotPickEventStub | null {
  const slug = String(item.slug || place.venueSlug || place.locationSlug || '')
    .trim()
    .toLowerCase();
  if (slug) {
    const bySlug = events.find((ev) => String(ev.venueSlug || '').trim().toLowerCase() === slug);
    if (bySlug) return bySlug;
  }
  const name = String(place.name || item.title || '')
    .trim()
    .toLowerCase();
  if (!name) return null;
  return (
    events.find((ev) => {
      const venue = String(ev.venue || '')
        .trim()
        .toLowerCase();
      return Boolean(venue) && (venue === name || venue.includes(name) || name.includes(venue));
    }) || null
  );
}

/**
 * Scenario map:
 * 1 affiche - recurring/evening entertainment stub (no trip date)
 * 2 open_date - museum / admission any day
 * free - park/landmark/gastro without checkout
 */
export function classifyHotPickOffer(
  place: MustSeeClassifyInput,
  event: HotPickEventStub | null,
): HotPickOffer {
  if (event) {
    const ticketUrl = eventHref({
      id: event.id,
      slug: event.slug || null,
      title: event.title || null,
    });
    const priceFromRub =
      event.priceFromRub != null && Number.isFinite(Number(event.priceFromRub))
        ? Number(event.priceFromRub)
        : null;
    const priceSuffix =
      priceFromRub != null && priceFromRub > 0 ? ` ${formatPriceFrom(priceFromRub)}` : '';

    if (isAdmissionMuseumPlace(place) && !isEntertainmentEvent(event)) {
      return {
        kind: 'open_date',
        badge: 'Билет на любой день',
        ctaLabel: `Купить билет${priceSuffix}`.trim(),
        dayPart: 'day',
        ticketUrl,
        eventId: event.id,
        eventSlug: event.slug || null,
        priceFromRub,
      };
    }

    // Scenario 1: affiche stub (primary for light / entertainment)
    return {
      kind: 'affiche',
      badge: isEntertainmentEvent(event) ? 'Каждый вечер' : 'Вечерний сеанс',
      ctaLabel: 'Выбрать дату и билеты',
      dayPart: 'evening',
      ticketUrl,
      sessionLabel: 'Вечерний сеанс',
      eventId: event.id,
      eventSlug: event.slug || null,
      priceFromRub,
    };
  }

  if (isAdmissionMuseumPlace(place)) {
    // Museum without live checkout - still a soft open-date hint, free add only.
    return {
      kind: 'free',
      badge: 'Музей',
      ctaLabel: 'Добавить в план',
      dayPart: 'day',
    };
  }

  const cat = classifyMustSeePlace(place);
  const badge =
    cat === 'gastro'
      ? 'Еда и бары'
      : cat === 'park'
        ? 'Прогулка'
        : cat === 'temple'
          ? 'Храм'
          : 'Совет';

  return {
    kind: 'free',
    badge,
    ctaLabel: 'Добавить в план',
    dayPart: cat === 'gastro' ? 'evening' : 'day',
  };
}

function placeMatchesTab(category: MustSeeFilterId, tab: HotPickTabId): boolean {
  if (tab === 'tips') {
    // Curated top: landmarks / parks / temples - not gastro dump.
    return category === 'main' || category === 'park' || category === 'temple';
  }
  if (tab === 'culture') {
    return category === 'museum' || category === 'temple' || category === 'main';
  }
  return category === 'gastro';
}

export function buildHotPickCards(input: {
  rows: Array<{
    place: CityMustSeeItem & MustSeeClassifyInput;
    item: DayRouteVenueItem;
    hook: string | null;
  }>;
  events: HotPickEventStub[];
  tab: HotPickTabId;
  max?: number;
}): HotPickCard[] {
  const max = input.max ?? HOT_PICKS_MAX;
  const cards: HotPickCard[] = [];

  for (const row of input.rows) {
    const category = classifyMustSeePlace(row.place);
    if (!placeMatchesTab(category, input.tab)) continue;
    const event = findHotPickEventForPlace(row.place, row.item, input.events);
    // On tips tab prefer free landmarks; still allow museum open_date if event matched.
    if (input.tab === 'tips' && category === 'main' && event && isEntertainmentEvent(event)) {
      // Entertainment belongs under food/culture vibes - skip on tips curation.
      continue;
    }
    const offer = classifyHotPickOffer(row.place, event);
    const hook =
      dayRouteHookLine(
        {
          hookFact: row.hook,
          shortDescription: null,
          desc: row.place.desc,
        },
        110,
      ) || row.hook;
    const title =
      offer.kind === 'affiche' && event?.title
        ? String(event.title).trim()
        : row.item.title;
    cards.push({
      key: `${row.item.id}:${offer.kind}`,
      place: row.place,
      item: row.item,
      hook,
      category,
      offer,
      title,
    });
    if (cards.length >= max) break;
  }

  return cards;
}

/** Which Hot Pick tabs have at least one card (omit empty). */
export function visibleHotPickTabs(
  rows: Array<{ place: MustSeeClassifyInput }>,
): HotPickTabId[] {
  const cats = new Set(rows.map((r) => classifyMustSeePlace(r.place)));
  const out: HotPickTabId[] = [];
  if (cats.has('main') || cats.has('park') || cats.has('temple')) out.push('tips');
  if (cats.has('museum') || cats.has('temple') || cats.has('main')) out.push('culture');
  if (cats.has('gastro')) out.push('food');
  return out.length ? out : ['tips'];
}

/** Timeline bucket: timed by hour, soft «Вечерний сеанс», else free → День. */
export function dayPartForStop(
  venue: Pick<DayRouteVenueItem, 'startsAt' | 'sessionLabel'>,
): HotPickDayPart {
  const label = String(venue.sessionLabel || '');
  if (/утр/i.test(label)) return 'morning';
  if (/вечер/i.test(label)) return 'evening';
  const hhmm = encodeDayRouteShareTime(venue);
  if (hhmm && hhmm !== 'free') {
    const h = Number(hhmm.slice(0, 2));
    if (Number.isFinite(h)) {
      if (h < 12) return 'morning';
      if (h >= 17) return 'evening';
      return 'day';
    }
  }
  return 'day';
}

export function dayPartLabel(part: HotPickDayPart): string {
  if (part === 'morning') return 'Утро';
  if (part === 'evening') return 'Вечер';
  return 'День';
}

/** Apply offer commerce fields onto a day-route item before persist. */
export function applyHotPickOfferToItem(
  item: DayRouteVenueItem,
  offer: HotPickOffer,
): DayRouteVenueItem {
  if (offer.kind === 'free') {
    return { ...item };
  }
  return {
    ...item,
    ticketUrl: offer.ticketUrl || item.ticketUrl || null,
    eventId: offer.eventId || item.eventId || null,
    eventSlug: offer.eventSlug || item.eventSlug || null,
    // Affiche: soft evening label. Open-date: no clock - ticket any day.
    sessionLabel: offer.kind === 'affiche' ? offer.sessionLabel || 'Вечерний сеанс' : null,
    startsAt: null,
    ticketBought: false,
  };
}
