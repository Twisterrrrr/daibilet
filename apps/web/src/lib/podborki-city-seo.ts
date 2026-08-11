import { cityToGenitive, cityToPrepositional } from './city-declension';
import { resolveLandingCityName } from './landing-city';
import { normalizeKnownCitySlug } from './landing-routes';

/**
 * Pilot cities for `/podborki?city=` unique Title/Description/H1 + self-canonical.
 * Slugs = SEO path canon (`normalizeKnownCitySlug` / landings / city hub after redirect),
 * NOT destination DB translit (`moskva`, `sankt-peterburg`).
 */
export const PODBORKI_CITY_META_PILOT_SLUGS = [
  'kaliningrad',
  'saint-petersburg',
  'moscow',
] as const;

export type PodborkiCityMetaPilotSlug = (typeof PODBORKI_CITY_META_PILOT_SLUGS)[number];

const PILOT_SET = new Set<string>(PODBORKI_CITY_META_PILOT_SLUGS);

export type PodborkiCitySeoPackage = {
  citySlug: PodborkiCityMetaPilotSlug;
  cityName: string;
  /** Absolute-path canonical including query - self, not bare `/podborki`. */
  canonicalPath: string;
  title: string;
  description: string;
  h1: string;
  heroDescription: string;
};

/** Hub defaults (no city / city=all / non-pilot). */
export const PODBORKI_HUB_SEO = {
  title: 'Подборки - тематические коллекции событий',
  description:
    'Готовые подборки на вечер, выходные и бюджет: по типу событий, для кого и сезонные программы.',
  h1: 'Готовые планы на вечер и выходные',
  heroDescription:
    'Подборки под настроение: для двоих, с детьми, бюджетно или культурно - сразу к билетам.',
  canonicalPath: '/podborki',
} as const;

export function isPodborkiCityMetaPilotSlug(slug: string | null | undefined): slug is PodborkiCityMetaPilotSlug {
  return Boolean(slug && PILOT_SET.has(slug));
}

/**
 * Resolve raw `?city=` (destination slug, SEO slug, or alias) to pilot SEO canon.
 * Returns null for all / missing / non-pilot.
 */
export function resolvePodborkiCityMetaPilot(
  rawCity: string | null | undefined,
): { citySlug: PodborkiCityMetaPilotSlug; cityName: string } | null {
  const raw = String(rawCity || '').trim();
  if (!raw || raw.toLowerCase() === 'all') return null;
  const canon = normalizeKnownCitySlug(raw);
  if (!isPodborkiCityMetaPilotSlug(canon)) return null;
  const cityName = resolveLandingCityName(canon) || resolveLandingCityName(raw) || canon;
  return { citySlug: canon, cityName };
}

export function buildPodborkiCityCanonicalPath(citySlug: PodborkiCityMetaPilotSlug): string {
  return `/podborki?city=${encodeURIComponent(citySlug)}`;
}

/**
 * Ideation hub copy - must not cannibalize `/cities/{slug}` (афиша / куда сходить).
 * Подборки = готовые идеи и тематические коллекции на Дайбилет.
 */
export function buildPodborkiCitySeoPackage(input: {
  citySlug: PodborkiCityMetaPilotSlug;
  cityName: string;
}): PodborkiCitySeoPackage {
  const prep = cityToPrepositional(input.cityName);
  const gen = cityToGenitive(input.cityName);
  const title = `Подборки событий в ${prep} - готовые идеи куда сходить`;
  const description =
    `Тематические подборки событий ${gen} на Дайбилет: выходные, вечер, с детьми и бюджетно. ` +
    `Выберите идею и перейдите к билетам без долгого поиска по афише.`;
  const h1 = `Подборки в ${prep}: готовые идеи на вечер и выходные`;
  const heroDescription =
    `Идейный хаб Дайбилет для ${gen}: тематические коллекции под настроение - сразу к событиям и билетам.`;
  return {
    citySlug: input.citySlug,
    cityName: input.cityName,
    canonicalPath: buildPodborkiCityCanonicalPath(input.citySlug),
    title,
    description,
    h1,
    heroDescription,
  };
}

export function resolvePodborkiCatalogSeo(rawCity: string | null | undefined): {
  pilot: PodborkiCitySeoPackage | null;
  title: string;
  description: string;
  h1: string;
  heroDescription: string;
  canonicalPath: string;
} {
  const resolved = resolvePodborkiCityMetaPilot(rawCity);
  if (!resolved) {
    return {
      pilot: null,
      title: PODBORKI_HUB_SEO.title,
      description: PODBORKI_HUB_SEO.description,
      h1: PODBORKI_HUB_SEO.h1,
      heroDescription: PODBORKI_HUB_SEO.heroDescription,
      canonicalPath: PODBORKI_HUB_SEO.canonicalPath,
    };
  }
  const pack = buildPodborkiCitySeoPackage(resolved);
  return {
    pilot: pack,
    title: pack.title,
    description: pack.description,
    h1: pack.h1,
    heroDescription: pack.heroDescription,
    canonicalPath: pack.canonicalPath,
  };
}
