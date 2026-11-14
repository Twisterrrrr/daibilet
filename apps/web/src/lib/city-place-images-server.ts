import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { resolveVenueHeroImage } from './city-place-images';

/**
 * True when a local `/images/...` asset exists under Next `public/`.
 * Remote http(s) URLs are treated as present (CDN). Used so og:image never
 * advertises a conventional path that 404s (photoStatus: missing).
 *
 * Server-only helpers: import from VenuePages / metadata, never from *.client.tsx
 * (node:fs would break the client webpack bundle).
 */
export function localPublicImageExists(url: string | null | undefined): boolean {
  const value = String(url || '').trim();
  if (!value) return false;
  if (/^https?:\/\//i.test(value)) return true;
  if (!value.startsWith('/')) return false;
  const rel = value.replace(/^\/+/, '');
  const roots = [join(process.cwd(), 'public'), join(process.cwd(), 'apps/web/public')];
  try {
    return roots.some((root) => existsSync(join(root, rel)));
  } catch {
    return false;
  }
}

/**
 * Hero for cards/PDP may still point at a conventional path (SafeImage → gradient).
 * Share/OG must not emit that URL when the file is missing - fall through to default OG.
 */
export function resolveVenueShareImage(
  slug: string | null | undefined,
  hubImageUrl?: string | null,
): string | null {
  const candidate =
    resolveVenueHeroImage(slug, hubImageUrl) || String(hubImageUrl || '').trim() || null;
  if (!candidate) return null;
  // Same-origin absolute may still 404 when photoStatus is missing - check disk.
  const sameOriginPath = candidate.match(
    /^https?:\/\/(?:www\.)?daibilet\.ru(\/images\/.+)$/i,
  )?.[1];
  if (sameOriginPath) {
    return localPublicImageExists(sameOriginPath) ? sameOriginPath : null;
  }
  if (/^https?:\/\//i.test(candidate)) return candidate;
  if (localPublicImageExists(candidate)) return candidate;
  return null;
}
