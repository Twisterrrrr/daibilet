import { cityToGenitive } from './city-declension.ts';

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
};

export function normalizePlacesFamily(
  raw?: string | null,
): 'institution' | 'location' | '' {
  const value = String(raw || '').trim().toLowerCase();
  if (value === 'institution' || value === 'location') return value;
  return '';
}

const PLACES_H1_DEFAULTS: Record<'all' | 'institution' | 'location', readonly string[]> = {
  all: ['музеи', 'театры', 'площадки', 'локации'],
  institution: ['музеи', 'театры', 'концертные залы', 'площадки'],
  location: ['парки', 'памятники', 'причалы', 'локации'],
};

/** Plural kinds for a city-stable H1 (not Math.random - same URL keeps the same four). */
const PLACES_H1_POOLS: Record<'all' | 'institution' | 'location', readonly string[]> = {
  all: [
    'музеи',
    'театры',
    'парки',
    'площадки',
    'локации',
    'концертные залы',
    'памятники',
    'достопримечательности',
    'арт-пространства',
    'причалы',
  ],
  institution: ['музеи', 'театры', 'концертные залы', 'арт-пространства', 'площадки', 'клубы'],
  location: ['парки', 'памятники', 'достопримечательности', 'локации', 'причалы', 'открытые локации'],
};

function hashSeed(raw: string): number {
  let hash = 2166136261;
  for (let index = 0; index < raw.length; index += 1) {
    hash ^= raw.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function capitalizeFirst(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatPlacesH1Types(types: string[]): string {
  return types.map((item, index) => (index === 0 ? capitalizeFirst(item) : item)).join(', ');
}

/**
 * Four catalog kinds for `/places` H1. Seeded by city slug so title/H1 stay stable per URL.
 */
export function pickPlacesH1Types(seed?: string | null, family?: string | null): string[] {
  const fam = normalizePlacesFamily(family) || 'all';
  const defaults = [...PLACES_H1_DEFAULTS[fam]];
  const key = String(seed || '')
    .trim()
    .toLowerCase();
  if (!key || key === 'all') return defaults;
  const pool = [...PLACES_H1_POOLS[fam]];
  let cursor = hashSeed(key);
  for (let index = pool.length - 1; index > 0; index -= 1) {
    cursor = (Math.imul(cursor, 1664525) + 1013904223) >>> 0;
    const swap = cursor % (index + 1);
    const current = pool[index];
    pool[index] = pool[swap];
    pool[swap] = current;
  }
  return pool.slice(0, 4);
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
  const city = String(cityName || '').trim();
  const gen = city ? cityToGenitive(city) : '';
  const seed = String(citySlug || city || '').trim();
  const types = formatPlacesH1Types(pickPlacesH1Types(city ? seed : '', family));
  const h1 = gen ? `${types} ${gen}` : types;
  const fam = normalizePlacesFamily(family);

  let description: string;
  if (fam === 'institution') {
    description = gen
      ? `Площадки ${gen}: музеи, театры, залы и арт-пространства. Афиша и билеты на Дайбилет.`
      : 'Каталог площадок: музеи, театры, залы и арт-пространства. Афиша и электронные билеты.';
  } else if (fam === 'location') {
    description = gen
      ? `Локации ${gen}: парки, набережные, памятники и точки сбора.`
      : 'Локации: парки, набережные, памятники, причалы и точки сбора.';
  } else {
    description = gen
      ? `Площадки с афишей и локации ${gen}: музеи, театры, парки, набережные и точки сбора. Один каталог мест.`
      : 'Площадки с афишей и локации по городам России: музеи, театры, парки, набережные и точки сбора. Один каталог мест.';
  }

  return { h1, title: h1, description };
}

export function resolvePlacesCitySlug(raw?: string | null): string {
  const value = String(raw || '').trim();
  if (!value || value.toLowerCase() === 'all') return '';
  return value;
}

/**
 * Listing SEO for `/places`.
 * Indexable: hub, `?city=`, `?family=institution|location` (and city+family).
 * Thin `q` / `type` / `hasEvents` / `page>1` → noindex, canonical to parent without those params.
 * Entity PDP stays `/venues/[slug]` and `/locations/[slug]`.
 */
export function buildPlacesListingSeo(input: PlacesListingSeoInput): {
  h1: string;
  title: string;
  description: string;
  canonicalPath: string;
  indexable: boolean;
} {
  const q = String(input.q || '').trim();
  const type = String(input.type || '').trim();
  const family = normalizePlacesFamily(input.family);
  const page = Number.parseInt(String(input.page || '').trim(), 10);
  const hasPage = Number.isFinite(page) && page > 1;
  const hasEventsRaw = String(input.hasEvents || '').trim().toLowerCase();
  const hasEvents = hasEventsRaw === '1' || hasEventsRaw === 'true' || hasEventsRaw === 'yes';
  const citySlug = resolvePlacesCitySlug(input.citySlug);
  const copy = buildPlacesListingCopy(input.cityName, family, citySlug);
  const thin = Boolean(q || type || hasPage || hasEvents);

  const canon = new URLSearchParams();
  if (citySlug) canon.set('city', citySlug);
  if (!thin && family) canon.set('family', family);
  const qs = canon.toString();
  const canonicalPath = qs ? `/places?${qs}` : '/places';

  return {
    ...copy,
    canonicalPath,
    indexable: !thin,
  };
}
