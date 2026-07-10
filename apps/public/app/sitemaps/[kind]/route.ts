import { buildUrlSetXml } from '@/server/sitemap';

type RouteContext = {
  params: Promise<{ kind: string }>;
};

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: RouteContext) {
  const { kind } = await context.params;
  const xml = await buildUrlSetXml(kind);
  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=900, s-maxage=900',
    },
  });
}

