import { prisma } from '@/lib/db';

/** Default top-N for SSG + post-deploy warm. Override: EVENT_SSG_TOP_N=300 */
export function eventSsgTopN(fallback = 200): number {
  const raw = Number(process.env.EVENT_SSG_TOP_N || fallback);
  if (!Number.isFinite(raw) || raw <= 0) return fallback;
  return Math.min(Math.floor(raw), 500);
}

/**
 * Upcoming published events for SSG / warm (not full catalog).
 * Prefer recently updated with a future or open session.
 */
export async function listTopEventSlugsForSsg(limit = eventSsgTopN()): Promise<string[]> {
  const now = new Date();
  try {
    const rows = await prisma.event.findMany({
      where: {
        status: 'PUBLISHED',
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
