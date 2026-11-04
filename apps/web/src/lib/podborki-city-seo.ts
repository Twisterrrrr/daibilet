import { cityToGenitive, cityToPrepositional } from './city-declension';
import { LANDING_CITY_SLUGS, resolveLandingCityName } from './landing-city';
import { normalizeKnownCitySlug } from './landing-routes';

/**
 * Active SEO pilot cities (owner 2026-09-03): KGD + SPB + PILOT-2 NN + Perm.
 * Used for: soft `?city=` Meta primary scope, intent×city stable index, sitemap city-variants.
 * Slugs = SEO path canon (`normalizeKnownCitySlug`), NOT DB translit (`moskva` / `sankt-peterburg`).
 */
export const PODBORKI_SEO_PILOT_CITY_SLUGS = [
  'kaliningrad',
  'saint-petersburg',
  'nizhny-novgorod',
  'perm',
] as const;

/**
 * Meta Title/Desc/H1 + self-canonical on marker CHPU `/podborki/c/{city}`.
 * Includes legacy `moscow` as harmless leftover (не расширяем пилот; не ломаем уже залитый meta).
 * Soft `/podborki?city=` for these slugs 301 → marker CHPU.
 */
export const PODBORKI_CITY_META_PILOT_SLUGS = [
  ...PODBORKI_SEO_PILOT_CITY_SLUGS,
  'moscow',
] as const;

export type PodborkiSeoPilotCitySlug = (typeof PODBORKI_SEO_PILOT_CITY_SLUGS)[number];
export type PodborkiCityMetaPilotSlug = (typeof PODBORKI_CITY_META_PILOT_SLUGS)[number];

const SEO_PILOT_SET = new Set<string>(PODBORKI_SEO_PILOT_CITY_SLUGS);
const PILOT_SET = new Set<string>(PODBORKI_CITY_META_PILOT_SLUGS);

/** Marker segment for city-scoped podborki hub (`/podborki/c/{city}`). */
export const PODBORKI_CITY_HUB_MARKER = 'c' as const;

export function isPodborkiSeoPilotCitySlug(
  slug: string | null | undefined,
): slug is PodborkiSeoPilotCitySlug {
  const canon = normalizeKnownCitySlug(slug) || String(slug || '').trim();
  return Boolean(canon && SEO_PILOT_SET.has(canon));
}

export type PodborkiCitySeoPackage = {
  citySlug: PodborkiCityMetaPilotSlug;
  cityName: string;
  /** Absolute-path canonical marker CHPU - self, not bare `/podborki` or soft `?city=`. */
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
 * Resolve raw `?city=` / picker label (destination slug, SEO slug, alias, or display name)
 * to meta-pilot SEO canon. Returns null for all / missing / non-pilot.
 */
export function resolvePodborkiCityMetaPilot(
  rawCity: string | null | undefined,
): { citySlug: PodborkiCityMetaPilotSlug; cityName: string } | null {
  const raw = String(rawCity || '').trim();
  if (!raw || raw.toLowerCase() === 'all') return null;

  const fromSlug = normalizeKnownCitySlug(raw);
  if (isPodborkiCityMetaPilotSlug(fromSlug)) {
    const cityName = resolveLandingCityName(fromSlug) || resolveLandingCityName(raw) || fromSlug;
    return { citySlug: fromSlug, cityName };
  }

  // Header picker may pass display name when destination list lacks the city.
  const needle = raw.toLowerCase();
  for (const [slug, name] of Object.entries(LANDING_CITY_SLUGS)) {
    if (name !== raw && name.toLowerCase() !== needle) continue;
    const canon = normalizeKnownCitySlug(slug);
    if (!isPodborkiCityMetaPilotSlug(canon)) continue;
    return { citySlug: canon, cityName: name };
  }

  return null;
}

export function buildPodborkiCityCanonicalPath(citySlug: PodborkiCityMetaPilotSlug): string {
  return `/podborki/${PODBORKI_CITY_HUB_MARKER}/${encodeURIComponent(citySlug)}`;
}

/**
 * Public href for city-scoped podborki hub.
 * Meta-pilot (incl. moscow leftover + future SEO pilot expansions) → marker CHPU;
 * other known cities stay on soft `?city=`; missing/all → hub root.
 */
export function buildPodborkiCityHref(rawCity: string | null | undefined): string {
  const raw = String(rawCity || '').trim();
  if (!raw || raw.toLowerCase() === 'all') return PODBORKI_HUB_SEO.canonicalPath;
  const resolved = resolvePodborkiCityMetaPilot(raw);
  if (resolved) return buildPodborkiCityCanonicalPath(resolved.citySlug);
  const canon = normalizeKnownCitySlug(raw) || raw;
  return `/podborki?city=${encodeURIComponent(canon)}`;
}

/** Parse `/podborki/c/{city}` (optional trailing slash). Returns raw path segment or null. */
export function parsePodborkiCityHubPath(pathname: string | null | undefined): string | null {
  const path = String(pathname || '').replace(/\/+$/, '') || '/';
  const match = path.match(new RegExp(`^/podborki/${PODBORKI_CITY_HUB_MARKER}/([^/?#]+)$`, 'i'));
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]).trim() || null;
  } catch {
    return String(match[1]).trim() || null;
  }
}

/**
 * Soft `/podborki?city=` → marker CHPU when city resolves to meta-pilot canon.
 * Returns destination path or null (no redirect).
 */
export function resolvePodborkiCityQueryRedirect(
  rawCity: string | null | undefined,
): string | null {
  const resolved = resolvePodborkiCityMetaPilot(rawCity);
  if (!resolved) return null;
  return buildPodborkiCityCanonicalPath(resolved.citySlug);
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
