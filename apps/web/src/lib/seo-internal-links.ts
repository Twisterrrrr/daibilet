import { catalogIntentPath, type CatalogIntentSlug } from '@/lib/catalog-intent-routes';
import { canonicalLandingSlug } from '@/lib/landing-constants';
import {
  isLandingCityAllowed,
  landingCategoryHref,
  MULTI_CITY_LANDING_SLUGS,
  normalizeCitySlug,
} from '@/lib/landing-routes';
import { cityHref } from '@/lib/routes';

export type SeoLink = {
  label: string;
  href: string;
};

export type FooterPopularCityBlock = {
  cityName: string;
  citySlug: string;
  links: SeoLink[];
};

/** Ярлыки для крошек / «Смотрите также» (UI copy, только обычный дефис). */
export const LANDING_BREADCRUMB_LABELS: Record<string, string> = {
  'river-cruises': 'Речные прогулки',
  'bus-tours': 'Автобусные экскурсии',
  'river-party': 'Вечеринки на теплоходе',
  'bridges-night': 'Разводные мосты',
  standup: 'Стендап и юмор',
  'family-kids': 'Детям и семьям',
  'concerts-genre': 'Концерты',
  'active-sport': 'Активный отдых',
  'walking-tours': 'Пешие экскурсии',
  'country-tours': 'Загородные экскурсии',
  exhibitions: 'Выставки и музеи',
  'unusual-theatres': 'Необычные театры',
  excursions: 'Экскурсии',
  rooftops: 'Экскурсии по крышам',
  'new-year': 'Новый год',
  'salute-9-may': 'Салют 9 мая',
  'moscow-museums': 'Музеи и выставки',
  'moscow-dinner-boat': 'Ужин на теплоходе',
  'spb-yards': 'Экскурсии по дворам',
  planetarium: 'Планетарий',
};

/** Приоритет matching landing для крошки события (сначала более узкие). */
const EVENT_LANDING_PRIORITY: string[] = [
  'river-party',
  'bridges-night',
  'rooftops',
  'moscow-dinner-boat',
  'spb-yards',
  'planetarium',
  'standup',
  'walking-tours',
  'country-tours',
  'bus-tours',
  'river-cruises',
  'exhibitions',
  'unusual-theatres',
  'concerts-genre',
  'family-kids',
  'active-sport',
  'moscow-museums',
  'excursions',
  'new-year',
  'salute-9-may',
];

/** Public city hub slug (как в `/cities/{slug}` на prod). */
const CITY_HUB_SLUG_BY_LANDING: Record<string, string> = {
  moscow: 'moskva',
  moskva: 'moskva',
  'saint-petersburg': 'sankt-peterburg',
  'sankt-peterburg': 'sankt-peterburg',
  spb: 'sankt-peterburg',
  kazan: 'kazan',
  ekaterinburg: 'ekaterinburg',
};

type RelatedLinkSpec =
  | { type: 'landing'; slug: string; label: string }
  | { type: 'intent'; intent: CatalogIntentSlug; label: string };

function relatedSpecsForLanding(landingSlug: string, citySlug?: string | null): RelatedLinkSpec[] {
  const slug = canonicalLandingSlug(landingSlug);
  const city = normalizeCitySlug(citySlug);
  const byLanding = RELATED_LINKS_BY_LANDING[slug] || {};
  return (city && byLanding[city]) || byLanding['*'] || DEFAULT_RELATED;
}

/**
 * Смежные ссылки для блока «Смотрите также» на CHPU-листингах.
 * Ключ: landing slug → city slug (`*` = fallback для любого города).
 */
