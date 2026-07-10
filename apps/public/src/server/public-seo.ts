import type { Metadata } from 'next';
import { prisma } from '@daibilet/db';

import { absoluteUrl } from './site';

const DEFAULT_DESCRIPTION = 'Каталог экскурсий, музеев, мероприятий, активного отдыха и развлечений в городах России.';

type RouteProfile = {
  title: string;
  description: string;
  canonicalPath?: string;
  robots?: string;
  imageUrl?: string | null;
};

export async function resolvePublicMetadata(path: string): Promise<Metadata> {
  const profile = await resolveRouteProfile(path);
  const canonicalPath = profile.canonicalPath || path || '/';
  return {
    title: profile.title,
    description: profile.description,
    robots: profile.robots || 'index,follow',
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: profile.title,
      description: profile.description,
      url: canonicalPath,
      ...(profile.imageUrl ? { images: [{ url: profile.imageUrl }] } : {}),
    },
  };
}

export async function resolveStructuredData(path: string): Promise<Record<string, unknown>[]> {
  try {
    const [section, slug] = pathSegments(path);
    const breadcrumbs = breadcrumbJsonLd(path);
    if (section === 'events' && slug) {
      const event = await findEvent(slug);
      if (!event) return [breadcrumbs];
      const title = event.override?.title || event.title;
      const description = excerpt(event.override?.description || event.description || event.seoDescription || DEFAULT_DESCRIPTION, 240);
      const startDate = event.sessions[0]?.startsAt?.toISOString();
      const offer = event.offers[0];
      return [
        breadcrumbs,
        {
          '@context': 'https://schema.org',
          '@type': 'Event',
          name: title,
          description,
          ...(startDate ? { startDate } : {}),
          eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
          eventStatus: 'https://schema.org/EventScheduled',
          ...(event.imageUrl || event.override?.imageUrl ? { image: [event.override?.imageUrl || event.imageUrl] } : {}),
          location: {
            '@type': 'Place',
            name: event.venue?.title || event.primaryCity?.title || 'Дайбилет',
            address: event.venue?.address || event.primaryCity?.title || undefined,
          },
          offers: {
            '@type': 'Offer',
            url: absoluteUrl(path),
            price: offer?.priceRub || event.priceFromRub || undefined,
            priceCurrency: 'RUB',
            availability: 'https://schema.org/InStock',
          },
        },
      ];
    }

    if (section === 'venues' && slug) {
      const venue = await prisma.venue.findFirst({
        where: { slug },
        select: { title: true, shortDescription: true, description: true, address: true, heroImageUrl: true },
      });
      if (!venue) return [breadcrumbs];
      return [
        breadcrumbs,
        {
          '@context': 'https://schema.org',
          '@type': 'Place',
          name: venue.title,
          description: excerpt(venue.shortDescription || venue.description || '', 240),
          address: venue.address || undefined,
          ...(venue.heroImageUrl ? { image: [venue.heroImageUrl] } : {}),
        },
      ];
    }

    return [breadcrumbs];
  } catch {
    return [breadcrumbJsonLd(path)];
  }
}

