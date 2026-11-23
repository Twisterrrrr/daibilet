import { prisma, type Prisma } from '@/lib/db';

/**
 * Top-N canonical EventPage slugs for SSG + post-deploy warm.
 * Default 40. EVENT_SSG_TOP_N=0 → skip event SSG (all via ISR / dynamicParams).
 *
 * Selects the indexable CANONICAL EventPages (not legacy Event slugs) so prebuild
 * and warm target the pages that are actually indexed and internally linked.
 * Mirrors the sitemap selection: READY + publishedAt + isIndexable + has >=1 event.
 *
 * Seasonal (New Year / Christmas) titles are ordered first so the current
 * high-value batch surfaces ahead of older rewrites on a bounded list.
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

/**
 * Indexable canonical EventPage slugs for SSG / warm (not the raw Event table).
 * Seasonal titles first, then by publishedAt desc.
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

    const rest = await prisma.eventPage.findMany({
      where: {
        ...INDEXABLE_EVENT_PAGE_WHERE,
        ...(seasonalSlugs.length ? { slug: { not: '', notIn: seasonalSlugs } } : {}),
      },
      select: { slug: true },
      orderBy: [{ publishedAt: 'desc' }, { slug: 'asc' }],
      take: Math.max(0, limit - seasonalSlugs.length),
    });

    return [...seasonalSlugs, ...rest.map((r) => r.slug)].filter(Boolean);
  } catch (error) {
    console.warn('[top-event-slugs] DB unavailable during SSG, skipping prebuild:', error);
    return [];
  }
}
