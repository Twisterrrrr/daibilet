import type { Prisma, VenueKind } from '@daibilet/db';
import { prisma } from '@daibilet/db';
import { join } from '@daibilet/db/sql';

import { pickFirstUsableEventImageUrl } from './event-image-url.js';

/** Non-draft / non-hidden events count for venue list tiles (no session hydrate). */
export const ACTIVE_VENUE_EVENT_WHERE = {
  status: { notIn: ['HIDDEN', 'DRAFT'] },
} as const satisfies Prisma.EventWhereInput;

export type LeanPublicVenueRow = {
  id: string;
  slug: string;
  name: string;
  title: string;
  shortDescription: string | null;
  description: string | null;
  heroImageUrl: string | null;
  city: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  kind: VenueKind;
  proposedKind: string;
  pageStatus: string;
  events: number;
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
  kind: true,
  pageStatus: true,
  city: { select: { title: true } },
  _count: {
    select: {
      events: { where: ACTIVE_VENUE_EVENT_WHERE },
    },
  },
} as const satisfies Prisma.VenueSelect;

type VenueListRecord = Prisma.VenueGetPayload<{ select: typeof venueListSelect }>;

/**
 * Lean venue rows for /venues + /locations catalog tiles.
 * Uses Prisma `select` + `_count` instead of include(events/offers/sessions).
 */
export async function fetchLeanPublicVenueRows(
  limit = 500,
  options: { leanText?: boolean; q?: string } = {},
): Promise<LeanPublicVenueRow[]> {
  const take = Math.max(1, Math.min(Number(limit) || 500, 2000));
  const q = String(options.q || '').trim();
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

  const rows = await prisma.venue.findMany({
    where,
    select: venueListSelect,
    orderBy: [{ events: { _count: 'desc' } }, { title: 'asc' }],
    take,
  });

  return (rows as VenueListRecord[]).map((row) => mapLeanVenueRow(row, options.leanText === true));
}

function mapLeanVenueRow(row: VenueListRecord, leanText: boolean): LeanPublicVenueRow {
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
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    kind,
    proposedKind: String(kind || 'OTHER').toLowerCase(),
    pageStatus,
    events: row._count.events,
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
  if (!venueIds.length) return { waterCounts, busCounts };

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
    where e."venueId" in (${join(venueIds)})
      and e.status not in ('HIDDEN', 'DRAFT')
    group by e."venueId"
  `;

  for (const row of rows) {
    if (!row.venueId) continue;
    waterCounts.set(row.venueId, Number(row.waterEvents) || 0);
    busCounts.set(row.venueId, Number(row.busEvents) || 0);
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
  const raw = String(url || '').trim();
  if (!raw) return false;
  if (raw.startsWith('/images/cities/')) return false;
  return /^https?:\/\//i.test(raw);
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
