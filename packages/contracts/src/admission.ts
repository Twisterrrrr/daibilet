import type { ReadinessIssue } from './common.js';
import type { ListingHealthDto } from './listing-health.js';

export type AdmissionProductType =
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

export type AdmissionValidityMode = 'OPEN_DATE' | 'FIXED_WINDOW' | 'VALID_DAYS_AFTER_PURCHASE';

export type AdmissionProductReadinessCode =
  | 'MISSING_VENUE'
  | 'MISSING_SUPPLIER'
  | 'SUPPLIER_NOT_ACTIVE'
  | 'NOT_PLATFORM_CHECKOUT'
  | 'NOT_DAIBILET_MANAGED'
  | 'MISSING_OFFER'
  | 'MISSING_PRICE'
  | 'PRICE_TOO_LOW'
  | 'SALES_NOT_STARTED'
  | 'SALES_CLOSED'
  | 'VALIDITY_NOT_STARTED'
  | 'VALIDITY_EXPIRED'
  | 'MISSING_VALID_DAYS'
  | 'NO_TICKETS_LEFT';

export interface AdmissionOfferDto {
  id: string;
  title: string | null;
  priceRub: number | null;
  oldPriceRub: number | null;
  active: boolean;
  capacityTotal: number | null;
  groupSize: number;
}

export interface AdmissionProductDto {
  id: string;
  slug: string;
  title: string;
  shortTitle: string | null;
  type: AdmissionProductType;
  status: string;
  purchaseFlow: string;
  managementMode: string;
  validityMode: AdmissionValidityMode;
  validFrom: string | null;
  validTo: string | null;
  validDaysAfterPurchase: number | null;
  salesStartsAt: string | null;
  salesEndsAt: string | null;
  priceFromRub: number | null;
  ticketsVacant: number | null;
  city: {
    id: string | null;
    slug: string | null;
    title: string | null;
  };
  venue: {
    id: string;
    slug: string;
    title: string;
    kind: string;
  };
  supplier: {
    id: string | null;
    slug: string | null;
    title: string | null;
    status: string | null;
  };
  offers: AdmissionOfferDto[];
  readiness: AdmissionProductReadinessDto;
  health: ListingHealthDto;
}

export interface AdmissionProductReadinessDto {
  canSell: boolean;
  blockers: Array<ReadinessIssue & { code: AdmissionProductReadinessCode | string }>;
  warnings: Array<ReadinessIssue & { code: AdmissionProductReadinessCode | string }>;
}

export interface AdmissionProductsListDto {
  generatedAt: string;
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  filters: {
    q: string | null;
    status: string | null;
    supplierId: string | null;
    venueId: string | null;
    cityId: string | null;
    type: AdmissionProductType | string | null;
  };
  metrics: {
    total: number;
    published: number;
    canSell: number;
    needsAttention: number;
    blocked: number;
  };
  items: AdmissionProductDto[];
}
