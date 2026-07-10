import { buildSitemapIndexXml } from '@/server/sitemap';

export const dynamic = 'force-dynamic';

export function GET() {
  return new Response(buildSitemapIndexXml(), {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=900, s-maxage=900',
    },
  });
}

