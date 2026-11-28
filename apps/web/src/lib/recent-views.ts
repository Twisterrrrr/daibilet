/**
 * Недавние просмотры (для блока «Просмотрено ранее» на 404 и др.).
 * Пишется только в localStorage; безопасно на SSR (no-op без window).
 */
export type RecentViewItem = {
  kind: 'city' | 'event' | 'venue';
  href: string;
  title: string;
};

const KEY = 'daibilet:recent-views';
const MAX_ITEMS = 8;

export function readRecentViews(): RecentViewItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is RecentViewItem => Boolean(item && (item as RecentViewItem).href && (item as RecentViewItem).title))
      .slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

export function rememberRecentView(item: RecentViewItem): void {
  if (typeof window === 'undefined') return;
  try {
    const list = readRecentViews().filter((existing) => existing.href !== item.href);
    list.unshift(item);
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_ITEMS)));
  } catch {
    // ignore
  }
}