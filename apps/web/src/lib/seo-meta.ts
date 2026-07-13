const SITE_URL = process.env.DAIBILET_SITE_URL || 'https://daibilet.ru';

/** Strip trailing brand suffixes so root title template does not become "X | Дайбилет | Дайбилет". */
export function pageTitle(title: string): string {
  return String(title || '')
    .replace(/\s*[|—-]\s*Дайбилет\s*$/i, '')
    .trim();
}

export function absoluteUrl(pathname: string): string {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return new URL(path, SITE_URL).toString();
}

export function routeOpenGraph(pathname: string, extras: Record<string, unknown> = {}) {
  return {
    url: absoluteUrl(pathname),
    ...extras,
  };
}
