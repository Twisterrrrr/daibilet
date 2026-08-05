import { landingCategoryHref } from '@/lib/landing-routes';
import { CANONICAL_LANDING_SLUGS } from '@/lib/landing-constants';
import { buildCatalogHref } from '@/lib/catalog-url';

/** Featured tile for desktop bento (~60%). */
export type HomeFeaturedBanner = {
  title: string;
  subtitle: string;
  href: string;
  imageUrl: string;
  ctaLabel: string;
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
    label: 'Река',
    href: landingCategoryHref(CANONICAL_LANDING_SLUGS.river),
    icon: 'ship',
  },
  {
    id: 'free',
    label: 'Бесплатное',
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
    label: 'Река',
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
    label: 'Бесплатное',
    href: buildCatalogHref({ minPrice: 0, maxPrice: 0, sort: 'popular' }),
    icon: 'gift',
  },
];

export function buildMyDayHref(citySlug?: string | null): string {
  const slug = String(citySlug || '').trim();
  if (!slug || slug === 'all') return '/my-day';
  return `/my-day?city=${encodeURIComponent(slug)}`;
}
