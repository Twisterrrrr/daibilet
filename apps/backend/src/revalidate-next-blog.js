/**
 * POST to Next internal revalidate for arbitrary tags/paths.
 * Optional `slug` → Next adds `event-page:{slug}` tag + `/events/{slug}` path.
 */
export async function revalidateNextPaths({ tags = [], paths = [], slug, reason = 'manual' } = {}) {
  const secret = process.env.DAIBILET_NEXT_REVALIDATE_SECRET?.trim();
  const base = (process.env.DAIBILET_WEB_REVALIDATE_URL || 'http://127.0.0.1:3001').replace(/\/$/, '');

  if (!secret) {
    console.warn('[revalidate-next] DAIBILET_NEXT_REVALIDATE_SECRET missing - skip');
    return { ok: false, skipped: true, reason: 'missing_secret' };
  }

  const body = { tags, paths };
  const eventSlug = String(slug || '').trim();
  if (eventSlug) body.slug = eventSlug;

  const response = await fetch(`${base}/api/internal/revalidate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.warn(`[revalidate-next] HTTP ${response.status} (${reason}):`, payload);
    return { ok: false, status: response.status, payload, reason };
  }

  console.log(`[revalidate-next] OK (${reason}):`, payload);
  return { ok: true, payload, reason };
}

/**
 * Invalidate a single public event page (DTO + ISR HTML).
 * Prefer this after admin override / price-sensitive updates.
 */
export async function revalidateNextEventPage({ slug, reason = 'event update' } = {}) {
  const eventSlug = String(slug || '').trim();
  const tags = ['event-page', 'catalog-page'];
  const paths = ['/events'];
  if (eventSlug) {
    tags.push(`event-page:${eventSlug}`);
    paths.push(`/events/${encodeURIComponent(eventSlug)}`);
  }
  return revalidateNextPaths({ tags, paths, slug: eventSlug || undefined, reason });
}

/**
 * Bust long-TTL destinations Data Cache (SiteLayout /cities) after admin city edits.
 * Tags match `getCachedDestinations` (`destinations` + `public-surfaces`).
 */
export async function revalidateNextDestinations({ reason = 'city update' } = {}) {
  return revalidateNextPaths({
    tags: ['destinations', 'public-surfaces', 'home-page'],
    paths: ['/', '/cities'],
    reason,
  });
}

export async function revalidateNextBlogArticle({
  slug,
  previousSlug,
  citySlug,
  reason = 'article update',
} = {}) {
  const paths = new Set(['/blog']);
  if (slug) paths.add(`/blog/${slug}`);
  if (previousSlug && previousSlug !== slug) paths.add(`/blog/${previousSlug}`);

  const city = String(citySlug || '').trim().toLowerCase();
  if (city === 'saint-petersburg' || city === 'sankt-peterburg') {
    paths.add('/cities/sankt-peterburg');
    paths.add('/cities/saint-petersburg');
  } else if (city === 'moscow' || city === 'moskva') {
    paths.add('/cities/moscow');
    paths.add('/cities/moskva');
  } else if (city === 'kazan') {
    paths.add('/cities/kazan');
  } else if (city) {
    paths.add(`/cities/${city}`);
  }

  return revalidateNextPaths({
    tags: ['articles', 'blog-page'],
    paths: [...paths],
    reason,
  });
}
