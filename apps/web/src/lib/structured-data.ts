import type {
  PublicCityPageDto,
  PublicEventDto,
  PublicEventPageDto,
  PublicVenuePageDto,
} from '@daibilet/contracts/public';

import { buildCityEditorialFaqItems, buildCityFaqItems, type CityFaqItem } from '@/lib/city-faq';
import { getTicketPriceRange, isFlexibleScheduleSession } from '@/lib/event-page-utils';
import { evaluateCityIndexability } from '@/lib/hub-indexability';
import { cityHref, eventHref, venueHref } from '@/lib/routes';
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

/** Хлебные крошки события: Главная → События → Город? → Title */
export function buildEventBreadcrumbs(event: PublicEventDto): StructuredBreadcrumb[] {
  const path = event.canonicalPath || eventHref(event);
  const crumbs: StructuredBreadcrumb[] = [
    { name: 'Главная', path: '/' },
    { name: 'События', path: '/events' },
  ];

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

  crumbs.push({ name: event.seoH1 || event.title, path });
  return crumbs;
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
    const faq = buildFaqPageJsonLd([
      ...buildCityEditorialFaqItems(payload),
      ...buildCityFaqItems(payload),
    ]);
    if (faq) blocks.unshift(faq);
  }

  return blocks;
}

export function buildVenueBreadcrumbs(payload: PublicVenuePageDto): StructuredBreadcrumb[] {
  const venue = payload.venue;
  const path = venue.canonicalPath || venueHref(venue);
  const crumbs: StructuredBreadcrumb[] = [
    { name: 'Главная', path: '/' },
    { name: 'Площадки', path: '/venues' },
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

/** SSR BreadcrumbList для venue (FAQ на venue пока не в scope п.5). */
export function buildVenuePageJsonLd(payload: PublicVenuePageDto): Array<Record<string, unknown>> {
  return [buildBreadcrumbListJsonLd(buildVenueBreadcrumbs(payload))];
}
