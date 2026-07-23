import type {
  PublicCityPageDto,
  PublicEventDto,
  PublicEventPageDto,
  PublicSessionDto,
  PublicVenuePageDto,
} from '@daibilet/contracts/public';

import { buildCityFaqItems, type CityFaqItem } from '@/lib/city-faq';
import { getTicketPriceRange, isFlexibleScheduleSession } from '@/lib/event-page-utils';
import { evaluateCityIndexability } from '@/lib/hub-indexability';
import { resolveLandingCityName } from '@/lib/landing-city';
import { landingCategoryHref } from '@/lib/landing-routes';
import { cityHref, eventHref, venueHref, venuePageTemplate } from '@/lib/routes';
import {
  cityHubPathFromLandingCity,
  landingBreadcrumbLabel,
  resolveEventLandingForBreadcrumb,
} from '@/lib/seo-internal-links';
import { absoluteUrl } from '@/lib/seo-meta';

const SITE_URL = (process.env.DAIBILET_SITE_URL || 'https://daibilet.ru').replace(/\/$/, '');
const SITE_NAME = 'Дайбилет';

function toAbsoluteUrl(pathOrUrl: string): string {
  const value = String(pathOrUrl || '').trim();
  if (!value) return SITE_URL;
  if (/^https?:\/\//i.test(value)) return value;
  return absoluteUrl(value.startsWith('/') ? value : `/${value}`);
}

export type StructuredBreadcrumb = {
  name: string;
  path: string;
};

/** Хлебные крошки события: Главная → Город → Категория (CHPU) → Title */
export function buildEventBreadcrumbs(event: PublicEventDto): StructuredBreadcrumb[] {
  const path = event.canonicalPath || eventHref(event);
  const crumbs: StructuredBreadcrumb[] = [{ name: 'Главная', path: '/' }];

  if (event.city && (event.citySlug || event.sourceCitySlug || event.city)) {
    crumbs.push({
      name: event.city,
      path: cityHref({
        name: event.city,
        slug: event.citySlug,
        sourceSlug: event.sourceCitySlug,
      }),
    });
  }

  const landingCrumb = resolveEventLandingForBreadcrumb({
    landingSlugs: event.landingSlugs,
    citySlug: event.citySlug,
    sourceCitySlug: event.sourceCitySlug,
    category: event.category,
    tags: event.tags,
    title: event.title,
  });
  if (landingCrumb) {
    crumbs.push({ name: landingCrumb.label, path: landingCrumb.href });
  }

  crumbs.push({ name: event.seoH1 || event.title, path });
  return crumbs;
}

/** Хлебные крошки CHPU-листинга: Главная → Город? → Категория */
export function buildLandingBreadcrumbs(input: {
  landingSlug: string;
  citySlug?: string | null;
  landingTitle?: string | null;
  canonicalPath: string;
}): StructuredBreadcrumb[] {
  const crumbs: StructuredBreadcrumb[] = [{ name: 'Главная', path: '/' }];
  const cityName = resolveLandingCityName(input.citySlug);
  const cityHub = cityHubPathFromLandingCity(input.citySlug);
  if (cityName && cityHub) {
    crumbs.push({ name: cityName, path: cityHub });
  }
  crumbs.push({
    name: landingBreadcrumbLabel(input.landingSlug, input.landingTitle),
    path: input.canonicalPath,
  });
  return crumbs;
}

/**
 * ItemList только для CHPU-листингов с непустой выдачей.
 * Не вызывать для `/events` каталога.
 */
export function buildLandingItemListJsonLd(input: {
  sessions: Array<Pick<PublicSessionDto, 'title' | 'slug' | 'sourceSlug' | 'id'>>;
  canonicalPath: string;
  name: string;
}): Record<string, unknown> | null {
  const items = (input.sessions || []).slice(0, 48);
  if (!items.length) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: input.name,
    numberOfItems: items.length,
    url: toAbsoluteUrl(input.canonicalPath),
    itemListElement: items.map((session, index) => {
      const path = eventHref(session);
      return {
        '@type': 'ListItem',
        position: index + 1,
        name: session.title,
        url: toAbsoluteUrl(path),
        item: toAbsoluteUrl(path),
      };
    }),
  };
}

