const DEFAULT_BACKEND_API_URL = 'http://127.0.0.1:4000';

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'content-length',
  'host',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

type ApiRouteContext = {
  params: Promise<{ path?: string[] }>;
};

export async function proxyBackendApi(request: Request, context: ApiRouteContext): Promise<Response> {
  const backendBase = resolveBackendApiBaseUrl();
  const params = await context.params;
  const path = (params?.path || []).map((segment) => encodeURIComponent(segment)).join('/');
  const incomingUrl = new URL(request.url);
  const targetUrl = new URL(`/api/${path}`, backendBase);
  targetUrl.search = incomingUrl.search;

  const headers = cloneForwardHeaders(request.headers);
  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';

  let response: Response;
  try {
    response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      cache: 'no-store',
      redirect: 'manual',
    });
  } catch (error) {
    return Response.json(
      {
        error: 'backend_unavailable',
        message: 'Daibilet backend is not reachable from the Next API bridge.',
        target: targetUrl.origin,
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 502 },
    );
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: cloneResponseHeaders(response.headers),
  });
}

function resolveBackendApiBaseUrl(): string {
  return (
    process.env.DAIBILET_BACKEND_API_URL ||
    process.env.DAIBILET_API_URL ||
    process.env.NEXT_PUBLIC_DAIBILET_API_URL ||
    process.env.VITE_DAIBILET_API_URL ||
    DEFAULT_BACKEND_API_URL
  );
}

function cloneForwardHeaders(source: Headers): Headers {
  const headers = new Headers();
  source.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) headers.set(key, value);
  });
  return headers;
}

function cloneResponseHeaders(source: Headers): Headers {
  const headers = new Headers();
  source.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) headers.set(key, value);
  });
  return headers;
}
