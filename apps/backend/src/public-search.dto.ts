import { prisma } from '@daibilet/db';
import { expandSearchQuery } from './search-synonyms.js';

const LANDING_CATEGORY_PATH: Record<string, string> = {
  'river-cruises': 'rechnye-progulki',
  'bus-tours': 'avtobusnye-ekskursii',
  'river-party': 'vecherinki-na-teplohode',
  standup: 'stendap-i-yumor',
  'family-kids': 'detyam-i-semyam',
  'concerts-genre': 'kontserty',
  'active-sport': 'aktivnyj-otdyh',
  'walking-tours': 'peshie-ekskursii',
  'country-tours': 'zagorodnye-ekskursii',
  exhibitions: 'vystavki-i-muzei',
  'unusual-theatres': 'neobychnye-teatry',
  excursions: 'ekskursii',
  rooftops: 'progulki-po-krysham',
  'new-year': 'novyj-god',
  'salute-9-may': 'salut-9-maya',
};

const CITY_SCOPED_LANDING_PATH: Record<string, { city: string; topic: string }> = {
  'bridges-night': { city: 'saint-petersburg', topic: 'night-bridges' },
  'spb-yards': { city: 'saint-petersburg', topic: 'spb-yards' },
  'moscow-dinner-boat': { city: 'moscow', topic: 'dinner-boat' },
  'moscow-museums': { city: 'moscow', topic: 'moscow-museums' },
  planetarium: { city: 'moscow', topic: 'planetarium' },
};

function landingSearchHref(slug: string): string {
  const scoped = CITY_SCOPED_LANDING_PATH[slug];
  if (scoped) return `/${scoped.city}/${scoped.topic}/`;
  const category = LANDING_CATEGORY_PATH[slug] || slug;
  return `/${category}/`;
}

export type PublicSearchItem = {
  type: 'event' | 'venue' | 'city' | 'landing';
  label: string;
  sublabel: string;
  href: string;
  imageUrl: string | null;
};

export type PublicSearchDto = {
  generatedAt: string;
  query: string;
  items: PublicSearchItem[];
};

type TrgmRow = {
  id: string;
  slug: string;
  title: string;
  score: number;
  city?: string | null;
  venue?: string | null;
  imageUrl?: string | null;
  kind?: string | null;
};

const CITY_CARD_SLUGS = new Set([
  'moscow',
  'saint-petersburg',
  'sankt-peterburg',
  'kazan',
  'ekaterinburg',
  'sochi',
  'novosibirsk',
  'nizhny-novgorod',
]);

function cityCardImage(slug: string): string | null {
  const key = slug === 'sankt-peterburg' ? 'saint-petersburg' : slug;
  if (!CITY_CARD_SLUGS.has(key)) return null;
  return `/images/cities/${key}.png`;
}

function likePattern(term: string): string {
  return `%${term.replace(/[%_\\]/g, '')}%`;
}

/**
 * Header search: pg_trgm + ILIKE on Event/Venue titles, synonym expand, lean city/landing rows.
 * Avoids hydrating the full public catalog session list per keystroke.
 */
