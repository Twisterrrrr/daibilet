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
  sort?: string | null;
};

export function normalizePlacesFamily(
  raw?: string | null,
): 'institution' | 'location' | '' {
  const value = String(raw || '').trim().toLowerCase();
  if (value === 'institution' || value === 'location') return value;
  return '';
}

const PLACES_H1 = 'Музеи, театры, локации, достопримечательности';

export function buildPlacesListingCopy(
  cityName?: string | null,
  family?: string | null,
): {
  h1: string;
  title: string;
  description: string;
} {
  const city = String(cityName || '').trim();
  const gen = city ? cityToGenitive(city) : '';
  const h1 = gen ? `${PLACES_H1} ${gen}` : PLACES_H1;
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
  } else {
    description = gen
      ? `Музеи, театры, локации и достопримечательности ${gen}: площадки с афишей, парки, набережные, памятники и точки сбора. Смотрите события, покупайте билеты и собирайте маршрут на день в Дайбилет.`
      : 'Каталог мест Дайбилет: музеи, театры, концертные залы, парки, набережные, памятники и точки сбора по городам России. Смотрите афишу, покупайте билеты и собирайте маршрут на один день.';
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
 * Thin `q` / `type` / `hasEvents` / `sort≠events` / `page>1` → noindex, canonical to parent without those params.
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
  const sortRaw = String(input.sort || '').trim().toLowerCase();
  const thinSort = Boolean(sortRaw && sortRaw !== 'events');
  const citySlug = resolvePlacesCitySlug(input.citySlug);
  const copy = buildPlacesListingCopy(input.cityName, family);
  const thin = Boolean(q || type || hasPage || hasEvents || thinSort);

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
