import type { Readiness } from './common.js';

export type ListingHealthEntityType = 'EVENT' | 'VENUE' | 'ADMISSION_PRODUCT';

export type ListingHealthIssueCode =
  | 'MISSING_TITLE'
  | 'MISSING_IMAGE'
  | 'WEAK_DESCRIPTION'
  | 'MISSING_CITY'
  | 'MISSING_VENUE'
  | 'MISSING_ADDRESS'
  | 'MISSING_CATEGORY'
  | 'MISSING_SUBCATEGORY'
  | 'NO_FUTURE_SESSIONS'
  | 'MISSING_OFFER'
  | 'MISSING_PRICE'
  | 'PRICE_TOO_LOW'
  | 'MISSING_PURCHASE_ENTRY'
  | 'NOT_PLATFORM_CHECKOUT'
  | 'NOT_DAIBILET_MANAGED'
  | 'NOT_PUBLISHED'
  | 'NO_EVENTS'
  | 'NO_ADMISSION_PRODUCTS'
  | 'MISSING_SUPPLIER'
  | 'SUPPLIER_NOT_ACTIVE'
  | 'SALES_NOT_STARTED'
  | 'SALES_CLOSED'
  | 'VALIDITY_NOT_STARTED'
  | 'VALIDITY_EXPIRED'
  | 'MISSING_VALID_DAYS'
  | 'NO_TICKETS_LEFT';

export type ListingHealthIssueSeverity = 'low' | 'medium' | 'high';

export interface ListingHealthIssueDto {
  code: ListingHealthIssueCode | string;
  label: string;
  severity: ListingHealthIssueSeverity;
  penalty: number;
}

export interface ListingHealthDto {
  entityType: ListingHealthEntityType;
  status: Readiness;
  score: number;
  canPublish: boolean;
  canSell: boolean;
  blockers: ListingHealthIssueDto[];
  warnings: ListingHealthIssueDto[];
  generatedAt: string;
}
