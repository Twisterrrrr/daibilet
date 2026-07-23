import type { BlogCardDto } from './blog-utils';

export type BlogFeedCursor = {
  publishedAt: string | null;
  slug: string;
};

/** Opaque cursor: base64url(JSON). */
export function encodeBlogFeedCursor(cursor: BlogFeedCursor): string {
  const payload = JSON.stringify({
    p: cursor.publishedAt || null,
    s: cursor.slug,
  });
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(payload, 'utf8').toString('base64url');
  }
  const bytes = new TextEncoder().encode(payload);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function decodeBlogFeedCursor(raw: string | null | undefined): BlogFeedCursor | null {
  const value = String(raw || '').trim();
  if (!value) return null;
  try {
    let json: string;
    if (typeof Buffer !== 'undefined') {
      json = Buffer.from(value, 'base64url').toString('utf8');
    } else {
      const padded = value.replace(/-/g, '+').replace(/_/g, '/');
      const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
      json = atob(padded + pad);
    }
    const parsed = JSON.parse(json) as { p?: string | null; s?: string };
    const slug = String(parsed.s || '').trim();
    if (!slug) return null;
    return { publishedAt: parsed.p ?? null, slug };
  } catch {
    return null;
  }
}

function cursorKey(post: Pick<BlogCardDto, 'publishedAt' | 'slug'>): string {
  const ts = Date.parse(String(post.publishedAt || '')) || 0;
  return `${String(1e15 - ts).padStart(16, '0')}|${post.slug}`;
}

/**
 * Cursor page over an already-ranked feed (featured already excluded).
 * Cursor points at the last returned item; next page starts after it.
 */
export function paginateBlogFeedByCursor<T extends Pick<BlogCardDto, 'publishedAt' | 'slug'>>(
  posts: T[],
  options: { cursor?: string | null; limit?: number } = {},
): { items: T[]; nextCursor: string | null } {
  const limit = Math.min(Math.max(Number(options.limit) || 12, 1), 50);
  const decoded = decodeBlogFeedCursor(options.cursor);
  let start = 0;
  if (decoded) {
    const idx = posts.findIndex((post) => post.slug === decoded.slug);
    if (idx >= 0) start = idx + 1;
    else {
      const needle = cursorKey({ publishedAt: decoded.publishedAt, slug: decoded.slug });
      start = posts.findIndex((post) => cursorKey(post) > needle);
      if (start < 0) start = posts.length;
    }
  }
  const items = posts.slice(start, start + limit);
  const last = items[items.length - 1];
  const hasMore = start + items.length < posts.length;
  return {
    items,
    nextCursor:
      hasMore && last
        ? encodeBlogFeedCursor({ publishedAt: last.publishedAt || null, slug: last.slug })
        : null,
  };
}
