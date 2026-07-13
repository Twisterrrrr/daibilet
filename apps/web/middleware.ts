import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { LANDING_CATEGORY_PATH_BY_SLUG, resolveLegacyLandingRedirect } from '@/lib/landing-routes';

const OLD_LANDING_SLUGS = Object.keys(LANDING_CATEGORY_PATH_BY_SLUG);

export function middleware(request: NextRequest) {
  const host = request.headers.get('host')?.toLowerCase() || '';
  if (host === 'www.daibilet.ru' || host.startsWith('www.daibilet.ru:')) {
    const url = request.nextUrl.clone();
    url.host = 'daibilet.ru';
    url.protocol = 'https:';
    url.port = '';
    return NextResponse.redirect(url, 301);
  }

  const redirectTarget = resolveLegacyLandingRedirect(request.nextUrl.pathname);
  if (!redirectTarget) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = redirectTarget.replace(/\/+$/, '') || '/';
  return NextResponse.redirect(url, 301);
}

export const config = {
  matcher: [
    '/landings/:path*',
    '/:city/:category',
    ...OLD_LANDING_SLUGS.map((slug) => `/${slug}`),
    ...OLD_LANDING_SLUGS.map((slug) => `/${slug}/:city`),
  ],
};
