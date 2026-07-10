import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { resolveLegacyLandingRedirect } from '@/lib/landing-routes';

export function middleware(request: NextRequest) {
  const redirectTarget = resolveLegacyLandingRedirect(request.nextUrl.pathname);
  if (!redirectTarget) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = redirectTarget.replace(/\/+$/, '') || '/';
  return NextResponse.redirect(url, 301);
}

export const config = {
  matcher: ['/landings/:path*', '/:city/:category'],
};
