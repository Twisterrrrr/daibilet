import type { PublicSession } from '@/types';

const CACHE_KEY = 'daibilet:catalog-default';
const CACHE_TTL_MS = 5 * 60 * 1000;

type CatalogFacetItem = { name: string; events: number };
type LandingFacet = { slug: string; title: string; events: number };

export type CachedCatalogResponse = {
  total: number;
  offset: number;
  limit: number;
  items: PublicSession[];
  facets?: {
    cities?: CatalogFacetItem[];
    categories?: CatalogFacetItem[];
    subcategories?: CatalogFacetItem[];
    tags?: CatalogFacetItem[];
    landings?: LandingFacet[];
    priceSteps?: number[];
  };
};

type CachedCatalogPage = {
  savedAt: string;
  payload: CachedCatalogResponse;
};

export function readCachedCatalogPage(): CachedCatalogResponse | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedCatalogPage;
    if (!parsed?.payload?.items) return null;
    if (Date.now() - Date.parse(parsed.savedAt || '') > CACHE_TTL_MS) return null;
    return parsed.payload;
  } catch {
    return null;
  }
}

export function writeCachedCatalogPage(payload: CachedCatalogResponse): void {
  try {
    const entry: CachedCatalogPage = {
      savedAt: new Date().toISOString(),
      payload,
    };
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // Private browsing or quota exceeded — ignore.
  }
}
