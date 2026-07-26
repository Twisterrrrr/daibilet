import '@/lib/env';

import { getIndexNowKey } from '@/lib/indexnow';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ key: string }> | { key: string };
};

/**
 * IndexNow key file: https://daibilet.ru/{INDEXNOW_KEY}.txt
 * Body must be the key only (plain text).
 */
export async function GET(_request: Request, context: RouteContext) {
  const params = await Promise.resolve(context.params);
  const expected = getIndexNowKey();
  const requested = String(params.key || '').trim();

  if (!expected || !requested || requested !== expected) {
    return new Response('Not Found', { status: 404 });
  }

  return new Response(expected, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