export async function buildPublicSearchDto(
  searchParams: URLSearchParams,
): Promise<PublicSearchDto> {
  const rawQ = String(searchParams.get('q') || '').trim();
  const q = rawQ.toLowerCase();
  if (q.length < 2) {
    return { generatedAt: new Date().toISOString(), query: q, items: [] };
  }

  const cityFilter = String(searchParams.get('city') || '').trim().toLowerCase();
  const terms = expandSearchQuery(q);
  const primary = terms[0] || q;
  const like = likePattern(primary);

  const items: PublicSearchItem[] = [];
  const seen = new Set<string>();
  const push = (item: PublicSearchItem, key: string) => {
    if (seen.has(key) || items.length >= 8) return;
    seen.add(key);
    items.push(item);
  };

  const [events, venues, cities, landings] = await Promise.all([
    searchEventsTrgm(primary, like, cityFilter, 6),
    searchVenuesTrgm(primary, like, cityFilter, 4),
    searchCitiesIlike(terms, 3),
    searchLandingsIlike(terms, 3),
  ]);

  for (const row of events) {
    push(
      {
        type: 'event',
        label: row.title,
        sublabel: [row.city, row.venue].filter(Boolean).join(' · '),
        href: `/events/${row.slug}`,
        imageUrl: row.imageUrl || null,
      },
      `event:${row.id}`,
    );
  }

  for (const row of venues) {
    const kind = String(row.kind || '').toUpperCase();
    const isLocation =
      kind.includes('PIER') ||
      kind.includes('OUTDOOR') ||
      kind === 'BUS' ||
      kind === 'ATTRACTION' ||
      kind === 'SPORT_ACTIVITY_SPACE';
    push(
      {
        type: 'venue',
        label: row.title,
        sublabel: row.city || '',
        href: isLocation ? `/locations/${row.slug}` : `/venues/${row.slug}`,
        imageUrl: row.imageUrl || null,
      },
      `venue:${row.id}`,
    );
  }

  for (const row of cities) {
    push(
      {
        type: 'city',
        label: row.title,
        sublabel: 'Город',
        href: `/cities/${row.slug}`,
        imageUrl: cityCardImage(row.slug),
      },
      `city:${row.slug}`,
    );
  }

  for (const row of landings) {
    push(
      {
        type: 'landing',
        label: row.title,
        sublabel: row.city || 'Подборка',
        href: landingSearchHref(row.slug),
        imageUrl: null,
      },
      `landing:${row.slug}`,
    );
  }

  return {
    generatedAt: new Date().toISOString(),
    query: q,
    items: items.slice(0, 8),
  };
}

/**
 * Align header search with `/events/[slug]` saleable gate (`hasUpcomingOrOpenSchedule`):
 * past / wide-lifetime-only rows must not deep-link to pages that return null → 404.
 */
async function searchEventsTrgm(
  term: string,
  like: string,
  cityFilter: string,
  limit: number,
): Promise<TrgmRow[]> {
  try {
    if (cityFilter && cityFilter !== 'all') {
      const cityLike = `%${cityFilter}%`;
      return await prisma.$queryRaw<TrgmRow[]>`
        select
          e.id,
          e.slug,
          e.title,
          e."imageUrl" as "imageUrl",
          c.title as city,
          v.title as venue,
          greatest(
            similarity(lower(e.title), ${term}),
            case when lower(e.title) like ${like} then 0.45 else 0 end
          )::float8 as score
        from "Event" e
        left join "City" c on c.id = e."primaryCityId"
        left join "Venue" v on v.id = e."venueId"
        where e.status not in ('HIDDEN', 'DRAFT')
          and exists (
            select 1
            from "EventSession" s
            where s."eventId" = e.id
              and (
                e.kind = 'OPEN_DATE'
                or lower(coalesce(s."sourceStatus", '')) in ('open_date', 'widget')
                or s."startsAt" >= now() - interval '15 minutes'
                or (
                  s."startsAt" < now()
                  and s."endsAt" is not null
                  and s."endsAt" >= now()
                  and s."endsAt" - s."startsAt" <= interval '36 hours'
                )
              )
          )
          and (
            lower(e.title) % ${term}
            or lower(e.title) like ${like}
          )
          and (
            lower(coalesce(c.title, '')) = ${cityFilter}
            or lower(coalesce(c.slug, '')) = ${cityFilter}
            or lower(coalesce(c.title, '')) like ${cityLike}
          )
        order by score desc, e.title asc
        limit ${limit}
      `;
    }

    return await prisma.$queryRaw<TrgmRow[]>`
      select
        e.id,
        e.slug,
        e.title,
        e."imageUrl" as "imageUrl",
        c.title as city,
        v.title as venue,
        greatest(
          similarity(lower(e.title), ${term}),
          case when lower(e.title) like ${like} then 0.45 else 0 end
        )::float8 as score
      from "Event" e
      left join "City" c on c.id = e."primaryCityId"
      left join "Venue" v on v.id = e."venueId"
      where e.status not in ('HIDDEN', 'DRAFT')
        and exists (
          select 1
          from "EventSession" s
          where s."eventId" = e.id
            and (
              e.kind = 'OPEN_DATE'
              or lower(coalesce(s."sourceStatus", '')) in ('open_date', 'widget')
              or s."startsAt" >= now() - interval '15 minutes'
              or (
                s."startsAt" < now()
                and s."endsAt" is not null
                and s."endsAt" >= now()
                and s."endsAt" - s."startsAt" <= interval '36 hours'
              )
            )
        )
        and (
          lower(e.title) % ${term}
          or lower(e.title) like ${like}
        )
      order by score desc, e.title asc
      limit ${limit}
    `;
  } catch {
    // Extension missing / index lag - ILIKE fallback.
    return searchEventsIlikeFallback(like, cityFilter, limit);
  }
}

