import { existsSync } from 'node:fs';
import path from 'node:path';

import { DEFAULT_OG_IMAGE, absoluteUrl } from './seo-meta.ts';

/** Local public asset check - scrapers 404 on invented *-og.jpg and drop the preview. */
export function publicAssetExists(urlPath: string): boolean {
  const rel = String(urlPath || '')
    .trim()
    .replace(/^https?:\/\/[^/]+/i, '')
    .split(/[?#]/)[0]
    .replace(/^\/+/, '');
  if (!rel || rel.includes('..')) return false;
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, 'public', rel),
    path.join(cwd, 'apps', 'web', 'public', rel),
    path.join(cwd, 'apps', 'public', 'public', rel),
  ];
  return candidates.some((filePath) => existsSync(filePath));
}

/**
 * Prefer 1200x630 `/images/blog/{slug}-og.jpg` (Telegram/VK).
 * Missing file → default-og.jpg, never a 2MB cover and never a 404 image.
 */
export function resolveBlogShareImage(coverImageUrl?: string | null, slug?: string | null): string {
  const fromSlug = String(slug || '').trim();
  if (fromSlug) {
    const ogPath = `/images/blog/${fromSlug}-og.jpg`;
    if (publicAssetExists(ogPath)) return absoluteUrl(ogPath);
    return DEFAULT_OG_IMAGE;
  }
  const raw = String(coverImageUrl || '').trim();
  if (!raw) return DEFAULT_OG_IMAGE;
  if (/-og\.(jpe?g|png|webp)(\?|$)/i.test(raw)) return absoluteUrl(raw);
  if (/\/images\/blog\/[^?#]+\.(jpe?g|png|webp)(\?|$)/i.test(raw)) {
    const ogPath = raw.replace(/\/images\/blog\/([^/?#]+)\.(jpe?g|png|webp)/i, '/images/blog/$1-og.jpg');
    if (publicAssetExists(ogPath.split(/[?#]/)[0])) return absoluteUrl(ogPath);
  }
  return DEFAULT_OG_IMAGE;
}
