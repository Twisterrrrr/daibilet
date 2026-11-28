import { prisma } from '@/lib/db';

/**
 * Top-N event slugs for SSG + post-deploy warm.
 * Default 40 (MSK 8Gi: 200 often times out mid-prerender).
 * EVENT_SSG_TOP_N=0 → skip event SSG (all via ISR / dynamicParams).
 * Cap 500.
 */
export function eventSsgTopN(fallback = 40): number {
  const rawEnv = process.env.EVENT_SSG_TOP_N;
  if (rawEnv === undefined || rawEnv === '') return fallback;
  const raw = Number(rawEnv);
  if (!Number.isFinite(raw)) return fallback;
  if (raw <= 0) return 0;
  return Math.min(Math.floor(raw), 500);
}

/**
 * Upcoming published events for SSG / warm (not full catalog).
 * Prefer recently updated with a future or open session.
 */
export async function listTopEventSlugsForSsg(limit = eventSsgTopN()): Promise<string[]> {
  if (limit <= 0) return [];
  const now = new Date();
  try {
    const rows = await prisma.event.findMany({
      where: {
        status: { in: ['READY', 'PUBLISHED'] },
        isIndexable: true,
        slug: { not: '' },
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
      },
      select: { slug: true },
      orderBy: [{ updatedAt: 'desc' }],
      take: limit,
    });
    return rows.map((r) => r.slug).filter(Boolean);
  } catch (error) {
    console.warn('[top-event-slugs] DB unavailable during SSG, skipping prebuild:', error);
    return [];
  }
}
