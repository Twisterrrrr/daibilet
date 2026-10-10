/**
 * Editorial hero covers for /my-day Hot Picks, location/venue catalog cards & PDP
 * when hub omits heroImageUrl or only has a dark /venues/generated stub.
 *
 * Data maps extracted to city-place-images-data.ts for code-splitting.
 * This file exports only utility functions that reference the data from the data file.
 * Client components should call preloadPlaceImages() on mount to ensure data is available.
 */

import { CITY_IDENTITY_FALLBACK } from './city-place-images-region-packs.ts';
import {
  EDITORIAL_IMAGES_BY_SLUG,
  PLACE_IMAGE_ALIASES,
} from './city-place-images-data.ts';
import {
  preloadPlaceImages,
  getEditorialPlaceImage as _getEditorialPlaceImage,
} from './city-place-images-lazy.ts';

/** Preload lazy data — call in client component useEffect. */
export { preloadPlaceImages };

/** Sync lookup via lazy cache — returns null if data not loaded yet. */
export function getEditorialPlaceImage(slug: string | null | undefined): string | null {
  return _getEditorialPlaceImage(slug);
}

function normalizePlaceImageKey(slug: string | null | undefined): string {
  return String(slug || '')
    .trim()
    .toLowerCase()
    .replace(/-+$/g, '');
}

/** Suburb card slug → canonical catalog slug (same keys as PLACE_IMAGE_ALIASES). */
export function resolveEditorialPlaceSlugAlias(slug: string | null | undefined): string | null {
  const key = normalizePlaceImageKey(slug);
  if (!key) return null;
  return PLACE_IMAGE_ALIASES[key] || null;
}

export function lookupEditorialPlaceImage(
  slug: string | null | undefined,
): string | null {
  const key = normalizePlaceImageKey(slug);
  if (!key) return null;
  const direct = EDITORIAL_IMAGES_BY_SLUG[key];
  if (direct) return direct;
  const alias = PLACE_IMAGE_ALIASES[key];
  if (!alias) return null;
  return EDITORIAL_IMAGES_BY_SLUG[alias] || null;
}

/** True for dark auto stubs that should lose to editorial covers. */
export function isGeneratedVenueStub(url: string | null | undefined): boolean {
  const value = String(url || '')
    .trim()
    .toLowerCase();
  if (!value) return true;
  return value.includes('/venues/generated/') || value.includes('venue-auto-stub');
}

/**
 * Early NN (and similar) editorial files that are label cards:
 * blurry color blobs + navy caption bar, not a real place photo.
 * Scenario magazine covers must skip these or cards look like «missing preview».
 */
/** NN label-card stubs regen'd 2026-08-23 (scripts/nn-regen-worklist.json). */
const LABEL_CARD_VENUE_STUB_BASENAMES = new Set<string>([]);

/** Label-card JPG stubs (gradient + caption) - not usable as scenario covers. */
export function isLabelCardVenueStub(url: string | null | undefined): boolean {
  const value = String(url || '')
    .trim()
    .toLowerCase()
    .split('?')[0]
    .split('#')[0];
  if (!value) return false;
  const base = value.slice(value.lastIndexOf('/') + 1);
  return LABEL_CARD_VENUE_STUB_BASENAMES.has(base);
}

const IDENTITY_CITY_PREFIXES = Object.keys(CITY_IDENTITY_FALLBACK).sort(
  (a, b) => b.length - a.length,
);

/** Cities with `/images/venues/{city}/{stem}.jpg` on disk (longest match first). */
const CONVENTIONAL_VENUE_CITY_PREFIXES = [
  ...new Set([
    ...IDENTITY_CITY_PREFIXES,
    'blagoveschensk-amurskaya-oblast',
    'kirov-kirovskaya-oblast',
    'nizhny-novgorod',
    'rostov-na-donu',
    'saint-petersburg',
    'veliky-novgorod',
    'yuzhno-sahalinsk',
    'yoshkar-ola',
    'abakan',
    'arhangelsk',
    'astrahan',
    'barnaul',
    'belgorod',
    'bryansk',
    'cheboksary',
    'chita',
    'habarovsk',
    'irkutsk',
    'ivanovo',
    'izhevsk',
    'kaliningrad',
    'kaluga',
    'kemerovo',
    'kirov',
    'kostroma',
    'krasnodar',
    'kurgan',
    'kursk',
    'lipeck',
    'moscow',
    'murmansk',
    'orel',
    'orenburg',
    'perm',
    'pskov',
    'saransk',
    'saratov',
    'sevastopol',
    'simferopol',
    'sochi',
    'sortavala',
    'stavropol',
    'syktyvkar',
    'tambov',
    'tomsk',
    'ulan-ude',
    'ulyanovsk',
    'vladimir',
    'vladivostok',
    'volgograd',
    'vologda',
    'vyborg',
    'yaroslavl',
  ]),
].sort((a, b) => b.length - a.length);

function editorialImageBasename(url: string): string {
  return String(url || '')
    .split('/')
    .pop()
    ?.replace(/\.jpe?g$/i, '') || '';
}

/**
 * True when an editorial still belongs to another POI in the same city
 * (e.g. kazanskiy-kreml.jpg reused for kazan-pamyatnik-* slugs).
 */
function isSharedVenueFallback(
  editorial: string | null | undefined,
  slug: string | null | undefined,
): boolean {
  const url = String(editorial || '').trim();
  const key = normalizePlaceImageKey(slug);
  if (!url || !key || editorialVenueImageMatchesSlug(url, slug)) return false;

  const base = editorialImageBasename(url);
  if (!base) return false;

  for (const city of CONVENTIONAL_VENUE_CITY_PREFIXES) {
    if (!key.startsWith(`${city}-`)) continue;
    const stem = key.slice(city.length + 1);
    if (!stem || base === stem) return false;

    const donorKey = `${city}-${base}`;
    if (donorKey !== key && EDITORIAL_IMAGES_BY_SLUG[donorKey] === url) {
      return true;
    }
  }
  return false;
}