const RELATED_LINKS_BY_LANDING: Record<string, Record<string, RelatedLinkSpec[]>> = {
  'river-cruises': {
    moscow: [
      { type: 'landing', slug: 'standup', label: 'Стендап и юмор' },
      { type: 'landing', slug: 'walking-tours', label: 'Пешие экскурсии' },
      { type: 'landing', slug: 'bus-tours', label: 'Автобусные экскурсии' },
      { type: 'intent', intent: 'besplatno', label: 'Бесплатные события' },
    ],
    'saint-petersburg': [
      { type: 'landing', slug: 'rooftops', label: 'Экскурсии по крышам' },
      { type: 'landing', slug: 'standup', label: 'Стендап-шоу' },
      { type: 'intent', intent: 'na-vyhodnye', label: 'Куда сходить на выходных' },
      { type: 'landing', slug: 'walking-tours', label: 'Пешие экскурсии' },
    ],
    '*': [
      { type: 'landing', slug: 'bus-tours', label: 'Автобусные экскурсии' },
      { type: 'landing', slug: 'standup', label: 'Стендап и юмор' },
      { type: 'intent', intent: 'na-vyhodnye', label: 'На выходных' },
    ],
  },
  standup: {
    moscow: [
      { type: 'landing', slug: 'river-cruises', label: 'Речные прогулки' },
      { type: 'landing', slug: 'walking-tours', label: 'Пешие экскурсии' },
      { type: 'intent', intent: 'besplatno', label: 'Бесплатные события' },
      { type: 'intent', intent: 'na-vyhodnye', label: 'На выходных' },
    ],
    'saint-petersburg': [
      { type: 'landing', slug: 'river-cruises', label: 'Речные прогулки' },
      { type: 'landing', slug: 'rooftops', label: 'Экскурсии по крышам' },
      { type: 'intent', intent: 'na-vyhodnye', label: 'Куда сходить на выходных' },
      { type: 'landing', slug: 'walking-tours', label: 'Пешие экскурсии' },
    ],
    '*': [
      { type: 'landing', slug: 'river-cruises', label: 'Речные прогулки' },
      { type: 'intent', intent: 'na-vyhodnye', label: 'На выходных' },
      { type: 'landing', slug: 'concerts-genre', label: 'Концерты' },
    ],
  },
  rooftops: {
    'saint-petersburg': [
      { type: 'landing', slug: 'river-cruises', label: 'Речные прогулки' },
      { type: 'landing', slug: 'standup', label: 'Стендап и юмор' },
      { type: 'landing', slug: 'walking-tours', label: 'Пешие экскурсии' },
      { type: 'intent', intent: 'na-vyhodnye', label: 'Куда сходить на выходных' },
    ],
    '*': [
      { type: 'landing', slug: 'river-cruises', label: 'Речные прогулки' },
      { type: 'landing', slug: 'standup', label: 'Стендап и юмор' },
      { type: 'intent', intent: 'na-vyhodnye', label: 'На выходных' },
    ],
  },
  'walking-tours': {
    moscow: [
      { type: 'landing', slug: 'river-cruises', label: 'Речные прогулки' },
      { type: 'landing', slug: 'standup', label: 'Стендап и юмор' },
      { type: 'intent', intent: 'besplatno', label: 'Бесплатные события' },
      { type: 'landing', slug: 'bus-tours', label: 'Автобусные экскурсии' },
    ],
    'saint-petersburg': [
      { type: 'landing', slug: 'rooftops', label: 'Экскурсии по крышам' },
      { type: 'landing', slug: 'river-cruises', label: 'Речные прогулки' },
      { type: 'landing', slug: 'standup', label: 'Стендап и юмор' },
      { type: 'intent', intent: 'na-vyhodnye', label: 'Куда сходить на выходных' },
    ],
    '*': [
      { type: 'landing', slug: 'river-cruises', label: 'Речные прогулки' },
      { type: 'landing', slug: 'excursions', label: 'Экскурсии' },
      { type: 'intent', intent: 'na-vyhodnye', label: 'На выходных' },
    ],
  },
  'bus-tours': {
    '*': [
      { type: 'landing', slug: 'river-cruises', label: 'Речные прогулки' },
      { type: 'landing', slug: 'walking-tours', label: 'Пешие экскурсии' },
      { type: 'intent', intent: 'na-vyhodnye', label: 'На выходных' },
    ],
  },
  exhibitions: {
    '*': [
      { type: 'landing', slug: 'walking-tours', label: 'Пешие экскурсии' },
      { type: 'landing', slug: 'excursions', label: 'Экскурсии' },
      { type: 'intent', intent: 'besplatno', label: 'Бесплатные события' },
    ],
  },
  excursions: {
    '*': [
      { type: 'landing', slug: 'walking-tours', label: 'Пешие экскурсии' },
      { type: 'landing', slug: 'bus-tours', label: 'Автобусные экскурсии' },
      { type: 'intent', intent: 'na-vyhodnye', label: 'На выходных' },
    ],
  },
  'country-tours': {
    'saint-petersburg': [
      { type: 'landing', slug: 'river-cruises', label: 'Речные прогулки' },
      { type: 'landing', slug: 'bus-tours', label: 'Автобусные экскурсии' },
      { type: 'landing', slug: 'walking-tours', label: 'Пешие экскурсии' },
      { type: 'intent', intent: 'na-vyhodnye', label: 'Куда сходить на выходных' },
    ],
    '*': [
      { type: 'landing', slug: 'bus-tours', label: 'Автобусные экскурсии' },
      { type: 'landing', slug: 'excursions', label: 'Экскурсии' },
      { type: 'intent', intent: 'na-vyhodnye', label: 'На выходных' },
    ],
  },
  'concerts-genre': {
    '*': [
      { type: 'landing', slug: 'standup', label: 'Стендап и юмор' },
      { type: 'intent', intent: 'na-vyhodnye', label: 'На выходных' },
      { type: 'intent', intent: 'segodnya-vecherom', label: 'Сегодня вечером' },
    ],
  },
  'family-kids': {
    '*': [
      { type: 'landing', slug: 'walking-tours', label: 'Пешие экскурсии' },
      { type: 'intent', intent: 'besplatno', label: 'Бесплатные события' },
      { type: 'intent', intent: 'na-vyhodnye', label: 'На выходных' },
    ],
  },
  'river-party': {
    moscow: [
      { type: 'landing', slug: 'river-cruises', label: 'Речные прогулки' },
      { type: 'landing', slug: 'standup', label: 'Стендап и юмор' },
      { type: 'intent', intent: 'na-vyhodnye', label: 'На выходных' },
    ],
    'saint-petersburg': [
      { type: 'landing', slug: 'river-cruises', label: 'Речные прогулки' },
      { type: 'landing', slug: 'standup', label: 'Стендап и юмор' },
      { type: 'intent', intent: 'na-vyhodnye', label: 'Куда сходить на выходных' },
    ],
    '*': [
      { type: 'landing', slug: 'river-cruises', label: 'Речные прогулки' },
      { type: 'intent', intent: 'na-vyhodnye', label: 'На выходных' },
    ],
  },
};

