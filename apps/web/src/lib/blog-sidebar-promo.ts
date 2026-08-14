import type { PublicCityPageDto, PublicLandingDto } from '@daibilet/contracts/public';

import { catalogHrefWithSelectedCity } from '@/lib/catalog-url';
import { resolveCityCardImage } from '@/lib/city-images';
import { PRIORITY_LISTING_CITY_SLUGS, landingCategoryHref, normalizeKnownCitySlug } from '@/lib/landing-routes';
import { cityEventsHref, cityHref } from '@/lib/routes';
import { sessionHasCoverImage } from '@/lib/session-cover-image';
import type { BlogCardDto } from '@/lib/blog-utils';

const MIN_DISPLAY_PRICE_RUB = 100;
const MAX_TITLES = 2;
const MAX_CHIPS = 2;

export type BlogSidebarPromoChip = {
  label: string;
  href: string;
};

export type BlogSidebarPromoDto = {
  cityName: string;
  citySlug: string;
  /** Primary CTA: catalog with city or city hub afisha. */
  href: string;
  priceFrom: number | null;
  weekendCount: number;
  eventsCount: number;
  upcomingTitles: string[];
  imageUrl: string | null;
  chips: BlogSidebarPromoChip[];
};

function indexKeys(cityName: string, citySlug: string): string[] {
  const keys = new Set<string>();
  const name = cityName.trim().toLowerCase();
  const slug = normalizeKnownCitySlug(citySlug) || citySlug.trim().toLowerCase();
  if (name) keys.add(name);
  if (slug) keys.add(slug);
  return [...keys];
}

/** Sat/Sun by local calendar day of `startsAt` (same idea as catalog weekend filter). */
export function isWeekendStartsAt(startsAt: string | null | undefined): boolean {
  if (!startsAt) return false;
  const date = new Date(startsAt);
  if (!Number.isFinite(date.getTime())) return false;
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function buildBlogSidebarPromoFromCityPage(page: PublicCityPageDto): BlogSidebarPromoDto | null {
  const city = page.city;
  const cityName = String(city.name || city.title || '').trim();
  const citySlug =
    normalizeKnownCitySlug(city.slug) ||
    normalizeKnownCitySlug(city.sourceSlug) ||
    String(city.slug || city.sourceSlug || '').trim().toLowerCase();
  if (!cityName || !citySlug) return null;

  const sessions = page.sessions || [];
  const priceRaw = page.stats?.priceFrom;
  const priceFrom =
    typeof priceRaw === 'number' && Number.isFinite(priceRaw) && priceRaw >= MIN_DISPLAY_PRICE_RUB
      ? Math.round(priceRaw)
      : null;

  const weekendCount = sessions.filter((session) => isWeekendStartsAt(session.startsAt)).length;

  const upcomingTitles: string[] = [];
  const seenTitles = new Set<string>();
  for (const session of sessions) {
    const title = String(session.title || '').trim();
    if (!title || seenTitles.has(title.toLowerCase())) continue;
    seenTitles.add(title.toLowerCase());
    upcomingTitles.push(title);
    if (upcomingTitles.length >= MAX_TITLES) break;
  }

  // Prefer stable city card art for the sidebar. Event/CDN covers often 404 on
  // MSK disk (evt-auto-*) or 504 via /_next/image when egress to teplohod/TC is dead.
  const cityImage = resolveCityCardImage({
    slug: city.slug,
    sourceSlug: city.sourceSlug,
    name: cityName,
    heroImageUrl: null,
  });
  const remoteCoverSession = sessions.find((session) => {
    const url = String(session.imageUrl || '').trim();
    return sessionHasCoverImage(session) && /^https?:\/\//i.test(url);
  });
  const imageUrl = cityImage || remoteCoverSession?.imageUrl?.trim() || null;

  const chips: BlogSidebarPromoChip[] = [];
  const landings = [...(page.landings || [])]
    .filter((landing: PublicLandingDto) => landing.events > 0 && landing.slug)
    .sort((a, b) => b.events - a.events || a.title.localeCompare(b.title, 'ru'))
    .slice(0, MAX_CHIPS);

  for (const landing of landings) {
    const label = (landing.chips?.[0] || landing.title || '').trim();
    if (!label) continue;
    chips.push({
      label: label.length > 22 ? `${label.slice(0, 20)}...` : label,
      href: landingCategoryHref(landing.slug, citySlug),
    });
  }

  if (chips.length < MAX_CHIPS) {
    const categories = Object.entries(city.categories || {})
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ru'))
      .slice(0, MAX_CHIPS - chips.length);
    for (const [name] of categories) {
      if (!name.trim()) continue;
      chips.push({
        label: name.length > 22 ? `${name.slice(0, 20)}...` : name,
        href: catalogHrefWithSelectedCity(cityName, { category: name }),
      });
    }
  }

  const eventsHref = cityEventsHref({ name: cityName, slug: citySlug });
  const catalogHref = catalogHrefWithSelectedCity(cityName);
  const href = sessions.length > 0 ? catalogHref : eventsHref || cityHref({ name: cityName, slug: citySlug });

  return {
    cityName,
    citySlug,
    href,
    priceFrom,
    weekendCount,
    eventsCount: page.stats?.events ?? sessions.length,
    upcomingTitles,
    imageUrl,
    chips,
  };
}

export function lookupBlogSidebarPromo(
  map: Record<string, BlogSidebarPromoDto>,
  candidates: Array<string | null | undefined>,
): BlogSidebarPromoDto | null {
  for (const raw of candidates) {
    const key = String(raw || '').trim().toLowerCase();
    if (key && map[key]) return map[key];
    const normalized = normalizeKnownCitySlug(raw);
    if (normalized && map[normalized]) return map[normalized];
  }
  return null;
}

/** Exported for server prefetch (blog-sidebar-promo.server.ts). */
export function blogSidebarPromoIndexKeys(cityName: string, citySlug: string): string[] {
  return indexKeys(cityName, citySlug);
}

/** Exported for server prefetch (blog-sidebar-promo.server.ts). */
export function collectBlogSidebarPromoCitySlugs(posts: BlogCardDto[]): string[] {
  const slugs = new Set<string>(PRIORITY_LISTING_CITY_SLUGS);
  for (const post of posts) {
    const slug = normalizeKnownCitySlug(post.citySlug);
    if (slug) slugs.add(slug);
  }
  return [...slugs];
}
