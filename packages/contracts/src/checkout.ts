export type StubCheckoutMode = 'STUB';
export type YooKassaCheckoutMode = 'YOOKASSA';
export type CheckoutSubjectType = 'EVENT' | 'VENUE_ADMISSION';

export type StubCheckoutIssueSeverity = 'low' | 'medium' | 'high';

export type StubCheckoutIssueCode =
  | 'STUB_CHECKOUT_DISABLED'
  | 'EVENT_NOT_FOUND'
  | 'EVENT_NOT_PUBLIC'
  | 'EVENT_NOT_INTERNAL_CHECKOUT'
  | 'EVENT_NOT_MANAGED_BY_DAIBILET'
  | 'ADMISSION_PRODUCT_NOT_FOUND'
  | 'ADMISSION_PRODUCT_NOT_PUBLIC'
  | 'ADMISSION_PRODUCT_NOT_INTERNAL_CHECKOUT'
  | 'ADMISSION_PRODUCT_NOT_MANAGED_BY_DAIBILET'
  | 'ADMISSION_OFFER_NOT_FOUND'
  | 'ADMISSION_OFFER_INACTIVE'
  | 'ADMISSION_OFFER_NOT_MANUAL'
  | 'ADMISSION_VALIDITY_NOT_ACTIVE'
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
  | 'OPEN_DATE_NOT_ACTIVE'
  | 'YOOKASSA_CHECKOUT_DISABLED'
  | 'YOOKASSA_CONFIG_MISSING'
  | 'YOOKASSA_PAYMENT_FAILED'
  | 'YOOKASSA_WEBHOOK_PAYMENT_NOT_FOUND';

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
  subjectType?: CheckoutSubjectType | null;
  eventId?: string | null;
  eventSlug?: string | null;
  admissionProductId?: string | null;
  admissionProductSlug?: string | null;
  offerId?: string | null;
  admissionOfferId?: string | null;
  sessionId?: string | null;
  quantity: number;
  buyer: StubCheckoutBuyerDto;
  attendee?: {
    name?: string | null;
    phone?: string | null;
  } | null;
  idempotencyKey?: string | null;
}

export interface YooKassaCheckoutCreateDto extends StubCheckoutCreateDto {
  returnUrl?: string | null;
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
    eventId: string | null;
    eventSlug: string | null;
    eventTitle: string | null;
    eventKind: string | null;
    admissionProductId: string | null;
    admissionProductSlug: string | null;
    admissionProductTitle: string | null;
    admissionProductType: string | null;
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

export interface YooKassaCheckoutOrderDto extends Omit<StubCheckoutOrderDto, 'payment' | 'fulfillment'> {
  checkoutUrl: string | null;
  expiresAt: string | null;
  ticketNumber: string | null;
  ticketNumbers: string[];
  payment: {
    id: string;
    provider: 'YOOKASSA';
    status: string;
    amountKopecks: number;
    providerPaymentId: string | null;
    confirmationUrl: string | null;
    paidAt: string | null;
  };
  fulfillment: {
    id: string;
    status: string;
    provider: 'INTERNAL';
    purchaseFlow: 'PLATFORM';
  };
}

export interface YooKassaCheckoutResultDto {
  generatedAt: string;
  mode: YooKassaCheckoutMode;
  order: YooKassaCheckoutOrderDto;
  warnings: StubCheckoutIssueDto[];
}

export interface YooKassaWebhookResultDto {
  generatedAt: string;
  event: string;
  providerPaymentId: string | null;
  paymentStatus: string | null;
  orderId: string | null;
  publicCode: string | null;
  result: 'processed' | 'duplicate' | 'ignored' | 'not_found';
}

export type YooKassaReconcileAction =
  | 'REMOTE_SUCCEEDED'
  | 'REMOTE_CANCELLED'
  | 'REMOTE_FAILED'
  | 'REMOTE_WAITING'
  | 'REMOTE_PENDING'
  | 'LOCAL_EXPIRED_WITHOUT_PROVIDER_PAYMENT'
  | 'SKIPPED_NOT_EXPIRED'
  | 'SKIPPED_NO_PAYMENT'
  | 'FAILED';

export interface YooKassaReconcileOrderDto {
  orderId: string;
  publicCode: string | null;
  paymentId: string | null;
  providerPaymentId: string | null;
  beforeOrderStatus: string | null;
  afterOrderStatus: string | null;
  beforePaymentStatus: string | null;
  afterPaymentStatus: string | null;
  remoteStatus: string | null;
  action: YooKassaReconcileAction;
  reason: string | null;
}

export interface YooKassaReconcileResultDto {
  generatedAt: string;
  dryRun: boolean;
  limit: number;
  checked: number;
  processed: number;
  succeeded: number;
  cancelled: number;
  expired: number;
  failed: number;
  skipped: number;
  orders: YooKassaReconcileOrderDto[];
}

export interface StubCheckoutErrorDto {
  error: 'stub_checkout_error';
  code: StubCheckoutIssueCode | 'IDEMPOTENCY_IN_PROGRESS' | 'IDEMPOTENCY_CONFLICT';
  message: string;
  issues: StubCheckoutIssueDto[];
}

export interface YooKassaCheckoutErrorDto {
  error: 'yookassa_checkout_error';
  code: StubCheckoutIssueCode | 'IDEMPOTENCY_REQUIRED' | 'IDEMPOTENCY_IN_PROGRESS' | 'IDEMPOTENCY_CONFLICT';
  message: string;
  issues: StubCheckoutIssueDto[];
}
