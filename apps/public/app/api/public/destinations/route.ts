import { buildNextPublicDestinations } from '@/server/public-hubs';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const refresh = new URL(request.url).searchParams.get('refresh') === '1';
    return Response.json(await buildNextPublicDestinations(refresh));
  } catch (error) {
    return Response.json(
      {
        error: 'public_destinations_unavailable',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
