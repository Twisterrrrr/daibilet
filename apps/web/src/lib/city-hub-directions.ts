import type { CityHubConfig, FeaturedDirectionConfig } from './city-hub-config.ts';
import { normalizeCityHubSlug } from './city-hub-config.ts';
import { landingCategoryHref } from './landing-routes.ts';

export type LandingLike = {
  slug: string;
  title: string;
  subtitle?: string | null;
  events: number;
  priceFrom?: number | null;
};

/** Water / boat landings - only surface on hubs with real water inventory (or when count>0 after rematch). */
const WATER_LANDING_SLUGS = new Set([
  'river-cruises',
  'river-party',
  'bridges-night',
  'moscow-dinner-boat',
  'moscow-city-day',
]);

/** Cities where boat/river landings are expected; landlocked hubs never auto-promote them. */
const WATER_LANDING_CITY_SLUGS = new Set([
  'moscow',
  'moskva',
  'saint-petersburg',
  'sankt-peterburg',
  'kazan',
  'nizhny-novgorod',
  'nizhniy-novgorod',
  'samara',
  'volgograd',
  'rostov-na-donu',
  'astrahan',
  'yaroslavl',
  'sochi',
  'kaliningrad',
  'vladivostok',
  'saratov',
  'tver',
  'ulyanovsk',
  'kostroma',
  'ryazan',
  'cheboksary',
  'perm',
]);

export function isWaterLandingAllowedForCity(
  landingSlug: string | null | undefined,
  citySlug?: string | null,
): boolean {
  const slug = String(landingSlug || '').trim().toLowerCase();
  if (!slug || !WATER_LANDING_SLUGS.has(slug)) return true;
  const city = normalizeCityHubSlug(citySlug);
  if (!city) return true;
  return WATER_LANDING_CITY_SLUGS.has(city);
}

export type ResolvedFeaturedDirection = {
  id: string;
  label: string;
  slug?: string;
  title: string;
  subtitle?: string | null;
  events: number;
  priceFrom?: number | null;
  href?: string;
  categoryKey?: string;
  emphasis?: 'primary' | 'default';
};

function landingBySlug(landings: LandingLike[], slug: string): LandingLike | null {
  const needle = slug.trim().toLowerCase();
  return landings.find((item) => item.slug.trim().toLowerCase() === needle) || null;
}

function resolveCategoryDirection(
  item: FeaturedDirectionConfig,
  categories: Array<[string, number]>,
): ResolvedFeaturedDirection | null {
  if (!item.categoryKey) return null;
  const needle = item.categoryKey.trim().toLowerCase();
  const match =
    categories.find(([name]) => name.trim().toLowerCase() === needle) ||
    // Soft match: config «Музеи» vs API «Музеи и арт»
    categories.find(([name]) => {
      const n = name.trim().toLowerCase();
      return n.includes(needle) || needle.includes(n);
    });
  if (!match || match[1] <= 0) return null;
  return {
    id: item.id,
    label: item.label,
    title: item.label,
    events: match[1],
    categoryKey: match[0],
    href: item.href,
    emphasis: item.emphasis,
  };
}

function resolveDirectionFromConfig(
  item: FeaturedDirectionConfig,
  landings: LandingLike[],
  categories: Array<[string, number]>,
  citySlug?: string | null,
): ResolvedFeaturedDirection | null {
  if (item.landingSlug) {
    const landing = landingBySlug(landings, item.landingSlug);
    if (
      landing &&
      Number(landing.events) > 0 &&
      isWaterLandingAllowedForCity(landing.slug, citySlug)
    ) {
      return {
        id: item.id,
        label: item.label,
        slug: landing.slug,
        title: item.label || landing.title,
        subtitle: landing.subtitle ?? null,
        events: landing.events,
        priceFrom: landing.priceFrom ?? null,
        href: item.href || landingCategoryHref(landing.slug, citySlug),
        emphasis: item.emphasis,
      };
    }
    // Landing missing/empty for this city - fall back to category so museums etc. stay visible.
    const categoryFallback = resolveCategoryDirection(item, categories);
    if (categoryFallback) return categoryFallback;
  } else {
    const categoryRow = resolveCategoryDirection(item, categories);
    if (categoryRow) return categoryRow;
  }

  if (item.href) {
    return {
      id: item.id,
      label: item.label,
      title: item.label,
      events: 0,
      href: item.href,
      emphasis: item.emphasis,
    };
  }

  return null;
}

/**
 * Собирает плитки направлений: конфиг курирует порядок, API валидирует count > 0.
 */
