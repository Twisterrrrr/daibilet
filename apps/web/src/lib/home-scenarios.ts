import { resolveCityHubConfig } from './city-hub-config.ts';
import {
  isWaterLandingAllowedForCity,
  resolveFeaturedDirections,
  type LandingLike,
} from './city-hub-directions.ts';
import { CANONICAL_LANDING_SLUGS } from './landing-constants.ts';
import { landingCategoryHref, landingMatchesCatalogCity } from './landing-routes.ts';

export type HomeQuickChip = {
  label: string;
  href: string;
};

export type HomeFormatTile = {
  title: string;
  subtitle: string;
  href: string;
  imageUrl: string;
  /** Soft fallback if image fails to load. */
  fallbackGradient: string;
};

export type HomeHeroChipHubTag = {
  slug?: string | null;
  label: string;
  kind: 'landing' | 'category' | string;
};

export type HomeHeroChipCategory = {
  name: string;
  events: number;
};

/** Cap soft pill rail: one swipe row, not a wall. */
export const HERO_QUICK_CHIP_LIMIT = 10;

type BaselineChip = HomeQuickChip & { landingSlug?: string };

/** National / fill chips - CHPU landings + category shortcuts, without emoji. */
const HERO_BASELINE_CHIPS: BaselineChip[] = [
  { label: 'Речные прогулки', href: landingCategoryHref(CANONICAL_LANDING_SLUGS.river), landingSlug: CANONICAL_LANDING_SLUGS.river },
  { label: 'Музеи', href: '/events?category=Музеи+и+арт&sort=popular' },
  { label: 'Roof-туры', href: landingCategoryHref('rooftops'), landingSlug: 'rooftops' },
  { label: 'Стендап', href: '/events?q=стендап&sort=popular', landingSlug: 'standup' },
  { label: 'Экскурсии', href: '/events?category=Экскурсии&sort=popular' },
  { label: 'Концерты', href: landingCategoryHref('concerts-genre'), landingSlug: 'concerts-genre' },
  { label: 'Семейные', href: landingCategoryHref('family-kids'), landingSlug: 'family-kids' },
  { label: 'Автобусные', href: landingCategoryHref(CANONICAL_LANDING_SLUGS.bus), landingSlug: CANONICAL_LANDING_SLUGS.bus },
  { label: 'Топ недели', href: '/events?sort=popular' },
];

/** Fallback when builder has no landings/city context. */
export const HERO_QUICK_CHIPS: HomeQuickChip[] = HERO_BASELINE_CHIPS.map(({ label, href }) => ({
  label,
  href,
}));

function chipKey(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, ' ');
}

function pushChip(
  out: HomeQuickChip[],
  used: Set<string>,
  chip: HomeQuickChip | null | undefined,
  limit: number,
): void {
  if (!chip?.label || !chip.href || out.length >= limit) return;
  const key = chipKey(chip.label);
  if (used.has(key)) return;
  used.add(key);
  out.push({ label: chip.label, href: chip.href });
}

function baselineChipForCity(chip: BaselineChip, citySlug?: string | null): HomeQuickChip | null {
  if (!chip.landingSlug) return { label: chip.label, href: chip.href };
  const slug = chip.landingSlug;
  if (citySlug) {
    if (!isWaterLandingAllowedForCity(slug, citySlug)) return null;
    if (!landingMatchesCatalogCity(slug, citySlug)) return null;
    return { label: chip.label, href: landingCategoryHref(slug, citySlug) };
  }
  return { label: chip.label, href: landingCategoryHref(slug) };
}

/**
 * Soft pill row under home search: city hub landings/подборки + category shortcuts.
 * One horizontal swipe; prefers curated hub directions when a city is selected.
 */
