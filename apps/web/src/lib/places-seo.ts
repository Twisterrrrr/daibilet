import { placesCatalogH1 } from './catalog-index-copy.ts';
import { cityToGenitive, cityToNominative, cityToPrepositional } from './city-declension.ts';
import {
  PLACES_HUB_DESCRIPTION,
  ensureSeoDescription,
  placesCityDescriptionFallback,
} from './seo-meta.ts';

export function firstPlacesQueryValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return String(value[0] || '').trim();
  return String(value || '').trim();
}

export type PlacesListingSeoInput = {
  cityName?: string | null;
  citySlug?: string | null;
  q?: string | null;
  type?: string | null;
  family?: string | null;
  page?: string | null;
  hasEvents?: string | null;
  sort?: string | null;
  category?: string | null;
};

export function normalizePlacesFamily(
  raw?: string | null,
): 'institution' | 'location' | '' {
  const value = String(raw || '').trim().toLowerCase();
  if (value === 'institution' || value === 'location') return value;
  return '';
}

/** Sitemap listing is only `/places` - do not invent `?city=` / `?family=` / `?category=` facets. */
export const PLACES_HUB_PATH = '/places';

function resolvePlacesCityLabel(cityName?: string | null, citySlug?: string | null): string {
  const raw = String(cityName || citySlug || '').trim();
  if (!raw) return '';
  const nominative = cityToNominative(raw);
  // Known slug/name maps to Cyrillic; unknown latin slug stays latin - skip genitive copy.
  return /[а-яё]/i.test(nominative) ? nominative : '';
}

export function buildPlacesListingCopy(
  cityName?: string | null,
  family?: string | null,
  citySlug?: string | null,
): {
  h1: string;
  title: string;
  description: string;
} {
  const city = resolvePlacesCityLabel(cityName, citySlug);
  const gen = city ? cityToGenitive(city) : '';
  const h1 = placesCatalogH1(city || null);
  const fam = normalizePlacesFamily(family);

  let description: string;
  if (fam === 'institution') {
    description = gen
      ? `Площадки ${gen}: музеи, театры, концертные залы, бары, клубы и арт-пространства. Афиша событий, электронные билеты и вход - выберите место и дату на Дайбилет.`
      : 'Каталог площадок Дайбилет: музеи, театры, концертные залы, бары, клубы и арт-пространства по городам России. Афиша, электронные билеты и вход - выберите место и дату.';
  } else if (fam === 'location') {
    description = gen
      ? `Локации ${gen}: парки, набережные, памятники, причалы, открытые площадки и точки сбора. Адреса, как добраться и события рядом - соберите день в городе с Дайбилет.`
      : 'Локации Дайбилет: парки, набережные, памятники, причалы, открытые площадки и точки сбора по городам России. Адреса, как добраться и события рядом.';
  } else if (gen) {
    description = `Музеи, театры, локации и достопримечательности ${gen}: площадки с афишей, парки, набережные, памятники и точки сбора. Смотрите события, покупайте билеты и собирайте маршрут на день в Дайбилет.`;
  } else {
    description = PLACES_HUB_DESCRIPTION;
  }

  const prep = city ? cityToPrepositional(city) : '';
  description = ensureSeoDescription(description, placesCityDescriptionFallback(prep));

  return { h1, title: h1, description };
}

export function resolvePlacesCitySlug(raw?: string | null): string {
  const value = String(raw || '').trim();
  if (!value || value.toLowerCase() === 'all') return '';
  return value;
}

/**
 * Listing SEO for `/places`.
 * Canonical is always the clean hub `/places` (strip city/family/category/q/type/sort/page).
 * Sitemap has no query facets - do not self-canonicalize filters.
 * Robots: index,follow + canon hub (same pattern as `/events?city=`).
 * Entity PDP stays `/venues/[slug]` and `/locations/[slug]`.
 */
export function buildPlacesListingSeo(input: PlacesListingSeoInput): {
  h1: string;
  title: string;
  description: string;
  canonicalPath: string;
  indexable: boolean;
} {
  const family = normalizePlacesFamily(input.family);
  const citySlug = resolvePlacesCitySlug(input.citySlug);
  const copy = buildPlacesListingCopy(input.cityName, family, citySlug);
  const city = resolvePlacesCityLabel(input.cityName, citySlug);
  const prep = city ? cityToPrepositional(city) : '';

  return {
    ...copy,
    description: ensureSeoDescription(copy.description, placesCityDescriptionFallback(prep)),
    canonicalPath: PLACES_HUB_PATH,
    indexable: true,
  };
}
