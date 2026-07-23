import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import {
  isAdminUiPath,
  isAuthorizedAdminBasicAuth,
  readAdminBasicAuthConfig,
} from '@/lib/admin-basic-auth';
import { isAdminHost, rewriteAdminHostPathname } from '@/lib/admin-host';
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

async function enforceAdminAuth(request: NextRequest) {
  const config = readAdminBasicAuthConfig(process.env);
  const ok = await isAuthorizedAdminBasicAuth(request.headers.get('authorization'), config);
  if (!ok) return unauthorizedAdminResponse(config.realm);
  return null;
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

  // F4.1c: admin.daibilet.ru → rewrite SPA paths onto /admin/*
  if (isAdminHost(host)) {
    if (pathname.startsWith('/_next') || pathname.startsWith('/api')) {
      return NextResponse.next();
    }

    // F4.6: /legacy retired → rewrite to Next admin dashboard
    if (pathname === '/legacy' || pathname.startsWith('/legacy/')) {
      const denied = await enforceAdminAuth(request);
      if (denied) return denied;
      const url = request.nextUrl.clone();
      url.pathname = '/admin';
      return NextResponse.redirect(url, 302);
    }

    const denied = await enforceAdminAuth(request);
    if (denied) return denied;

    const rewritten = rewriteAdminHostPathname(pathname);
    if (!rewritten) return NextResponse.next();

    const url = request.nextUrl.clone();
    url.pathname = rewritten;
    return NextResponse.rewrite(url);
  }

  if (isAdminUiPath(pathname)) {
    const denied = await enforceAdminAuth(request);
    if (denied) return denied;
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
    '/',
    '/admin',
    '/admin/:path*',
    '/events',
    '/events/:path*',
    '/landings',
    '/landings/:path*',
    '/articles',
    '/articles/:path*',
    '/sources',
    '/sources/:path*',
    '/settings',
    '/settings/:path*',
    '/orders',
    '/orders/:path*',
    '/buyers',
    '/buyers/:path*',
    '/venues',
    '/venues/:path*',
    '/cities',
    '/cities/:path*',
    '/sync-health',
    '/sync-health/:path*',
    '/reviews',
    '/reviews/:path*',
    '/change-requests',
    '/change-requests/:path*',
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