async function searchEventsIlikeFallback(
  like: string,
  cityFilter: string,
  limit: number,
): Promise<TrgmRow[]> {
  const now = new Date();
  const grace = new Date(now.getTime() - 15 * 60 * 1000);
  const rows = await prisma.event.findMany({
    where: {
      status: { notIn: ['HIDDEN', 'DRAFT'] },
      title: { contains: like.replace(/%/g, ''), mode: 'insensitive' },
      OR: [
        { kind: 'OPEN_DATE' },
        {
          sessions: {
            some: {
              OR: [
                { sourceStatus: { equals: 'open_date', mode: 'insensitive' } },
                { sourceStatus: { equals: 'widget', mode: 'insensitive' } },
                { startsAt: { gte: grace } },
                {
                  AND: [
                    { startsAt: { lt: now } },
                    { endsAt: { gte: now } },
                  ],
                },
              ],
            },
          },
        },
      ],
      ...(cityFilter && cityFilter !== 'all'
        ? {
            primaryCity: {
              OR: [
                { title: { equals: cityFilter, mode: 'insensitive' } },
                { slug: { equals: cityFilter, mode: 'insensitive' } },
                { title: { contains: cityFilter, mode: 'insensitive' } },
              ],
            },
          }
        : {}),
    },
    select: {
      id: true,
      slug: true,
      title: true,
      imageUrl: true,
      kind: true,
      primaryCity: { select: { title: true } },
      venue: { select: { title: true } },
      sessions: {
        select: { startsAt: true, endsAt: true, sourceStatus: true },
        take: 8,
      },
    },
    take: Math.max(limit * 3, 12),
    orderBy: { title: 'asc' },
  });
  const saleable = rows.filter((row: {
    kind: string;
    sessions: Array<{ startsAt: Date | null; endsAt: Date | null; sourceStatus: string | null }>;
  }) => {
    if (String(row.kind).toUpperCase() === 'OPEN_DATE') return true;
    return row.sessions.some((session) => {
      const status = String(session.sourceStatus || '').toLowerCase();
      if (status === 'open_date' || status === 'widget') return true;
      const startsAt = session.startsAt ? session.startsAt.getTime() : NaN;
      const endsAt = session.endsAt ? session.endsAt.getTime() : NaN;
      if (Number.isFinite(startsAt) && startsAt >= grace.getTime()) return true;
      if (
        Number.isFinite(startsAt) &&
        Number.isFinite(endsAt) &&
        startsAt < now.getTime() &&
        endsAt >= now.getTime() &&
        endsAt - startsAt <= 36 * 60 * 60 * 1000
      ) {
        return true;
      }
      return false;
    });
  });
  return saleable.slice(0, limit).map((row: {
    id: string;
    slug: string;
    title: string;
    imageUrl: string | null;
    primaryCity: { title: string } | null;
    venue: { title: string } | null;
  }) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    score: 0.4,
    city: row.primaryCity?.title,
    venue: row.venue?.title,
    imageUrl: row.imageUrl,
  }));
}

