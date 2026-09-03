import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Same-origin OSM tile proxy for My Day PDF canvas.
 * Path must NOT be under `/api/*` - nginx on MSK proxies `/api/` to Express.
 * Avoids Carto «API KEY REQUIRED» watermarks and canvas cross-origin taint.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ z: string; x: string; y: string }> },
) {
  const { z, x, y } = await context.params;
  const zi = Number(z);
  const xi = Number(x);
  const yi = Number(String(y).replace(/\.png$/i, ''));
  if (
    !Number.isInteger(zi) ||
    !Number.isInteger(xi) ||
    !Number.isInteger(yi) ||
    zi < 0 ||
    zi > 19 ||
    xi < 0 ||
    yi < 0
  ) {
    return new NextResponse('Bad tile', { status: 400 });
  }

  const upstream = `https://tile.openstreetmap.org/${zi}/${xi}/${yi}.png`;
  const res = await fetch(upstream, {
    headers: {
      // OSM tile usage policy asks for a valid identifying User-Agent.
      'User-Agent': 'DaibiletMyDayPdf/1.0 (https://daibilet.ru; support@daibilet.ru)',
      Accept: 'image/png,image/*;q=0.8,*/*;q=0.5',
    },
    next: { revalidate: 86_400 },
  });
  if (!res.ok) {
    return new NextResponse('Tile upstream error', { status: 502 });
  }

  const buf = await res.arrayBuffer();
  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  });
}
