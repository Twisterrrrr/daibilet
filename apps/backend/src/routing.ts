import type { IncomingMessage, ServerResponse } from 'node:http';
import { requestUrl, routeKey } from './http.js';

export interface RouteContext {
  request: IncomingMessage;
  response: ServerResponse;
  url: URL;
  pathname: string;
  method: string;
  route: string;
  searchParams: URLSearchParams;
}

export function createRouteContext(request: IncomingMessage, response: ServerResponse): RouteContext {
  const url = requestUrl(request);
  const method = request.method || 'GET';
  return {
    request,
    response,
    url,
    pathname: url.pathname,
    method,
    route: routeKey(method, url.pathname),
    searchParams: url.searchParams,
  };
}

export function matchPath(pathname: string, pattern: RegExp): string[] | null {
  const match = pathname.match(pattern);
  if (!match) return null;
  return match.slice(1).map((value) => decodeURIComponent(value));
}

export function isMethod(context: Pick<RouteContext, 'method'>, method: string): boolean {
  return context.method === method;
}

export function isRoute(context: Pick<RouteContext, 'route'>, route: string): boolean {
  return context.route === route;
}

