import '@/lib/env';
import {
  SITEMAP_RESPONSE_HEADERS,
  sitemapResponseHeaders,
  buildEventsSitemapEntries,
  renderUrlsetXml,
} from '@/lib/sitemap-data';

// Events can expire from the public catalog during the day. Keep their sitemap
// on a short runtime ISR window instead of baking it into the deployment build.
export const revalidate = 300;

export async function GET() {
  try {
    const entries = await buildEventsSitemapEntries();
    return new Response(renderUrlsetXml(entries), { headers: sitemapResponseHeaders('events') });
  } catch (error) {
    const detail = error instanceof Error ? error.stack || error.message : String(error);
    process.stderr.write(`[sitemap] chunk=events build failed: ${detail}\n`);
    return new Response('Sitemap temporarily unavailable', {
      status: 503,
      headers: { ...SITEMAP_RESPONSE_HEADERS, 'Cache-Control': 'no-store' },
    });
  }
}
