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

/**
 * Home / root title. Descriptive part first, brand last.
 *
 * Was `Дайбилет - экскурсии, музеи и мероприятия в городах России`, which put
 * the brand ahead of a dash. That reads as "brand + optional suffix", and for a
 * brand query such as "дай билет" Google served the site as just `Дайбилет`,
 * dropping everything after the dash. Leading with the keywords and using the
 * same `| Дайбилет` separator as the site-wide title template makes the
 * descriptive half the primary signal. 57 chars, fits one line on desktop.
 */
export const HOME_SEO_TITLE = 'Экскурсии, музеи и мероприятия в городах России | Дайбилет';

/** Static fallback (layout / build without destinations) - no hardcoded city counts. */
export const HOME_SEO_DESCRIPTION_FALLBACK =
  'Купите билеты на экскурсии, музеи и мероприятия онлайн. Афиша городов России на Дайбилет.';

/** Hub `/places` - dense Yandex snippet; never empty, never footer scrap. */
export const PLACES_HUB_DESCRIPTION =
  'Каталог мест Дайбилет: музеи, театры, концертные залы, парки, набережные, памятники и точки сбора по городам России. Смотрите афишу, покупайте билеты и собирайте маршрут на один день.';

/** Hub `/events` - unique vs places/home; filters canonical here, not to `/`. */
export const EVENTS_HUB_DESCRIPTION =
  'Афиша событий Дайбилет: экскурсии, музеи, концерты и билеты онлайн более чем в 100 городах России. Выберите город, дату и формат - купите электронный билет без очереди.';

/** Hub `/blog` listing. */
export const BLOG_HUB_DESCRIPTION =
  'Статьи по концертам, театру и городским прогулкам. Как выбрать билет, куда пойти с детьми, что смотреть на этой неделе.';

/** Default indexable robots for public hubs (home/blog/places/events). */
export const INDEX_FOLLOW_ROBOTS = { index: true, follow: true } as const;

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
 * Home meta description.
 *
 * Was: `Купите билеты на экскурсии, музеи и мероприятия онлайн: Москва - 852,
 * Санкт-Петербург - 877, Казань - 48, Екатеринбург - 90. Афиша городов России
 * на Дайбилет.`
 *
 * Two problems with that. The four per-city event counts ate ~40% of the
 * snippet, and Google cut the description right after the last number - so the
 * brand and the actual value proposition fell outside the visible snippet and
 * the user saw a list of integers. The counts also came from the destinations
 * cache, so the description changed on every catalog sync, the same daily-churn
 * defect the listing titles had.
 *
 * One live number is worth keeping: how many cities actually have events. It is
 * real scale, it barely moves, and it is short. Everything else is static.
 */
export function buildHomeSeoDescription(destinations: DestinationLike[]): string {
  const cityCount = new Set(
    destinations
      .filter((item) => item.type === 'city' && item.slug && Number(item.events) > 0)
      .map((item) => String(item.slug).toLowerCase()),
  ).size;

  if (cityCount <= 0) return HOME_SEO_DESCRIPTION_FALLBACK;

  return (
    `Купите билеты на экскурсии, музеи, концерты и теплоходы в ${cityCount} ` +
    // Plain hyphens only: ensureSeoDescription() rewrites en/em dashes, so an
    // em dash here would not survive to the served meta description.
    'городах России. Свежая афиша, честные цены и электронные билеты - покупайте онлайн на Дайбилет.'
  );
}

export function absoluteUrl(pathname: string): string {
  const value = String(pathname || '').trim();
  if (!value) return SITE_URL;
  if (/^https?:\/\//i.test(value)) return value;
  const path = value.startsWith('/') ? value : `/${value}`;
  return new URL(path, `${SITE_URL}/`).toString();
}

/**
 * Absolute https canonical for metadata.alternates.
 * Catalog hubs must pass a clean pathname (`/places`, `/events`) - never `/`.
 */
export function canonicalHref(pathname: string): string {
  return absoluteUrl(pathname);
}

/** Never emit empty meta description (Yandex falls back to footer scrap). */
export function ensureSeoDescription(value: string | null | undefined, fallback: string): string {
  const text = String(value || '')
    .replace(/[\u2013\u2014]/g, '-')
    .trim();
  if (text) return text;
  return String(fallback || '')
    .replace(/[\u2013\u2014]/g, '-')
    .trim();
}

/** Filter-page fallback when city is known but listing copy is empty. */
export function placesCityDescriptionFallback(cityPrepositional: string): string {
  const city = String(cityPrepositional || '').trim();
  if (!city) return PLACES_HUB_DESCRIPTION;
  return `Каталог интересных мест и достопримечательностей в ${city}: музеи, театры, парки и площадки. Афиша, билеты и маршруты на один день на Дайбилет.`;
}

export function eventsCityDescriptionFallback(cityPrepositional: string): string {
  const city = String(cityPrepositional || '').trim();
  if (!city) return EVENTS_HUB_DESCRIPTION;
  return `Афиша событий в ${city}: экскурсии, музеи, концерты и развлечения. Даты, площадки и электронные билеты на Дайбилет.`;
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
