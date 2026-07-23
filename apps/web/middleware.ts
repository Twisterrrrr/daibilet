import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import {
  isAdminUiPath,
  isAuthorizedAdminBasicAuth,
  readAdminBasicAuthConfig,
} from '@/lib/admin-basic-auth';
import { resolveLegacyLandingRedirect } from '@/lib/landing-routes';

function unauthorizedAdminResponse(realm: string) {
  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': `Basic realm="${realm}", charset="UTF-8"`,
      'Cache-Control': 'no-store',
    },
  });
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host')?.toLowerCase() || '';
  if (host === 'www.daibilet.ru' || host.startsWith('www.daibilet.ru:')) {
    const url = request.nextUrl.clone();
    url.host = 'daibilet.ru';
    url.protocol = 'https:';
    url.port = '';
    return NextResponse.redirect(url, 301);
  }

  const { pathname } = request.nextUrl;
  if (isAdminUiPath(pathname)) {
    const config = readAdminBasicAuthConfig(process.env);
    const ok = await isAuthorizedAdminBasicAuth(request.headers.get('authorization'), config);
    if (!ok) return unauthorizedAdminResponse(config.realm);
    return NextResponse.next();
  }

  const redirectTarget = resolveLegacyLandingRedirect(pathname);
  if (!redirectTarget) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = redirectTarget.replace(/\/+$/, '') || '/';
  return NextResponse.redirect(url, 301);
}

// Static matcher only — Next rejects spread/dynamic arrays in config.matcher.
export const config = {
  matcher: [
    '/admin',
    '/admin/:path*',
    '/landings/:path*',
    '/:city/:category',
    '/river-cruises',
    '/river-cruises/:city',
    '/bus-tours',
    '/bus-tours/:city',
    '/river-party',
    '/river-party/:city',
    '/standup',
    '/standup/:city',
    '/family-kids',
    '/family-kids/:city',
    '/concerts-genre',
    '/concerts-genre/:city',
    '/active-sport',
    '/active-sport/:city',
    '/new-year',
    '/new-year/:city',
    '/salute-9-may',
    '/salute-9-may/:city',
  ],
};
