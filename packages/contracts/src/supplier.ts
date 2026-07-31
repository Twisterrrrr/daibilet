import type { Readiness, ReadinessIssue } from './common.js';
import type { AdmissionProductsListDto } from './admission.js';
import type { StubCheckoutBuyerDto, StubCheckoutResultDto, YooKassaCheckoutResultDto } from './checkout.js';

export interface SupplierPortalIdentityDto {
  id: string;
  slug: string;
  title: string;
  legalName: string | null;
  status: string;
  kind: string;
  integrationMode: string;
  defaultCatalogMode: string;
  paymentMode: string;
  pspFeeMode: string;
  defaultCommissionBps: number;
  yookassaShopId: string | null;
  email: string | null;
  phone: string | null;
  websiteUrl: string | null;
}

export interface SupplierPortalUserDto {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

export interface SupplierPortalSessionSupplierDto {
  id: string;
  slug: string;
  title: string;
  status: string;
  role: string;
}

export interface SupplierPortalAuthDto {
  accessToken: string;
  user: SupplierPortalUserDto;
  suppliers: SupplierPortalSessionSupplierDto[];
  currentSupplier: SupplierPortalSessionSupplierDto;
}

export interface SupplierPortalMeDto {
  user: SupplierPortalUserDto;
  suppliers: SupplierPortalSessionSupplierDto[];
  currentSupplier: SupplierPortalSessionSupplierDto;
}

export interface SupplierPortalReadinessDto {
  status: Readiness;
  canEnableInternalCheckout: boolean;
  blockers: ReadinessIssue[];
  warnings: ReadinessIssue[];
}

export interface SupplierPortalSummaryDto {
  events: {
    total: number;
    active: number;
    published: number;
    widgetOnly: number;
    internalCheckout: number;
    hybrid: number;
    sourceManaged: number;
    daibiletManaged: number;
    supplierDrafts: number;
    supplierSelfService: number;
  };
  admissions: {
    total: number;
    published: number;
    platform: number;
    canSell: number;
    needsAttention: number;
  };
  orders: {
    totalItems: number;
    reserved: number;
    confirmed: number;
    fulfilled: number;
    cancelled: number;
    refunded: number;
    grossKopecks: number;
    commissionKopecks: number;
  };
  finance: {
    ledgerBalanceKopecks: number;
    saleKopecks: number;
    commissionKopecks: number;
    refundKopecks: number;
    payoutKopecks: number;
    pendingPayoutsKopecks: number;
    paidPayoutsKopecks: number;
    openRefundRequests: number;
    openDisputes: number;
  };
  reviews: {
    total: number;
    pendingModeration: number;
    approved: number;
    hidden: number;
    needsResponse: number;
    disputes: number;
    averageRating: number | null;
  };
}

export interface SupplierPortalEventIssueDto {
  code: string;
  label: string;
  severity: 'low' | 'medium' | 'high' | string;
}

export interface SupplierPortalEventRowDto {
  id: string;
  slug: string;
  title: string;
  status: string;
  kind: string;
  purchaseFlow: string;
  managementMode: string;
  catalogMode: string;
  sourceManaged: boolean;
  city: {
    id: string | null;
    slug: string | null;
    title: string | null;
  };
  venue: {
    id: string | null;
    slug: string | null;
    title: string | null;
  };
  priceFromRub: number | null;
  imageUrl: string | null;
  nextSessionAt: string | null;
  activeSessions: number;
  offersCount: number;
  ticketsVacant: number | null;
  canEditContent: boolean;
  canEditMedia: boolean;
  canEditSeo: boolean;
  canEditSchedule: boolean;
  canEditOffers: boolean;
  readinessIssues: SupplierPortalEventIssueDto[];
  updatedAt: string;
}

export interface SupplierPortalEventsListDto {
  generatedAt: string;
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  filters: {
    q: string | null;
    status: string | null;
  };
  items: SupplierPortalEventRowDto[];
}

export interface SupplierPortalAdmissionsListDto extends AdmissionProductsListDto {
  supplier: SupplierPortalIdentityDto;
}

export interface SupplierPortalAdmissionStubPurchaseRequestDto {
  admissionOfferId?: string | null;
  quantity?: number;
  buyer?: Partial<StubCheckoutBuyerDto> | null;
  idempotencyKey?: string | null;
}

export type SupplierPortalAdmissionStubPurchaseResultDto = StubCheckoutResultDto;

export interface SupplierPortalAdmissionYooKassaPurchaseRequestDto {
  admissionOfferId?: string | null;
  quantity?: number;
  buyer?: Partial<StubCheckoutBuyerDto> | null;
  idempotencyKey?: string | null;
  returnUrl?: string | null;
}

export type SupplierPortalAdmissionYooKassaPurchaseResultDto = YooKassaCheckoutResultDto;

export interface SupplierPortalSessionPreviewDto {
  id: string;
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  startsAt: string | null;
  endsAt: string | null;
  capacityTotal: number | null;
  capacitySold: number;
  ticketsVacant: number | null;
}

export interface SupplierPortalOrderRowDto {
  id: string;
  orderId: string;
  publicCode: string | null;
  subjectType: string;
  status: string;
  itemStatus: string;
  title: string;
  eventId: string | null;
  eventSlug: string | null;
  eventTitle: string | null;
  admissionProductId: string | null;
  admissionProductSlug: string | null;
  admissionProductTitle: string | null;
  sessionId: string | null;
  startsAt: string | null;
  ticketTitle: string | null;
  quantity: number;
  unitPriceKopecks: number;
  totalKopecks: number;
  commissionKopecks: number;
  buyerName: string | null;
  buyerEmail: string | null;
  buyerPhone: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface SupplierPortalOrdersListDto {
  generatedAt: string;
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  filters: {
    status: string | null;
  };
  items: SupplierPortalOrderRowDto[];
}

export interface SupplierPortalFinanceDto {
  generatedAt: string;
  supplier: SupplierPortalIdentityDto;
  summary: SupplierPortalSummaryDto['finance'];
  ledger: Array<{
    id: string;
    type: string;
    amountKopecks: number;
    currency: string;
    referenceType: string | null;
    referenceId: string | null;
    note: string | null;
    createdAt: string;
  }>;
  payouts: Array<{
    id: string;
    status: string;
    amountKopecks: number;
    commissionKopecks: number;
    periodStart: string | null;
    periodEnd: string | null;
    paidAt: string | null;
    comment: string | null;
    createdAt: string;
  }>;
}

export interface SupplierPortalReviewRowDto {
  id: string;
  rating: number;
  title: string | null;
  text: string;
  authorName: string;
  isVerified: boolean;
  status: string;
  eventId: string | null;
  eventSlug: string | null;
  eventTitle: string | null;
  supplierResponseStatus: string | null;
  hasDispute: boolean;
  createdAt: string;
  publishedAt: string | null;
}

export interface SupplierPortalReviewsListDto {
  generatedAt: string;
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  filters: {
    tab: string;
  };
  items: SupplierPortalReviewRowDto[];
}

export interface SupplierPortalProfileDto {
  generatedAt: string;
  supplier: SupplierPortalIdentityDto;
  legal: {
    status: string | null;
    legalName: string | null;
    legalAddress: string | null;
    inn: string | null;
    kpp: string | null;
    ogrn: string | null;
    taxMode: string | null;
    isVatPayer: boolean | null;
    defaultVatRate: number | null;
    signerFullName: string | null;
    signerPosition: string | null;
    financeEmail: string | null;
    docsEmail: string | null;
    verifiedAt: string | null;
    rejectionComment: string | null;
  };
  bankAccounts: Array<{
    id: string;
    bankName: string | null;
    bik: string | null;
    accountMask: string | null;
    correspondentMask: string | null;
    isPrimary: boolean;
  }>;
  users: Array<{
    id: string;
    role: string;
    isActive: boolean;
    email: string | null;
    name: string | null;
    acceptedAt: string | null;
  }>;
  venues: Array<{
    id: string;
    slug: string;
    title: string;
    cityTitle: string | null;
    isPrimary: boolean;
    isActive: boolean;
  }>;
  commissionRules: Array<{
    id: string;
    scope: string;
    title: string | null;
    percentBps: number;
    fixedFeeKopecks: number;
    priority: number;
    isActive: boolean;
    startsAt: string | null;
    endsAt: string | null;
  }>;
}

export interface SupplierPortalLegalProfileUpdateRequestDto {
  legalName?: string;
  legalAddress?: string | null;
  inn?: string | null;
  kpp?: string | null;
  ogrn?: string | null;
  taxMode?: 'OSNO' | 'USN_6' | 'USN_15' | 'AUSN' | 'NPD';
  isVatPayer?: boolean;
  defaultVatRate?: number | null;
  signerFullName?: string | null;
  signerPosition?: string | null;
  financeEmail?: string | null;
  docsEmail?: string | null;
}

export interface SupplierPortalBankAccountUpdateRequestDto {
  bankAccountId?: string | null;
  bankName?: string | null;
  bik?: string | null;
  accountNumber?: string | null;
  correspondentAccount?: string | null;
  isPrimary?: boolean;
}

export interface SupplierPortalDashboardDto {
  generatedAt: string;
  supplier: SupplierPortalIdentityDto;
  summary: SupplierPortalSummaryDto;
  readiness: SupplierPortalReadinessDto;
  upcomingSessions: SupplierPortalSessionPreviewDto[];
  latestOrders: SupplierPortalOrderRowDto[];
  eventsNeedingAttention: SupplierPortalEventRowDto[];
  admissionsNeedingAttention: AdmissionProductsListDto['items'];
}
