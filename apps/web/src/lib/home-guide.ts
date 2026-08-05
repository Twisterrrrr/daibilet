import { landingCategoryHref } from '@/lib/landing-routes';
import { CANONICAL_LANDING_SLUGS } from '@/lib/landing-constants';
import { buildCatalogHref } from '@/lib/catalog-url';
import { resolveHomePromoImage } from '@/lib/home-scenarios';
import { pluralEvents } from '@/lib/format';

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

type LandingLite = {
  slug: string;
  title: string;
  subtitle?: string | null;
  events: number;
  priceFrom?: number | null;
};

type BannerLite = {
  title: string;
  imageUrl: string;
  link: string | null;
};

/**
 * Build hero carousel slides from live home data (banners, landings, catalog counts).
 * No invented events - only real routes and promo sources already on the home page.
 */
export function buildHomeHeroSlides(input: {
  banners: BannerLite[];
  landings: LandingLite[];
  liveEvents?: number;
}): HomeHeroSlide[] {
  const slides: HomeHeroSlide[] = [];
  const usedHrefs = new Set<string>();
  const push = (slide: HomeHeroSlide) => {
    if (usedHrefs.has(slide.href)) return;
    usedHrefs.add(slide.href);
    slides.push(slide);
  };

  const banner = input.banners[0];
  if (banner?.imageUrl) {
    push({
      id: 'featured-banner',
      badge: 'Событие недели',
      title: banner.title || 'Афиша на неделю',
      subtitle: 'Подборка ярких событий - выбирайте и бронируйте онлайн',
      href: banner.link || '/events?sort=popular',
      imageUrl: banner.imageUrl,
      ctaLabel: 'Смотреть афишу',
    });
  } else if (input.landings[0]) {
    const landing = input.landings[0];
    push({
      id: `landing-${landing.slug}`,
      badge: 'Подборка',
      title: landing.title,
      subtitle: landing.subtitle || `${pluralEvents(landing.events)} - готовая подборка`,
      href: landingCategoryHref(landing.slug),
      imageUrl: resolveHomePromoImage(landing.slug, landing.title),
      ctaLabel: 'Смотреть подборку',
    });
  }

  const eventsLabel =
    typeof input.liveEvents === 'number' && input.liveEvents > 0
      ? `${pluralEvents(input.liveEvents)} в каталоге - фильтруйте по городу и дате`
      : 'Экскурсии, музеи, река и концерты в одном каталоге';

  push({
    id: 'afisha',
    badge: 'Афиша',
    title: 'Куда сходить на этой неделе',
    subtitle: eventsLabel,
    href: '/events?sort=popular',
    imageUrl: '/images/home/format-tours.jpg',
    ctaLabel: 'Открыть афишу',
  });

  push({
    id: 'my-day',
    badge: 'Мой день',
    title: 'Соберите свой день в городе',
    subtitle: 'Музеи, прогулки и события по порядку - без хаоса в заметках',
    href: '/my-day',
    imageUrl: '/images/home/format-museums.jpg',
    ctaLabel: 'Собрать маршрут',
  });

  const riverLanding =
    input.landings.find((item) => /river|cruise|теплоход|канал|реч/i.test(`${item.slug} ${item.title}`)) ||
    null;
  if (riverLanding) {
    push({
      id: `landing-${riverLanding.slug}`,
      badge: 'Реки и каналы',
      title: riverLanding.title,
      subtitle: riverLanding.subtitle || `${pluralEvents(riverLanding.events)} - прогулки по воде`,
      href: landingCategoryHref(riverLanding.slug),
      imageUrl: resolveHomePromoImage(riverLanding.slug, riverLanding.title),
      ctaLabel: 'Смотреть прогулки',
    });
  } else {
    push({
      id: 'river',
      badge: 'Реки и каналы',
      title: 'Речные прогулки и каналы',
      subtitle: 'Теплоходы, набережные и вечерние маршруты',
      href: landingCategoryHref(CANONICAL_LANDING_SLUGS.river),
      imageUrl: '/images/home/format-river.jpg',
      ctaLabel: 'Смотреть прогулки',
    });
  }

  push({
    id: 'podborki',
    badge: 'Подборки',
    title: 'Готовые сценарии под настроение',
    subtitle: 'Топ-подборки, бесплатные события и тематические лендинги',
    href: '/podborki',
    imageUrl: '/images/home/format-night.jpg',
    ctaLabel: 'Смотреть подборки',
  });

  for (const landing of input.landings) {
    if (slides.length >= 5) break;
    push({
      id: `landing-${landing.slug}`,
      badge: 'Подборка',
      title: landing.title,
      subtitle: landing.subtitle || `${pluralEvents(landing.events)} - готовая подборка`,
      href: landingCategoryHref(landing.slug),
      imageUrl: resolveHomePromoImage(landing.slug, landing.title),
      ctaLabel: 'Смотреть подборку',
    });
  }

  if (slides.length === 0) {
    push({
      id: 'fallback',
      badge: 'Афиша',
      title: 'Куда сходить на этой неделе',
      subtitle: 'Экскурсии, музеи, река и концерты в одном каталоге',
      href: '/events?sort=popular',
      imageUrl: '/images/home/format-tours.jpg',
      ctaLabel: 'Смотреть афишу',
    });
  }

  return slides.slice(0, 5);
}
