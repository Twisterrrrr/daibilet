import { prisma, type Prisma } from '@/lib/db';

/**
 * Top-N canonical EventPage slugs + legacy indexable Event slugs for SSG + post-deploy warm.
 * Default 40. EVENT_SSG_TOP_N=0 → skip event SSG (all via ISR / dynamicParams).
 *
 * Union of two indexable surfaces:
 *  1. CANONICAL EventPages (rewrites) — READY + publishedAt + isIndexable + has >=1 event.
 *  2. LEGACY Events without a rewrite — their self-canonical /events/{slug} still indexes.
 * Seasonal (New Year / Christmas) EventPage titles are ordered first.
 *
 * Cap raised 500 → 2000: the build runs with NODE_OPTIONS=--max-old-space-size=5120
 * and the host now has swap, so a full catalog prebuild (~1.5k pages) is affordable.
 */
export function eventSsgTopN(fallback = 40): number {
  const rawEnv = process.env.EVENT_SSG_TOP_N;
  if (rawEnv === undefined || rawEnv === '') return fallback;
  const raw = Number(rawEnv);
  if (!Number.isFinite(raw)) return fallback;
  if (raw <= 0) return 0;
  return Math.min(Math.floor(raw), 2000);
}

const SEASONAL_TITLE_PATTERNS = [
  'новогод',
  'новый год',
  'рождеств',
  'ёлк',
  'елк',
  'дед мороз',
  'снегурочк',
];

const INDEXABLE_EVENT_PAGE_WHERE: Prisma.EventPageWhereInput = {
  status: 'READY',
  isIndexable: true,
  publishedAt: { not: null },
  slug: { not: '' },
  // Empty source shells left after a consolidation are historical URL containers.
  events: { some: {} },
};

function seasonalTitleFilter(): Prisma.EventPageWhereInput[] {
  return SEASONAL_TITLE_PATTERNS.map(
    (pattern): Prisma.EventPageWhereInput => ({
      title: { contains: pattern, mode: 'insensitive' },
    }),
  );
}

/** Legacy events not grouped into an EventPage still serve their own indexable page. */
function legacyIndexableEventWhere(now: Date): Prisma.EventWhereInput {
  return {
    status: { in: ['READY', 'PUBLISHED'] },
    isIndexable: true,
    slug: { not: '' },
    eventPageLink: null,
    OR: [
      {
        sessions: {
          some: {
            isActive: true,
            cancelledAt: null,
            OR: [{ startsAt: { gte: now } }, { endsAt: { gte: now } }, { startsAt: null }],
          },
        },
      },
      { sessions: { none: {} } },
    ],
  };
}

/**
 * Indexable event slugs for SSG / warm, season-first:
 * canonical EventPages (seasonal → publishedAt desc), then legacy Events (updatedAt desc).
 */
export async function listTopEventSlugsForSsg(limit = eventSsgTopN()): Promise<string[]> {
  if (limit <= 0) return [];
  try {
    const seasonal = await prisma.eventPage.findMany({
      where: { ...INDEXABLE_EVENT_PAGE_WHERE, OR: seasonalTitleFilter() },
      select: { slug: true },
      orderBy: [{ publishedAt: 'desc' }, { slug: 'asc' }],
      take: limit,
    });
    const seasonalSlugs = seasonal.map((r) => r.slug);

    const restPages = await prisma.eventPage.findMany({
      where: {
        ...INDEXABLE_EVENT_PAGE_WHERE,
        ...(seasonalSlugs.length ? { slug: { not: '', notIn: seasonalSlugs } } : {}),
      },
      select: { slug: true },
      orderBy: [{ publishedAt: 'desc' }, { slug: 'asc' }],
      take: Math.max(0, limit - seasonalSlugs.length),
    });
    const pageSlugs = [...seasonalSlugs, ...restPages.map((r) => r.slug)];

    const remaining = Math.max(0, limit - pageSlugs.length);
    let legacySlugs: string[] = [];
    if (remaining > 0) {
      const legacy = await prisma.event.findMany({
        where: legacyIndexableEventWhere(new Date()),
        select: { slug: true },
        orderBy: [{ updatedAt: 'desc' }],
        take: remaining,
      });
      legacySlugs = legacy.map((r) => r.slug);
    }

    return [...pageSlugs, ...legacySlugs].filter(Boolean);
  } catch (error) {
    console.warn('[top-event-slugs] DB unavailable during SSG, skipping prebuild:', error);
    return [];
  }
}
