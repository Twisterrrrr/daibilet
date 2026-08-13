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

export function buildPlacesListingCopy(cityName?: string | null, family?: string | null): {
  h1: string;
  title: string;
  description: string;
} {
  const city = String(cityName || '').trim();
  const gen = city ? cityToGenitive(city) : '';
  const h1 = gen
    ? `Музеи, театры, площадки, локации ${gen}`
    : 'Музеи, театры, площадки, локации';
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
  const copy = buildPlacesListingCopy(input.cityName, family);
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
