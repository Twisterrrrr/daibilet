import {
  resolveBlogCityEventsHref,
  resolveBlogCityHref,
} from '@/lib/blog-article-city';
import {
  isLandingCityAllowed,
  landingCategoryHref,
  normalizeKnownCitySlug,
} from '@/lib/landing-routes';
import {
  getFooterPopularDirections,
  LANDING_BREADCRUMB_LABELS,
  resolveEventLandingForBreadcrumb,
  resolveRelatedListingLinks,
  type SeoLink,
} from '@/lib/seo-internal-links';

/** Явный CHPU (аналог ctaHref) для ключевых гайдов - без правки всех MD. */
const BLOG_PRIMARY_LANDING_BY_SLUG: Record<string, string> = {
  'moskva-rechnye-progulki-kak-vybrat': 'river-cruises',
  'moskva-rechnye-progulki-zaryade': 'river-cruises',
  'rechnye-progulki-neva-kanaly-kak-vybrat': 'river-cruises',
  'kazan-rechnye-progulki': 'river-cruises',
  'uzhin-na-teplohode-moskva-kak-vybrat': 'moscow-dinner-boat',
  'spb-rooftop-guide': 'rooftops',
  'spb-stendap-gid': 'standup',
  'ekb-stendap-uralskiy-yumor': 'standup',
  'ekb-uralskiy-mars-bazhovskie-ekskursii': 'country-tours',
  'moskva-avtobusnaya-obzornaya': 'bus-tours',
  'moskva-immersivnye-vystavki': 'exhibitions',
  'moskva-kvesty-escape-room': 'excursions',
  'spb-dvory-paradnye-kommunalki': 'spb-yards',
  'spb-planetarium-gid': 'planetarium',
  'spb-razvod-mostov-kakoi-reis': 'bridges-night',
  'kuda-poyti-s-detmi': 'family-kids',
  'chto-poslushat-jazz': 'concerts-genre',
  'koncerty-peterburg-osobnyak-klub-zal': 'concerts-genre',
  'muzyka-v-osobnyakah-spb': 'concerts-genre',
  'kak-vybrat-koncert': 'concerts-genre',
  'myuzikly-teatr-novichok-msk-spb': 'unusual-theatres',
  'moscow-2-dnya-samostoyatelno-marshrut': 'walking-tours',
  'sankt-peterburg-3-dnya-samostoyatelno': 'walking-tours',
  'kazan-2-3-dnya-samostoyatelno-karta': 'walking-tours',
};

function resolvePrimaryLanding(
  slug: string,
  title: string,
  tag?: string | null,
  citySlug?: string | null,
): { landingSlug: string; label: string; href: string } | null {
  const mapped = BLOG_PRIMARY_LANDING_BY_SLUG[slug];
  const city = normalizeKnownCitySlug(citySlug);

  if (mapped) {
    if (city && !isLandingCityAllowed(mapped, city)) {
      // skip city-restricted landing when hub city is outside allow-list
    } else {
      const href = landingCategoryHref(mapped, city);
      if (href) {
        return {
          landingSlug: mapped,
          label: LANDING_BREADCRUMB_LABELS[mapped] || mapped,
          href,
        };
      }
    }
  }

  return resolveEventLandingForBreadcrumb({
    citySlug: city,
    title,
    tags: [tag, slug].filter(Boolean) as string[],
  });
}

/**
 * Компактные ссылки для large card magazine-сетки `/blog`:
 * CHPU (cta) + афиша/события города + related - паттерн city hub / LandingSeeAlso.
 */
export function resolveBlogListingQuickLinks(input: {
  slug: string;
  title: string;
  tag?: string | null;
  city?: string | null;
  citySlug?: string | null;
  limit?: number;
}): SeoLink[] {
  const limit = Math.max(2, Math.min(input.limit ?? 4, 5));
  const links: SeoLink[] = [];
  const seen = new Set<string>();

  const push = (href: string | null | undefined, label: string) => {
    const clean = String(href || '').trim();
    if (!clean || seen.has(clean) || links.length >= limit) return;
    seen.add(clean);
    links.push({ href: clean, label });
  };

  const city = normalizeKnownCitySlug(input.citySlug);
  const cityHref = city ? resolveBlogCityHref(input.city, city) : null;
  const eventsHref = city ? resolveBlogCityEventsHref(input.city, city) : null;
  const primary = resolvePrimaryLanding(input.slug, input.title, input.tag, city);

  // 1) CHPU / cta  2) события города  3) хаб  4) related
  if (primary) push(primary.href, primary.label);

  if (eventsHref && input.city) {
    push(eventsHref, `События: ${input.city}`);
  } else if (eventsHref) {
    push(eventsHref, 'События города');
  }

  if (cityHref && input.city) {
    push(cityHref, `Афиша ${input.city}`);
  }

  if (primary) {
    for (const related of resolveRelatedListingLinks(primary.landingSlug, city, 3)) {
      push(related.href, related.label);
    }
  }

  if (links.length < limit && city) {
    const popular = getFooterPopularDirections().find((block) => block.citySlug === city);
    for (const item of popular?.links || []) {
      push(item.href, item.label);
    }
  }

  if (links.length < 2) {
    push('/podborki', 'Подборки');
    if (city) {
      push(`/blog?city=${encodeURIComponent(city)}`, 'Ещё по городу');
    }
  }

  return links.slice(0, limit);
}

/**
 * Явный CTA на карточке листинга: CHPU / афиша города.
 * «Смотреть расписание» - если есть целевой лендинг; иначе «К событиям».
 * Без пустого «Купить билет» без event.
 */
export function resolveBlogListingCta(input: {
  slug: string;
  title: string;
  tag?: string | null;
  city?: string | null;
  citySlug?: string | null;
}): SeoLink | null {
  const city = normalizeKnownCitySlug(input.citySlug);
  const primary = resolvePrimaryLanding(input.slug, input.title, input.tag, city);
  if (primary?.href) {
    return { href: primary.href, label: 'Смотреть расписание' };
  }

  const eventsHref = city ? resolveBlogCityEventsHref(input.city, city) : null;
  if (eventsHref) {
    return { href: eventsHref, label: 'К событиям' };
  }

  const hubHref = city ? resolveBlogCityHref(input.city, city) : null;
  if (hubHref) {
    return { href: hubHref, label: 'К событиям' };
  }

  return null;
}

/** Landing slug для темы/CTA (если известен). */
export function resolveBlogPrimaryLandingSlug(
  slug: string,
  title: string,
  tag?: string | null,
  citySlug?: string | null,
): string | null {
  return resolvePrimaryLanding(slug, title, tag, citySlug)?.landingSlug || null;
}
