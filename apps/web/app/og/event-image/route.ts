import { buildEventOgImage } from '@/server/og-image';
import { DEFAULT_OG_IMAGE } from '@/lib/seo-meta';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const source = new URL(request.url).searchParams.get('source') || '';
  const image = await buildEventOgImage(source);
  if (!image) {
    return Response.redirect(DEFAULT_OG_IMAGE, 302);
  }

  return new Response(new Uint8Array(image), {
    headers: {
      'Content-Type': 'image/jpeg',
      'Content-Length': String(image.byteLength),
      'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
