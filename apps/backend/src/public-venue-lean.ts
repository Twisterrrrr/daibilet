import type { Prisma, VenueKind } from '@daibilet/db';
import { prisma } from '@daibilet/db';
import { join } from '@daibilet/db/sql';

import { isUsableCatalogImageUrl, pickFirstUsableEventImageUrl } from './event-image-url.js';
import { CONTENT_PLACE_DB_KINDS } from './public-venue-hub-gate.js';

/** Non-draft / non-hidden events for venue list tiles (no session hydrate). */
export const ACTIVE_VENUE_EVENT_WHERE = {
  status: { notIn: ['HIDDEN', 'DRAFT'] },
} as const satisfies Prisma.EventWhereInput;

/**
 * Strip TC date/time prefixes so recurring slots collapse to one product title.
 * Mirrors catalog group-title normalization used for afisha cards.
 */
function sqlNormalizedEventTitle(column = 'e.title'): string {
  return `lower(trim(regexp_replace(
    regexp_replace(
      regexp_replace(
        coalesce(${column}, ''),
        '^\\d{1,2}[./]\\d{1,2}(?:[./]\\d{2,4})?(?:\\s*(?:,\\s*|\\s+в\\s+))?\\d{1,2}:\\d{2}[^\\n]*',
        '',
        'i'
      ),
      '\\s*\\([^)]{2,40}\\)\\s*$',
      '',
      'i'
    ),
    '\\s+',
    ' ',
    'g'
  )))`;
}

export type LeanPublicVenueRow = {
  id: string;
  slug: string;
  name: string;
  title: string;
  shortDescription: string | null;
  description: string | null;
  heroImageUrl: string | null;
  city: string;
  cityId: string | null;
  citySlug: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  metroStation: string | null;
  wayToFind: string | null;
  parkingInfo: string | null;
  kind: VenueKind;
  proposedKind: string;
  pageStatus: string;
  hookFact: string | null;
  events: number;
  stopEventCount?: number;
  waterEvents: number;
  busEvents: number;
  reason: string;
};

const venueListSelect = {
  id: true,
  slug: true,
  title: true,
  shortDescription: true,
  description: true,
  heroImageUrl: true,
  address: true,
  latitude: true,
  longitude: true,
  metroStation: true,
  wayToFind: true,
  parkingInfo: true,
  hookFact: true,
  kind: true,
  pageStatus: true,
  cityId: true,
  city: { select: { id: true, title: true, slug: true } },
} as const satisfies Prisma.VenueSelect;

type VenueListRecord = Prisma.VenueGetPayload<{ select: typeof venueListSelect }>;

/** Catalog hub must load the full eligible set - take(500) made hero/chips stuck at 500. */
export const VENUE_LEAN_HUB_MAX = 10_000;
/** Keep IN(...) lists bounded so cold hub rebuild does not monopolize Postgres for 20s+. */
const VENUE_ID_QUERY_CHUNK = 400;

function chunkIds(ids: string[], size = VENUE_ID_QUERY_CHUNK): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += size) out.push(ids.slice(i, i + size));
  return out;
}

/**
 * Count logical products per venue (not EventSession rows / dated TC twins).
 * Prefer EventOverride.mergeGroupKey, else normalized title.
 */
export async function fetchVenueDistinctEventCounts(
  venueIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  const ids = [...new Set((venueIds || []).map((id) => String(id || '').trim()).filter(Boolean))];
  if (!ids.length) return counts;

  const titleExpr = sqlNormalizedEventTitle(`coalesce(nullif(trim(o.title), ''), e.title)`);
  for (const batch of chunkIds(ids)) {
    const placeholders = batch.map((_, i) => `$${i + 1}`).join(', ');
    const distinctRows = await prisma.$queryRawUnsafe<Array<{ venueId: string; events: number }>>(
      `
        select
          e."venueId" as "venueId",
          count(distinct coalesce(
            nullif(trim(o."mergeGroupKey"), ''),
            nullif(${titleExpr}, ''),
            e.id
          ))::int as events
        from "Event" e
        left join "EventOverride" o on o."eventId" = e.id
        where e."venueId" in (${placeholders})
          and e.status not in ('HIDDEN', 'DRAFT')
        group by e."venueId"
      `,
      ...batch,
    );

    for (const row of distinctRows) {
      if (!row.venueId) continue;
      counts.set(row.venueId, Number(row.events) || 0);
    }
  }
  return counts;
}