const DEFAULT_RELATED: RelatedLinkSpec[] = [
  { type: 'landing', slug: 'river-cruises', label: 'Речные прогулки' },
  { type: 'landing', slug: 'standup', label: 'Стендап и юмор' },
  { type: 'landing', slug: 'walking-tours', label: 'Пешие экскурсии' },
  { type: 'intent', intent: 'na-vyhodnye', label: 'На выходных' },
];

/** Сквозной блок футера: вес с главной на посадки. */
export function getFooterPopularDirections(): FooterPopularCityBlock[] {
  return [
    {
      cityName: 'Москва',
      citySlug: 'moscow',
      links: [
        { label: 'Речные прогулки', href: landingCategoryHref('river-cruises', 'moscow') },
        { label: 'Стендап и юмор', href: landingCategoryHref('standup', 'moscow') },
        { label: 'Пешие экскурсии', href: landingCategoryHref('walking-tours', 'moscow') },
        { label: 'Бесплатные события', href: catalogIntentPath('besplatno', 'moscow') },
      ],
    },
    {
      cityName: 'Санкт-Петербург',
      citySlug: 'saint-petersburg',
      links: [
        { label: 'Речные прогулки', href: landingCategoryHref('river-cruises', 'saint-petersburg') },
        { label: 'Экскурсии по крышам', href: landingCategoryHref('rooftops', 'saint-petersburg') },
        { label: 'Стендап', href: landingCategoryHref('standup', 'saint-petersburg') },
        { label: 'Выходные в Питере', href: catalogIntentPath('na-vyhodnye', 'saint-petersburg') },
      ],
    },
  ];
}

export function landingBreadcrumbLabel(landingSlug: string, fallbackTitle?: string | null): string {
  const slug = canonicalLandingSlug(landingSlug);
  return LANDING_BREADCRUMB_LABELS[slug] || String(fallbackTitle || '').trim() || slug;
}

export function cityHubPathFromLandingCity(citySlug?: string | null): string | null {
  const canonical = normalizeCitySlug(citySlug);
  if (!canonical) return null;
  const hub = CITY_HUB_SLUG_BY_LANDING[canonical] || canonical;
  return cityHref({ name: hub, slug: hub });
}