async function resolveRouteProfile(path: string): Promise<RouteProfile> {
  const [section, slug] = pathSegments(path);

  try {
    if (section === 'events' && slug) {
      const event = await findEvent(slug);
      if (event) {
        const seo = await findSeoMeta('EVENT', event.id);
        const title = seo?.title || event.seoTitle || event.override?.title || event.title;
        return {
          title,
          description: excerpt(seo?.description || event.seoDescription || event.override?.description || event.description || DEFAULT_DESCRIPTION),
          canonicalPath: seo?.canonicalUrl || event.canonicalPath || `/events/${event.slug}`,
          robots: seo?.robots || (event.isIndexable === false ? 'noindex,follow' : 'index,follow'),
          imageUrl: seo?.ogImageUrl || event.override?.imageUrl || event.imageUrl,
        };
      }
    }

    if (section === 'cities' && slug) {
      const city = await prisma.city.findFirst({
        where: { slug },
        select: {
          id: true,
          slug: true,
          title: true,
          introText: true,
          heroImageUrl: true,
          seoTitle: true,
          seoDescription: true,
          canonicalPath: true,
        },
      });
      if (city) {
        const seo = await findSeoMeta('CITY', city.id);
        return {
          title: seo?.title || city.seoTitle || `Афиша и экскурсии в городе ${city.title}`,
          description: excerpt(seo?.description || city.seoDescription || city.introText || `События, экскурсии, музеи и площадки в городе ${city.title}.`),
          canonicalPath: seo?.canonicalUrl || city.canonicalPath || `/cities/${city.slug}`,
          robots: seo?.robots || 'index,follow',
          imageUrl: seo?.ogImageUrl || city.heroImageUrl,
        };
      }
    }

    if (section === 'venues' && slug) {
      const venue = await prisma.venue.findFirst({
        where: { slug },
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          shortDescription: true,
          heroImageUrl: true,
          seoTitle: true,
          seoDescription: true,
          canonicalPath: true,
          isIndexable: true,
        },
      });
      if (venue) {
        const seo = await findSeoMeta('VENUE', venue.id);
        return {
          title: seo?.title || venue.seoTitle || `${venue.title}: события и билеты`,
          description: excerpt(seo?.description || venue.seoDescription || venue.shortDescription || venue.description || `Афиша площадки ${venue.title}, события и билеты.`),
          canonicalPath: seo?.canonicalUrl || venue.canonicalPath || `/venues/${venue.slug}`,
          robots: seo?.robots || (venue.isIndexable ? 'index,follow' : 'noindex,follow'),
          imageUrl: seo?.ogImageUrl || venue.heroImageUrl,
        };
      }
    }

    if (section === 'landings' && slug) {
      const landing = await prisma.landing.findFirst({
        where: { slug },
        select: {
          id: true,
          slug: true,
          title: true,
          subtitle: true,
          description: true,
          heroImageUrl: true,
          seoTitle: true,
          seoDescription: true,
          canonicalUrl: true,
          isIndexable: true,
        },
      });
      if (landing) {
        const seo = await findSeoMeta('LANDING', landing.id);
        return {
          title: seo?.title || landing.seoTitle || landing.title,
          description: excerpt(seo?.description || landing.seoDescription || landing.subtitle || landing.description || DEFAULT_DESCRIPTION),
          canonicalPath: seo?.canonicalUrl || landing.canonicalUrl || `/landings/${landing.slug}`,
          robots: seo?.robots || (landing.isIndexable ? 'index,follow' : 'noindex,follow'),
          imageUrl: seo?.ogImageUrl || landing.heroImageUrl,
        };
      }
    }
  } catch {
    return staticRouteProfile(section);
  }

  return staticRouteProfile(section);
}

async function findEvent(slug: string) {
  const possibleId = opaqueIdFromSlug(slug);
  return prisma.event.findFirst({
    where: {
      OR: [
        { slug },
        ...(possibleId ? [{ id: possibleId }] : []),
      ],
    },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      imageUrl: true,
      priceFromRub: true,
      seoTitle: true,
      seoDescription: true,
      canonicalPath: true,
      isIndexable: true,
      primaryCity: { select: { title: true } },
      venue: { select: { title: true, address: true } },
      override: {
        select: {
          title: true,
          description: true,
          imageUrl: true,
        },
      },
      offers: {
        where: { active: true, priceRub: { gte: 100 } },
        orderBy: [{ priceRub: 'asc' }, { id: 'asc' }],
        take: 1,
        select: { priceRub: true },
      },
      sessions: {
        where: { OR: [{ startsAt: null }, { startsAt: { gte: new Date() } }] },
        orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
        take: 1,
        select: { startsAt: true },
      },
    },
  });
}

async function findSeoMeta(entityType: 'EVENT' | 'CITY' | 'VENUE' | 'LANDING', entityId: string) {
  return prisma.seoMeta.findUnique({
    where: { entityType_entityId: { entityType, entityId } },
  });
}