/** Distinct STOP-linked events per venue (EventVenueRouteItem role=STOP). */
export async function fetchVenueStopEventCounts(
  venueIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  const ids = [...new Set((venueIds || []).map((id) => String(id || '').trim()).filter(Boolean))];
  if (!ids.length) return counts;

  for (const batch of chunkIds(ids)) {
    const placeholders = batch.map((_, i) => `$${i + 1}`).join(', ');
    const rows = await prisma.$queryRawUnsafe<Array<{ venueId: string; stops: number }>>(
      `
        select
          link."venueId" as "venueId",
          count(distinct link."eventId")::int as stops
        from event_venue_route_items link
        join "Event" e on e.id = link."eventId"
        where link."venueId" in (${placeholders})
          and link.role = 'STOP'::"RouteItemRole"
          and e.status not in ('HIDDEN', 'DRAFT')
        group by link."venueId"
      `,
      ...batch,
    );
    for (const row of rows) {
      if (!row.venueId) continue;
      counts.set(row.venueId, Number(row.stops) || 0);
    }
  }
  return counts;
}

/**
 * Lean venue rows for /venues + /locations catalog tiles.
 * Uses Prisma `select` + `_count` instead of include(events/offers/sessions).
 * Also unions content places (park/monument/museum/…) with PUBLISHED|CANDIDATE
 * so zero-event must-see entities are not dropped by the top-N event sort.
 */
export async function fetchLeanPublicVenueRows(
  limit = VENUE_LEAN_HUB_MAX,
  options: { leanText?: boolean; q?: string; skipEventCounts?: boolean } = {},
): Promise<LeanPublicVenueRow[]> {
  const take = Math.max(1, Math.min(Number(limit) || VENUE_LEAN_HUB_MAX, VENUE_LEAN_HUB_MAX));
  const q = String(options.q || '').trim();
  const skipEventCounts = options.skipEventCounts === true;
  const where: Prisma.VenueWhereInput = {
    pageStatus: { not: 'HIDDEN' },
  };
  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { address: { contains: q, mode: 'insensitive' } },
      { city: { is: { title: { contains: q, mode: 'insensitive' } } } },
    ];
  }

  const contentKinds = [...CONTENT_PLACE_DB_KINDS] as VenueKind[];
  // Full editorial set (SPB/KGD must-see etc.). Former A→Z take:400 dropped
  // titles after «П» (Петропавловская, Спас, Стрелка…) from /locations.
  const contentTake = Math.min(Math.max(take, 500), VENUE_LEAN_HUB_MAX);
  const [rows, contentRows] = await Promise.all([
    prisma.venue.findMany({
      where,
      select: venueListSelect,
      // Shell keeps _count order for «по афише» ranking; distinct products fill later.
      orderBy: [{ events: { _count: 'desc' } }, { title: 'asc' }],
      take,
    }),
    q
      ? Promise.resolve([] as VenueListRecord[])
      : prisma.venue.findMany({
          where: {
            pageStatus: { in: ['PUBLISHED', 'CANDIDATE'] },
            kind: { in: contentKinds },
            OR: [
              { shortDescription: { not: null } },
              { hookFact: { not: null } },
              { description: { not: null } },
            ],
          },
          select: venueListSelect,
          orderBy: [{ title: 'asc' }],
          take: contentTake,
        }),
  ]);

  const byId = new Map<string, VenueListRecord>();
  for (const row of rows as VenueListRecord[]) byId.set(row.id, row);
  for (const row of contentRows as VenueListRecord[]) {
    if (!byId.has(row.id)) byId.set(row.id, row);
  }

  const merged = [...byId.values()];
  if (skipEventCounts) {
    // Progressive /venues paint: cards first, distinct product counts via enrich.
    return merged.map((row) => mapLeanVenueRow(row, options.leanText === true, 0, 0));
  }
  const ids = merged.map((row) => row.id);
  const [eventCounts, stopCounts] = await Promise.all([
    fetchVenueDistinctEventCounts(ids),
    fetchVenueStopEventCounts(ids),
  ]);
  return merged.map((row) =>
    mapLeanVenueRow(
      row,
      options.leanText === true,
      eventCounts.get(row.id) || 0,
      stopCounts.get(row.id) || 0,
    ),
  );
}

function mapLeanVenueRow(
  row: VenueListRecord,
  leanText: boolean,
  eventCount: number,
  stopEventCount = 0,
): LeanPublicVenueRow {
  const pageStatus = String(row.pageStatus || 'NONE').toLowerCase();
  const kind = row.kind;
  return {
    id: row.id,
    slug: row.slug,
    name: row.title,
    title: row.title,
    shortDescription: leanText ? null : row.shortDescription,
    description: leanText ? null : row.description,
    heroImageUrl: row.heroImageUrl,
    city: row.city?.title || 'Не указан',
    cityId: row.cityId || row.city?.id || null,
    citySlug: row.city?.slug || null,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    metroStation: row.metroStation,
    wayToFind: leanText ? null : row.wayToFind,
    parkingInfo: row.parkingInfo,
    hookFact: leanText ? null : row.hookFact,
    kind,
    proposedKind: String(kind || 'OTHER').toLowerCase(),
    pageStatus,
    events: eventCount,
    ...(stopEventCount > 0 ? { stopEventCount } : {}),
    waterEvents: 0,
    busEvents: 0,
    reason: pageStatus === 'candidate' ? 'кандидат на public-страницу' : 'пока только локация',
  };
}

