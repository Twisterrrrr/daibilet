import { resolveCityLocalFlavor } from '@/lib/city-hub-local-flavor';
import { fetchOpenMeteoSnapshot } from '@/server/fetch-city-weather';

export const revalidate = 1200;

type RouteContext = { params: Promise<{ slug: string }> };

/**
 * GET /api/day-route/weather/:slug
 * Next-owned prefix: live nginx proxies `/api/public/*` to catalog :4000.
 */
export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const flavor = resolveCityLocalFlavor(slug);
  const weather = flavor?.weather;
  if (!weather) {
    return Response.json({ ok: false, error: 'no_weather' }, { status: 404 });
  }

  try {
    const snapshot = await fetchOpenMeteoSnapshot(weather);
    if (!snapshot) {
      return Response.json(
        { ok: false, error: 'unavailable' },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      );
    }
    return Response.json(
      {
        ok: true,
        citySlug: slug,
        today: snapshot.today,
        tomorrow: snapshot.tomorrow,
        dayAfter: snapshot.dayAfter,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=1200, stale-while-revalidate=3600',
        },
      },
    );
  } catch {
    return Response.json(
      { ok: false, error: 'unavailable' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