function staticRouteProfile(section?: string): RouteProfile {
  if (!section) {
    return {
      title: 'Афиша, экскурсии и билеты',
      description: 'Дайбилет собирает экскурсии, музеи, мероприятия, активный отдых и развлечения в городах России.',
      canonicalPath: '/',
    };
  }
  if (section === 'events') {
    return {
      title: 'Каталог событий, экскурсий и билетов',
      description: 'Фильтры по городу, дате, категории, цене, площадке и тематическим подборкам.',
      canonicalPath: '/events',
    };
  }
  if (section === 'cities') {
    return {
      title: 'Города России',
      description: 'Выбор города для поездки, афиша событий, экскурсии, музеи, площадки и тематические подборки.',
      canonicalPath: '/cities',
    };
  }
  if (section === 'venues') {
    return {
      title: 'Площадки России',
      description: 'Страницы площадок с афишей, событиями, адресами и полезной информацией для посетителей.',
      canonicalPath: '/venues',
    };
  }
  if (section === 'landings' || section === 'podborki') {
    return {
      title: 'Подборки событий',
      description: 'Тематические страницы с быстрыми фильтрами, расписанием и удобным переходом к покупке билетов.',
      canonicalPath: section === 'podborki' ? '/podborki' : '/landings',
    };
  }
  if (section === 'account') {
    return {
      title: 'Мои покупки',
      description: 'Личный кабинет покупателя с историей покупок и статусами билетов.',
      canonicalPath: '/account/purchases',
      robots: 'noindex,nofollow',
    };
  }
  if (section === 'my-orders' || section === 'login') {
    return {
      title: section === 'login' ? 'Вход' : 'Проверить заказ',
      description: 'Проверка статуса покупки и билетов.',
      robots: 'noindex,nofollow',
    };
  }
  if (section === 'help') {
    return {
      title: 'Помощь',
      description: 'Ответы на частые вопросы о покупке билетов, статусах заказов и работе сервиса Дайбилет.',
      canonicalPath: '/help',
    };
  }
  if (section === 'about') {
    return {
      title: 'О сервисе',
      description: 'Дайбилет помогает находить события, экскурсии, музеи и развлечения в городах России.',
      canonicalPath: '/about',
    };
  }
  return { title: 'Дайбилет', description: DEFAULT_DESCRIPTION, canonicalPath: '/' };
}

function breadcrumbJsonLd(path: string): Record<string, unknown> {
  const parts = pathSegments(path);
  const items = [{ name: 'Дайбилет', item: absoluteUrl('/') }];
  if (parts[0]) items.push({ name: labelForSection(parts[0]), item: absoluteUrl(`/${parts[0]}`) });
  if (parts[1]) items.push({ name: decodeURIComponent(parts[1]).replace(/-/g, ' '), item: absoluteUrl(path) });
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.item,
    })),
  };
}

function pathSegments(path: string): string[] {
  return path.split('/').filter(Boolean).map(decodePathSegment);
}

function decodePathSegment(value: string): string {
  let decoded = value;
  for (let i = 0; i < 3; i += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      break;
    }
  }
  return decoded;
}

function opaqueIdFromSlug(slug: string): string | null {
  if (/^[a-z0-9]{20,}$/i.test(slug)) return slug;
  const parts = slug.split('-');
  const tail = parts[parts.length - 1] || '';
  return /^[a-z0-9]{20,}$/i.test(tail) ? tail : null;
}

function excerpt(value: string | null | undefined, limit = 170): string {
  const cleaned = String(value || DEFAULT_DESCRIPTION).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (cleaned.length <= limit) return cleaned;
  return `${cleaned.slice(0, limit - 1).trim()}…`;
}

function labelForSection(section: string): string {
  const labels: Record<string, string> = {
    events: 'События',
    cities: 'Города',
    venues: 'Площадки',
    landings: 'Подборки',
    podborki: 'Подборки',
  };
  return labels[section] || section;
}