export type VenueEventFacetCounts = {
  waterCounts: Map<string, number>;
  busCounts: Map<string, number>;
};

/**
 * Lightweight SQL facets for kind inference (pier/bus) without hydrating catalog sessions.
 */
export async function fetchVenueEventFacetCounts(venueIds: string[]): Promise<VenueEventFacetCounts> {
  const waterCounts = new Map<string, number>();
  const busCounts = new Map<string, number>();
  const ids = [...new Set((venueIds || []).map((id) => String(id || '').trim()).filter(Boolean))];
  if (!ids.length) return { waterCounts, busCounts };

  for (const batch of chunkIds(ids)) {
    const rows = await prisma.$queryRaw<Array<{ venueId: string; waterEvents: number; busEvents: number }>>`
      select
        e."venueId" as "venueId",
        count(*) filter (
          where
            coalesce(cat.title, '') ~* 'водн|речн|теплоход|катер'
            or coalesce(sub.title, '') ~* 'водн|речн|теплоход|катер'
            or coalesce(e.title, '') ~* 'теплоход|катер|яхт|корабл|судн|лодк|речн|река|канал|круиз|развод.*мост|мост.*развод|прогулк'
            or exists (
              select 1
              from "EventOffer" o
              where o."eventId" = e.id
                and o.active = true
                and o."sourceCode"::text = 'TEPLOHOD'
            )
        )::int as "waterEvents",
        count(*) filter (
          where
            coalesce(cat.title, '') ~* 'автобус|hop.?on|hop.?off|city.?sightseeing|сити.?тур'
            or coalesce(sub.title, '') ~* 'автобус|hop.?on|hop.?off|city.?tour'
            or coalesce(e.title, '') ~* 'автобус|hop.?on|hop.?off|city.?sightseeing|сити.?тур|двухэтажн|садись.?руляй'
        )::int as "busEvents"
      from "Event" e
      left join "Category" cat on cat.id = e."categoryId"
      left join "Subcategory" sub on sub.id = e."primarySubcategoryId"
      where e."venueId" in (${join(batch)})
        and e.status not in ('HIDDEN', 'DRAFT')
      group by e."venueId"
    `;

    for (const row of rows) {
      if (!row.venueId) continue;
      waterCounts.set(row.venueId, Number(row.waterEvents) || 0);
      busCounts.set(row.venueId, Number(row.busEvents) || 0);
    }
  }
  return { waterCounts, busCounts };
}

export function applyVenueEventFacetCounts(
  rows: LeanPublicVenueRow[],
  facets: VenueEventFacetCounts,
): LeanPublicVenueRow[] {
  return rows.map((row) => ({
    ...row,
    waterEvents: facets.waterCounts.get(row.id) || 0,
    busEvents: facets.busCounts.get(row.id) || 0,
  }));
}

function isRealPublicHeroCandidate(url: string | null | undefined): boolean {
  // Prefer provider CDN; also accept local /images/events|venues (TC overrides + generated).
  return isUsableCatalogImageUrl(url);
}

/**
 * Lean cover fallbacks for venue tiles: one usable event/override image per venue.
 * Replaces the old `buildActiveVenueEventCounts(...).heroImageFallbacks` path that
 * required hydrating full publicCatalogSessions.
 */
export async function fetchVenueHeroImageFallbacks(
  venueIds: string[],
): Promise<Map<string, string>> {
  const fallbacks = new Map<string, string>();
  const ids = [...new Set((venueIds || []).map((id) => String(id || '').trim()).filter(Boolean))];
  if (!ids.length) return fallbacks;

  const rows = await prisma.$queryRaw<Array<{ venueId: string; imageUrl: string | null }>>`
    select distinct on (e."venueId")
      e."venueId" as "venueId",
      coalesce(nullif(trim(o."imageUrl"), ''), nullif(trim(e."imageUrl"), '')) as "imageUrl"
    from "Event" e
    left join "EventOverride" o on o."eventId" = e.id
    where e."venueId" in (${join(ids)})
      and e.status not in ('HIDDEN', 'DRAFT')
      and coalesce(nullif(trim(o."imageUrl"), ''), nullif(trim(e."imageUrl"), '')) is not null
      and coalesce(nullif(trim(o."imageUrl"), ''), nullif(trim(e."imageUrl"), '')) !~* '^/images/cities/'
      and coalesce(nullif(trim(o."imageUrl"), ''), nullif(trim(e."imageUrl"), '')) !~* 'placeholder\\.gif'
    order by e."venueId", e."updatedAt" desc nulls last
  `;

  for (const row of rows) {
    if (!row.venueId || fallbacks.has(row.venueId)) continue;
    const picked = pickFirstUsableEventImageUrl(row.imageUrl);
    if (!picked || !isRealPublicHeroCandidate(picked)) continue;
    fallbacks.set(row.venueId, picked);
  }

  return fallbacks;
}

export type { VenueKind };
