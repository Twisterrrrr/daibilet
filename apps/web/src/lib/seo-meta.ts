const SITE_URL = process.env.DAIBILET_SITE_URL || 'https://daibilet.ru';

/** Site-wide OG fallback when a page has no dedicated share image (1200×630 hero). */
export const DEFAULT_OG_IMAGE = '/images/hero/home-hero-friends-selfie.jpg';

/** Blog index share preview (distinct from per-article *-og.jpg). */
export const BLOG_LIST_OG_IMAGE = '/images/blog/blog-hero-promo.jpg';

/** Default home / root title - keep ≤~60–70 chars for SERP; no live counts. */
export const HOME_SEO_TITLE =
  'Дайбилет - экскурсии, музеи и мероприятия в городах России';

/** Static fallback (layout / build without destinations) - no hardcoded city counts. */
export const HOME_SEO_DESCRIPTION_FALLBACK =
  'Купите билеты на экскурсии, музеи и мероприятия онлайн. Афиша городов России на Дайбилет.';

/** Fixed hubs + display names for home meta description. */
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
 * Lead with purchase CTA - never with middleman / widget disclaimer.
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
    parts.push(`${hub.label} - ${count}`);
  }

  if (!parts.length) return HOME_SEO_DESCRIPTION_FALLBACK;

  return `Купите билеты на экскурсии, музеи и мероприятия онлайн: ${parts.join(', ')}. Афиша городов России на Дайбилет.`;
}

export function absoluteUrl(pathname: string): string {
  const value = String(pathname || '').trim();
  if (!value) return SITE_URL.replace(/\/+$/, '');
  if (/^https?:\/\//i.test(value)) return value;
  const path = value.startsWith('/') ? value : `/${value}`;
  return new URL(path, SITE_URL).toString();
}

export function routeOpenGraph(pathname: string, extras: Record<string, unknown> = {}) {
  return {
    url: absoluteUrl(pathname),
    ...extras,
  };
}

/** Единый пакет OG + Twitter, чтобы twitter не наследовал title/description главной. */
export function buildShareMetadata(input: {
  title: string;
  description?: string | null;
  path: string;
  image?: string | null;
  /** Optional OG pixel size (Telegram / FB scrapers prefer explicit dims). */
  imageWidth?: number;
  imageHeight?: number;
  type?: 'website' | 'article';
}): Pick<import('next').Metadata, 'openGraph' | 'twitter'> {
  const shareTitle = String(input.title || '').trim();
  const description = String(input.description || '').trim() || undefined;
  const url = absoluteUrl(input.path);
  const imagePath = input.image || DEFAULT_OG_IMAGE;
  const image = absoluteUrl(imagePath);
  return {
    openGraph: {
      type: input.type || 'website',
      locale: 'ru_RU',
      siteName: 'Дайбилет',
      url,
      title: shareTitle,
      description,
      images: [
        {
          url: image,
          secureUrl: image,
          alt: shareTitle,
          ...(input.imageWidth ? { width: input.imageWidth } : {}),
          ...(input.imageHeight ? { height: input.imageHeight } : {}),
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: shareTitle,
      description,
      images: [image],
    },
  };
}
