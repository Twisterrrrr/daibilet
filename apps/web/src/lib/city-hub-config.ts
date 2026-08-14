/**
 * Per-city IA config for city hubs (wireframe v2 / task 1.3.7).
 * Контент brief/travel/sights остаётся в cityInfo; здесь только layout и перелинковка.
 */

export type CityHubSection = 'directions' | 'venues' | 'travel' | 'sights' | 'seo';

export type FeaturedDirectionConfig = {
  id: string;
  label: string;
  landingSlug?: string;
  categoryKey?: string;
  href?: string;
  emphasis?: 'primary' | 'default';
};

export type CityHubConfig = {
  featuredDirections?: FeaturedDirectionConfig[];
  highlightSeason?: { label: string; monthsHint?: string };
  hideSections?: CityHubSection[];
  primaryCta?: { label: string; target: '#affiche' | '#directions' | string };
  sectionOrderAfterAffiche?: Array<'directions' | 'venues' | 'travel' | 'sights'>;
  venuesTopN?: number;
};

const SLUG_ALIASES: Record<string, string> = {
  moskva: 'moscow',
  'sankt-peterburg': 'saint-petersburg',
  'nizhniy-novgorod': 'nizhny-novgorod',
  'velikiy-novgorod': 'veliky-novgorod',
  'rostov-on-don': 'rostov-na-donu',
};

export const CITY_HUB_CONFIG: Record<string, CityHubConfig> = {
  'saint-petersburg': {
    highlightSeason: { label: 'Белые ночи', monthsHint: 'май-июль' },
    primaryCta: { label: 'Круизы и прогулки', target: '#directions' },
    featuredDirections: [
      { id: 'river', label: 'Речные прогулки', landingSlug: 'river-cruises', emphasis: 'primary' },
      { id: 'palaces', label: 'Дворцы и Петергоф', landingSlug: 'country-tours' },
      // SPb uses national `exhibitions` landing; moscow-museums is MSK-only and must not hide museums.
      { id: 'museums', label: 'Музеи', landingSlug: 'exhibitions', categoryKey: 'Музеи и арт' },
      { id: 'bridges', label: 'Развод мостов', landingSlug: 'bridges-night' },
      { id: 'yards', label: 'Дворы и крыши', landingSlug: 'spb-yards' },
      { id: 'standup', label: 'Стендап', landingSlug: 'standup' },
    ],
    venuesTopN: 10,
  },
  moscow: {
    highlightSeason: { label: 'День города', monthsHint: 'сентябрь' },
    primaryCta: { label: 'День города', target: '/moscow/den-goroda' },
    featuredDirections: [
      { id: 'city-day', label: 'День города в Москве', landingSlug: 'moscow-city-day', emphasis: 'primary' },
      { id: 'theatre', label: 'Театр', categoryKey: 'Театр' },
      { id: 'concerts', label: 'Концерты', landingSlug: 'concerts-genre' },
      { id: 'river', label: 'Речные прогулки', landingSlug: 'river-cruises' },
      { id: 'bus', label: 'Автобусные экскурсии', landingSlug: 'bus-tours' },
      // Museums/workshops stay available but must not displace City Day in the top.
      { id: 'museums', label: 'Музеи и выставки', landingSlug: 'moscow-museums', categoryKey: 'Музеи и арт' },
    ],
    sectionOrderAfterAffiche: ['directions', 'venues', 'travel', 'sights'],
    venuesTopN: 12,
  },
  sochi: {
    highlightSeason: { label: 'Бархатный сезон', monthsHint: 'сентябрь-ноябрь' },
    primaryCta: { label: 'Афиша Сочи', target: '#affiche' },
    featuredDirections: [
      { id: 'sea', label: 'Море и набережная', categoryKey: 'Экскурсии', emphasis: 'primary' },
      { id: 'krasnaya', label: 'Красная Поляна', categoryKey: 'Активный отдых' },
      { id: 'concerts', label: 'Концерты', landingSlug: 'concerts-genre' },
      { id: 'family', label: 'Семейные', landingSlug: 'family-kids' },
    ],
    venuesTopN: 8,
  },
  kazan: {
    highlightSeason: { label: 'Летний сезон', monthsHint: 'май-сентябрь' },
    primaryCta: { label: 'События в Казани', target: '#affiche' },
    featuredDirections: [
      { id: 'kremlin', label: 'Кремль и центр', categoryKey: 'Экскурсии', emphasis: 'primary' },
      { id: 'walking', label: 'Пешие прогулки', landingSlug: 'walking-tours' },
      { id: 'standup', label: 'Стендап', landingSlug: 'standup' },
      { id: 'family', label: 'Семейные', landingSlug: 'family-kids' },
    ],
    venuesTopN: 8,
  },
  // Landlocked: no river-cruises / river-party in curated chips (count>0 still gates fallbacks).
  ekaterinburg: {
    highlightSeason: { label: 'Уральское лето', monthsHint: 'июнь-август' },
    primaryCta: { label: 'События в Екатеринбурге', target: '#affiche' },
    featuredDirections: [
      { id: 'standup', label: 'Стендап', landingSlug: 'standup', emphasis: 'primary' },
      { id: 'concerts', label: 'Концерты', landingSlug: 'concerts-genre' },
      { id: 'theatre', label: 'Театр', landingSlug: 'unusual-theatres', categoryKey: 'Театр' },
      { id: 'family', label: 'Семейные', landingSlug: 'family-kids' },
    ],
    venuesTopN: 10,
  },
};

export function normalizeCityHubSlug(slug: string | null | undefined): string {
  const raw = String(slug || '').trim().toLowerCase();
  if (!raw) return '';
  return SLUG_ALIASES[raw] || raw;
}

export function resolveCityHubConfig(slug: string | null | undefined): CityHubConfig | null {
  const normalized = normalizeCityHubSlug(slug);
  if (!normalized) return null;
  return CITY_HUB_CONFIG[normalized] || CITY_HUB_CONFIG[slug?.trim().toLowerCase() || ''] || null;
}

export function isCityHubSectionHidden(
  config: CityHubConfig | null,
  section: CityHubSection,
): boolean {
  return Boolean(config?.hideSections?.includes(section));
}

/**
 * Owner: on these hubs tourist discovery puts афиша early (after scenarios).
 * Blog+FAQ now share the bottom split (`#faq`); this flag still gates
 * affiche-before-suburbs order via `isCityHubAfficheBeforeSuburbs`.
 */
const BLOG_AFTER_SUBURBS_SLUGS = new Set([
  'perm',
  'kaliningrad',
  'moscow',
  'saint-petersburg',
  'nizhny-novgorod',
]);

export function isCityHubBlogAfterSuburbs(slug: string | null | undefined): boolean {
  const normalized = normalizeCityHubSlug(slug);
  return Boolean(normalized) && BLOG_AFTER_SUBURBS_SLUGS.has(normalized);
}

/**
 * Tourist discovery hubs: афиша сразу после сценариев, пригороды и фестивали ниже.
 * Локальный стендап не должен стоять между «зачем ехать» и билетами на экскурсии.
 */
export function isCityHubAfficheBeforeSuburbs(slug: string | null | undefined): boolean {
  return isCityHubBlogAfterSuburbs(slug);
}
