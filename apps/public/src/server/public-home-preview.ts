import type { PublicHomePreviewDto, PublicLandingDto, PublicSessionDto } from '@daibilet/contracts';

import {
  MIN_DISPLAY_PRICE_RUB,
  getNextPublicCatalogSessions,
  landingTitle,
} from './public-catalog';

const CACHE_MS = 5 * 60 * 1000;
const HOME_PREVIEW_LIMIT = 96;

type LandingRule = {
  slug: string;
  subtitle: string;
  chips: string[];
};

const LANDING_RULES: LandingRule[] = [
  {
    slug: 'river-cruises',
    subtitle: 'Прогулки по воде, маршруты по рекам и каналам, ближайшие рейсы и билеты.',
    chips: ['речные прогулки', 'теплоходы', 'мосты'],
  },
  {
    slug: 'river-party',
    subtitle: 'Ужины, вечеринки и праздники на теплоходе с быстрым выбором даты.',
    chips: ['ужин', 'вечеринка', 'праздник'],
  },
  {
    slug: 'bus-tours',
    subtitle: 'Обзорные автобусные маршруты и экскурсии для первого знакомства с городом.',
    chips: ['автобус', 'обзорные', 'экскурсии'],
  },
  {
    slug: 'salute-9-may',
    subtitle: 'События и маршруты к праздничным датам с удобным расписанием.',
    chips: ['9 мая', 'салют', 'праздник'],
  },
];

let homePreviewCache: { expiresAt: number; payload: PublicHomePreviewDto } | null = null;
let homePreviewBuild: Promise<PublicHomePreviewDto> | null = null;

export async function buildNextPublicHomePreview(forceRefresh = false): Promise<PublicHomePreviewDto> {
  const now = Date.now();
  if (!forceRefresh && homePreviewCache && homePreviewCache.expiresAt > now) return homePreviewCache.payload;
  if (!forceRefresh && homePreviewBuild) return homePreviewBuild;

  const build = getNextPublicCatalogSessions(forceRefresh).then((sessions) => {
    const payload: PublicHomePreviewDto = {
      generatedAt: new Date().toISOString(),
      sessions: sessions.slice(0, HOME_PREVIEW_LIMIT),
      landings: buildHomePreviewLandings(sessions),
    };
    homePreviewCache = { expiresAt: Date.now() + CACHE_MS, payload };
    return payload;
  });

  homePreviewBuild = build;
  try {
    return await build;
  } finally {
    if (homePreviewBuild === build) homePreviewBuild = null;
  }
}

export function clearNextPublicHomePreviewCache(): void {
  homePreviewCache = null;
  homePreviewBuild = null;
}

function buildHomePreviewLandings(sessions: PublicSessionDto[]): PublicLandingDto[] {
  const slugs = new Set<string>(LANDING_RULES.map((rule) => rule.slug));
  for (const session of sessions) {
    for (const slug of session.landingSlugs || []) {
      if (slug) slugs.add(slug);
    }
  }

  return [...slugs]
    .map((slug) => landingFromSessions(slug, sessions.filter((session) => session.landingSlugs.includes(slug))))
    .sort((left, right) => landingSortScore(right) - landingSortScore(left) || left.title.localeCompare(right.title, 'ru'));
}

function landingFromSessions(slug: string, sessions: PublicSessionDto[]): PublicLandingDto {
  const rule = LANDING_RULES.find((item) => item.slug === slug);
  const prices = sessions
    .map((session) => session.priceFrom)
    .filter((price): price is number => Number.isFinite(price) && Number(price) >= MIN_DISPLAY_PRICE_RUB);
  const venueIds = new Set(sessions.map((session) => session.venueId || session.venue).filter(Boolean));
  const chips = rule?.chips?.length ? rule.chips : topValues(sessions.flatMap((session) => [
    session.category,
    ...(session.subcategories || []),
    ...session.tags,
  ]), 3);

  return {
    slug,
    type: 'MULTI_CITY',
    title: landingTitle(slug),
    subtitle: rule?.subtitle || `Быстрая подборка: ${landingTitle(slug).toLowerCase()}.`,
    chips,
    events: sessions.length,
    venues: venueIds.size,
    priceFrom: prices.length ? Math.min(...prices) : null,
    imageUrl: sessions.find((session) => session.imageUrl)?.imageUrl || null,
    strength: sessions.length >= 20 ? 'ready' : sessions.length > 0 ? 'seed' : 'empty',
  };
}

function landingSortScore(landing: PublicLandingDto): number {
  const ruleIndex = LANDING_RULES.findIndex((rule) => rule.slug === landing.slug);
  const ruleScore = ruleIndex >= 0 ? (LANDING_RULES.length - ruleIndex) * 10000 : 0;
  return ruleScore + landing.events;
}

function topValues(values: string[], limit: number): string[] {
  const counts = new Map<string, number>();
  for (const raw of values) {
    const value = String(raw || '').trim();
    if (!value) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], 'ru'))
    .slice(0, limit)
    .map(([value]) => value);
}
