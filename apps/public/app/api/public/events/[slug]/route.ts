import { buildNextPublicEventPage } from '@/server/public-event-page';

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
    const refresh = searchParams.get('refresh') === '1';
    const payload = await buildNextPublicEventPage(slug, refresh);
    if (!payload) {
      return Response.json(
        {
          error: 'public_event_not_found',
          message: 'Event is not available in public catalog.',
        },
        { status: 404 },
      );
    }
    return Response.json(payload);
  } catch (error) {
    return Response.json(
      {
        error: 'public_event_unavailable',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
