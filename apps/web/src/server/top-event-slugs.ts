import { prisma } from '@/lib/db';

/**
 * Top-N canonical EventPage slugs for SSG + post-deploy warm.
 * Default 40. EVENT_SSG_TOP_N=0 → skip event SSG (all via ISR / dynamicParams).
 *
 * Selects the indexable CANONICAL EventPages (not legacy Event slugs) so prebuild
 * and warm target the pages that are actually indexed and internally linked.
 * Mirrors the sitemap selection: READY + publishedAt + isIndexable + has >=1 event.
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

/**
 * Indexable canonical EventPage slugs for SSG / warm (not the raw Event table).
 * publishedAt desc puts freshly published rewrites (incl. seasonal batches) first.
 */
export async function listTopEventSlugsForSsg(limit = eventSsgTopN()): Promise<string[]> {
  if (limit <= 0) return [];
  try {
    const rows = await prisma.eventPage.findMany({
      where: {
        status: 'READY',
        isIndexable: true,
        publishedAt: { not: null },
        slug: { not: '' },
        // Empty source shells left after a consolidation are historical URL containers.
        events: { some: {} },
      },
      select: { slug: true },
      orderBy: [{ publishedAt: 'desc' }, { slug: 'asc' }],
      take: limit,
    });
    return rows.map((r) => r.slug).filter(Boolean);
  } catch (error) {
    console.warn('[top-event-slugs] DB unavailable during SSG, skipping prebuild:', error);
    return [];
  }
}
