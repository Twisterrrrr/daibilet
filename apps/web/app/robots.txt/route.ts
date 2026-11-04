import { renderPublicRobotsTxt, resolveRobotsSiteUrl } from '@/lib/robots-policy';

export const dynamic = 'force-static';
export const revalidate = 3600;

export function GET(): Response {
  return new Response(renderPublicRobotsTxt(resolveRobotsSiteUrl()), {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