/** SSR blocks для CHPU landing: BreadcrumbList + ItemList (если есть офферы). */
export function buildLandingPageJsonLd(input: {
  landingSlug: string;
  citySlug?: string | null;
  landingTitle?: string | null;
  canonicalPath: string;
  sessions: Array<Pick<PublicSessionDto, 'title' | 'slug' | 'sourceSlug' | 'id'>>;
}): Array<Record<string, unknown>> {
  const crumbs = buildLandingBreadcrumbs(input);
  const blocks: Array<Record<string, unknown>> = [buildBreadcrumbListJsonLd(crumbs)];
  const listName = input.citySlug
    ? `${landingBreadcrumbLabel(input.landingSlug, input.landingTitle)} - ${resolveLandingCityName(input.citySlug) || ''}`.trim()
    : landingBreadcrumbLabel(input.landingSlug, input.landingTitle);
  const itemList = buildLandingItemListJsonLd({
    sessions: input.sessions,
    canonicalPath: input.canonicalPath || landingCategoryHref(input.landingSlug, input.citySlug),
    name: listName,
  });
  if (itemList) blocks.push(itemList);
  return blocks;
}

export function buildBreadcrumbListJsonLd(items: StructuredBreadcrumb[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: toAbsoluteUrl(item.path),
    })),
  };
}

function pickEventStartDate(payload: PublicEventPageDto): string | undefined {
  const sessions = payload.sessions ?? [];
  const dated = sessions.find(
    (session) =>
      session.startsAt &&
      !isFlexibleScheduleSession(session) &&
      !Number.isNaN(Date.parse(session.startsAt)),
  );
  if (dated?.startsAt) return dated.startsAt;

  const anyDated = sessions.find((session) => session.startsAt && !Number.isNaN(Date.parse(session.startsAt)));
  return anyDated?.startsAt || undefined;
}

function resolveOfferPrice(payload: PublicEventPageDto): number | null {
  const range = getTicketPriceRange(payload);
  if (range?.min && range.min > 0) return range.min;

  const statsPrice = payload.stats?.priceFrom;
  if (typeof statsPrice === 'number' && statsPrice > 0) return statsPrice;

  const eventPrice = payload.event.priceFrom;
  if (typeof eventPrice === 'number' && eventPrice > 0) return eventPrice;

  return null;
}

function resolveOfferUrl(payload: PublicEventPageDto, canonical: string): string {
  const event = payload.event;
  const candidates = [
    event.purchaseUrl,
    event.deeplinkUrl,
    ...(payload.offers ?? []).map((offer) => offer.purchaseUrl),
    ...(payload.sessions ?? []).map((session) => session.purchaseUrl),
  ];
  for (const raw of candidates) {
    const value = String(raw || '').trim();
    if (/^https?:\/\//i.test(value)) return value;
  }
  return canonical;
}

/** Schema.org Event (+ Offer при наличии цены). AggregateRating — только при ≥10 реальных отзывов. */
export function buildEventJsonLd(
  payload: PublicEventPageDto,
  options?: { aggregateRating?: { ratingValue: number; reviewCount: number } | null },
): Record<string, unknown> {
  const event = payload.event;
  const path = event.canonicalPath || eventHref(event);
  const canonical = toAbsoluteUrl(path);
  const startDate = pickEventStartDate(payload);
  const image = event.imageUrl ? toAbsoluteUrl(event.imageUrl) : undefined;
  const description = event.seoDescription || event.description || undefined;
  const price = resolveOfferPrice(payload);

  const locationName = event.venue || event.city || SITE_NAME;
  const location: Record<string, unknown> = {
    '@type': 'Place',
    name: locationName,
    address: {
      '@type': 'PostalAddress',
      addressLocality: event.city || undefined,
      streetAddress: event.venueAddress || undefined,
      addressCountry: 'RU',
    },
  };
  if (event.venueSlug || event.venueId) {
    location.url = toAbsoluteUrl(
      venueHref({
        id: event.venueId || event.venueSlug || '',
        slug: event.venueSlug,
        name: event.venue || locationName,
        type: event.venueKind,
      }),
    );
  }

  const block: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.seoH1 || event.title,
    description,
    url: canonical,
    image: image ? [image] : undefined,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    startDate,
    location,
    organizer: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
  };

  if (price != null) {
    block.offers = {
      '@type': 'Offer',
      url: resolveOfferUrl(payload, canonical),
      price: String(Math.round(price)),
      priceCurrency: 'RUB',
      availability: 'https://schema.org/InStock',
    };
  }

  const aggregate = options?.aggregateRating;
  if (aggregate && aggregate.reviewCount >= 10 && aggregate.ratingValue > 0) {
    block.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: String(aggregate.ratingValue),
      reviewCount: String(aggregate.reviewCount),
      bestRating: '5',
      worstRating: '1',
    };
  }

  return block;
}