export function resolveFeaturedDirections(input: {
  config: CityHubConfig | null;
  landings: LandingLike[];
  categories: Array<[string, number]>;
  citySlug?: string | null;
  limit?: number;
}): ResolvedFeaturedDirection[] {
  const limit = input.limit ?? 6;
  const configured = input.config?.featuredDirections || [];
  const resolved: ResolvedFeaturedDirection[] = [];
  const usedLandingSlugs = new Set<string>();
  const usedCategories = new Set<string>();

  for (const item of configured) {
    const row = resolveDirectionFromConfig(item, input.landings, input.categories, input.citySlug);
    if (!row) continue;
    if (row.slug && usedLandingSlugs.has(row.slug)) continue;
    if (row.categoryKey && usedCategories.has(row.categoryKey.toLowerCase())) continue;
    if (row.slug) usedLandingSlugs.add(row.slug);
    if (row.categoryKey) usedCategories.add(row.categoryKey.toLowerCase());
    resolved.push(row);
    if (resolved.length >= limit) return resolved;
  }

  const landingFallback = input.landings
    .filter((landing) => Number(landing.events) > 0)
    .filter((landing) => isWaterLandingAllowedForCity(landing.slug, input.citySlug))
    .filter((landing) => !usedLandingSlugs.has(landing.slug))
    .slice(0, Math.max(0, limit - resolved.length))
    .map((landing) => ({
      id: `landing:${landing.slug}`,
      label: landing.title,
      slug: landing.slug,
      title: landing.title,
      subtitle: landing.subtitle ?? null,
      events: landing.events,
      priceFrom: landing.priceFrom ?? null,
      href: landingCategoryHref(landing.slug, input.citySlug),
    }));

  const categoryFallback = input.categories
    .filter(([, count]) => count > 0)
    .filter(([name]) => !usedCategories.has(name.trim().toLowerCase()))
    .filter(([name]) => !resolved.some((row) => row.title.trim().toLowerCase() === name.trim().toLowerCase()))
    .slice(0, Math.max(0, limit - resolved.length - landingFallback.length))
    .map(([name, count]) => ({
      id: `category:${name}`,
      label: name,
      title: name,
      events: count,
      categoryKey: name,
    }));

  return [...resolved, ...landingFallback, ...categoryFallback].slice(0, limit);
}

const SIGHT_LANDING_HINTS: Array<{ pattern: RegExp; landingSlug: string; label: string }> = [
  { pattern: /эрмитаж|дворец|музей|галере|выставк/i, landingSlug: 'exhibitions', label: 'Музеи и выставки' },
  { pattern: /эрмитаж|дворец|музей|галере|выставк/i, landingSlug: 'moscow-museums', label: 'Музеи и выставки' },
  { pattern: /нева|река|круиз|прогулк|причал|теплоход/i, landingSlug: 'river-cruises', label: 'Речные прогулки' },
  { pattern: /мост|развод/i, landingSlug: 'bridges-night', label: 'Развод мостов' },
  { pattern: /петергоф|дворец|загород/i, landingSlug: 'country-tours', label: 'Загородные экскурсии' },
  { pattern: /кремл|собор|храм/i, landingSlug: 'walking-tours', label: 'Пешие экскурсии' },
  { pattern: /театр|балет|опер/i, landingSlug: 'unusual-theatres', label: 'Театр' },
  { pattern: /стендап|комик|юмор/i, landingSlug: 'standup', label: 'Стендап' },
  { pattern: /концерт/i, landingSlug: 'concerts-genre', label: 'Концерты' },
];

/**
 * CTA для sight только при реальной привязке к landing или category с count > 0.
 */
export function matchSightAfficheLink(input: {
  sightName: string;
  sightDesc?: string;
  landings: LandingLike[];
  categories: Array<[string, number]>;
  citySlug?: string | null;
}): { href: string; label: string; kind: 'landing' | 'category' | 'affiche' } | null {
  const hay = `${input.sightName} ${input.sightDesc || ''}`.trim();
  if (!hay) return null;

  for (const hint of SIGHT_LANDING_HINTS) {
    if (!hint.pattern.test(hay)) continue;
    const landing = landingBySlug(input.landings, hint.landingSlug);
    if (
      landing &&
      Number(landing.events) > 0 &&
      isWaterLandingAllowedForCity(landing.slug, input.citySlug)
    ) {
      return {
        href: landingCategoryHref(landing.slug, input.citySlug),
        label: hint.label,
        kind: 'landing',
      };
    }
  }

  for (const [name, count] of input.categories) {
    if (count <= 0) continue;
    if (!hay.toLowerCase().includes(name.trim().toLowerCase().slice(0, Math.min(5, name.length)))) continue;
    return { href: '#affiche', label: `События: ${name}`, kind: 'category' };
  }

  return null;
}
