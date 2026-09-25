import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [events, cities, venues] = await Promise.all([
      prisma.event.count(),
      prisma.city.count(),
      prisma.venue.count(),
    ]);

    return Response.json({
      ok: true,
      service: 'daibilet-web',
      db: { events, cities, venues },
    });
  } catch {
    return Response.json(
      {
        ok: false,
        service: 'daibilet-web',
        error: 'db_unreachable',
      },
      { status: 503 },
    );
  }
}
