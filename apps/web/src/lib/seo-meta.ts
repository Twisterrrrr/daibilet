const SITE_URL = process.env.DAIBILET_SITE_URL || 'https://daibilet.ru';

/** Default home / root title — keep ≤~60–70 chars for SERP. */
export const HOME_SEO_TITLE =
  'Дайбилет — экскурсии, музеи и мероприятия в городах России';

export const HOME_SEO_DESCRIPTION_FALLBACK =
  'Билеты на экскурсии, музеи и мероприятия в городах России. Афиша событий онлайн на Дайбилет.';

/** Prefer major hubs in meta description; then fill by event count. */
const HOME_SEO_CITY_SLUGS = ['moskva', 'sankt-peterburg', 'kazan', 'ekaterinburg'] as const;

type DestinationLike = {
  name: string;
  type?: string;
  slug?: string | null;
  events: number;
};

/** Strip trailing brand suffixes so root title template does not become "X | Дайбилет | Дайбилет". */
export function pageTitle(title: string): string {
  return String(title || '')
    .replace(/\s*[|—-]\s*Дайбилет\s*$/i, '')
    .trim();
}

/** Enrich home meta description with live city event counts (ISR/cache-friendly). */
export function buildHomeSeoDescription(
  destinations: DestinationLike[],
  opts?: { limit?: number },
): string {
  const limit = opts?.limit ?? 4;
  const cities = destinations.filter((item) => item.type === 'city' && Number(item.events) > 0);
  const bySlug = new Map(
    cities
      .filter((city) => city.slug)
      .map((city) => [String(city.slug).toLowerCase(), city] as const),
  );

  const picked: DestinationLike[] = [];
  for (const slug of HOME_SEO_CITY_SLUGS) {
    const city = bySlug.get(slug);
    if (city) picked.push(city);
    if (picked.length >= limit) break;
  }

  if (picked.length < limit) {
    const used = new Set(picked.map((city) => String(city.slug || '').toLowerCase()));
    const rest = [...cities]
      .filter((city) => !used.has(String(city.slug || '').toLowerCase()))
      .sort((a, b) => b.events - a.events || a.name.localeCompare(b.name, 'ru'));
    for (const city of rest) {
      picked.push(city);
      if (picked.length >= limit) break;
    }
  }

  if (!picked.length) return HOME_SEO_DESCRIPTION_FALLBACK;

  const counts = picked.map((city) => `${city.name} — ${city.events}`).join(', ');
  return `Билеты на экскурсии и события: ${counts}. Афиша музеев и мероприятий по городам России.`;
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
