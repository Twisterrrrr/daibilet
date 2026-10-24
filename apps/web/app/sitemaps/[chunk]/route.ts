import '@/lib/env';
import {
  SITEMAP_CHUNKS,
  SITEMAP_RESPONSE_HEADERS,
  sitemapResponseHeaders,
  buildSitemapChunkEntries,
  normalizeSitemapChunkParam,
  renderUrlsetXml,
} from '@/lib/sitemap-data';

export const revalidate = 3600;

export function generateStaticParams() {
  // Volatile chunks have dedicated runtime routes so deployments do not bake
  // an event or venue snapshot into the CI artifact.
  return SITEMAP_CHUNKS.filter((chunk) => chunk !== 'venues' && chunk !== 'events')
    .flatMap((chunk) => [{ chunk }, { chunk: `${chunk}.xml` }]);
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
      headers: sitemapResponseHeaders(chunk),
    });
  } catch (error) {
    const detail = error instanceof Error ? error.stack || error.message : String(error);
    process.stderr.write(`[sitemap] chunk=${chunk} build failed: ${detail}\n`);
    return new Response('Sitemap temporarily unavailable', {
      status: 503,
      headers: { ...SITEMAP_RESPONSE_HEADERS, 'Cache-Control': 'no-store' },
    });
  }
}
