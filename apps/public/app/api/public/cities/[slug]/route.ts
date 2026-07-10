import { buildNextPublicCityPage } from '@/server/public-hubs';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const [{ slug }, searchParams] = await Promise.all([
      context.params,
      Promise.resolve(new URL(request.url).searchParams),
    ]);
    const payload = await buildNextPublicCityPage(slug, searchParams.get('refresh') === '1');
    if (!payload) {
      return Response.json(
        {
          error: 'public_city_not_found',
          message: 'City is not available in public catalog.',
        },
        { status: 404 },
      );
    }
    return Response.json(payload);
  } catch (error) {
    return Response.json(
      {
        error: 'public_city_unavailable',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
