import { buildNextPublicHomePreview } from '@/server/public-home-preview';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const refresh = new URL(request.url).searchParams.get('refresh') === '1';
    return Response.json(await buildNextPublicHomePreview(refresh));
  } catch (error) {
    return Response.json(
      {
        error: 'public_home_preview_unavailable',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
