import type { AdmissionProductDto } from './admission.js';
import type { PurchaseFields, Readiness, ReadinessIssue, SeoFields, Severity, SourceCode } from './common.js';
import type { ListingHealthDto } from './listing-health.js';

export interface AdminDashboardLaunchMetrics {
  groupedEvents: number;
  readyForSales: number;
  readyForSeo: number;
  needsAttention: number;
  priceBlocked: number;
  purchaseBlocked: number;
  noImage: number;
  landingMatched: number;
}

export interface AdminDashboardMetrics {
  events: number;
  sourceEvents: number;
  readyEvents: number;
  reviewEvents: number;
  blockedEvents: number;
  sources: number;
  venues: number;
  cities: number;
  categories: number;
  tags: number;
  landingRules: number;
  destinations: number;
  orders: number;
  launch: AdminDashboardLaunchMetrics;
}

export interface AdminDashboardDto {
  generatedAt: string;
  metrics: AdminDashboardMetrics;
}

export interface AdminEventRowDto extends SeoFields, PurchaseFields {
  id: string;
  slug?: string | null;
  sourceSlug?: string | null;
  groupKey?: string;
  groupEventIds?: string[];
  groupedEventsCount?: number;
  slotCount?: number;
  source: string;
  sourceCode?: SourceCode | null;
  externalId?: string | null;
  title: string;
  description?: string | null;
  categoryId?: string | null;
  primarySubcategoryId?: string | null;
  subcategoryIds?: string[];
  tagIds?: string[];
  sourceCategory: string;
  proposedCategory: string;
  city: string;
  destination: string;
  destinationType?: string | null;
  venue: string;
  venueKind: string;
  offerSourceCode?: string | null;
  offerTitle?: string | null;
  offerPriceRub?: number | null;
  eventType: string;
  startsAt?: string | null;
  ageLimit?: string | null;
  priceFrom?: number | null;
  vacant?: number | null;
  hasImage: boolean;
  imageUrl?: string | null;
  override?: AdminEventOverrideDto | null;
  tags: string[];
  landingHits: string[];
  reasons: string[];
  readinessCodes?: string[];
  readinessIssues?: ReadinessIssue[];
  moderationStatus?: 'DRAFT' | 'REVIEW' | 'READY' | 'PUBLISHED' | 'HIDDEN' | string;
  canPublish?: boolean;
  publishBlockers?: string[];
  publishWarnings?: string[];
  severity: Severity;
  readiness: Readiness;
  offerStatus: string;
  status: 'ready' | 'needs_review';
}

export interface AdminEventOverrideDto extends SeoFields {
  title?: string | null;
  description?: string | null;
  shortDescription?: string | null;
  imageUrl?: string | null;
  editorStatus?: string | null;
}

export interface AdminEventDetailDto extends AdminEventRowDto {
  sessions: Array<{
    id: string;
    startsAt?: string | null;
    endsAt?: string | null;
    sourceStatus?: string | null;
    priceFrom?: number | null;
    vacant?: number | null;
  }>;
  offers: Array<{
    id: string;
    sourceCode: SourceCode;
    title?: string | null;
    priceRub?: number | null;
    widgetUrl?: string | null;
    deeplinkUrl?: string | null;
    active: boolean;
  }>;
}

export type AdminEventScheduleLockCode =
  | 'SOURCE_MANAGED'
  | 'SCHEDULE_LOCKED';

export interface AdminEventScheduleSessionDto {
  id: string;
  startsAt?: string | null;
  endsAt?: string | null;
  sourceStatus?: string | null;
  priceFromRub?: number | null;
  ticketsVacant?: number | null;
  capacityTotal?: number | null;
  capacitySold: number;
  isActive: boolean;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  externalId?: string | null;
  hasSales: boolean;
}

export interface AdminEventScheduleOfferDto {
  id: string;
  sourceCode: SourceCode;
  title?: string | null;
  priceRub?: number | null;
  oldPriceRub?: number | null;
  capacityTotal?: number | null;
  groupSize: number;
  weekdayMask?: number | null;
  active: boolean;
}

export interface AdminEventScheduleDto {
  eventId: string;
  slug: string;
  title: string;
  kind: 'SINGLE' | 'RECURRING' | 'OPEN_DATE' | string;
  status: string;
  purchaseFlow: string;
  managementMode: string;
  scheduleLocked: boolean;
  editable: boolean;
  lockCode?: AdminEventScheduleLockCode | null;
  lockReason?: string | null;
  defaultCapacityTotal?: number | null;
  openDate: {
    validFrom?: string | null;
    validTo?: string | null;
    validDays?: number | null;
  };
  salesPolicy: {
    startsAt?: string | null;
    endsAt?: string | null;
  };
  sessions: AdminEventScheduleSessionDto[];
  offers: AdminEventScheduleOfferDto[];
  updatedAt: string;
}

