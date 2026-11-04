export type CatalogViewMode = 'cards' | 'list' | 'table';

export const CATALOG_VIEW_MODE_STORAGE_KEY = 'catalog:viewMode';

export function parseCatalogViewMode(value?: string | null): CatalogViewMode {
  if (value === 'list' || value === 'table') return value;
  // legacy alias from older Vite catalog
  if (value === 'grid' || value === 'cards') return 'cards';
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

/** Пиктограммы чипов категорий каталога — уникальные на каждую топ-категорию. */
const CATEGORY_EMOJI: Record<string, string> = {
  Экскурсии: '🚌',
  'Музеи и арт': '🏛',
  Музеи: '🏛',
  Залы: '🏛',
  Мероприятия: '🎭',
  Развлечения: '🎡',
  'Активный отдых': '🏃',
  Речные: '⛴️',
  'Речные прогулки': '⛴️',
  Концерты: '🎵',
  Выставки: '🖼',
  Театры: '🎪',
  Детям: '🧒',
};

export function categoryEmoji(name: string): string {
  const key = String(name || '').trim();
  return CATEGORY_EMOJI[key] || '✨';
}