export function resolveEventLandingForBreadcrumb(input: {
  landingSlugs?: string[] | null;
  citySlug?: string | null;
  sourceCitySlug?: string | null;
  category?: string | null;
  tags?: string[] | null;
  title?: string | null;
}): { landingSlug: string; label: string; href: string } | null {
  const city =
    normalizeCitySlug(input.citySlug) ||
    normalizeCitySlug(input.sourceCitySlug) ||
    null;

  const fromPayload = (input.landingSlugs || [])
    .map((slug) => canonicalLandingSlug(slug))
    .filter(Boolean);

  const candidates = [
    ...EVENT_LANDING_PRIORITY.filter((slug) => fromPayload.includes(slug)),
    ...fromPayload.filter((slug) => !EVENT_LANDING_PRIORITY.includes(slug)),
  ];

  for (const landingSlug of candidates) {
    if (city && !isLandingCityAllowed(landingSlug, city)) continue;
    if (city && MULTI_CITY_LANDING_SLUGS.has(landingSlug) && !isLandingCityAllowed(landingSlug, city)) {
      continue;
    }
    const href = landingCategoryHref(landingSlug, city);
    if (!href || href === `/${landingSlug}/` || href === `/${landingSlug}`) {
      // city-scoped without city: still ok for bridges etc.
    }
    return {
      landingSlug,
      label: landingBreadcrumbLabel(landingSlug),
      href,
    };
  }

  const heuristic = heuristicLandingFromText({
    category: input.category,
    tags: input.tags,
    title: input.title,
  });
  if (!heuristic) return null;
  if (city && !isLandingCityAllowed(heuristic, city)) return null;
  return {
    landingSlug: heuristic,
    label: landingBreadcrumbLabel(heuristic),
    href: landingCategoryHref(heuristic, city),
  };
}

function heuristicLandingFromText(input: {
  category?: string | null;
  tags?: string[] | null;
  title?: string | null;
}): string | null {
  const hay = [input.category, ...(input.tags || []), input.title]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  if (!hay) return null;
  if (/стендап|stand[\s-]?up|юмор|комеди/.test(hay)) return 'standup';
  if (/крыш/.test(hay)) return 'rooftops';
  if (/теплоход|катер|речн|канал|водн/.test(hay)) return 'river-cruises';
  if (/пеш(ие|еход)|прогулк/.test(hay) && /экскурс/.test(hay)) return 'walking-tours';
  if (/автобус/.test(hay)) return 'bus-tours';
  if (/загород|петергоф|царск|павловск/.test(hay)) return 'country-tours';
  if (/выставк|музе/.test(hay)) return 'exhibitions';
  if (/концерт|джив|рок|джаз/.test(hay)) return 'concerts-genre';
  if (/дет|семь/.test(hay)) return 'family-kids';
  if (/экскурс/.test(hay)) return 'excursions';
  return null;
}

/** 3–4 смежные ссылки того же города для листинга. */
export function resolveRelatedListingLinks(
  landingSlug: string,
  citySlug?: string | null,
  limit = 4,
): SeoLink[] {
  const slug = canonicalLandingSlug(landingSlug);
  const city = normalizeCitySlug(citySlug);
  const specs = relatedSpecsForLanding(slug, city);

  const links: SeoLink[] = [];
  const seen = new Set<string>();

  for (const spec of specs) {
    if (links.length >= limit) break;
    let href: string | null = null;
    let label = spec.label;

    if (spec.type === 'landing') {
      const relatedSlug = canonicalLandingSlug(spec.slug);
      if (relatedSlug === slug) continue;
      if (city && !isLandingCityAllowed(relatedSlug, city)) continue;
      href = landingCategoryHref(relatedSlug, city);
      label = spec.label || landingBreadcrumbLabel(relatedSlug);
    } else {
      href = catalogIntentPath(spec.intent, city);
    }

    if (!href || seen.has(href)) continue;
    seen.add(href);
    links.push({ label, href });
  }

  return links;
}

/** Смежные category landings (без intent) для thin-карточек. */
export function resolveRelatedLandingCardTargets(
  landingSlug: string,
  citySlug?: string | null,
  limit = 4,
): Array<{ slug: string; label: string; href: string }> {
  const slug = canonicalLandingSlug(landingSlug);
  const city = normalizeCitySlug(citySlug);
  const specs = relatedSpecsForLanding(slug, city);
  const out: Array<{ slug: string; label: string; href: string }> = [];
  const seen = new Set<string>();

  for (const spec of specs) {
    if (out.length >= limit) break;
    if (spec.type !== 'landing') continue;
    const relatedSlug = canonicalLandingSlug(spec.slug);
    if (relatedSlug === slug || seen.has(relatedSlug)) continue;
    if (city && !isLandingCityAllowed(relatedSlug, city)) continue;
    const href = landingCategoryHref(relatedSlug, city);
    if (!href) continue;
    seen.add(relatedSlug);
    out.push({
      slug: relatedSlug,
      label: spec.label || landingBreadcrumbLabel(relatedSlug),
      href,
    });
  }

  return out;
}
