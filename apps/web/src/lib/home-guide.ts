import { landingCategoryHref } from '@/lib/landing-routes';
import { CANONICAL_LANDING_SLUGS } from '@/lib/landing-constants';
import { buildCatalogHref } from '@/lib/catalog-url';
import { formatPriceFrom } from '@/lib/format';
import {
  buildPopularEvents,
  createHomePickState,
} from '@/lib/home-showcase-sections';
import { eventHref } from '@/lib/routes';
import {
  sessionHasCoverImage,
  spreadCatalogSessionsByCoverImage,
} from '@/lib/session-cover-image';
import type { PublicCatalogListItemDto, PublicSessionDto } from '@daibilet/contracts/public';

/** Max event slides in the home hero carousel. */
export const HOME_HERO_EVENT_SLIDE_LIMIT = 5;

/** Single slide in the home hero carousel. */
export type HomeHeroSlide = {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  href: string;
  imageUrl: string;
  ctaLabel: string;
};

/** @deprecated Prefer HomeHeroSlide - kept for call sites during migration. */
export type HomeFeaturedBanner = Omit<HomeHeroSlide, 'id' | 'badge'> & {
  id?: string;
  badge?: string;
};

/** Category chip under desktop bento / mobile stories. */
export type HomeGuideChip = {
  id: string;
  label: string;
  href: string;
  /** Lucide icon key resolved in UI. */
  icon: 'mic' | 'ship' | 'map' | 'calendar' | 'gift' | 'sparkles' | 'landmark';
};

/** Horizontal stories under mobile header. */
export const HOME_STORIES: HomeGuideChip[] = [
  {
    id: 'top-podborki',
    label: 'Топ-подборки',
    href: '/podborki',
    icon: 'sparkles',
  },
  {
    id: 'today',
    label: 'Сегодня',
    href: buildCatalogHref({ date: 'today', sort: 'popular' }),
    icon: 'calendar',
  },
  {
    id: 'river',
    label: 'Реки и каналы!',
    href: landingCategoryHref(CANONICAL_LANDING_SLUGS.river),
    icon: 'ship',
  },
  {
    id: 'free',
    label: 'Бесплатно',
    href: buildCatalogHref({ minPrice: 0, maxPrice: 0, sort: 'popular' }),
    icon: 'gift',
  },
  {
    id: 'standup',
    label: 'Стендап',
    href: buildCatalogHref({ q: 'стендап', sort: 'popular' }),
    icon: 'mic',
  },
  {
    id: 'excursions',
    label: 'Экскурсии',
    href: buildCatalogHref({ category: 'Экскурсии', sort: 'popular' }),
    icon: 'map',
  },
];

/** Desktop category carousel under bento (icons, brand primary/sky). */
export const HOME_CATEGORY_CHIPS: HomeGuideChip[] = [
  {
    id: 'standup',
    label: 'Стендап',
    href: buildCatalogHref({ q: 'стендап', sort: 'popular' }),
    icon: 'mic',
  },
  {
    id: 'river',
    label: 'Реки и каналы!',
    href: landingCategoryHref(CANONICAL_LANDING_SLUGS.river),
    icon: 'ship',
  },
  {
    id: 'excursions',
    label: 'Экскурсии',
    href: buildCatalogHref({ category: 'Экскурсии', sort: 'popular' }),
    icon: 'map',
  },
  {
    id: 'museums',
    label: 'Музеи',
    href: buildCatalogHref({ category: 'Музеи и арт', sort: 'popular' }),
    icon: 'landmark',
  },
  {
    id: 'today',
    label: 'Сегодня',
    href: buildCatalogHref({ date: 'today', sort: 'popular' }),
    icon: 'calendar',
  },
  {
    id: 'free',
    label: 'Бесплатно',
    href: buildCatalogHref({ minPrice: 0, maxPrice: 0, sort: 'popular' }),
    icon: 'gift',
  },
];

export function buildMyDayHref(citySlug?: string | null): string {
  const slug = String(citySlug || '').trim();
  if (!slug || slug === 'all') return '/my-day';
  return `/my-day?city=${encodeURIComponent(slug)}`;
}

type HeroSession = PublicSessionDto | PublicCatalogListItemDto;

const FALLBACK_HERO_IMAGE = '/images/home/format-tours.jpg';

function sessionHeroSubtitle(session: HeroSession): string {
  const when = [session.dateLabel, session.timeLabel].filter(Boolean).join(', ');
  const priceLabel = formatPriceFrom(session.priceFrom);
  const price = priceLabel === 'Цена уточняется' ? null : priceLabel;
  const place = [session.venue, session.city].filter(Boolean).join(', ');
  return [when, price, place].filter(Boolean).join(' · ') || 'Событие из афиши';
}

/** Map a catalog session to a hero carousel slide (PDP href). */
export function sessionToHomeHeroSlide(session: HeroSession): HomeHeroSlide {
  const imageUrl = String(session.imageUrl || '').trim() || FALLBACK_HERO_IMAGE;
  return {
    id: `event-${session.id}`,
    badge: session.category?.trim() || 'Афиша',
    title: session.title,
    subtitle: sessionHeroSubtitle(session),
    href: eventHref(session),
    imageUrl,
    ctaLabel: 'Смотреть событие',
  };
}

/**
 * Build hero carousel from live catalog events (popular + cover diversity).
 * Prefers sessions with real cover images; falls back to a single afisha CTA if empty.
 */
export function buildHomeHeroSlides(
  sessions: HeroSession[],
  options: { fingerprints?: Map<string, string> } = {},
): HomeHeroSlide[] {
  const fingerprints = options.fingerprints ?? new Map<string, string>();
  const withCover = sessions.filter((session) => sessionHasCoverImage(session));
  const pool = withCover.length >= 2 ? withCover : sessions;

  if (!pool.length) {
    return [
      {
        id: 'fallback-afisha',
        badge: 'Афиша',
        title: 'Куда сходить на этой неделе',
        subtitle: 'Экскурсии, музеи, река и концерты в одном каталоге',
        href: '/events?sort=popular',
        imageUrl: FALLBACK_HERO_IMAGE,
        ctaLabel: 'Открыть афишу',
      },
    ];
  }

  const pickState = createHomePickState({ fingerprints });
  const popular = buildPopularEvents(
    pool as PublicSessionDto[],
    HOME_HERO_EVENT_SLIDE_LIMIT * 2,
    pickState,
  );
  const diversified = spreadCatalogSessionsByCoverImage(popular, fingerprints).slice(
    0,
    HOME_HERO_EVENT_SLIDE_LIMIT,
  );
  const chosen = diversified.length ? diversified : popular.slice(0, HOME_HERO_EVENT_SLIDE_LIMIT);

  return chosen.map(sessionToHomeHeroSlide);
}
