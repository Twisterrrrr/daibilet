import '@/lib/env';
import {
  SITEMAP_CHUNKS,
  SITEMAP_RESPONSE_HEADERS,
  buildSitemapChunkEntries,
  normalizeSitemapChunkParam,
  renderUrlsetXml,
} from '@/lib/sitemap-data';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export function generateStaticParams() {
  return SITEMAP_CHUNKS.flatMap((chunk) => [{ chunk }, { chunk: `${chunk}.xml` }]);
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ chunk: string }> },
) {
  const { chunk: rawChunk } = await context.params;
  const chunk = normalizeSitemapChunkParam(rawChunk);
  if (!chunk) {
    return new Response('Not Found', { status: 404 });
  }

  try {
    const entries = await buildSitemapChunkEntries(chunk);
    return new Response(renderUrlsetXml(entries), {
      headers: SITEMAP_RESPONSE_HEADERS,
    });
  } catch {
    return new Response(renderUrlsetXml([]), {
      headers: SITEMAP_RESPONSE_HEADERS,
    });
  }
}
