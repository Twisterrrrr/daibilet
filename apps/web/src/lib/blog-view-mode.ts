export type BlogViewMode = 'magazine' | 'list';

export const BLOG_VIEW_MODE_STORAGE_KEY = 'blog:viewMode';

export function parseBlogViewMode(value?: string | null): BlogViewMode {
  const raw = String(value || '')
    .trim()
    .toLowerCase();
  if (raw === 'list') return 'list';
  // aliases: grid / cards / magazine → magazine (default)
  if (raw === 'magazine' || raw === 'grid' || raw === 'cards') return 'magazine';
  return 'magazine';
}

export function readStoredBlogViewMode(): BlogViewMode | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(BLOG_VIEW_MODE_STORAGE_KEY);
    return stored ? parseBlogViewMode(stored) : null;
  } catch {
    return null;
  }
}

export function storeBlogViewMode(mode: BlogViewMode) {
  try {
    window.localStorage.setItem(BLOG_VIEW_MODE_STORAGE_KEY, mode);
  } catch {
    // ignore quota / private mode
  }
}
