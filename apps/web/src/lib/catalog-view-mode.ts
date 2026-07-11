export type CatalogViewMode = 'cards' | 'list' | 'table';

export const CATALOG_VIEW_MODE_STORAGE_KEY = 'catalog:viewMode';

export function parseCatalogViewMode(value?: string | null): CatalogViewMode {
  if (value === 'list' || value === 'table') return value;
  return 'cards';
}

export function readStoredCatalogViewMode(): CatalogViewMode | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(CATALOG_VIEW_MODE_STORAGE_KEY);
    return stored ? parseCatalogViewMode(stored) : null;
  } catch {
    return null;
  }
}

export function storeCatalogViewMode(mode: CatalogViewMode) {
  try {
    window.localStorage.setItem(CATALOG_VIEW_MODE_STORAGE_KEY, mode);
  } catch {
    // ignore
  }
}

const CATEGORY_EMOJI: Record<string, string> = {
  Экскурсии: '🚌',
  Речные: '⛴️',
  Концерты: '🎵',
  Детям: '🧒',
};

export function categoryEmoji(name: string): string {
  return CATEGORY_EMOJI[name] || '🎫';
}