const IDENTITY_CITY_SET = new Set<string>(IDENTITY_CITY_PREFIXES);

/** Conventional `{city}/{stem}.jpg` when the city has no identity pack (e.g. Kaliningrad). */
function shouldPreferConventionalWithoutEditorial(slug: string | null | undefined): boolean {
  const key = normalizePlaceImageKey(slug);
  if (!key) return false;
  for (const city of CONVENTIONAL_VENUE_CITY_PREFIXES) {
    if (!key.startsWith(`${city}-`)) continue;
    return !IDENTITY_CITY_SET.has(city);
  }
  return false;
}

export function isCityPlaceholderImage(url: string | null | undefined): boolean {
  const value = String(url || '').trim().toLowerCase();
  return value.startsWith('/images/cities/');
}

/** City identity pack when a listed place has no unique still (avoids gray cards). */
export function inferCityIdentityImage(slug: string | null | undefined): string | null {
  const key = normalizePlaceImageKey(slug);
  if (!key) return null;
  for (const city of IDENTITY_CITY_PREFIXES) {
    if (key === city || key.startsWith(`${city}-`)) {
      return CITY_IDENTITY_FALLBACK[city] || null;
    }
  }
  return null;
}

/**
 * Prefer curated editorial cover for catalog cards / PDP / my-day.
 * Then city identity pack. Hub photo wins only when no editorial/identity
 * and hub is a real image (not generated stub / cities/*.png).
 */
/**
 * On-disk convention `/images/venues/{city}/{stem}.jpg` for `city-stem` slugs.
 * Beats city-identity pack so nested/must-see cards do not all share one symbol
 * when the editorial map entry is missing from a stale bundle.
 */
export function inferConventionalVenueImage(slug: string | null | undefined): string | null {
  const key = normalizePlaceImageKey(slug);
  if (!key) return null;
  for (const city of CONVENTIONAL_VENUE_CITY_PREFIXES) {
    if (key === city) continue;
    if (!key.startsWith(`${city}-`)) continue;
    const stem = key.slice(city.length + 1);
    if (!stem || stem.includes('/')) return null;
    return `/images/venues/${city}/${stem}.jpg`;
  }
  return null;
}

/** True when editorial path is slug-specific (not a stale shared still for another POI). */
export function editorialVenueImageMatchesSlug(
  editorial: string | null | undefined,
  slug: string | null | undefined,
): boolean {
  const url = String(editorial || '').trim();
  const key = normalizePlaceImageKey(slug);
  if (!url || !key) return false;
  if (url.includes('/identity-')) return true;
  for (const city of CONVENTIONAL_VENUE_CITY_PREFIXES) {
    if (!key.startsWith(`${city}-`)) continue;
    const stem = key.slice(city.length + 1);
    if (!stem) return false;
    const base = editorialImageBasename(url);
    return base === stem || base.startsWith(`${stem}-`);
  }
  return false;
}

/**
 * Editorial map when slug-specific; else on-disk convention so stale shared
 * fallbacks (e.g. kreml for every kremlin POI) cannot override unique files.
 */
export function resolveEditorialVenueCover(slug: string | null | undefined): string | null {
  const key = normalizePlaceImageKey(slug);
  const direct = key ? EDITORIAL_IMAGES_BY_SLUG[key] : null;

  if (direct && editorialVenueImageMatchesSlug(direct, slug)) return direct;

  const conventional = inferConventionalVenueImage(slug);
  if (direct && isSharedVenueFallback(direct, slug)) {
    // Explicit map for this slug may intentionally reuse a suburb hero
    // (e.g. Большой дворец → petergof.jpg). Prefer that over a guessed
    // `{stem}.jpg` that often 404s and greys out the rail card.
    return direct;
  }
  if (direct) return direct;

  const editorial = lookupEditorialPlaceImage(slug);
  if (editorial && editorialVenueImageMatchesSlug(editorial, slug)) return editorial;
  if (editorial && isSharedVenueFallback(editorial, slug)) {
    if (conventional) return conventional;
    return editorial;
  }
  if (editorial) return editorial;
  if (conventional && shouldPreferConventionalWithoutEditorial(slug)) return conventional;
  return null;
}

export function resolveVenueHeroImage(
  slug: string | null | undefined,
  hubImageUrl?: string | null,
): string | null {
  const cover = resolveEditorialVenueCover(slug);
  if (cover) return cover;
  const identity = inferCityIdentityImage(slug);
  if (identity) return identity;
  const hub = String(hubImageUrl || '').trim() || null;
  if (!hub || isGeneratedVenueStub(hub) || isCityPlaceholderImage(hub)) return null;
  return hub;
}

/**
 * Timeline / stop thumbs: LS may slim away imageUrl on quota pressure.
 * Re-resolve from slug/id + any remaining hub URL so circles are not empty
 * when editorial LOCATION_PACK / must-see maps already have a cover.
 */
export function resolveDayRouteStopImage(item: {
  id?: string | null;
  slug?: string | null;
  imageUrl?: string | null;
}): string | null {
  const hub = String(item.imageUrl || '').trim() || null;
  return (
    resolveVenueHeroImage(item.slug, hub) ||
    resolveVenueHeroImage(item.id, hub) ||
    (hub && !isGeneratedVenueStub(hub) ? hub : null)
  );
}
