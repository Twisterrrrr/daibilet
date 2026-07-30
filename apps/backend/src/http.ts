import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AdminAuthConfig } from './auth.js';

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'OPTIONS' | string;

/** CDN/browser cache for public GET JSON (catalog, city, event, venue). */
export const PUBLIC_JSON_CACHE_CONTROL = 'public, max-age=60, s-maxage=300, stale-while-revalidate=600';

export interface JsonResponseOptions {
  statusCode?: number;
  cacheControl?: string;
}

export function routeKey(method: HttpMethod | undefined, pathname: string): string {
  return `${method || 'GET'} ${pathname}`;
}

export function sendJson(response: ServerResponse, payload: unknown, options: JsonResponseOptions = {}): void {
  const body = JSON.stringify(payload);
  response.writeHead(options.statusCode || 200, {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, PATCH, POST, OPTIONS',
    'access-control-allow-headers': 'content-type, authorization, idempotency-key',
    'content-type': 'application/json; charset=utf-8',
    'cache-control': options.cacheControl || 'no-store',
  });
  response.end(body);
}

export function sendPublicJson(response: ServerResponse, payload: unknown, options: JsonResponseOptions = {}): void {
  sendJson(response, payload, {
    ...options,
    cacheControl: options.cacheControl || PUBLIC_JSON_CACHE_CONTROL,
  });
}

export function sendEmpty(response: ServerResponse, statusCode: number): void {
  response.writeHead(statusCode, {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, PATCH, POST, OPTIONS',
    'access-control-allow-headers': 'content-type, authorization, idempotency-key',
  });
  response.end();
}

export function sendAuthRequired(response: ServerResponse, config: Pick<AdminAuthConfig, 'realm'>): void {
  response.writeHead(401, {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, PATCH, POST, OPTIONS',
    'access-control-allow-headers': 'content-type, authorization, idempotency-key',
    'www-authenticate': `Basic realm="${config.realm}", charset="UTF-8"`,
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  response.end(JSON.stringify({ error: 'admin_auth_required' }));
}

export async function readJsonBody<T = unknown>(request: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const body = Buffer.concat(chunks).toString('utf8').trim();
  if (!body) return {} as T;
  return JSON.parse(body) as T;
}

export function requestUrl(request: IncomingMessage): URL {
  return new URL(request.url || '/', `http://${request.headers.host || '127.0.0.1'}`);
}
