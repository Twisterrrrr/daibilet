/**
 * Политика индексации hub-страниц (city / region / venue).
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

export const MIN_CITY_EVENTS_FOR_INDEX = 3;
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
]);

export type HubIndexDecision = {
  indexable: boolean;
  thin: boolean;
  reason: 'strong_city' | 'enough_events' | 'low_event_count' | 'zero_events' | 'explicit_noindex';
};

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
}): HubIndexDecision {
  if (input.isIndexable === false) {
    return { indexable: false, thin: true, reason: 'explicit_noindex' };
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
