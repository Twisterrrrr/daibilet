/** Public catalog page sizes (SSR default + UI selector). */
import type { CatalogListLabel, PublicCatalogListItemDto } from './public.js';
import type { FacetCount } from './common.js';

export const CATALOG_PAGE_SIZES = [50, 100, 200] as const;

export type CatalogPageSize = (typeof CATALOG_PAGE_SIZES)[number];

export const CATALOG_PAGE_SIZE_DEFAULT: CatalogPageSize = 50;

export const CATALOG_PAGE_SIZE_MAX: CatalogPageSize = 200;

export function isCatalogPageSize(value: number): value is CatalogPageSize {
  return (CATALOG_PAGE_SIZES as readonly number[]).includes(value);
}

/** Shared listing contract for the commercial catalog. Event and admission retain distinct data. */
export interface PublicAdmissionCatalogItemDto {
  productKind: 'ADMISSION';
  id: string;
  slug: string;
  href: string;
  title: string;
  shortDescription?: string | null;
  imageUrl?: string | null;
  citySlug?: string | null;
  city: string;
  venueSlug?: string | null;
  venue: string;
  admissionType: string;
  category?: { slug: string; title: string } | null;
  subcategory?: { slug: string; title: string } | null;
  /** Booking/validity is not an EventSession and must not fabricate a start time. */
  validityMode: string;
  validFrom?: string | null;
  validTo?: string | null;
  validDaysAfterPurchase?: number | null;
  salesStartsAt?: string | null;
  salesEndsAt?: string | null;
  priceFrom?: number | null;
  priceTo?: number | null;
  canSell: boolean;
  offersCount: number;
  dateLabel: string;
}

export type PublicUnifiedCatalogItemDto =
  | (PublicCatalogListItemDto & { productKind: 'EVENT'; href: string })
  | PublicAdmissionCatalogItemDto;

export interface PublicUnifiedCatalogDto {
  generatedAt: string;
  items: PublicUnifiedCatalogItemDto[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  facets: {
    cities: FacetCount[];
    categories: FacetCount[];
    subcategories: FacetCount[];
    catalogLists?: Array<CatalogListLabel & { events: number }>;
    landings: Array<{ slug: string; title: string; events: number }>;
    priceSteps: number[];
  };
}