async function searchVenuesTrgm(
  term: string,
  like: string,
  cityFilter: string,
  limit: number,
): Promise<TrgmRow[]> {
  try {
    if (cityFilter && cityFilter !== 'all') {
      return await prisma.$queryRaw<TrgmRow[]>`
        select
          v.id,
          v.slug,
          v.title,
          v."heroImageUrl" as "imageUrl",
          v.kind::text as kind,
          c.title as city,
          greatest(
            similarity(lower(v.title), ${term}),
            case when lower(v.title) like ${like} then 0.45 else 0 end
          )::float8 as score
        from "Venue" v
        left join "City" c on c.id = v."cityId"
        where v."pageStatus" <> 'HIDDEN'
          and (
            lower(v.title) % ${term}
            or lower(v.title) like ${like}
          )
          and (
            lower(coalesce(c.title, '')) = ${cityFilter}
            or lower(coalesce(c.slug, '')) = ${cityFilter}
            or lower(coalesce(c.title, '')) like ${'%' + cityFilter + '%'}
          )
        order by score desc, v.title asc
        limit ${limit}
      `;
    }

    return await prisma.$queryRaw<TrgmRow[]>`
      select
        v.id,
        v.slug,
        v.title,
        v."heroImageUrl" as "imageUrl",
        v.kind::text as kind,
        c.title as city,
        greatest(
          similarity(lower(v.title), ${term}),
          case when lower(v.title) like ${like} then 0.45 else 0 end
        )::float8 as score
      from "Venue" v
      left join "City" c on c.id = v."cityId"
      where v."pageStatus" <> 'HIDDEN'
        and (
          lower(v.title) % ${term}
          or lower(v.title) like ${like}
        )
      order by score desc, v.title asc
      limit ${limit}
    `;
  } catch {
    return searchVenuesIlikeFallback(like, cityFilter, limit);
  }
}

async function searchVenuesIlikeFallback(
  like: string,
  cityFilter: string,
  limit: number,
): Promise<TrgmRow[]> {
  const needle = like.replace(/%/g, '');
  const rows = await prisma.venue.findMany({
    where: {
      pageStatus: { not: 'HIDDEN' },
      title: { contains: needle, mode: 'insensitive' },
      ...(cityFilter && cityFilter !== 'all'
        ? {
            city: {
              OR: [
                { title: { equals: cityFilter, mode: 'insensitive' } },
                { slug: { equals: cityFilter, mode: 'insensitive' } },
                { title: { contains: cityFilter, mode: 'insensitive' } },
              ],
            },
          }
        : {}),
    },
    select: {
      id: true,
      slug: true,
      title: true,
      heroImageUrl: true,
      kind: true,
      city: { select: { title: true } },
    },
    take: limit,
    orderBy: { title: 'asc' },
  });
  return rows.map((row: {
    id: string;
    slug: string;
    title: string;
    heroImageUrl: string | null;
    kind: string;
    city: { title: string } | null;
  }) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    score: 0.4,
    city: row.city?.title,
    imageUrl: row.heroImageUrl,
    kind: String(row.kind),
  }));
}

async function searchCitiesIlike(terms: string[], limit: number): Promise<TrgmRow[]> {
  const or = terms.flatMap((term) => [
    { title: { contains: term, mode: 'insensitive' as const } },
    { slug: { contains: term, mode: 'insensitive' as const } },
  ]);
  const rows = await prisma.city.findMany({
    where: { OR: or },
    select: { id: true, slug: true, title: true },
    take: limit,
    orderBy: { title: 'asc' },
  });
  return rows.map((row: { id: string; slug: string; title: string }) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    score: 0.5,
  }));
}

async function searchLandingsIlike(terms: string[], limit: number): Promise<TrgmRow[]> {
  const or = terms.flatMap((term) => [
    { title: { contains: term, mode: 'insensitive' as const } },
    { slug: { contains: term, mode: 'insensitive' as const } },
    { heroTitle: { contains: term, mode: 'insensitive' as const } },
  ]);
  const rows = await prisma.landing.findMany({
    where: {
      isActive: true,
      OR: or,
    },
    select: {
      id: true,
      slug: true,
      title: true,
      city: { select: { title: true } },
    },
    take: limit,
    orderBy: { sortOrder: 'asc' },
  });
  return rows.map((row: { id: string; slug: string; title: string; city: { title: string } | null }) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    score: 0.45,
    city: row.city?.title,
  }));
}
