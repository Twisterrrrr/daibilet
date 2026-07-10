import { buildNextPublicStats } from '@/server/public-catalog';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const refresh = new URL(request.url).searchParams.get('refresh') === '1';
  try {
    return Response.json(await buildNextPublicStats(refresh));
  } catch (error) {
    return Response.json(
      {
        error: 'public_stats_unavailable',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

