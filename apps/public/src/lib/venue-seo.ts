import { API_BASE_URL } from '@/lib/api-base';
import type { PublicVenuePage } from '@/types';

const SITE_ORIGIN = typeof window !== 'undefined' ? window.location.origin : 'https://daibilet.ru';

function setMetaTag(name: string, content: string) {
  const attr = name.startsWith('og:') || name.startsWith('twitter:') ? 'property' : 'name';
  let element = document.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attr, name);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function setCanonical(path: string) {
  const href = path.startsWith('http') ? path : `${SITE_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
  let element = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!element) {
    element = document.createElement('link');
    element.rel = 'canonical';
    document.head.appendChild(element);
  }
  element.href = href;
}

function absoluteImageUrl(image?: string | null): string | null {
  if (!image) return null;
  if (/^https?:\/\//i.test(image)) return image;
  return `${SITE_ORIGIN}${image.startsWith('/') ? image : `/${image}`}`;
}

export function applyVenueSeo(payload: PublicVenuePage) {
  const venue = payload.venue;
  const title = venue.seoTitle || `${venue.name}: афиша и билеты | Дайбилет`;
  const description =
    venue.seoDescription ||
    venue.shortDescription ||
    venue.description ||
    `${venue.name}: события, расписание и билеты.`;
  const canonicalPath =
    venue.canonicalPath ||
    `${venue.template === 'location' ? '/locations' : '/venues'}/${venue.slug}`;
  const image = absoluteImageUrl(venue.heroImageUrl);

  document.title = title;
  setMetaTag('description', description);
  setMetaTag('robots', venue.isIndexable === false ? 'noindex, nofollow' : 'index, follow');
  setCanonical(canonicalPath);

  setMetaTag('og:type', 'website');
  setMetaTag('og:title', title);
  setMetaTag('og:description', description);
  setMetaTag('og:url', `${SITE_ORIGIN}${canonicalPath}`);
  if (image) setMetaTag('og:image', image);

  setMetaTag('twitter:card', image ? 'summary_large_image' : 'summary');
  setMetaTag('twitter:title', title);
  setMetaTag('twitter:description', description);
  if (image) setMetaTag('twitter:image', image);
}

export async function prefetchVenueSocialMeta(slug: string) {
  if (typeof window === 'undefined' || !slug) return;
  try {
    const response = await fetch(`${API_BASE_URL}/api/public/venues/${encodeURIComponent(slug)}`, {
      credentials: 'same-origin',
    });
    if (!response.ok) return;
    const payload = (await response.json()) as PublicVenuePage | null;
    if (payload?.venue) applyVenueSeo(payload);
  } catch {
    // ignore prefetch failures
  }
}
