import type { Metadata } from 'next';

function siteOrigin(): string {
  return (
    process.env.DAIBILET_SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://daibilet.ru'
  ).replace(/\/+$/, '');
}

const SITE_URL = siteOrigin();

export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;
export const OG_IMAGE_TYPE = 'image/jpeg';

/** Relative path on disk (apps/public/public + synced web/public). */
export const DEFAULT_OG_IMAGE_PATH = '/images/og/default-og.jpg';

/** Site-wide OG fallback. Absolute JPEG 1200x630 - never the 2.5MB home-hero selfie. */
export const DEFAULT_OG_IMAGE = `${SITE_URL}${DEFAULT_OG_IMAGE_PATH}`;

/** Blog index share preview (distinct from per-article *-og.jpg). */
export const BLOG_LIST_OG_IMAGE = '/images/blog/blog-hero-promo.jpg';

const DEFAULT_OG_ALT = 'Дайбилет';

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

export type OgImageDescriptor = {
  url: string;
  secureUrl: string;
  width: number;
  height: number;
  type: string;
  alt: string;
};

export type OpenGraphMediaTags = {
  url: string;
  images: OgImageDescriptor[];
  twitterCard: 'summary_large_image';
  twitterImages: string[];
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
  if (!value) return SITE_URL;
  if (/^https?:\/\//i.test(value)) return value;
  const path = value.startsWith('/') ? value : `/${value}`;
  return new URL(path, `${SITE_URL}/`).toString();
}

function sanitizeOgAlt(alt?: string | null): string {
  const value = String(alt || DEFAULT_OG_ALT)
    .replace(/[\u2013\u2014]/g, '-')
    .trim();
  return value || DEFAULT_OG_ALT;
}

function toHttps(url: string): string {
  return url.replace(/^http:\/\//i, 'https://');
}

/**
 * Full OG + Twitter image pack: absolute https URL, 1200x630, image/jpeg, alt.
 * No custom path → default-og.jpg. Already-absolute URLs are kept.
 */
export function getOpenGraphMediaTags(
  customImagePath?: string | null,
  alt?: string | null,
): OpenGraphMediaTags {
  const raw = String(customImagePath || '').trim();
  const url = raw ? absoluteUrl(raw) : DEFAULT_OG_IMAGE;
  const secureUrl = toHttps(url);
  const descriptor: OgImageDescriptor = {
    url,
    secureUrl,
    width: OG_IMAGE_WIDTH,
    height: OG_IMAGE_HEIGHT,
    type: OG_IMAGE_TYPE,
    alt: sanitizeOgAlt(alt),
  };
  return {
    url,
    images: [descriptor],
    twitterCard: 'summary_large_image',
    twitterImages: [url],
  };
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
}): Pick<Metadata, 'openGraph' | 'twitter'> {
  const shareTitle = String(input.title || '').trim();
  const description = String(input.description || '').trim() || undefined;
  const url = absoluteUrl(input.path);
  const media = getOpenGraphMediaTags(input.image, shareTitle);
  const image = {
    ...media.images[0]!,
    width: input.imageWidth || media.images[0]!.width,
    height: input.imageHeight || media.images[0]!.height,
  };
  return {
    openGraph: {
      type: input.type || 'website',
      locale: 'ru_RU',
      siteName: 'Дайбилет',
      url,
      title: shareTitle,
      description,
      images: [image],
    },
    twitter: {
      card: media.twitterCard,
      title: shareTitle,
      description,
      images: media.twitterImages,
    },
  };
}
