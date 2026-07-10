import { prisma } from '@daibilet/db';

import { absoluteUrl, getSiteUrl, xmlEscape } from './site';

type SitemapEntry = {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
};

const SITEMAP_KINDS = ['static', 'events', 'cities', 'venues', 'landings'] as const;

export function buildSitemapIndexXml(): string {
  const now = new Date().toISOString();
  const items = SITEMAP_KINDS.map((kind) => `
  <sitemap>
    <loc>${xmlEscape(`${getSiteUrl()}/sitemaps/${kind}`)}</loc>
    <lastmod>${now}</lastmod>
  </sitemap>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items}
</sitemapindex>`;
}

export async function buildUrlSetXml(kind: string): Promise<string> {
  const entries = await loadEntries(kind);
  const body = entries.map((entry) => `
  <url>
    <loc>${xmlEscape(entry.loc)}</loc>${entry.lastmod ? `
    <lastmod>${entry.lastmod}</lastmod>` : ''}${entry.changefreq ? `
    <changefreq>${entry.changefreq}</changefreq>` : ''}${entry.priority ? `
    <priority>${entry.priority}</priority>` : ''}
  </url>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}
</urlset>`;
}

async function loadEntries(kind: string): Promise<SitemapEntry[]> {
  try {
    if (kind === 'static') return staticEntries();
    if (kind === 'events') return eventEntries();
    if (kind === 'cities') return cityEntries();
    if (kind === 'venues') return venueEntries();
    if (kind === 'landings') return landingEntries();
  } catch {
    return [];
  }
  return [];
}

function staticEntries(): SitemapEntry[] {
  return [
    { loc: absoluteUrl('/'), changefreq: 'hourly', priority: '1.0' },
    { loc: absoluteUrl('/events'), changefreq: 'hourly', priority: '0.9' },
    { loc: absoluteUrl('/cities'), changefreq: 'daily', priority: '0.8' },
    { loc: absoluteUrl('/venues'), changefreq: 'daily', priority: '0.8' },
    { loc: absoluteUrl('/podborki'), changefreq: 'daily', priority: '0.7' },
    { loc: absoluteUrl('/help'), changefreq: 'monthly', priority: '0.4' },
    { loc: absoluteUrl('/about'), changefreq: 'monthly', priority: '0.4' },
  ];
}

async function eventEntries(): Promise<SitemapEntry[]> {
  const events = await prisma.event.findMany({
    where: {
      status: { not: 'HIDDEN' },
      isIndexable: true,
      OR: [
        { sessions: { some: { OR: [{ startsAt: null }, { startsAt: { gte: new Date() } }] } } },
        { kind: 'OPEN_DATE' },
        { sourceStatus: 'open_date' },
      ],
    },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
    take: 10000,
  });
  return events.map((event) => ({
    loc: absoluteUrl(`/events/${event.slug}`),
    lastmod: event.updatedAt.toISOString(),
    changefreq: 'daily',
    priority: '0.8',
  }));
}

async function cityEntries(): Promise<SitemapEntry[]> {
  const cities = await prisma.city.findMany({
    where: { events: { some: { status: { not: 'HIDDEN' }, isIndexable: true } } },
    select: { slug: true },
    orderBy: { title: 'asc' },
    take: 5000,
  });
  return cities.map((city) => ({
    loc: absoluteUrl(`/cities/${city.slug}`),
    changefreq: 'daily',
    priority: '0.7',
  }));
}

async function venueEntries(): Promise<SitemapEntry[]> {
  const venues = await prisma.venue.findMany({
    where: {
      isIndexable: true,
      pageStatus: { not: 'HIDDEN' },
      events: { some: { status: { not: 'HIDDEN' }, isIndexable: true } },
    },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
    take: 10000,
  });
  return venues.map((venue) => ({
    loc: absoluteUrl(`/venues/${venue.slug}`),
    lastmod: venue.updatedAt.toISOString(),
    changefreq: 'weekly',
    priority: '0.6',
  }));
}

async function landingEntries(): Promise<SitemapEntry[]> {
  const landings = await prisma.landing.findMany({
    where: { isActive: true, isIndexable: true, status: { not: 'HIDDEN' } },
    select: { slug: true, updatedAt: true },
    orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    take: 5000,
  });
  return landings.map((landing) => ({
    loc: absoluteUrl(`/landings/${landing.slug}`),
    lastmod: landing.updatedAt.toISOString(),
    changefreq: 'daily',
    priority: '0.7',
  }));
}
