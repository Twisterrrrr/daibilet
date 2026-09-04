import '@/lib/env';
import {
  SITEMAP_RESPONSE_HEADERS,
  renderSitemapIndexXml,
} from '@/lib/sitemap-data';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export async function GET() {
  return new Response(renderSitemapIndexXml(), {
    headers: SITEMAP_RESPONSE_HEADERS,
  });
}
