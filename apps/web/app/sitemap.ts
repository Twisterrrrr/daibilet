import type { MetadataRoute } from 'next';

import '@/lib/env';
import { getPublicCatalogSessions } from '@daibilet/backend/public-read';
import { buildPublicDestinationsDto } from '@daibilet/backend/public-read';
import { buildPublicVenuesDto } from '@daibilet/backend/public-read';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://daibilet.ru').replace(/\/$/, '');

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    '',
    '/events',
    '/cities',
    '/venues',
    '/locations',
    '/podborki',
    '/blog',
    '/help',
  ].map((path) => ({
    url: `${SITE_URL}${path || '/'}`,
    lastModified: now,
    changeFrequency: path === '' || path === '/events' ? 'hourly' : 'daily',
    priority: path === '' ? 1 : 0.8,
  }));

  try {
    const [sessions, destinationsPayload, venuesPayload] = await Promise.all([
      getPublicCatalogSessions(),
      buildPublicDestinationsDto(),
      buildPublicVenuesDto(new URLSearchParams('limit=500')),
    ]);

    const eventRoutes: MetadataRoute.Sitemap = sessions.slice(0, 2000).map((session) => {
      const slug = session.slug || session.sourceSlug || session.id;
      return {
        url: `${SITE_URL}/events/${encodeURIComponent(slug)}`,
        lastModified: now,
        changeFrequency: 'daily' as const,
        priority: 0.7,
      };
    });

    const cityRoutes: MetadataRoute.Sitemap = (destinationsPayload?.destinations || [])
      .filter((destination) => destination.type === 'city' && destination.slug)
      .map((destination) => ({
        url: `${SITE_URL}/cities/${encodeURIComponent(String(destination.slug))}`,
        lastModified: now,
        changeFrequency: 'daily' as const,
        priority: 0.75,
      }));

    const venueRoutes: MetadataRoute.Sitemap = (venuesPayload?.venues || [])
      .filter((venue) => venue.isIndexable !== false && venue.slug)
      .slice(0, 1000)
      .map((venue) => ({
        url: `${SITE_URL}/venues/${encodeURIComponent(String(venue.slug))}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.6,
      }));

    return [...staticRoutes, ...cityRoutes, ...eventRoutes, ...venueRoutes];
  } catch {
    return staticRoutes;
  }
}
