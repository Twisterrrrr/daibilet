import '@/lib/env';
import {
  SITEMAP_RESPONSE_HEADERS,
  buildVenuesSitemapEntries,
  renderUrlsetXml,
} from '@/lib/sitemap-data';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const entries = await buildVenuesSitemapEntries();
    return new Response(renderUrlsetXml(entries), { headers: SITEMAP_RESPONSE_HEADERS });
  } catch (error) {
    const detail = error instanceof Error ? error.stack || error.message : String(error);
    process.stderr.write(`[sitemap] chunk=venues build failed: ${detail}\n`);
    return new Response('Sitemap temporarily unavailable', {
      status: 503,
      headers: SITEMAP_RESPONSE_HEADERS,
    });
  }
}