/** SSR blocks для страницы события: Event (+ Offer) и BreadcrumbList. */
export function buildEventPageJsonLd(
  payload: PublicEventPageDto,
  options?: { aggregateRating?: { ratingValue: number; reviewCount: number } | null },
): Array<Record<string, unknown>> {
  return [buildEventJsonLd(payload, options), buildBreadcrumbListJsonLd(buildEventBreadcrumbs(payload.event))];
}

export function buildFaqPageJsonLd(items: CityFaqItem[]): Record<string, unknown> | null {
  if (!items.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

/** Хлебные крошки города: Главная → Города → City */
export function buildCityBreadcrumbs(payload: PublicCityPageDto): StructuredBreadcrumb[] {
  const city = payload.city;
  const path = city.canonicalPath || `/cities/${city.slug}`;
  return [
    { name: 'Главная', path: '/' },
    { name: 'Города', path: '/cities' },
    { name: city.seoH1 || city.name, path },
  ];
}

/** SSR blocks для city page: FAQPage (если не thin) + BreadcrumbList. */
export function buildCityPageJsonLd(payload: PublicCityPageDto): Array<Record<string, unknown>> {
  const blocks: Array<Record<string, unknown>> = [
    buildBreadcrumbListJsonLd(buildCityBreadcrumbs(payload)),
  ];

  const decision = evaluateCityIndexability({
    events: payload.stats?.events ?? payload.city.events ?? 0,
    slug: payload.city.slug,
    sourceSlug: payload.city.sourceSlug,
    isIndexable: payload.city.isIndexable,
  });

  if (decision.indexable) {
    const faq = buildFaqPageJsonLd(buildCityFaqItems(payload));
    if (faq) blocks.unshift(faq);
  }

  return blocks;
}

export function buildVenueBreadcrumbs(payload: PublicVenuePageDto): StructuredBreadcrumb[] {
  const venue = payload.venue;
  const path = venue.canonicalPath || venueHref(venue);
  const catalogPath = venuePageTemplate(venue.type) === 'location' ? '/locations' : '/venues';
  const crumbs: StructuredBreadcrumb[] = [
    { name: 'Главная', path: '/' },
    { name: catalogPath === '/locations' ? 'Локации' : 'Площадки', path: catalogPath },
  ];
  if (venue.city && venue.city !== 'Не указан') {
    crumbs.push({
      name: venue.city,
      path: cityHref({ name: venue.city }),
    });
  }
  crumbs.push({ name: venue.seoH1 || venue.title || venue.name, path });
  return crumbs;
}

/** Schema.org Place (+ GeoCoordinates) для страницы площадки / локации. */
export function buildVenuePlaceJsonLd(payload: PublicVenuePageDto): Record<string, unknown> {
  const venue = payload.venue;
  const path = venue.canonicalPath || venueHref(venue);
  const canonical = toAbsoluteUrl(path);
  const image = venue.heroImageUrl ? toAbsoluteUrl(venue.heroImageUrl) : undefined;
  const description = venue.seoDescription || venue.shortDescription || venue.description || undefined;

  const block: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: venue.seoH1 || venue.title || venue.name,
    description,
    url: canonical,
    image: image ? [image] : undefined,
    address: {
      '@type': 'PostalAddress',
      addressLocality: venue.city && venue.city !== 'Не указан' ? venue.city : undefined,
      streetAddress: venue.address || undefined,
      addressCountry: 'RU',
    },
  };

  if (
    typeof venue.latitude === 'number' &&
    typeof venue.longitude === 'number' &&
    Number.isFinite(venue.latitude) &&
    Number.isFinite(venue.longitude)
  ) {
    block.geo = {
      '@type': 'GeoCoordinates',
      latitude: venue.latitude,
      longitude: venue.longitude,
    };
  }

  return block;
}

/** SSR blocks для venue/location: Place (+ geo) и BreadcrumbList. */
export function buildVenuePageJsonLd(payload: PublicVenuePageDto): Array<Record<string, unknown>> {
  return [buildVenuePlaceJsonLd(payload), buildBreadcrumbListJsonLd(buildVenueBreadcrumbs(payload))];
}
