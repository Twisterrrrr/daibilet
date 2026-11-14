export function blogCoverUrl(slug: string): string {
  return `/images/blog/${slug}.jpg`;
}

export function blogOgUrl(slug: string): string {
  return `/images/blog/${slug}-og.jpg`;
}

/**
 * Listing cards (/blog, home, city hub): prefer existing 1200x630 *-og.jpg (~150KB).
 * Article page keeps full `{slug}.jpg` cover. Missing og: caller falls back to cover.
 */
export function resolveBlogCardImage(input: {
  slug?: string | null;
  coverImageUrl?: string | null;
}): string | null {
  const slug = String(input.slug || '').trim();
  const cover = String(input.coverImageUrl || '').trim();
  if (slug) return blogOgUrl(slug);
  if (!cover) return null;
  if (/-og\.(jpe?g|png|webp)$/i.test(cover)) return cover;
  const mapped = cover.replace(
    /\/images\/blog\/([^/?#]+)\.(jpe?g|png|webp)$/i,
    '/images/blog/$1-og.jpg',
  );
  return mapped || cover;
}