export interface AdminEventScheduleModePatchDto {
  kind?: 'SINGLE' | 'RECURRING' | 'OPEN_DATE';
  scheduleLocked?: boolean;
  defaultCapacityTotal?: number | null;
  openDateValidFrom?: string | null;
  openDateValidTo?: string | null;
  openDateValidDays?: number | null;
  salesStartsAt?: string | null;
  salesEndsAt?: string | null;
}

export interface AdminEventScheduleSessionCreateDto {
  startsAt: string;
  endsAt?: string | null;
  priceFromRub?: number | null;
  ticketsVacant?: number | null;
  capacityTotal?: number | null;
  isActive?: boolean;
}

export interface AdminEventScheduleSessionPatchDto {
  startsAt?: string;
  endsAt?: string | null;
  priceFromRub?: number | null;
  ticketsVacant?: number | null;
  capacityTotal?: number | null;
  isActive?: boolean;
  cancelReason?: string | null;
}

export interface AdminEventScheduleSessionCancelDto {
  reason?: string | null;
}

export interface AdminEventsListDto {
  generatedAt: string;
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  items: AdminEventRowDto[];
}

export interface AdminVenueRowDto extends SeoFields {
  id: string;
  name: string;
  title?: string;
  slug?: string;
  city: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  metroStation?: string | null;
  wayToFind?: string | null;
  parkingInfo?: string | null;
  description?: string | null;
  shortDescription?: string | null;
  heroImageUrl?: string | null;
  kind?: string;
  proposedKind: string;
  pageStatus: string;
  reason: string;
  events: number;
}

export interface AdminCityRowDto {
  id: string;
  slug: string;
  title: string;
  type: 'city' | 'region' | string;
  events: number;
  venues: number;
  categories?: Record<string, number>;
}

export interface AdminTaxonomyDto {
  categories: Array<{ id: string; slug: string; title: string }>;
  subcategories: Array<{ id: string; slug: string; title: string; categoryId: string }>;
  tags: Array<{ id: string; slug: string; title: string }>;
}

export interface AdminEventChangeRequestActorDto {
  id: string;
  email: string;
  name?: string | null;
}

export interface AdminEventChangeRequestEventDto {
  id: string;
  title: string;
  slug: string;
  status: string;
  managementMode: string;
  scheduleLocked: boolean;
  updatedAt: string;
}

export interface AdminEventChangeRequestSupplierDto {
  id: string;
  title: string;
  slug: string;
  status: string;
}

export interface AdminEventChangeRequestActionsDto {
  canApprove: boolean;
  canReject: boolean;
  canApply: boolean;
}

export interface AdminEventChangeRequestRowDto {
  id: string;
  eventId?: string | null;
  supplierId?: string | null;
  type: string;
  status: string;
  title?: string | null;
  summary?: string | null;
  adminComment?: string | null;
  payloadKeys: string[];
  submittedAt?: string | null;
  reviewedAt?: string | null;
  appliedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  event?: AdminEventChangeRequestEventDto | null;
  supplier?: AdminEventChangeRequestSupplierDto | null;
  createdBy?: AdminEventChangeRequestActorDto | null;
  reviewedBy?: AdminEventChangeRequestActorDto | null;
  actions: AdminEventChangeRequestActionsDto;
}

export interface AdminEventChangeRequestsListDto {
  generatedAt: string;
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  filters: {
    status?: string | null;
    type?: string | null;
    supplierId?: string | null;
    eventId?: string | null;
    q?: string | null;
  };
  facets: {
    statuses: Record<string, number>;
    types: Record<string, number>;
  };
  items: AdminEventChangeRequestRowDto[];
}

export interface AdminEventChangeRequestDiffItemDto {
  path: string;
  label: string;
  currentValue?: unknown;
  proposedValue?: unknown;
  changeType: 'added' | 'changed' | 'removed' | 'unchanged';
}

export interface AdminEventChangeRequestPayloadPreviewSectionDto {
  id: string;
  title: string;
  kind: string;
  value: unknown;
}

export interface AdminEventChangeRequestDetailDto extends AdminEventChangeRequestRowDto {
  payloadPreview: {
    baseSnapshot?: Record<string, unknown> | null;
    sections: AdminEventChangeRequestPayloadPreviewSectionDto[];
  };
  diff: {
    items: AdminEventChangeRequestDiffItemDto[];
    warnings: string[];
  };
}

export interface AdminEventChangeRequestActionDto {
  requestId: string;
  status: string;
  reviewedAt?: string | null;
  appliedAt?: string | null;
  logAction?: string | null;
  noOp?: boolean;
}

export interface AdminReviewEventDto {
  id: string;
  title: string;
  slug: string;
}

export interface AdminReviewRowDto {
  id: string;
  rating: number;
  title?: string | null;
  text: string;
  authorName: string;
  authorEmail: string;
  isVerified: boolean;
  status: string;
  adminComment?: string | null;
  purchaseRef?: string | null;
  createdAt: string;
  publishedAt?: string | null;
  event?: AdminReviewEventDto | null;
  externalOrder?: {
    id: string;
    publicCode?: string | null;
    externalOrderId: string;
    status: string;
    purchasedAt?: string | null;
  } | null;
}