export function buildHomeHeroQuickChips(input: {
  citySlug?: string | null;
  landings?: LandingLike[];
  hubTags?: HomeHeroChipHubTag[] | null;
  categories?: HomeHeroChipCategory[] | null;
  limit?: number;
}): HomeQuickChip[] {
  const limit = Math.min(Math.max(input.limit ?? HERO_QUICK_CHIP_LIMIT, 8), 12);
  const citySlug = input.citySlug?.trim() || null;
  const landings = input.landings || [];
  const out: HomeQuickChip[] = [];
  const used = new Set<string>();

  if (citySlug) {
    const directions = resolveFeaturedDirections({
      config: resolveCityHubConfig(citySlug),
      landings,
      categories: (input.categories || [])
        .filter((row) => row.events > 0)
        .map((row) => [row.name, row.events] as [string, number]),
      citySlug,
      limit,
    });

    for (const row of directions) {
      if (row.slug && row.href) {
        pushChip(out, used, { label: row.label || row.title, href: row.href }, limit);
        continue;
      }
      if (row.categoryKey) {
        pushChip(
          out,
          used,
          {
            label: row.label || row.categoryKey,
            href: `/events?category=${encodeURIComponent(row.categoryKey)}&sort=popular`,
          },
          limit,
        );
      }
    }

    for (const tag of input.hubTags || []) {
      if (out.length >= limit) break;
      if (tag.kind === 'landing' && tag.slug) {
        if (!isWaterLandingAllowedForCity(tag.slug, citySlug)) continue;
        if (!landingMatchesCatalogCity(tag.slug, citySlug)) continue;
        pushChip(
          out,
          used,
          { label: tag.label, href: landingCategoryHref(tag.slug, citySlug) },
          limit,
        );
      } else if (tag.kind === 'category' && tag.label) {
        pushChip(
          out,
          used,
          {
            label: tag.label,
            href: `/events?category=${encodeURIComponent(tag.label)}&sort=popular`,
          },
          limit,
        );
      }
    }

    for (const cat of (input.categories || []).filter((row) => row.events > 0)) {
      if (out.length >= limit) break;
      pushChip(
        out,
        used,
        {
          label: cat.name,
          href: `/events?category=${encodeURIComponent(cat.name)}&sort=popular`,
        },
        limit,
      );
    }
  } else {
    for (const landing of landings.filter((item) => Number(item.events) > 0)) {
      if (out.length >= Math.min(6, limit)) break;
      pushChip(
        out,
        used,
        { label: landing.title, href: landingCategoryHref(landing.slug) },
        limit,
      );
    }
  }

  for (const chip of HERO_BASELINE_CHIPS) {
    if (out.length >= limit) break;
    pushChip(out, used, baselineChipForCity(chip, citySlug), limit);
  }

  return out.slice(0, limit);
}

export const HOME_FORMAT_TILES: HomeFormatTile[] = [
  {
    title: 'Речные прогулки',
    subtitle: 'Теплоходы и каналы',
    href: landingCategoryHref(CANONICAL_LANDING_SLUGS.river),
    imageUrl: '/images/home/format-river.jpg',
    fallbackGradient: 'from-sky-700 to-slate-900',
  },
  {
    title: 'Обзорные экскурсии',
    subtitle: 'Для первого знакомства',
    href: '/events?category=Экскурсии&sort=popular',
    imageUrl: '/images/home/format-tours.jpg',
    fallbackGradient: 'from-emerald-700 to-slate-900',
  },
  {
    title: 'Музеи',
    subtitle: 'Выставки и экспозиции',
    href: '/events?category=Музеи+и+арт&sort=popular',
    imageUrl: '/images/home/format-museums.jpg',
    fallbackGradient: 'from-amber-700 to-stone-900',
  },
  {
    title: 'Ночная программа',
    subtitle: 'Вечер и огни города',
    href: '/events?date=evening&sort=time',
    imageUrl: '/images/home/format-night.jpg',
    fallbackGradient: 'from-slate-700 to-slate-950',
  },
];

/** Photo covers for home «Тематические подборки» by landing slug / keyword. */
export const HOME_PROMO_IMAGES: Array<{ match: RegExp; imageUrl: string }> = [
  { match: /yard|парадн|двор/i, imageUrl: '/images/home/promo-yards.jpg' },
  { match: /bridge|мост/i, imageUrl: '/images/home/promo-bridges.jpg' },
  { match: /dinner|ужин/i, imageUrl: '/images/home/promo-dinner.jpg' },
  { match: /museum|мастер|музе/i, imageUrl: '/images/home/promo-museums.jpg' },
  { match: /party|disco|вечер/i, imageUrl: '/images/home/promo-party.jpg' },
  { match: /concert|концерт/i, imageUrl: '/images/home/promo-concerts.jpg' },
  { match: /river|теплоход|progul/i, imageUrl: '/images/home/format-river.jpg' },
];

export function resolveHomePromoImage(slug: string, title?: string | null): string {
  const haystack = `${slug} ${title || ''}`;
  for (const item of HOME_PROMO_IMAGES) {
    if (item.match.test(haystack)) return item.imageUrl;
  }
  // Neutral museums stock - not SPB Savior-on-Blood (`format-tours.jpg`).
  return '/images/home/format-museums.jpg';
}

export const HOME_TRUST_ITEMS = [
  {
    title: 'Проверяем события и площадки',
    text: 'В каталог попадают только объекты с понятной афишей и адресом.',
  },
  {
    title: 'Всё в одном месте',
    text: 'Экскурсии, музеи и мероприятия - с фильтрами по городу, дате и формату.',
  },
  {
    title: 'Помогаем выбрать',
    text: 'Подборки и сценарии под компанию, сезон и настроение.',
  },
  {
    title: 'Более чем в 100 городах',
    text: 'Экскурсии, музеи и события по России в одном каталоге.',
  },
] as const;

export const HOME_HOW_IT_WORKS = [
  {
    step: '1',
    title: 'Выберите событие и дату',
    text: 'Каталог, подборки и фильтры по городу - без прыжков по разным сайтам.',
  },
  {
    step: '2',
    title: 'Оплатите онлайн',
    text: 'Купите билет в пару кликов - без кассы и очереди.',
  },
  {
    step: '3',
    title: 'Билет на телефоне',
    text: 'Придёт на email и SMS. На входе покажите с экрана смартфона.',
  },
] as const;
