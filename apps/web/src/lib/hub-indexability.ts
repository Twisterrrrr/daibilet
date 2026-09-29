/**
 * Политика индексации hub-страниц (city / region / venue).
 *
 * City: index только при стабильном предложении (≥ MIN_CITY_EVENTS_FOR_INDEX)
 * или strong-city allowlist. Owner 2026-09-03: не плодить thin city hubs /
 * editorial landings без спроса и стабильных офферов.
 *
 * Region live tier (без ручного вмешательства):
 * - C: <3 child-events → noindex,nofollow + strip на центре
 * - B: 3-9 → index,follow + программный Region Hub
 * - A: ≥10 → index,follow + полный regionInfo / AI
 */

import {
  REGION_TIER_B_MIN_EVENTS,
  resolveRegionLiveTier,
} from '@daibilet/contracts/common';

/** Align with commercial listing gate (`MIN_LISTING_OFFERS_FOR_INDEX`). */
export const MIN_CITY_EVENTS_FOR_INDEX = 6;
export const MIN_REGION_CHILD_EVENTS_FOR_INDEX = REGION_TIER_B_MIN_EVENTS;
export const MIN_VENUE_EVENTS_FOR_INDEX = 1;

/** Города, которые нельзя случайно noindex'ить из-за временных дыр в каталоге. */
export const STRONG_CITY_SLUGS = new Set([
  'moskva',
  'moscow',
  'sankt-peterburg',
  'saint-petersburg',
  'kazan',
  'ekaterinburg',
  'nizhniy-novgorod',
  'nizhny-novgorod',
  'samara',
  'novosibirsk',
  'krasnodar',
  'sochi',
  'kaliningrad',
  'yaroslavl',
  'vladimir',
  'perm',
]);

export type HubIndexDecision = {
  indexable: boolean;
  thin: boolean;
  reason:
    | 'strong_city'
    | 'enough_events'
    | 'low_event_count'
    | 'zero_events'
    | 'explicit_noindex'
    | 'non_venue_type';
};

/**
 * Venue types that are sub-entities of an event rather than a destination in
 * their own right, so they must never get a standalone indexable page.
 *
 * A meeting point inherits every event of the excursion it belongs to, so it
 * always clears MIN_VENUE_EVENTS_FOR_INDEX (= 1) no matter how thin it is.
 * Live example: /venues/base - "BASE", type meeting_point, one address, a
 * generic name, self-canonical, `index, follow`, and present in venues.xml.
 *
 * Deliberately narrow. Parks, piers, temples, buses and monuments are real
 * places with their own demand and stay indexable; only the degenerate
 * collection/placeholder types are excluded.
 */
export const NON_INDEXABLE_VENUE_TYPES = new Set(['meeting_point', 'online', 'other']);

function normalizeVenueType(value?: string | null): string {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function normalizeSlug(value?: string | null): string {
  return String(value || '')
    .trim()
    .toLowerCase();
}

export function isStrongCitySlug(...candidates: Array<string | null | undefined>): boolean {
  return candidates.some((candidate) => STRONG_CITY_SLUGS.has(normalizeSlug(candidate)));
}

export function evaluateCityIndexability(input: {
  events: number;
  slug?: string | null;
  sourceSlug?: string | null;
  isIndexable?: boolean | null;
}): HubIndexDecision {
  if (input.isIndexable === false) {
    return { indexable: false, thin: true, reason: 'explicit_noindex' };
  }

  if (isStrongCitySlug(input.slug, input.sourceSlug)) {
    return { indexable: true, thin: false, reason: 'strong_city' };
  }

  const events = Number(input.events) || 0;
  if (events <= 0) {
    return { indexable: false, thin: true, reason: 'zero_events' };
  }
  if (events < MIN_CITY_EVENTS_FOR_INDEX) {
    return { indexable: false, thin: true, reason: 'low_event_count' };
  }

  return { indexable: true, thin: false, reason: 'enough_events' };
}

export function evaluateVenueIndexability(input: {
  events: number;
  isIndexable?: boolean | null;
  type?: string | null;
}): HubIndexDecision {
  if (input.isIndexable === false) {
    return { indexable: false, thin: true, reason: 'explicit_noindex' };
  }

  if (NON_INDEXABLE_VENUE_TYPES.has(normalizeVenueType(input.type))) {
    return { indexable: false, thin: true, reason: 'non_venue_type' };
  }

  const events = Number(input.events) || 0;
  if (events <= 0) {
    return { indexable: false, thin: true, reason: 'zero_events' };
  }
  if (events < MIN_VENUE_EVENTS_FOR_INDEX) {
    return { indexable: false, thin: true, reason: 'low_event_count' };
  }

  return { indexable: true, thin: false, reason: 'enough_events' };
}

/**
 * Region hub: index только если live tier ≠ C (≥3 child-events).
 */
export function evaluateRegionIndexability(input: {
  childEventTotal: number;
  isIndexable?: boolean | null;
}): HubIndexDecision {
  if (input.isIndexable === false) {
    return { indexable: false, thin: true, reason: 'explicit_noindex' };
  }

  const events = Number(input.childEventTotal) || 0;
  if (events <= 0) {
    return { indexable: false, thin: true, reason: 'zero_events' };
  }
  if (resolveRegionLiveTier(events) === 'C') {
    return { indexable: false, thin: true, reason: 'low_event_count' };
  }

  return { indexable: true, thin: false, reason: 'enough_events' };
}

export function robotsForIndexability(indexable: boolean): { index: boolean; follow: boolean } {
  return indexable ? { index: true, follow: true } : { index: false, follow: true };
}

/** Region tier C: noindex + nofollow. */
export function robotsForRegionIndexability(indexable: boolean): { index: boolean; follow: boolean } {
  return indexable ? { index: true, follow: true } : { index: false, follow: false };
}