export interface AdminReviewsListDto {
  items: AdminReviewRowDto[];
  total: number;
  page: number;
  pages: number;
  pendingCount: number;
}

export type AdminSupplierReadinessCode =
  | 'SUPPLIER_NOT_ACTIVE'
  | 'MISSING_OWNER_USER'
  | 'MISSING_LEGAL_PROFILE'
  | 'LEGAL_PROFILE_NOT_VERIFIED'
  | 'MISSING_PRIMARY_BANK_ACCOUNT'
  | 'MISSING_COMMISSION_RULE'
  | 'MISSING_YOOKASSA_SHOP'
  | 'NO_INTERNAL_CHECKOUT_EVENTS';

export interface AdminSupplierReadinessDto {
  status: Readiness;
  canEnableInternalCheckout: boolean;
  blockers: ReadinessIssue[];
  warnings: ReadinessIssue[];
}

export interface AdminSupplierEventsSummaryDto {
  total: number;
  active: number;
  published: number;
  internalCheckout: number;
  hybrid: number;
  widgetOnly: number;
  sourceManaged: number;
  daibiletManaged: number;
  supplierDrafts: number;
  supplierSelfService: number;
}

export interface AdminSupplierAdmissionsSummaryDto {
  total: number;
  published: number;
  platform: number;
  canSell: number;
  needsAttention: number;
}

export interface AdminSupplierOrdersSummaryDto {
  totalItems: number;
  reserved: number;
  confirmed: number;
  fulfilled: number;
  cancelled: number;
  refunded: number;
  grossKopecks: number;
  commissionKopecks: number;
}

export interface AdminSupplierFinanceSummaryDto {
  ledgerBalanceKopecks: number;
  saleKopecks: number;
  commissionKopecks: number;
  refundKopecks: number;
  payoutKopecks: number;
  pendingPayoutsKopecks: number;
  paidPayoutsKopecks: number;
  openRefundRequests: number;
  openDisputes: number;
}

export interface AdminSupplierReviewSummaryDto {
  total: number;
  pendingModeration: number;
  approved: number;
  hidden: number;
  averageRating?: number | null;
}

export interface AdminSupplierLegalSummaryDto {
  status?: string | null;
  legalName?: string | null;
  inn?: string | null;
  taxMode?: string | null;
  isVatPayer?: boolean | null;
  hasPrimaryBankAccount: boolean;
}

export interface AdminSupplierRowDto {
  id: string;
  slug: string;
  title: string;
  legalName?: string | null;
  kind: string;
  status: string;
  email?: string | null;
  phone?: string | null;
  websiteUrl?: string | null;
  integrationMode: string;
  defaultCatalogMode: string;
  paymentMode: string;
  pspFeeMode: string;
  defaultCommissionBps: number;
  yookassaShopId?: string | null;
  usersCount: number;
  ownerUsersCount: number;
  legal: AdminSupplierLegalSummaryDto;
  events: AdminSupplierEventsSummaryDto;
  admissions: AdminSupplierAdmissionsSummaryDto;
  orders: AdminSupplierOrdersSummaryDto;
  finance: AdminSupplierFinanceSummaryDto;
  reviews: AdminSupplierReviewSummaryDto;
  readiness: AdminSupplierReadinessDto;
  createdAt: string;
  updatedAt: string;
}

export interface AdminSuppliersListDto {
  generatedAt: string;
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  filters: {
    q?: string | null;
    status?: string | null;
  };
  metrics: {
    total: number;
    active: number;
    review: number;
    draft: number;
    paused: number;
    checkoutReady: number;
    needsAttention: number;
  };
  items: AdminSupplierRowDto[];
}

export interface AdminSupplierDetailDto extends AdminSupplierRowDto {
  users: Array<{
    id: string;
    role: string;
    isActive: boolean;
    email?: string | null;
    name?: string | null;
    acceptedAt?: string | null;
  }>;
  commissionRules: Array<{
    id: string;
    scope: string;
    title?: string | null;
    percentBps: number;
    fixedFeeKopecks: number;
    priority: number;
    startsAt?: string | null;
    endsAt?: string | null;
    isActive: boolean;
  }>;
  eventsSample: Array<{
    id: string;
    slug: string;
    title: string;
    status: string;
    purchaseFlow: string;
    managementMode: string;
    priceFromRub?: number | null;
  }>;
  admissionProductsSample: AdmissionProductDto[];
  recentLedgerEntries: Array<{
    id: string;
    type: string;
    amountKopecks: number;
    note?: string | null;
    createdAt: string;
  }>;
}

export interface AdminListingHealthOverviewDto {
  generatedAt: string;
  metrics: {
    total: number;
    ready: number;
    review: number;
    blocked: number;
    averageScore: number;
  };
  items: Array<{
    entityType: 'EVENT' | 'VENUE' | 'ADMISSION_PRODUCT';
    entityId: string;
    title: string;
    slug: string | null;
    health: ListingHealthDto;
  }>;
}
