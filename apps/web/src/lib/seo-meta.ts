const SITE_URL = process.env.DAIBILET_SITE_URL || 'https://daibilet.ru';

/** Default home / root title — keep ≤~60–70 chars for SERP; no live counts. */
export const HOME_SEO_TITLE =
  'Дайбилет — экскурсии, музеи и мероприятия в городах России';

/** Static fallback (layout / build without destinations) — no hardcoded city counts. */
export const HOME_SEO_DESCRIPTION_FALLBACK =
  'Афиша событий, экскурсий и мероприятий в городах России. Билеты онлайн.';

/** Fixed hubs + display names for home meta description (em dash —). */
const HOME_SEO_CITIES = [
  { slug: 'moskva', label: 'Москва' },
  { slug: 'sankt-peterburg', label: 'Санкт-Петербург' },
  { slug: 'kazan', label: 'Казань' },
  { slug: 'ekaterinburg', label: 'Екатеринбург' },
] as const;

type DestinationLike = {
  name: string;
  type?: string;
  slug?: string | null;
  events: number;
};

/** Strip trailing brand suffixes so root title template does not become "X | Дайбилет | Дайбилет". */
export function pageTitle(title: string): string {
  return String(title || '')
    .replace(/\s*[|\u2013\u2014-]\s*Дайбилет\s*$/i, '')
    .replace(/\s*[|\u2013\u2014-]\s*Блог Дайбилет\s*$/i, '')
    .trim();
}

/**
 * Home meta description with live city event counts.
 * Template: «Афиша … России. Билеты онлайн: Москва — {n}, Санкт-Петербург — {m}, …»
 */
export function buildHomeSeoDescription(destinations: DestinationLike[]): string {
  const bySlug = new Map(
    destinations
      .filter((item) => item.type === 'city' && item.slug)
      .map((city) => [String(city.slug).toLowerCase(), city] as const),
  );

  const parts: string[] = [];
  for (const hub of HOME_SEO_CITIES) {
    const city = bySlug.get(hub.slug);
    const count = city ? Number(city.events) : 0;
    if (!Number.isFinite(count) || count <= 0) continue;
    parts.push(`${hub.label} — ${count}`);
  }

  if (!parts.length) return HOME_SEO_DESCRIPTION_FALLBACK;

  return `Афиша событий, экскурсий и мероприятий в городах России. Билеты онлайн: ${parts.join(', ')}`;
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
