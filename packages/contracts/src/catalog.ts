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
    tags?: FacetCount[];
    catalogLists?: Array<CatalogListLabel & { events: number }>;
    landings: Array<{ slug: string; title: string; events: number }>;
    priceSteps: number[];
  };
  sources: {
    admissionsAvailable: boolean;
  };
}

export type AdmissionProductTypeDto =
  | 'MUSEUM_ENTRY'
  | 'GALLERY_ENTRY'
  | 'ART_SPACE_ENTRY'
  | 'EXHIBITION_ENTRY'
  | 'OBSERVATION_ENTRY'
  | 'PARK_ENTRY'
  | 'ATTRACTION_ENTRY'
  | 'ZOO_ENTRY'
  | 'AQUARIUM_ENTRY'
  | 'COMPLEX_ENTRY'
  | 'OTHER';

export type AdmissionValidityModeDto = 'OPEN_DATE' | 'FIXED_WINDOW' | 'VALID_DAYS_AFTER_PURCHASE';

export interface AdminAdmissionProductDto {
  id: string;
  slug: string;
  title: string;
  type: AdmissionProductTypeDto;
  status: string;
  categoryId: string | null;
  category: { id: string; slug: string; title: string } | null;
  primarySubcategoryId: string | null;
  primarySubcategory: { id: string; slug: string; title: string; categoryId: string } | null;
  validityMode: AdmissionValidityModeDto;
  validFrom: string | null;
  validTo: string | null;
  validDaysAfterPurchase: number | null;
  salesStartsAt: string | null;
  salesEndsAt: string | null;
  city: { title: string; slug: string } | null;
  venue: { title: string; slug: string };
  updatedAt: string;
}

export interface AdminAdmissionProductsListDto {
  items: AdminAdmissionProductDto[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  categories: Array<{ id: string; slug: string; title: string }>;
  subcategories: Array<{ id: string; slug: string; title: string; categoryId: string }>;
}

export interface AdminAdmissionClassificationPatchDto {
  type: AdmissionProductTypeDto;
  categoryId: string | null;
  primarySubcategoryId: string | null;
  validityMode: AdmissionValidityModeDto;
  validFrom: string | null;
  validTo: string | null;
  validDaysAfterPurchase: number | null;
  salesStartsAt: string | null;
  salesEndsAt: string | null;
}
