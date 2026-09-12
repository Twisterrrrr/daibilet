import { transliterateSlug } from './routes.ts';

/**
 * Cyrillic `/events/{slug}` → latin CHPU.
 * Do this in middleware: `permanentRedirect()` inside the ISR event page
 * (`revalidate`) surfaces as HTTP 500 + Location (live Pianissimo 2026-09-03).
 */
export function cyrillicEventRedirectPath(pathname: string): string | null {
  const match = String(pathname || '')
    .replace(/\/+$/, '')
    .match(/^\/events\/([^/]+)$/);
  if (!match?.[1]) return null;

  let slug = match[1];
  try {
    slug = decodeURIComponent(slug);
  } catch {
    // keep raw segment
  }
  if (!/[а-яё]/i.test(slug)) return null;

  const latin = transliterateSlug(slug);
  if (!latin || latin === slug) return null;
  return `/events/${latin}`;
}
