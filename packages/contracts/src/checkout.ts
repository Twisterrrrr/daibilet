export type StubCheckoutMode = 'STUB';
export type CheckoutSubjectType = 'EVENT' | 'VENUE_ADMISSION';

export type StubCheckoutIssueSeverity = 'low' | 'medium' | 'high';

export type StubCheckoutIssueCode =
  | 'STUB_CHECKOUT_DISABLED'
  | 'EVENT_NOT_FOUND'
  | 'EVENT_NOT_PUBLIC'
  | 'EVENT_NOT_INTERNAL_CHECKOUT'
  | 'EVENT_NOT_MANAGED_BY_DAIBILET'
  | 'SUPPLIER_NOT_CONFIGURED'
  | 'OFFER_NOT_FOUND'
  | 'OFFER_INACTIVE'
  | 'OFFER_NOT_MANUAL'
  | 'MISSING_PRICE'
  | 'PRICE_TOO_LOW'
  | 'QUANTITY_OUT_OF_RANGE'
  | 'SESSION_REQUIRED'
  | 'SESSION_NOT_FOUND'
  | 'SESSION_NOT_ACTIVE'
  | 'SESSION_IN_PAST'
  | 'NOT_ENOUGH_CAPACITY'
  | 'SALES_NOT_STARTED'
  | 'SALES_CLOSED'
  | 'OPEN_DATE_NOT_ACTIVE';

export interface StubCheckoutIssueDto {
  code: StubCheckoutIssueCode;
  label: string;
  severity: StubCheckoutIssueSeverity;
}

export interface StubCheckoutBuyerDto {
  email: string;
  name: string | null;
  phone: string | null;
}

export interface StubCheckoutCreateDto {
  eventId?: string | null;
  eventSlug?: string | null;
  offerId: string;
  sessionId?: string | null;
  quantity: number;
  buyer: StubCheckoutBuyerDto;
  attendee?: {
    name?: string | null;
    phone?: string | null;
  } | null;
  idempotencyKey?: string | null;
}

export interface StubCheckoutTotalsDto {
  currency: 'RUB';
  unitPriceKopecks: number;
  subtotalKopecks: number;
  discountKopecks: number;
  totalKopecks: number;
  commissionKopecks: number;
  netKopecks: number;
}

export interface StubCheckoutOrderDto {
  id: string;
  publicCode: string;
  status: string;
  createdAt: string;
  paidAt: string | null;
  confirmedAt: string | null;
  buyer: StubCheckoutBuyerDto;
  subject: {
    type: CheckoutSubjectType;
    eventId: string;
    eventSlug: string;
    eventTitle: string;
    eventKind: string;
    cityId: string | null;
    citySlug: string | null;
    cityTitle: string | null;
    venueId: string | null;
    venueSlug: string | null;
    venueTitle: string | null;
  };
  item: {
    id: string;
    supplierId: string;
    supplierTitle: string;
    offerId: string;
    offerTitle: string | null;
    sessionId: string | null;
    startsAt: string | null;
    quantity: number;
    ticketTitle: string | null;
    status: string;
  };
  totals: StubCheckoutTotalsDto;
  payment: {
    id: string;
    provider: 'MANUAL';
    status: string;
    amountKopecks: number;
    providerPaymentId: string | null;
    paidAt: string | null;
  };
  fulfillment: {
    id: string;
    status: string;
    provider: 'STUB';
    purchaseFlow: 'PLATFORM';
  };
}

export interface StubCheckoutResultDto {
  generatedAt: string;
  mode: StubCheckoutMode;
  order: StubCheckoutOrderDto;
  warnings: StubCheckoutIssueDto[];
}

export interface StubCheckoutErrorDto {
  error: 'stub_checkout_error';
  code: StubCheckoutIssueCode | 'IDEMPOTENCY_IN_PROGRESS' | 'IDEMPOTENCY_CONFLICT';
  message: string;
  issues: StubCheckoutIssueDto[];
}
