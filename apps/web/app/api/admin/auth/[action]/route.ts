import { NextResponse, type NextRequest } from 'next/server';

const ACTIONS = new Set(['login', 'me', 'logout', 'accept-invitation', 'invitations']);

function backendBase(): string {
  return (
    process.env.DAIBILET_ADMIN_API_URL ||
    process.env.DAIBILET_API_INTERNAL_URL ||
    process.env.DAIBILET_API_URL ||
    'http://127.0.0.1:4000'
  ).replace(/\/$/, '');
}

async function proxy(request: NextRequest, action: string, method: 'GET' | 'POST') {
  if (!ACTIONS.has(action)) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if ((action === 'me') !== (method === 'GET')) {
    return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 });
  }

  const headers = new Headers();
  for (const name of ['cookie', 'origin', 'x-request-id', 'content-type']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  let body: string | undefined;
  if (method === 'POST') {
    body = await request.text();
    if (body.length > 8192) return NextResponse.json({ error: 'request_too_large' }, { status: 413 });
  }

  try {
    const upstream = await fetch(`${backendBase()}/api/admin/auth/${action}`, {
      method,
      headers,
      body,
      cache: 'no-store',
    });
    const responseHeaders = new Headers({ 'Cache-Control': 'no-store' });
    const contentType = upstream.headers.get('content-type');
    const setCookie = upstream.headers.get('set-cookie');
    if (contentType) responseHeaders.set('Content-Type', contentType);
    if (setCookie) responseHeaders.set('Set-Cookie', setCookie);
    return new NextResponse(await upstream.text(), { status: upstream.status, headers: responseHeaders });
  } catch {
    return NextResponse.json({ error: 'admin_auth_backend_unavailable' }, { status: 503 });
  }
}

type RouteContext = { params: Promise<{ action: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  return proxy(request, (await context.params).action, 'GET');
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxy(request, (await context.params).action, 'POST');
}
