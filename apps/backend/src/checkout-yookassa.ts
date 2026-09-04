import { createHash } from 'node:crypto';
import type {
  CheckoutSubjectType,
  StubCheckoutIssueDto,
  StubCheckoutTotalsDto,
  YooKassaCheckoutCreateDto,
  YooKassaCheckoutErrorDto,
  YooKassaCheckoutOrderDto,
  YooKassaCheckoutResultDto,
  YooKassaReconcileAction,
  YooKassaReconcileOrderDto,
  YooKassaReconcileResultDto,
  YooKassaWebhookResultDto,
} from '@daibilet/contracts/checkout';
import { prisma, type Prisma } from '@daibilet/db';
import {
  checkoutItemResultSelect,
  checkoutOrderResultSelect,
  classifyStubCheckoutSubject,
  computeStubCheckoutTotals,
  createUniquePublicCode,
  decrementAdmissionCapacity,
  decrementCapacity,
  fulfillmentResultSelect,
  isAdmissionCheckoutPayload,
  loadStubCheckoutAdmissionProduct,
  loadStubCheckoutEvent,
  IDEMPOTENCY_KEY_MAX_LENGTH,
  normalizeIdempotencyKey,
  normalizeStubCheckoutPayload,
  paymentResultSelect,
  resolveStubCheckoutSupplier,
  StubCheckoutError,
  toIso,
  validateStubAdmissionCheckoutReadiness,
  validateStubCheckoutReadiness,
  writeSupplierLedgerEntries,
  type StubCheckoutAdmissionOfferRow,
  type StubCheckoutAdmissionProductRow,
  type StubCheckoutEventRow,
  type StubCheckoutOfferRow,
  type StubCheckoutSessionRow,
  type StubCheckoutSupplierRow,
} from './checkout-stub.js';

const YOOKASSA_CREATE_SCOPE = 'PAYMENT_CREATE';
const DEFAULT_YOOKASSA_API_URL = 'https://api.yookassa.ru/v3';
const DEFAULT_RETURN_BASE_URL = 'https://daibilet.ru';
const CHECKOUT_RESULT_PATH = '/checkout/result';
const DEFAULT_ADMISSION_RETURN_URL = `${DEFAULT_RETURN_BASE_URL}${CHECKOUT_RESULT_PATH}`;
const PAYMENT_CONFIRMATION_TTL_MINUTES = 30;

export interface YooKassaRuntimeConfig {
  enabled: boolean;
  shopId: string | null;
  secretKey: string | null;
  apiUrl: string;
  returnBaseUrl: string;
  verifyWebhook: boolean;
}

export interface YooKassaPaymentObject {
  id: string;
  status: string;
  paid?: boolean;
  amount?: {
    value?: string;
    currency?: string;
  };
  confirmation?: {
    type?: string;
    confirmation_url?: string;
  };
  metadata?: Record<string, unknown>;
  cancellation_details?: Record<string, unknown>;
  test?: boolean;
  created_at?: string;
  captured_at?: string;
  expires_at?: string;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;
type LocalPaymentStatus =
  | 'CREATED'
  | 'PENDING'
  | 'WAITING_FOR_CAPTURE'
  | 'SUCCEEDED'
  | 'CANCELLED'
  | 'FAILED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED';

interface CreatedYooKassaCheckoutRows {
  order: Prisma.CheckoutOrderGetPayload<{ select: typeof yookassaOrderResultSelect }>;
  item: Prisma.CheckoutItemGetPayload<{ select: typeof yookassaItemResultSelect }>;
  payment: Prisma.PaymentGetPayload<{ select: typeof yookassaPaymentResultSelect }>;
  fulfillment: Prisma.FulfillmentItemGetPayload<{ select: typeof yookassaFulfillmentResultSelect }>;
}

type YooKassaReconcileCandidate = Prisma.CheckoutOrderGetPayload<{ select: typeof yookassaReconcileCandidateSelect }>;

export class YooKassaCheckoutError extends Error {
  readonly statusCode: number;
  readonly code: YooKassaCheckoutErrorDto['code'];
  readonly issues: StubCheckoutIssueDto[];

  constructor(
    code: YooKassaCheckoutErrorDto['code'],
    statusCode: number,
    issues: StubCheckoutIssueDto[] = [],
    message: string = code,
  ) {
    super(message);
    this.name = 'YooKassaCheckoutError';
    this.code = code;
    this.statusCode = statusCode;
    this.issues = issues;
  }

  toDto(): YooKassaCheckoutErrorDto {
    return {
      error: 'yookassa_checkout_error',
      code: this.code,
      message: this.message,
      issues: this.issues,
    };
  }
}

export function isYooKassaCheckoutError(error: unknown): error is YooKassaCheckoutError {
  return error instanceof YooKassaCheckoutError;
}

export function readYooKassaRuntimeConfig(env: NodeJS.ProcessEnv = process.env): YooKassaRuntimeConfig {
  const shopId = cleanString(env.YOOKASSA_SHOP_ID || env.YOOKASSA_STORE_ID);
  const secretKey = cleanString(env.YOOKASSA_SECRET_KEY || env.YOOKASSA_API_KEY);
  return {
    enabled: env.DAIBILET_YOOKASSA_CHECKOUT === '1',
    shopId,
    secretKey,
    apiUrl: (cleanString(env.YOOKASSA_API_URL) || DEFAULT_YOOKASSA_API_URL).replace(/\/+$/, ''),
    returnBaseUrl: (cleanString(env.YOOKASSA_RETURN_BASE_URL || env.PUBLIC_SITE_URL) || DEFAULT_RETURN_BASE_URL).replace(/\/+$/, ''),
    verifyWebhook: env.DAIBILET_YOOKASSA_VERIFY_WEBHOOK !== '0',
  };
}

export function isYooKassaCheckoutReady(config = readYooKassaRuntimeConfig()): boolean {
  return Boolean(config.enabled && config.shopId && config.secretKey);
}

export async function createYooKassaCheckoutOrder(
  payload: YooKassaCheckoutCreateDto,
  options: {
    idempotencyKey?: string | null;
    now?: Date;
    config?: YooKassaRuntimeConfig;
    fetchImpl?: FetchLike;
  } = {},
): Promise<YooKassaCheckoutResultDto> {
  const now = options.now || new Date();
  const config = options.config || readYooKassaRuntimeConfig();
  const idempotencyKey = normalizeIdempotencyKey(options.idempotencyKey || payload.idempotencyKey);
  if (!idempotencyKey) {
    throw new YooKassaCheckoutError('IDEMPOTENCY_REQUIRED', 400, [], 'Idempotency-Key is required');
  }

  const normalizedPayload: YooKassaCheckoutCreateDto = {
    ...normalizeStubCheckoutPayload(payload),
    returnUrl: cleanString(payload.returnUrl),
  };
  if (isAdmissionCheckoutPayload(normalizedPayload)) {
    return createYooKassaAdmissionCheckoutOrder(normalizedPayload, {
      idempotencyKey,
      now,
      config,
      ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
    });
  }

  const payloadHash = hashYooKassaCheckoutPayload(normalizedPayload);
  const event = await loadStubCheckoutEvent(normalizedPayload);
  const eventOfferId = normalizedPayload.offerId || '';
  const [offer, session] = await Promise.all([
    event
      ? prisma.eventOffer.findFirst({
          where: { id: eventOfferId, eventId: event.id },
          select: yookassaOfferSelect,
        })
      : Promise.resolve(null),
    event && normalizedPayload.sessionId
      ? prisma.eventSession.findFirst({
          where: { id: normalizedPayload.sessionId, eventId: event.id },
          select: yookassaSessionSelect,
        })
      : Promise.resolve(null),
  ]);
  const supplier = event ? resolveStubCheckoutSupplier(event) : null;
  const issues = validateYooKassaCheckoutReadiness({
    config,
    now,
    event,
    offer,
    session,
    supplier,
    quantity: normalizedPayload.quantity,
  });
  const blocking = issues.filter((issue) => issue.severity === 'high');
  if (blocking.length) {
    throw new YooKassaCheckoutError(blocking[0]?.code || 'EVENT_NOT_FOUND', 422, issues);
  }
  if (!event || !offer || !supplier) throw new YooKassaCheckoutError('EVENT_NOT_FOUND', 404, issues);

  const replayedAfterValidation = await reserveYooKassaIdempotencyKey(idempotencyKey, event.id, payloadHash);
  if (replayedAfterValidation) return replayedAfterValidation;

  const subjectType = classifyStubCheckoutSubject({
    eventKind: String(event.kind),
    venueKind: event.venue ? String(event.venue.kind) : null,
  });
  const totals = computeStubCheckoutTotals({
    priceRub: offer.priceRub || 0,
    quantity: normalizedPayload.quantity,
    commissionBps: supplier.defaultCommissionBps || 0,
  });
  const expiresAt = new Date(now.getTime() + PAYMENT_CONFIRMATION_TTL_MINUTES * 60 * 1000);
  let created: CreatedYooKassaCheckoutRows | null = null;

  try {
    created = await loadCreatedRowsForIdempotencyKey(idempotencyKey);
    if (!created) {
      created = await prisma.$transaction(async (tx) => {
        await decrementCapacity(tx, event, session, normalizedPayload.quantity);
        const publicCode = await createUniquePublicCode(tx);
        const returnUrl = buildYooKassaCatalogResultReturnUrl(
          normalizedPayload.returnUrl || config.returnBaseUrl,
          publicCode,
        );
        const order = await tx.checkoutOrder.create({
          data: {
            publicCode,
            status: 'PENDING_PAYMENT',
            currency: 'RUB',
            subtotalKopecks: totals.subtotalKopecks,
            discountKopecks: totals.discountKopecks,
            totalKopecks: totals.totalKopecks,
            commissionKopecks: totals.commissionKopecks,
            buyerEmail: normalizedPayload.buyer.email,
            buyerPhone: normalizedPayload.buyer.phone,
            buyerName: normalizedPayload.buyer.name,
            buyerSnapshot: {
              mode: 'YOOKASSA',
              buyer: {
                email: normalizedPayload.buyer.email,
                name: normalizedPayload.buyer.name,
                phone: normalizedPayload.buyer.phone,
              },
              subjectType,
              requestedReturnUrl: cleanString(normalizedPayload.returnUrl),
              returnUrl,
            } satisfies Prisma.InputJsonObject,
            expiresAt,
          },
          select: yookassaOrderResultSelect,
        });
        const item = await tx.checkoutItem.create({
          data: {
            checkoutOrderId: order.id,
            subjectType,
            supplierId: supplier.id,
            eventId: event.id,
            sessionId: session?.id || null,
            offerId: offer.id,
            title: event.title,
            ticketTitle: offer.title,
            status: 'RESERVED',
            quantity: normalizedPayload.quantity,
            unitPriceKopecks: totals.unitPriceKopecks,
            totalKopecks: totals.totalKopecks,
            commissionKopecks: totals.commissionKopecks,
            attendeeName: normalizedPayload.attendee?.name || normalizedPayload.buyer.name,
            attendeePhone: normalizedPayload.attendee?.phone || normalizedPayload.buyer.phone,
            providerPayload: {
              mode: 'YOOKASSA',
              subjectType,
              eventSlug: event.slug,
              admissionProductId: null,
              admissionOfferId: null,
              offerId: offer.id,
              sessionId: session?.id || null,
              returnUrl,
            },
          },
          select: yookassaItemResultSelect,
        });
        const payment = await tx.payment.create({
          data: {
            checkoutOrderId: order.id,
            provider: 'YOOKASSA',
            status: 'CREATED',
            amountKopecks: totals.totalKopecks,
            currency: 'RUB',
            idempotenceKey: idempotencyKey,
            rawPayload: {
              mode: 'YOOKASSA',
              requestedReturnUrl: cleanString(normalizedPayload.returnUrl),
              returnUrl,
            } satisfies Prisma.InputJsonObject,
          },
          select: yookassaPaymentResultSelect,
        });
        const fulfillment = await tx.fulfillmentItem.create({
          data: {
            checkoutOrderId: order.id,
            checkoutItemId: item.id,
            lineItemIndex: 0,
            offerId: offer.id,
            purchaseFlow: 'PLATFORM',
            provider: 'INTERNAL',
            status: 'PENDING',
            amountKopecks: totals.totalKopecks,
            providerData: {
              mode: 'YOOKASSA',
              publicCode,
              subjectType,
              returnUrl,
            },
          },
          select: yookassaFulfillmentResultSelect,
        });
        return { order, item, payment, fulfillment };
      });
      await markYooKassaIdempotencyLocalRows(idempotencyKey, created.order.id, created.payment.id, payloadHash);
    }
    if (created.payment.providerPaymentId && created.payment.confirmationUrl) {
      const result = mapYooKassaCheckoutResult({
        created,
        event,
        offer,
        session,
        supplier,
        totals,
        subjectType,
        warnings: issues.filter((issue) => issue.severity !== 'high'),
      });
      await markYooKassaIdempotencySucceeded(idempotencyKey, created.order.id, result);
      return result;
    }
    const returnUrl = buildYooKassaCatalogResultReturnUrl(
      normalizedPayload.returnUrl || config.returnBaseUrl,
      created.order.publicCode,
    );
    const paymentObject = await createYooKassaPayment({
      config,
      ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
      idempotenceKey: idempotencyKey,
      body: buildYooKassaPaymentCreatePayload({
        order: created.order,
        event,
        offer,
        session,
        totals,
        returnUrl,
      }),
    });
    const persisted = await persistCreatedYooKassaPayment({
      created,
      paymentObject,
      event,
      session,
      offer,
      supplier,
      subjectType,
      totals,
      returnUrl,
    });
    const result = mapYooKassaCheckoutResult({
      created: persisted,
      event,
      offer,
      session,
      supplier,
      totals,
      subjectType,
      warnings: issues.filter((issue) => issue.severity !== 'high'),
    });
    await markYooKassaIdempotencySucceeded(idempotencyKey, persisted.order.id, result);
    return result;
  } catch (error) {
    await markYooKassaIdempotencyFailed(idempotencyKey, created?.order.id || event.id);
    if (created) await markYooKassaCreateAttemptErrored(created, error);
    if (error instanceof YooKassaCheckoutError) throw error;
    if (error instanceof StubCheckoutError) throw new YooKassaCheckoutError(error.code, error.statusCode, error.issues);
    throw new YooKassaCheckoutError('YOOKASSA_PAYMENT_FAILED', 502, [], errorToMessage(error));
  }
}

async function createYooKassaAdmissionCheckoutOrder(
  normalizedPayload: YooKassaCheckoutCreateDto,
  options: {
    idempotencyKey: string;
    now: Date;
    config: YooKassaRuntimeConfig;
    fetchImpl?: FetchLike;
  },
): Promise<YooKassaCheckoutResultDto> {
  const { config, idempotencyKey, now } = options;
  const payloadHash = hashYooKassaCheckoutPayload(normalizedPayload);
  const product = await loadStubCheckoutAdmissionProduct(normalizedPayload);
  const offer = product && normalizedPayload.admissionOfferId
    ? await prisma.admissionOffer.findFirst({
        where: { id: normalizedPayload.admissionOfferId, admissionProductId: product.id },
        select: yookassaAdmissionOfferSelect,
      })
    : null;
  const supplier = product?.supplier || null;
  const issues = validateYooKassaAdmissionCheckoutReadiness({
    config,
    now,
    product,
    offer,
    supplier,
    quantity: normalizedPayload.quantity,
  });
  const blocking = issues.filter((issue) => issue.severity === 'high');
  if (blocking.length) {
    throw new YooKassaCheckoutError(blocking[0]?.code || 'ADMISSION_PRODUCT_NOT_FOUND', 422, issues);
  }
  if (!product || !offer || !supplier) {
    throw new YooKassaCheckoutError('ADMISSION_PRODUCT_NOT_FOUND', 404, issues);
  }

  const replayedAfterValidation = await reserveYooKassaIdempotencyKey(idempotencyKey, product.id, payloadHash);
  if (replayedAfterValidation) return replayedAfterValidation;

  const totals = computeStubCheckoutTotals({
    priceRub: offer.priceRub || 0,
    quantity: normalizedPayload.quantity,
    commissionBps: supplier.defaultCommissionBps || 0,
  });
  const expiresAt = new Date(now.getTime() + PAYMENT_CONFIRMATION_TTL_MINUTES * 60 * 1000);
  let created: CreatedYooKassaCheckoutRows | null = null;

  try {
    created = await loadCreatedRowsForIdempotencyKey(idempotencyKey);
    if (!created) {
      created = await prisma.$transaction(async (tx) => {
        await decrementAdmissionCapacity(tx, product, normalizedPayload.quantity);
        const publicCode = await createUniquePublicCode(tx);
        const returnUrl = buildYooKassaCatalogResultReturnUrl(
          normalizedPayload.returnUrl || DEFAULT_ADMISSION_RETURN_URL,
          publicCode,
        );
        const order = await tx.checkoutOrder.create({
          data: {
            publicCode,
            status: 'PENDING_PAYMENT',
            currency: 'RUB',
            subtotalKopecks: totals.subtotalKopecks,
            discountKopecks: totals.discountKopecks,
            totalKopecks: totals.totalKopecks,
            commissionKopecks: totals.commissionKopecks,
            buyerEmail: normalizedPayload.buyer.email,
            buyerPhone: normalizedPayload.buyer.phone,
            buyerName: normalizedPayload.buyer.name,
            buyerSnapshot: {
              mode: 'YOOKASSA',
              buyer: {
                email: normalizedPayload.buyer.email,
                name: normalizedPayload.buyer.name,
                phone: normalizedPayload.buyer.phone,
              },
              subjectType: 'VENUE_ADMISSION',
              requestedReturnUrl: cleanString(normalizedPayload.returnUrl),
              returnUrl,
            } satisfies Prisma.InputJsonObject,
            expiresAt,
          },
          select: yookassaOrderResultSelect,
        });
        const item = await tx.checkoutItem.create({
          data: {
            checkoutOrderId: order.id,
            subjectType: 'VENUE_ADMISSION',
            supplierId: supplier.id,
            admissionProductId: product.id,
            admissionOfferId: offer.id,
            title: product.title,
            ticketTitle: offer.title,
            status: 'RESERVED',
            quantity: normalizedPayload.quantity,
            unitPriceKopecks: totals.unitPriceKopecks,
            totalKopecks: totals.totalKopecks,
            commissionKopecks: totals.commissionKopecks,
            attendeeName: normalizedPayload.attendee?.name || normalizedPayload.buyer.name,
            attendeePhone: normalizedPayload.attendee?.phone || normalizedPayload.buyer.phone,
            providerPayload: {
              mode: 'YOOKASSA',
              subjectType: 'VENUE_ADMISSION',
              admissionProductId: product.id,
              admissionProductSlug: product.slug,
              admissionOfferId: offer.id,
              returnUrl,
            },
          },
          select: yookassaItemResultSelect,
        });
        const payment = await tx.payment.create({
          data: {
            checkoutOrderId: order.id,
            provider: 'YOOKASSA',
            status: 'CREATED',
            amountKopecks: totals.totalKopecks,
            currency: 'RUB',
            idempotenceKey: idempotencyKey,
            rawPayload: {
              mode: 'YOOKASSA',
              requestedReturnUrl: cleanString(normalizedPayload.returnUrl),
              returnUrl,
            } satisfies Prisma.InputJsonObject,
          },
          select: yookassaPaymentResultSelect,
        });
        const fulfillment = await tx.fulfillmentItem.create({
          data: {
            checkoutOrderId: order.id,
            checkoutItemId: item.id,
            lineItemIndex: 0,
            admissionOfferId: offer.id,
            purchaseFlow: 'PLATFORM',
            provider: 'INTERNAL',
            status: 'PENDING',
            amountKopecks: totals.totalKopecks,
            providerData: {
              mode: 'YOOKASSA',
              publicCode,
              subjectType: 'VENUE_ADMISSION',
              admissionProductId: product.id,
              returnUrl,
            },
          },
          select: yookassaFulfillmentResultSelect,
        });
        return { order, item, payment, fulfillment };
      });
      await markYooKassaIdempotencyLocalRows(idempotencyKey, created.order.id, created.payment.id, payloadHash);
    }
    if (created.payment.providerPaymentId && created.payment.confirmationUrl) {
      const result = mapYooKassaAdmissionCheckoutResult({
        created,
        product,
        offer,
        supplier,
        totals,
        warnings: issues.filter((issue) => issue.severity !== 'high'),
      });
      await markYooKassaIdempotencySucceeded(idempotencyKey, created.order.id, result);
      return result;
    }
    const returnUrl = buildYooKassaCatalogResultReturnUrl(
      normalizedPayload.returnUrl || DEFAULT_ADMISSION_RETURN_URL,
      created.order.publicCode,
    );
    const paymentObject = await createYooKassaPayment({
      config,
      ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
      idempotenceKey: idempotencyKey,
      body: buildYooKassaAdmissionPaymentCreatePayload({
        order: created.order,
        product,
        offer,
        totals,
        returnUrl,
      }),
    });
    const persisted = await persistCreatedYooKassaAdmissionPayment({
      created,
      paymentObject,
      supplier,
      totals,
      returnUrl,
    });
    const result = mapYooKassaAdmissionCheckoutResult({
      created: persisted,
      product,
      offer,
      supplier,
      totals,
      warnings: issues.filter((issue) => issue.severity !== 'high'),
    });
    await markYooKassaIdempotencySucceeded(idempotencyKey, persisted.order.id, result);
    return result;
  } catch (error) {
    await markYooKassaIdempotencyFailed(idempotencyKey, created?.order.id || product.id);
    if (created) await markYooKassaCreateAttemptErrored(created, error);
    if (error instanceof YooKassaCheckoutError) throw error;
    if (error instanceof StubCheckoutError) throw new YooKassaCheckoutError(error.code, error.statusCode, error.issues);
    throw new YooKassaCheckoutError('YOOKASSA_PAYMENT_FAILED', 502, [], errorToMessage(error));
  }
}

export function validateYooKassaCheckoutReadiness(input: {
  config: YooKassaRuntimeConfig;
  now: Date;
  event: StubCheckoutEventRow | null;
  offer: StubCheckoutOfferRow | null;
  session: StubCheckoutSessionRow | null;
  supplier: StubCheckoutSupplierRow | null;
  quantity: number;
}): StubCheckoutIssueDto[] {
  const issues = validateStubCheckoutReadiness({
    enabled: true,
    now: input.now,
    event: input.event,
    offer: input.offer,
    session: input.session,
    supplier: input.supplier,
    quantity: input.quantity,
  });
  if (!input.config.enabled) {
    issues.unshift(issue('YOOKASSA_CHECKOUT_DISABLED', 'YooKassa checkout выключен', 'high'));
  } else if (!input.config.shopId || !input.config.secretKey) {
    issues.unshift(issue('YOOKASSA_CONFIG_MISSING', 'Не заданы shop id или secret key YooKassa', 'high'));
  }
  return issues;
}

export function validateYooKassaAdmissionCheckoutReadiness(input: {
  config: YooKassaRuntimeConfig;
  now: Date;
  product: StubCheckoutAdmissionProductRow | null;
  offer: StubCheckoutAdmissionOfferRow | null;
  supplier: StubCheckoutSupplierRow | null;
  quantity: number;
}): StubCheckoutIssueDto[] {
  const issues = validateStubAdmissionCheckoutReadiness({
    enabled: true,
    now: input.now,
    product: input.product,
    offer: input.offer,
    supplier: input.supplier,
    quantity: input.quantity,
  });
  if (!input.config.enabled) {
    issues.unshift(issue('YOOKASSA_CHECKOUT_DISABLED', 'YooKassa checkout выключен', 'high'));
  } else if (!input.config.shopId || !input.config.secretKey) {
    issues.unshift(issue('YOOKASSA_CONFIG_MISSING', 'Не заданы shop id или secret key YooKassa', 'high'));
  }
  return issues;
}

export function buildYooKassaPaymentCreatePayload(input: {
  order: Pick<CreatedYooKassaCheckoutRows['order'], 'id' | 'publicCode' | 'buyerEmail' | 'buyerPhone'>;
  event: Pick<StubCheckoutEventRow, 'id' | 'slug' | 'title'>;
  offer: Pick<StubCheckoutOfferRow, 'id' | 'title'>;
  session: Pick<StubCheckoutSessionRow, 'id' | 'startsAt'> | null;
  totals: StubCheckoutTotalsDto;
  returnUrl: string;
}): Record<string, unknown> {
  return {
    amount: {
      value: formatKopecksForYooKassa(input.totals.totalKopecks),
      currency: 'RUB',
    },
    capture: true,
    confirmation: {
      type: 'redirect',
      return_url: input.returnUrl,
    },
    description: trimForYooKassaDescription(`Daibilet order ${input.order.publicCode}`),
    metadata: {
      source: 'daibilet',
      checkoutOrderId: input.order.id,
      publicCode: input.order.publicCode,
      eventId: input.event.id,
      eventSlug: input.event.slug,
      offerId: input.offer.id,
      sessionId: input.session?.id || null,
    },
    merchant_customer_id: input.order.buyerEmail || input.order.buyerPhone || undefined,
  };
}

export function buildYooKassaAdmissionPaymentCreatePayload(input: {
  order: Pick<CreatedYooKassaCheckoutRows['order'], 'id' | 'publicCode' | 'buyerEmail' | 'buyerPhone'>;
  product: Pick<StubCheckoutAdmissionProductRow, 'id' | 'slug' | 'title' | 'venueId' | 'cityId'>;
  offer: Pick<StubCheckoutAdmissionOfferRow, 'id' | 'title'>;
  totals: StubCheckoutTotalsDto;
  returnUrl: string;
}): Record<string, unknown> {
  return {
    amount: {
      value: formatKopecksForYooKassa(input.totals.totalKopecks),
      currency: 'RUB',
    },
    capture: true,
    confirmation: {
      type: 'redirect',
      return_url: input.returnUrl,
    },
    description: trimForYooKassaDescription(`Daibilet admission ${input.order.publicCode}`),
    metadata: {
      source: 'daibilet',
      subjectType: 'VENUE_ADMISSION',
      checkoutOrderId: input.order.id,
      publicCode: input.order.publicCode,
      admissionProductId: input.product.id,
      admissionProductSlug: input.product.slug,
      admissionOfferId: input.offer.id,
      venueId: input.product.venueId,
      cityId: input.product.cityId,
    },
    merchant_customer_id: input.order.buyerEmail || input.order.buyerPhone || undefined,
  };
}

export function formatKopecksForYooKassa(value: number): string {
  return (Math.max(0, Math.trunc(value || 0)) / 100).toFixed(2);
}

export function mapYooKassaPaymentStatus(status: string): LocalPaymentStatus {
  switch (status) {
    case 'pending':
      return 'PENDING';
    case 'waiting_for_capture':
      return 'WAITING_FOR_CAPTURE';
    case 'succeeded':
      return 'SUCCEEDED';
    case 'canceled':
      return 'CANCELLED';
    default:
      return 'FAILED';
  }
}

export function classifyYooKassaReconcileAction(input: {
  hasLocalPayment: boolean;
  localExpired: boolean;
  providerPaymentId: string | null;
  remoteStatus?: string | null;
  failed?: boolean;
}): YooKassaReconcileAction {
  if (input.failed) return 'FAILED';
  if (!input.hasLocalPayment) return 'SKIPPED_NO_PAYMENT';
  if (!input.localExpired) return 'SKIPPED_NOT_EXPIRED';
  if (!input.providerPaymentId) return 'LOCAL_EXPIRED_WITHOUT_PROVIDER_PAYMENT';
  switch (input.remoteStatus) {
    case 'succeeded':
      return 'REMOTE_SUCCEEDED';
    case 'canceled':
      return 'REMOTE_CANCELLED';
    case 'waiting_for_capture':
      return 'REMOTE_WAITING';
    case 'pending':
      return 'REMOTE_PENDING';
    default:
      return 'REMOTE_FAILED';
  }
}

export async function reconcileExpiredYooKassaCheckouts(
  options: {
    now?: Date;
    limit?: number;
    dryRun?: boolean;
    graceMinutes?: number;
    orderId?: string | null;
    config?: YooKassaRuntimeConfig;
    fetchImpl?: FetchLike;
  } = {},
): Promise<YooKassaReconcileResultDto> {
  const now = options.now || new Date();
  const dryRun = options.dryRun !== false;
  const limit = normalizeReconcileLimit(options.limit);
  const graceMinutes = Math.max(0, Math.trunc(options.graceMinutes ?? 5));
  const expiredBefore = new Date(now.getTime() - graceMinutes * 60 * 1000);
  const config = options.config || readYooKassaRuntimeConfig();
  const candidates = await prisma.checkoutOrder.findMany({
    where: {
      ...(options.orderId ? { id: options.orderId } : {}),
      status: 'PENDING_PAYMENT',
      expiresAt: { lte: expiredBefore },
      payments: {
        some: {
          provider: 'YOOKASSA',
          status: { in: ['CREATED', 'PENDING', 'WAITING_FOR_CAPTURE', 'FAILED'] },
        },
      },
    },
    orderBy: { expiresAt: 'asc' },
    take: limit,
    select: yookassaReconcileCandidateSelect,
  });
  const orders: YooKassaReconcileOrderDto[] = [];

  for (const candidate of candidates) {
    orders.push(await reconcileYooKassaCandidate(candidate, {
      config,
      dryRun,
      ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
      now,
    }));
  }

  return summarizeYooKassaReconcileResult({
    generatedAt: now.toISOString(),
    dryRun,
    limit,
    orders,
  });
}

export async function applyYooKassaWebhookPayload(
  payload: unknown,
  options: {
    config?: YooKassaRuntimeConfig;
    fetchImpl?: FetchLike;
    now?: Date;
  } = {},
): Promise<YooKassaWebhookResultDto> {
  const now = options.now || new Date();
  const config = options.config || readYooKassaRuntimeConfig();
  const event = extractYooKassaWebhookEvent(payload);
  if (!event.paymentId) {
    return {
      generatedAt: now.toISOString(),
      event: event.eventType,
      providerPaymentId: null,
      paymentStatus: null,
      orderId: null,
      publicCode: null,
      result: 'ignored',
    };
  }

  const dedupeKey = buildYooKassaWebhookDedupeKey(event);
  const duplicateResult = await reserveYooKassaWebhookDedupe({
    dedupeKey,
    event,
  });
  if (duplicateResult) return duplicateResult;

  try {
    const paymentObject = config.verifyWebhook
      ? await getYooKassaPayment({
          config,
          ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
          paymentId: event.paymentId,
        })
      : event.paymentObject;
    assertYooKassaWebhookPaymentMatches(event, paymentObject);
    const result = await applyYooKassaPaymentObject(paymentObject, { now });
    await prisma.processedWebhookEvent.update({
      where: { dedupeKey },
      data: {
        paymentId: result.paymentDbId || null,
        result: result.result,
      },
    });
    return {
      generatedAt: now.toISOString(),
      event: event.eventType,
      providerPaymentId: event.paymentId,
      paymentStatus: result.paymentStatus,
      orderId: result.orderId,
      publicCode: result.publicCode,
      result: result.result,
    };
  } catch (error) {
    await prisma.processedWebhookEvent.updateMany({
      where: { dedupeKey },
      data: { result: 'FAILED' },
    });
    throw error;
  }
}

async function reconcileYooKassaCandidate(
  candidate: YooKassaReconcileCandidate,
  options: {
    now: Date;
    dryRun: boolean;
    config: YooKassaRuntimeConfig;
    fetchImpl?: FetchLike;
  },
): Promise<YooKassaReconcileOrderDto> {
  const localPayment = candidate.payments[0] || null;
  const base = {
    orderId: candidate.id,
    publicCode: candidate.publicCode || null,
    paymentId: localPayment?.id || null,
    providerPaymentId: localPayment?.providerPaymentId || null,
    beforeOrderStatus: String(candidate.status || ''),
    afterOrderStatus: String(candidate.status || ''),
    beforePaymentStatus: localPayment ? String(localPayment.status || '') : null,
    afterPaymentStatus: localPayment ? String(localPayment.status || '') : null,
    remoteStatus: null,
  };
  const localExpired = Boolean(candidate.expiresAt && candidate.expiresAt <= options.now);
  if (!localPayment) {
    return {
      ...base,
      action: classifyYooKassaReconcileAction({
        hasLocalPayment: false,
        localExpired,
        providerPaymentId: null,
      }),
      reason: 'No local YooKassa payment row is attached to the pending order.',
    };
  }
  if (!localExpired) {
    return {
      ...base,
      action: classifyYooKassaReconcileAction({
        hasLocalPayment: true,
        localExpired,
        providerPaymentId: localPayment.providerPaymentId || null,
      }),
      reason: 'Order is still inside the local payment window.',
    };
  }
  if (!localPayment.providerPaymentId) {
    if (!options.dryRun) {
      await expireLocalUnboundYooKassaOrder({
        orderId: candidate.id,
        paymentId: localPayment.id,
        now: options.now,
      });
    }
    const after = options.dryRun
      ? { orderStatus: String(candidate.status || ''), paymentStatus: String(localPayment.status || '') }
      : await loadYooKassaOrderPaymentStatus(candidate.id, localPayment.id);
    return {
      ...base,
      afterOrderStatus: after.orderStatus,
      afterPaymentStatus: after.paymentStatus,
      action: 'LOCAL_EXPIRED_WITHOUT_PROVIDER_PAYMENT',
      reason: options.dryRun
        ? 'Would expire local order because provider payment id was never persisted.'
        : 'Expired local order because provider payment id was never persisted.',
    };
  }

  try {
    const paymentObject = await getYooKassaPayment({
      config: options.config,
      ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
      paymentId: localPayment.providerPaymentId,
    });
    const action = classifyYooKassaReconcileAction({
      hasLocalPayment: true,
      localExpired,
      providerPaymentId: localPayment.providerPaymentId,
      remoteStatus: paymentObject.status,
    });
    if (!options.dryRun) {
      await applyYooKassaPaymentObject(paymentObject, { now: options.now });
    }
    const after = options.dryRun
      ? { orderStatus: String(candidate.status || ''), paymentStatus: String(localPayment.status || '') }
      : await loadYooKassaOrderPaymentStatus(candidate.id, localPayment.id);
    return {
      ...base,
      afterOrderStatus: after.orderStatus,
      afterPaymentStatus: after.paymentStatus,
      remoteStatus: paymentObject.status || null,
      action,
      reason: reasonForYooKassaReconcileAction(action, options.dryRun),
    };
  } catch (error) {
    return {
      ...base,
      action: 'FAILED',
      reason: errorToMessage(error),
    };
  }
}

async function expireLocalUnboundYooKassaOrder(input: {
  orderId: string;
  paymentId: string;
  now: Date;
}): Promise<boolean> {
  const expired = await prisma.$transaction(async (tx) => {
    const orderUpdate = await tx.checkoutOrder.updateMany({
      where: {
        id: input.orderId,
        status: 'PENDING_PAYMENT',
      },
      data: {
        status: 'EXPIRED',
        cancelledAt: input.now,
        checkoutUrl: null,
      },
    });
    if (orderUpdate.count !== 1) return false;
    await tx.payment.updateMany({
      where: {
        id: input.paymentId,
        provider: 'YOOKASSA',
        providerPaymentId: null,
        status: { in: ['CREATED', 'PENDING', 'WAITING_FOR_CAPTURE', 'FAILED'] },
      },
      data: {
        status: 'FAILED',
        cancelledAt: input.now,
        error: 'expired_without_provider_payment_id',
      },
    });
    await tx.fulfillmentItem.updateMany({
      where: {
        checkoutOrderId: input.orderId,
        status: { in: ['PENDING', 'RESERVING', 'RESERVED', 'FAILED'] },
      },
      data: {
        status: 'CANCELLED',
        lastError: 'Payment expired before YooKassa provider payment id was persisted.',
      },
    });
    await releaseReservedCapacityInTransaction(tx, input.orderId);
    return true;
  });
  return expired;
}

async function loadYooKassaOrderPaymentStatus(orderId: string, paymentId: string): Promise<{
  orderStatus: string | null;
  paymentStatus: string | null;
}> {
  const order = await prisma.checkoutOrder.findUnique({
    where: { id: orderId },
    select: {
      status: true,
      payments: {
        where: { id: paymentId },
        take: 1,
        select: { status: true },
      },
    },
  });
  return {
    orderStatus: order ? String(order.status || '') : null,
    paymentStatus: order?.payments[0] ? String(order.payments[0].status || '') : null,
  };
}

async function reserveYooKassaWebhookDedupe(input: {
  dedupeKey: string;
  event: ReturnType<typeof extractYooKassaWebhookEvent>;
}): Promise<YooKassaWebhookResultDto | null> {
  try {
    await prisma.processedWebhookEvent.create({
      data: {
        dedupeKey: input.dedupeKey,
        providerEventId: input.event.providerEventId || input.dedupeKey,
        provider: 'YOOKASSA',
        eventType: input.event.eventType,
        payload: input.event.rawPayload as Prisma.InputJsonValue,
        result: 'IN_PROGRESS',
      },
    });
    return null;
  } catch (error) {
    if (!isPrismaUniqueViolation(error)) throw error;
  }

  const existing = await prisma.processedWebhookEvent.findUnique({
    where: { dedupeKey: input.dedupeKey },
  });
  if (existing && !['IN_PROGRESS', 'FAILED'].includes(String(existing.result || ''))) {
    const payment = input.event.paymentId
      ? await prisma.payment.findUnique({
          where: { providerPaymentId: input.event.paymentId },
          select: { checkoutOrderId: true, order: { select: { publicCode: true } }, status: true },
        })
      : null;
    return {
      generatedAt: new Date().toISOString(),
      event: input.event.eventType,
      providerPaymentId: input.event.paymentId,
      paymentStatus: payment?.status || input.event.status,
      orderId: payment?.checkoutOrderId || null,
      publicCode: payment?.order.publicCode || null,
      result: 'duplicate',
    };
  }
  const staleCutoff = new Date(Date.now() - 2 * 60 * 1000);
  if (existing?.result === 'IN_PROGRESS' && existing.processedAt > staleCutoff) {
    return {
      generatedAt: new Date().toISOString(),
      event: input.event.eventType,
      providerPaymentId: input.event.paymentId,
      paymentStatus: input.event.status,
      orderId: null,
      publicCode: null,
      result: 'duplicate',
    };
  }

  const claimed = await prisma.processedWebhookEvent.updateMany({
    where: {
      dedupeKey: input.dedupeKey,
      OR: [
        { result: 'FAILED' },
        { result: 'IN_PROGRESS', processedAt: { lte: staleCutoff } },
      ],
    },
    data: {
      payload: input.event.rawPayload as Prisma.InputJsonValue,
      result: 'IN_PROGRESS',
      processedAt: new Date(),
    },
  });
  if (claimed.count !== 1) {
    return {
      generatedAt: new Date().toISOString(),
      event: input.event.eventType,
      providerPaymentId: input.event.paymentId,
      paymentStatus: input.event.status,
      orderId: null,
      publicCode: null,
      result: 'duplicate',
    };
  }
  return null;
}

async function createYooKassaPayment(input: {
  config: YooKassaRuntimeConfig;
  fetchImpl?: FetchLike | undefined;
  idempotenceKey: string;
  body: Record<string, unknown>;
}): Promise<YooKassaPaymentObject> {
  assertYooKassaApiConfig(input.config);
  return yookassaJsonRequest<YooKassaPaymentObject>({
    config: input.config,
    ...(input.fetchImpl ? { fetchImpl: input.fetchImpl } : {}),
    path: '/payments',
    method: 'POST',
    idempotenceKey: input.idempotenceKey,
    body: input.body,
  });
}

async function getYooKassaPayment(input: {
  config: YooKassaRuntimeConfig;
  fetchImpl?: FetchLike | undefined;
  paymentId: string;
}): Promise<YooKassaPaymentObject> {
  assertYooKassaApiConfig(input.config);
  return yookassaJsonRequest<YooKassaPaymentObject>({
    config: input.config,
    ...(input.fetchImpl ? { fetchImpl: input.fetchImpl } : {}),
    path: `/payments/${encodeURIComponent(input.paymentId)}`,
    method: 'GET',
  });
}

async function yookassaJsonRequest<T>(input: {
  config: YooKassaRuntimeConfig;
  fetchImpl?: FetchLike | undefined;
  path: string;
  method: 'GET' | 'POST';
  idempotenceKey?: string;
  body?: Record<string, unknown>;
}): Promise<T> {
  const fetchImpl = input.fetchImpl || globalThis.fetch;
  if (!fetchImpl) throw new YooKassaCheckoutError('YOOKASSA_PAYMENT_FAILED', 500, [], 'fetch is not available');
  const idempotenceKey = input.idempotenceKey
    ? normalizeIdempotencyKey(input.idempotenceKey) || input.idempotenceKey.slice(0, IDEMPOTENCY_KEY_MAX_LENGTH)
    : undefined;
  if (idempotenceKey && idempotenceKey.length > IDEMPOTENCY_KEY_MAX_LENGTH) {
    throw new YooKassaCheckoutError(
      'YOOKASSA_PAYMENT_FAILED',
      500,
      [],
      `Idempotence-Key exceeds ${IDEMPOTENCY_KEY_MAX_LENGTH} characters`,
    );
  }
  const init: RequestInit = {
    method: input.method,
    headers: {
      authorization: `Basic ${Buffer.from(`${input.config.shopId}:${input.config.secretKey}`).toString('base64')}`,
      'content-type': 'application/json',
      ...(idempotenceKey ? { 'Idempotence-Key': idempotenceKey } : {}),
    },
  };
  if (input.body) init.body = JSON.stringify(input.body);
  const response = await fetchImpl(`${input.config.apiUrl}${input.path}`, init);
  const json = await readResponseJson(response);
  if (!response.ok) {
    throw new YooKassaCheckoutError('YOOKASSA_PAYMENT_FAILED', response.status || 502, [], JSON.stringify(json));
  }
  return json as T;
}

async function persistCreatedYooKassaPayment(input: {
  created: CreatedYooKassaCheckoutRows;
  paymentObject: YooKassaPaymentObject;
  event: StubCheckoutEventRow;
  session: StubCheckoutSessionRow | null;
  offer: StubCheckoutOfferRow;
  supplier: StubCheckoutSupplierRow;
  subjectType: CheckoutSubjectType;
  totals: StubCheckoutTotalsDto;
  returnUrl: string;
}): Promise<CreatedYooKassaCheckoutRows> {
  const providerStatus = mapYooKassaPaymentStatus(input.paymentObject.status);
  const confirmationUrl = input.paymentObject.confirmation?.confirmation_url || null;
  const payment = await prisma.payment.update({
    where: { id: input.created.payment.id },
    data: {
      status: providerStatus,
      providerPaymentId: input.paymentObject.id,
      confirmationUrl,
      rawPayload: buildYooKassaPaymentRawPayload(input.paymentObject, input.returnUrl),
      ...(providerStatus === 'SUCCEEDED'
        ? { paidAt: new Date(), capturedAt: new Date() }
        : {}),
      ...(providerStatus === 'CANCELLED'
        ? { cancelledAt: new Date(), error: stringifyYooKassaCancellation(input.paymentObject) }
        : {}),
    },
    select: yookassaPaymentResultSelect,
  });
  const order = await prisma.checkoutOrder.update({
    where: { id: input.created.order.id },
    data: {
      checkoutUrl: confirmationUrl,
      ...(providerStatus === 'SUCCEEDED'
        ? { status: 'CONFIRMED', paidAt: new Date(), confirmedAt: new Date() }
        : {}),
      ...(providerStatus === 'CANCELLED'
        ? { status: 'CANCELLED', cancelledAt: new Date() }
        : {}),
    },
    select: yookassaOrderResultSelect,
  });
  const created = { ...input.created, order, payment };
  if (providerStatus === 'SUCCEEDED') {
    return finalizeYooKassaPaidCheckout({
      created,
      supplier: input.supplier,
      totals: input.totals,
    });
  }
  if (providerStatus === 'CANCELLED') {
    await prisma.$transaction(async (tx) => {
      await tx.fulfillmentItem.updateMany({
        where: { checkoutOrderId: input.created.order.id },
        data: {
          status: 'CANCELLED',
          lastError: stringifyYooKassaCancellation(input.paymentObject),
        },
      });
      await releaseReservedCapacityInTransaction(tx, input.created.order.id);
    });
  }
  return created;
}

async function persistCreatedYooKassaAdmissionPayment(input: {
  created: CreatedYooKassaCheckoutRows;
  paymentObject: YooKassaPaymentObject;
  supplier: StubCheckoutSupplierRow;
  totals: StubCheckoutTotalsDto;
  returnUrl: string;
}): Promise<CreatedYooKassaCheckoutRows> {
  const providerStatus = mapYooKassaPaymentStatus(input.paymentObject.status);
  const confirmationUrl = input.paymentObject.confirmation?.confirmation_url || null;
  const payment = await prisma.payment.update({
    where: { id: input.created.payment.id },
    data: {
      status: providerStatus,
      providerPaymentId: input.paymentObject.id,
      confirmationUrl,
      rawPayload: buildYooKassaPaymentRawPayload(input.paymentObject, input.returnUrl),
      ...(providerStatus === 'SUCCEEDED'
        ? { paidAt: new Date(), capturedAt: new Date() }
        : {}),
      ...(providerStatus === 'CANCELLED'
        ? { cancelledAt: new Date(), error: stringifyYooKassaCancellation(input.paymentObject) }
        : {}),
    },
    select: yookassaPaymentResultSelect,
  });
  const order = await prisma.checkoutOrder.update({
    where: { id: input.created.order.id },
    data: {
      checkoutUrl: confirmationUrl,
      ...(providerStatus === 'SUCCEEDED'
        ? { status: 'CONFIRMED', paidAt: new Date(), confirmedAt: new Date() }
        : {}),
      ...(providerStatus === 'CANCELLED'
        ? { status: 'CANCELLED', cancelledAt: new Date() }
        : {}),
    },
    select: yookassaOrderResultSelect,
  });
  const created = { ...input.created, order, payment };
  if (providerStatus === 'SUCCEEDED') {
    return finalizeYooKassaPaidCheckout({
      created,
      supplier: input.supplier,
      totals: input.totals,
    });
  }
  if (providerStatus === 'CANCELLED') {
    await prisma.$transaction(async (tx) => {
      await tx.fulfillmentItem.updateMany({
        where: { checkoutOrderId: input.created.order.id },
        data: {
          status: 'CANCELLED',
          lastError: stringifyYooKassaCancellation(input.paymentObject),
        },
      });
      await releaseReservedCapacityInTransaction(tx, input.created.order.id);
    });
  }
  return created;
}

async function applyYooKassaPaymentObject(
  paymentObject: YooKassaPaymentObject,
  options: { now: Date },
): Promise<{
  result: YooKassaWebhookResultDto['result'];
  paymentDbId: string | null;
  paymentStatus: string | null;
  orderId: string | null;
  publicCode: string | null;
}> {
  const payment = await prisma.payment.findUnique({
    where: { providerPaymentId: paymentObject.id },
    include: {
      order: {
        include: {
          items: true,
          fulfillmentItems: true,
        },
      },
    },
  });
  if (!payment) {
    return {
      result: 'not_found',
      paymentDbId: null,
      paymentStatus: paymentObject.status,
      orderId: null,
      publicCode: null,
    };
  }

  const providerStatus = mapYooKassaPaymentStatus(paymentObject.status);
  const orderId = payment.checkoutOrderId;
  const publicCode = payment.order.publicCode || null;
  const wasTerminal = ['SUCCEEDED', 'CANCELLED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED'].includes(String(payment.status));
  await prisma.paymentEventLog.create({
    data: {
      provider: 'YOOKASSA',
      eventType: `payment.${paymentObject.status}`,
      paymentId: payment.id,
      providerEventId: paymentObject.id,
      idempotencyKey: `payment.${paymentObject.status}:${paymentObject.id}:${options.now.toISOString()}`,
      payload: paymentObject as unknown as Prisma.InputJsonValue,
    },
  }).catch((error) => {
    if (!isPrismaUniqueViolation(error)) throw error;
  });

  if (providerStatus === 'SUCCEEDED') {
    const updated = await prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'SUCCEEDED',
          rawPayload: paymentObject as unknown as Prisma.InputJsonValue,
          paidAt: payment.paidAt || options.now,
          capturedAt: payment.capturedAt || options.now,
        },
        select: yookassaPaymentResultSelect,
      });
      const order = await tx.checkoutOrder.update({
        where: { id: orderId },
        data: {
          status: 'CONFIRMED',
          paidAt: payment.order.paidAt || options.now,
          confirmedAt: payment.order.confirmedAt || options.now,
        },
        select: yookassaOrderResultSelect,
      });
      const item = await confirmFirstCheckoutItem(tx, orderId, options.now);
      const fulfillment = await confirmFirstFulfillment(tx, {
        orderId,
        publicCode: order.publicCode || publicCode,
        quantity: item.quantity,
        now: options.now,
      });
      const saleAlreadyLogged = await tx.supplierLedgerEntry.count({
        where: { paymentId: payment.id, type: 'SALE' },
      });
      if (!saleAlreadyLogged && item.supplierId) {
        await writeSupplierLedgerEntries(tx, {
          supplierId: item.supplierId,
          orderId,
          itemId: item.id,
          paymentId: payment.id,
          publicCode: order.publicCode || order.id.slice(-7),
          totals: totalsFromOrderAndItem(order, item),
          mode: 'YOOKASSA',
        });
      }
      return { order, payment: updatedPayment, item, fulfillment };
    });
    return {
      result: 'processed',
      paymentDbId: updated.payment.id,
      paymentStatus: updated.payment.status,
      orderId,
      publicCode,
    };
  }

  if (providerStatus === 'CANCELLED' || providerStatus === 'FAILED') {
    const shouldReleaseCapacity = !wasTerminal && !['CONFIRMED', 'FULFILLED'].includes(String(payment.order.status));
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: providerStatus,
          rawPayload: paymentObject as unknown as Prisma.InputJsonValue,
          cancelledAt: providerStatus === 'CANCELLED' ? options.now : payment.cancelledAt,
          error: stringifyYooKassaCancellation(paymentObject),
        },
      });
      if (!['CONFIRMED', 'FULFILLED', 'REFUNDED'].includes(String(payment.order.status))) {
        await tx.checkoutOrder.update({
          where: { id: orderId },
          data: {
            status: providerStatus === 'CANCELLED' ? 'CANCELLED' : 'FAILED',
            cancelledAt: providerStatus === 'CANCELLED' ? options.now : payment.order.cancelledAt,
          },
        });
        await tx.fulfillmentItem.updateMany({
          where: { checkoutOrderId: orderId },
          data: {
            status: providerStatus === 'CANCELLED' ? 'CANCELLED' : 'FAILED',
            lastError: stringifyYooKassaCancellation(paymentObject),
          },
        });
        if (shouldReleaseCapacity) await releaseReservedCapacityInTransaction(tx, orderId);
      }
    });
    return {
      result: 'processed',
      paymentDbId: payment.id,
      paymentStatus: providerStatus,
      orderId,
      publicCode,
    };
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: providerStatus,
      rawPayload: paymentObject as unknown as Prisma.InputJsonValue,
    },
  });
  return {
    result: 'processed',
    paymentDbId: payment.id,
    paymentStatus: providerStatus,
    orderId,
    publicCode,
  };
}

async function finalizeYooKassaPaidCheckout(input: {
  created: CreatedYooKassaCheckoutRows;
  supplier: StubCheckoutSupplierRow;
  totals: StubCheckoutTotalsDto;
}): Promise<CreatedYooKassaCheckoutRows> {
  return prisma.$transaction(async (tx) => {
    const item = await tx.checkoutItem.update({
      where: { id: input.created.item.id },
      data: {
        status: 'CONFIRMED',
        issuedAt: new Date(),
      },
      select: yookassaItemResultSelect,
    });
    const ticketNumbers = buildInternalTicketNumbers({
      publicCode: input.created.order.publicCode,
      orderId: input.created.order.id,
      quantity: item.quantity,
    });
    const fulfillment = await tx.fulfillmentItem.update({
      where: { id: input.created.fulfillment.id },
      data: {
        status: 'CONFIRMED',
        providerData: withIssuedTicketNumbers(input.created.fulfillment.providerData, ticketNumbers, new Date()),
      },
      select: yookassaFulfillmentResultSelect,
    });
    const saleAlreadyLogged = await tx.supplierLedgerEntry.count({
      where: { paymentId: input.created.payment.id, type: 'SALE' },
    });
    if (!saleAlreadyLogged) {
      await writeSupplierLedgerEntries(tx, {
        supplierId: input.supplier.id,
        orderId: input.created.order.id,
        itemId: item.id,
        paymentId: input.created.payment.id,
        publicCode: input.created.order.publicCode || input.created.order.id.slice(-7),
        totals: input.totals,
        mode: 'YOOKASSA',
      });
    }
    return {
      ...input.created,
      item,
      fulfillment,
    };
  });
}

async function loadCreatedRowsForIdempotencyKey(key: string): Promise<CreatedYooKassaCheckoutRows | null> {
  const paymentLookup = await prisma.payment.findUnique({
    where: { idempotenceKey: key },
    select: { id: true, checkoutOrderId: true },
  });
  if (!paymentLookup) return null;
  const [order, item, payment, fulfillment] = await Promise.all([
    prisma.checkoutOrder.findUnique({
      where: { id: paymentLookup.checkoutOrderId },
      select: yookassaOrderResultSelect,
    }),
    prisma.checkoutItem.findFirst({
      where: { checkoutOrderId: paymentLookup.checkoutOrderId },
      orderBy: { createdAt: 'asc' },
      select: yookassaItemResultSelect,
    }),
    prisma.payment.findUnique({
      where: { id: paymentLookup.id },
      select: yookassaPaymentResultSelect,
    }),
    prisma.fulfillmentItem.findFirst({
      where: { checkoutOrderId: paymentLookup.checkoutOrderId },
      orderBy: { createdAt: 'asc' },
      select: yookassaFulfillmentResultSelect,
    }),
  ]);
  if (!order || !item || !payment || !fulfillment) return null;
  return { order, item, payment, fulfillment };
}

async function markYooKassaCreateAttemptErrored(
  created: CreatedYooKassaCheckoutRows,
  error: unknown,
): Promise<void> {
  await prisma.payment.update({
    where: { id: created.payment.id },
    data: {
      error: errorToMessage(error),
      rawPayload: {
        localError: errorToMessage(error),
        note: 'Local order is kept pending because remote YooKassa payment may have been created.',
      },
    },
  }).catch(() => undefined);
}

async function failCreatedYooKassaCheckout(created: CreatedYooKassaCheckoutRows, error: unknown): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: created.payment.id },
      data: {
        status: 'FAILED',
        error: errorToMessage(error),
      },
    });
    await tx.checkoutOrder.update({
      where: { id: created.order.id },
      data: {
        status: 'FAILED',
        cancelledAt: new Date(),
      },
    });
    await tx.fulfillmentItem.update({
      where: { id: created.fulfillment.id },
      data: {
        status: 'FAILED',
        lastError: errorToMessage(error),
      },
    });
    await releaseReservedCapacityInTransaction(tx, created.order.id);
  });
}

async function releaseReservedCapacityInTransaction(tx: Prisma.TransactionClient, orderId: string): Promise<void> {
  const items = await tx.checkoutItem.findMany({
    where: {
      checkoutOrderId: orderId,
      status: 'RESERVED',
    },
    select: {
      id: true,
      eventId: true,
      sessionId: true,
      admissionProductId: true,
      quantity: true,
    },
  });
  for (const item of items) {
    const claimed = await tx.checkoutItem.updateMany({
      where: {
        id: item.id,
        status: 'RESERVED',
      },
      data: { status: 'CANCELLED' },
    });
    if (claimed.count !== 1) continue;
    if (item.sessionId) {
      await tx.eventSession.updateMany({
        where: { id: item.sessionId, ticketsVacant: { not: null } },
        data: {
          ticketsVacant: { increment: item.quantity },
          capacitySold: { decrement: item.quantity },
        },
      });
    }
    if (item.eventId) {
      await tx.event.updateMany({
        where: { id: item.eventId, ticketsVacant: { not: null } },
        data: {
          ticketsVacant: { increment: item.quantity },
        },
      });
    }
    if (item.admissionProductId) {
      await tx.admissionProduct.updateMany({
        where: { id: item.admissionProductId, ticketsVacant: { not: null } },
        data: {
          ticketsVacant: { increment: item.quantity },
        },
      });
    }
  }
}

async function confirmFirstCheckoutItem(tx: Prisma.TransactionClient, orderId: string, now: Date) {
  const item = await tx.checkoutItem.findFirst({
    where: { checkoutOrderId: orderId },
    orderBy: { createdAt: 'asc' },
    select: yookassaItemResultSelect,
  });
  if (!item) throw new YooKassaCheckoutError('YOOKASSA_WEBHOOK_PAYMENT_NOT_FOUND', 404, [], 'Checkout item not found');
  return tx.checkoutItem.update({
    where: { id: item.id },
    data: {
      status: 'CONFIRMED',
      issuedAt: now,
    },
    select: yookassaItemResultSelect,
  });
}

async function confirmFirstFulfillment(
  tx: Prisma.TransactionClient,
  input: {
    orderId: string;
    publicCode: string | null;
    quantity: number;
    now: Date;
  },
) {
  const fulfillment = await tx.fulfillmentItem.findFirst({
    where: { checkoutOrderId: input.orderId },
    orderBy: { createdAt: 'asc' },
    select: yookassaFulfillmentResultSelect,
  });
  if (!fulfillment) {
    throw new YooKassaCheckoutError('YOOKASSA_WEBHOOK_PAYMENT_NOT_FOUND', 404, [], 'Fulfillment item not found');
  }
  const ticketNumbers = buildInternalTicketNumbers({
    publicCode: input.publicCode,
    orderId: input.orderId,
    quantity: input.quantity,
  });
  return tx.fulfillmentItem.update({
    where: { id: fulfillment.id },
    data: {
      status: 'CONFIRMED',
      providerData: withIssuedTicketNumbers(fulfillment.providerData, ticketNumbers, input.now),
    },
    select: yookassaFulfillmentResultSelect,
  });
}

function mapYooKassaCheckoutResult(input: {
  created: CreatedYooKassaCheckoutRows;
  event: StubCheckoutEventRow;
  offer: StubCheckoutOfferRow;
  session: StubCheckoutSessionRow | null;
  supplier: StubCheckoutSupplierRow;
  totals: StubCheckoutTotalsDto;
  subjectType: CheckoutSubjectType;
  warnings: StubCheckoutIssueDto[];
}): YooKassaCheckoutResultDto {
  const publicCode = input.created.order.publicCode || input.created.order.id.slice(-7);
  const ticketNumbers = ticketNumbersFromFulfillment(input.created.fulfillment);
  return {
    generatedAt: new Date().toISOString(),
    mode: 'YOOKASSA',
    order: {
      id: input.created.order.id,
      publicCode,
      status: input.created.order.status,
      createdAt: input.created.order.createdAt.toISOString(),
      paidAt: toIso(input.created.order.paidAt),
      confirmedAt: toIso(input.created.order.confirmedAt),
      checkoutUrl: input.created.order.checkoutUrl,
      expiresAt: toIso(input.created.order.expiresAt),
      ticketNumber: ticketNumbers[0] || null,
      ticketNumbers,
      buyer: {
        email: input.created.order.buyerEmail || '',
        name: input.created.order.buyerName || null,
        phone: input.created.order.buyerPhone || null,
      },
      subject: {
        type: input.subjectType,
        eventId: input.event.id,
        eventSlug: input.event.slug,
        eventTitle: input.event.title,
        eventKind: String(input.event.kind),
        admissionProductId: null,
        admissionProductSlug: null,
        admissionProductTitle: null,
        admissionProductType: null,
        cityId: input.event.primaryCity?.id || null,
        citySlug: input.event.primaryCity?.slug || null,
        cityTitle: input.event.primaryCity?.title || null,
        venueId: input.event.venue?.id || null,
        venueSlug: input.event.venue?.slug || null,
        venueTitle: input.event.venue?.title || null,
      },
      item: {
        id: input.created.item.id,
        supplierId: input.created.item.supplierId || input.supplier.id,
        supplierTitle: input.supplier.title,
        offerId: input.offer.id,
        offerTitle: input.offer.title || null,
        sessionId: input.session?.id || null,
        startsAt: toIso(input.session?.startsAt),
        quantity: input.created.item.quantity,
        ticketTitle: input.created.item.ticketTitle || input.offer.title || null,
        status: input.created.item.status,
      },
      totals: input.totals,
      payment: {
        id: input.created.payment.id,
        provider: 'YOOKASSA',
        status: input.created.payment.status,
        amountKopecks: input.created.payment.amountKopecks,
        providerPaymentId: input.created.payment.providerPaymentId,
        confirmationUrl: input.created.payment.confirmationUrl,
        paidAt: toIso(input.created.payment.paidAt),
      },
      fulfillment: {
        id: input.created.fulfillment.id,
        status: input.created.fulfillment.status,
        provider: 'INTERNAL',
        purchaseFlow: 'PLATFORM',
      },
    },
    warnings: input.warnings,
  };
}

function mapYooKassaAdmissionCheckoutResult(input: {
  created: CreatedYooKassaCheckoutRows;
  product: StubCheckoutAdmissionProductRow;
  offer: StubCheckoutAdmissionOfferRow;
  supplier: StubCheckoutSupplierRow;
  totals: StubCheckoutTotalsDto;
  warnings: StubCheckoutIssueDto[];
}): YooKassaCheckoutResultDto {
  const publicCode = input.created.order.publicCode || input.created.order.id.slice(-7);
  const city = input.product.city || input.product.venue.city || null;
  const ticketNumbers = ticketNumbersFromFulfillment(input.created.fulfillment);
  return {
    generatedAt: new Date().toISOString(),
    mode: 'YOOKASSA',
    order: {
      id: input.created.order.id,
      publicCode,
      status: input.created.order.status,
      createdAt: input.created.order.createdAt.toISOString(),
      paidAt: toIso(input.created.order.paidAt),
      confirmedAt: toIso(input.created.order.confirmedAt),
      checkoutUrl: input.created.order.checkoutUrl,
      expiresAt: toIso(input.created.order.expiresAt),
      ticketNumber: ticketNumbers[0] || null,
      ticketNumbers,
      buyer: {
        email: input.created.order.buyerEmail || '',
        name: input.created.order.buyerName || null,
        phone: input.created.order.buyerPhone || null,
      },
      subject: {
        type: 'VENUE_ADMISSION',
        eventId: null,
        eventSlug: null,
        eventTitle: null,
        eventKind: null,
        admissionProductId: input.product.id,
        admissionProductSlug: input.product.slug,
        admissionProductTitle: input.product.title,
        admissionProductType: String(input.product.type),
        cityId: city?.id || null,
        citySlug: city?.slug || null,
        cityTitle: city?.title || null,
        venueId: input.product.venue.id,
        venueSlug: input.product.venue.slug,
        venueTitle: input.product.venue.title,
      },
      item: {
        id: input.created.item.id,
        supplierId: input.created.item.supplierId || input.supplier.id,
        supplierTitle: input.supplier.title,
        offerId: input.offer.id,
        offerTitle: input.offer.title || null,
        sessionId: null,
        startsAt: null,
        quantity: input.created.item.quantity,
        ticketTitle: input.created.item.ticketTitle || input.offer.title || null,
        status: input.created.item.status,
      },
      totals: input.totals,
      payment: {
        id: input.created.payment.id,
        provider: 'YOOKASSA',
        status: input.created.payment.status,
        amountKopecks: input.created.payment.amountKopecks,
        providerPaymentId: input.created.payment.providerPaymentId,
        confirmationUrl: input.created.payment.confirmationUrl,
        paidAt: toIso(input.created.payment.paidAt),
      },
      fulfillment: {
        id: input.created.fulfillment.id,
        status: input.created.fulfillment.status,
        provider: 'INTERNAL',
        purchaseFlow: 'PLATFORM',
      },
    },
    warnings: input.warnings,
  };
}

function extractYooKassaWebhookEvent(payload: unknown): {
  providerEventId: string | null;
  eventType: string;
  paymentId: string | null;
  status: string | null;
  paymentObject: YooKassaPaymentObject;
  rawPayload: Record<string, unknown>;
} {
  const rawPayload = asRecord(payload);
  const object = asRecord(rawPayload.object);
  const paymentObject = object as unknown as YooKassaPaymentObject;
  return {
    providerEventId: cleanString(rawPayload.id) || cleanString(rawPayload.event_id) || cleanString(rawPayload.notification_id),
    eventType: cleanString(rawPayload.event) || 'payment.unknown',
    paymentId: cleanString(object.id),
    status: cleanString(object.status),
    paymentObject,
    rawPayload,
  };
}

function buildYooKassaWebhookDedupeKey(event: ReturnType<typeof extractYooKassaWebhookEvent>): string {
  if (event.providerEventId) return `yookassa:event:${event.providerEventId}`;
  return `yookassa:${event.eventType}:${event.paymentId}:${event.status || 'unknown'}`;
}

function assertYooKassaWebhookPaymentMatches(
  event: ReturnType<typeof extractYooKassaWebhookEvent>,
  paymentObject: YooKassaPaymentObject,
): void {
  const actualPaymentId = cleanString(paymentObject.id);
  if (!actualPaymentId || actualPaymentId !== event.paymentId) {
    throw new YooKassaCheckoutError('YOOKASSA_PAYMENT_FAILED', 400, [], 'YooKassa webhook payment id mismatch');
  }
}

export function buildYooKassaCatalogResultReturnUrl(
  returnUrlOrBase: string | null | undefined,
  publicCode: string | null,
): string {
  const raw = cleanString(returnUrlOrBase) || DEFAULT_ADMISSION_RETURN_URL;
  const code = cleanString(publicCode);
  const fallback = new URL(DEFAULT_ADMISSION_RETURN_URL);
  let url: URL;
  try {
    url = new URL(raw.includes('://')
      ? raw
      : `${DEFAULT_RETURN_BASE_URL}${raw.startsWith('/') ? raw : `/${raw}`}`);
  } catch {
    url = fallback;
  }

  const host = url.hostname.toLowerCase();
  if (host === 'pay.daibilet.ru' || host === 'checkout.daibilet.ru' || host === 'finance-api.daibilet.ru') {
    url = fallback;
  }

  if (!url.pathname || url.pathname === '/') {
    url.pathname = CHECKOUT_RESULT_PATH;
  } else {
    url.pathname = url.pathname.replace(/\/+$/, '') || CHECKOUT_RESULT_PATH;
  }

  if (code && !url.searchParams.has('order')) {
    url.searchParams.set('order', code);
  }
  return url.toString();
}

function buildYooKassaPaymentRawPayload(
  paymentObject: YooKassaPaymentObject,
  returnUrl: string,
): Prisma.InputJsonValue {
  return {
    ...(paymentObject as unknown as Record<string, unknown>),
    daibilet: {
      returnUrl,
    },
  } satisfies Prisma.InputJsonObject;
}

function buildInternalTicketNumbers(input: {
  publicCode: string | null;
  orderId: string;
  quantity: number;
}): string[] {
  const base = (cleanString(input.publicCode) || input.orderId.slice(-8)).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const quantity = Math.max(1, Math.min(50, Math.trunc(input.quantity || 1)));
  return Array.from({ length: quantity }, (_, index) => `TKT-${base}-${String(index + 1).padStart(2, '0')}`);
}

function withIssuedTicketNumbers(
  providerData: Prisma.JsonValue,
  ticketNumbers: string[],
  issuedAt: Date,
): Prisma.InputJsonObject {
  const existing = asRecord(providerData);
  const current = ticketNumbersFromProviderData(existing);
  const numbers = current.length ? current : ticketNumbers;
  return {
    ...existing,
    ticketNumber: numbers[0] || null,
    ticketNumbers: numbers,
    issuedAt: issuedAt.toISOString(),
  };
}

function ticketNumbersFromFulfillment(
  fulfillment: Pick<CreatedYooKassaCheckoutRows['fulfillment'], 'providerData'>,
): string[] {
  return ticketNumbersFromProviderData(asRecord(fulfillment.providerData));
}

function ticketNumbersFromProviderData(providerData: Record<string, unknown>): string[] {
  const rawList = Array.isArray(providerData.ticketNumbers) ? providerData.ticketNumbers : [];
  const list = rawList.map((value) => cleanString(value)).filter((value): value is string => Boolean(value));
  const single = cleanString(providerData.ticketNumber);
  return list.length ? list : single ? [single] : [];
}

function hashYooKassaCheckoutPayload(payload: YooKassaCheckoutCreateDto): string {
  const stablePayload = {
    subjectType: cleanString(payload.subjectType),
    eventId: cleanString(payload.eventId),
    eventSlug: cleanString(payload.eventSlug),
    admissionProductId: cleanString(payload.admissionProductId),
    admissionProductSlug: cleanString(payload.admissionProductSlug),
    offerId: cleanString(payload.offerId),
    admissionOfferId: cleanString(payload.admissionOfferId),
    sessionId: cleanString(payload.sessionId),
    quantity: Math.trunc(Number(payload.quantity || 0)),
    buyerEmail: cleanString(payload.buyer?.email)?.toLowerCase() || '',
    buyerPhone: cleanString(payload.buyer?.phone),
    attendeeName: cleanString(payload.attendee?.name),
    attendeePhone: cleanString(payload.attendee?.phone),
    returnUrl: cleanString(payload.returnUrl),
  };
  return createHash('sha256').update(JSON.stringify(stablePayload)).digest('hex');
}

function assertYooKassaApiConfig(config: YooKassaRuntimeConfig): void {
  if (!config.enabled) {
    throw new YooKassaCheckoutError('YOOKASSA_CHECKOUT_DISABLED', 403);
  }
  if (!config.shopId || !config.secretKey) {
    throw new YooKassaCheckoutError('YOOKASSA_CONFIG_MISSING', 500);
  }
}

async function reserveYooKassaIdempotencyKey(
  key: string,
  eventId: string,
  payloadHash: string,
): Promise<YooKassaCheckoutResultDto | null> {
  try {
    await prisma.idempotencyKey.create({
      data: {
        scope: YOOKASSA_CREATE_SCOPE,
        key,
        entityId: eventId,
        status: 'IN_PROGRESS',
        metaJson: { mode: 'YOOKASSA', payloadHash },
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    return null;
  } catch (error) {
    if (!isPrismaUniqueViolation(error)) throw error;
  }

  const existing = await prisma.idempotencyKey.findUnique({
    where: {
      scope_key: {
        scope: YOOKASSA_CREATE_SCOPE,
        key,
      },
    },
  });
  assertSameIdempotencyPayload(existing?.metaJson, payloadHash);
  if (existing?.status === 'SUCCEEDED' && existing.response) {
    return existing.response as unknown as YooKassaCheckoutResultDto;
  }
  if (existing?.status === 'IN_PROGRESS') {
    throw new YooKassaCheckoutError('IDEMPOTENCY_IN_PROGRESS', 409);
  }
  await prisma.idempotencyKey.update({
    where: {
      scope_key: {
        scope: YOOKASSA_CREATE_SCOPE,
        key,
      },
    },
    data: {
      entityId: eventId,
      status: 'IN_PROGRESS',
      metaJson: { mode: 'YOOKASSA', payloadHash },
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  return null;
}

function assertSameIdempotencyPayload(metaJson: unknown, payloadHash: string): void {
  const meta = asRecord(metaJson);
  const existingHash = cleanString(meta.payloadHash);
  if (existingHash && existingHash !== payloadHash) {
    throw new YooKassaCheckoutError('IDEMPOTENCY_CONFLICT', 409, [], 'Idempotency-Key payload mismatch');
  }
}

async function markYooKassaIdempotencySucceeded(
  key: string | null,
  orderId: string,
  result: YooKassaCheckoutResultDto,
): Promise<void> {
  if (!key) return;
  await prisma.idempotencyKey.update({
    where: {
      scope_key: {
        scope: YOOKASSA_CREATE_SCOPE,
        key,
      },
    },
    data: {
      entityId: orderId,
      status: 'SUCCEEDED',
      response: result as unknown as Prisma.InputJsonValue,
    },
  });
}

async function markYooKassaIdempotencyLocalRows(
  key: string,
  orderId: string,
  paymentId: string,
  payloadHash: string,
): Promise<void> {
  await prisma.idempotencyKey.update({
    where: {
      scope_key: {
        scope: YOOKASSA_CREATE_SCOPE,
        key,
      },
    },
    data: {
      entityId: orderId,
      metaJson: {
        mode: 'YOOKASSA',
        payloadHash,
        orderId,
        paymentId,
      },
    },
  });
}

async function markYooKassaIdempotencyFailed(key: string | null, eventId: string): Promise<void> {
  if (!key) return;
  await prisma.idempotencyKey.updateMany({
    where: {
      scope: YOOKASSA_CREATE_SCOPE,
      key,
      status: 'IN_PROGRESS',
    },
    data: {
      entityId: eventId,
      status: 'FAILED',
    },
  });
}

function summarizeYooKassaReconcileResult(input: {
  generatedAt: string;
  dryRun: boolean;
  limit: number;
  orders: YooKassaReconcileOrderDto[];
}): YooKassaReconcileResultDto {
  const summary: YooKassaReconcileResultDto = {
    generatedAt: input.generatedAt,
    dryRun: input.dryRun,
    limit: input.limit,
    checked: input.orders.length,
    processed: 0,
    succeeded: 0,
    cancelled: 0,
    expired: 0,
    failed: 0,
    skipped: 0,
    orders: input.orders,
  };
  for (const order of input.orders) {
    if (order.action === 'SKIPPED_NOT_EXPIRED' || order.action === 'SKIPPED_NO_PAYMENT') {
      summary.skipped += 1;
      continue;
    }
    if (order.action === 'FAILED') {
      summary.failed += 1;
      continue;
    }
    if (!input.dryRun) summary.processed += 1;
    if (order.action === 'REMOTE_SUCCEEDED') summary.succeeded += 1;
    if (order.action === 'REMOTE_CANCELLED') summary.cancelled += 1;
    if (order.action === 'LOCAL_EXPIRED_WITHOUT_PROVIDER_PAYMENT') summary.expired += 1;
    if (order.action === 'REMOTE_FAILED') summary.failed += 1;
  }
  return summary;
}

function reasonForYooKassaReconcileAction(action: YooKassaReconcileAction, dryRun: boolean): string {
  const prefix = dryRun ? 'Would apply: ' : '';
  switch (action) {
    case 'REMOTE_SUCCEEDED':
      return `${prefix}remote YooKassa payment succeeded.`;
    case 'REMOTE_CANCELLED':
      return `${prefix}remote YooKassa payment was cancelled.`;
    case 'REMOTE_FAILED':
      return `${prefix}remote YooKassa status maps to local failed payment.`;
    case 'REMOTE_WAITING':
      return `${prefix}remote YooKassa payment is waiting for capture; capacity remains reserved.`;
    case 'REMOTE_PENDING':
      return `${prefix}remote YooKassa payment is still pending; capacity remains reserved.`;
    case 'LOCAL_EXPIRED_WITHOUT_PROVIDER_PAYMENT':
      return `${prefix}local order can be expired because provider payment id is missing.`;
    case 'SKIPPED_NOT_EXPIRED':
      return 'Order is not expired yet.';
    case 'SKIPPED_NO_PAYMENT':
      return 'Order has no local YooKassa payment row.';
    case 'FAILED':
      return 'Reconcile failed.';
  }
}

function normalizeReconcileLimit(value: number | undefined): number {
  if (!Number.isFinite(value)) return 50;
  return Math.min(500, Math.max(1, Math.trunc(Number(value))));
}

function totalsFromOrderAndItem(
  order: Pick<CreatedYooKassaCheckoutRows['order'], 'currency' | 'subtotalKopecks' | 'discountKopecks' | 'totalKopecks' | 'commissionKopecks'>,
  item: Pick<CreatedYooKassaCheckoutRows['item'], 'unitPriceKopecks'>,
): StubCheckoutTotalsDto {
  return {
    currency: order.currency === 'RUB' ? 'RUB' : 'RUB',
    unitPriceKopecks: item.unitPriceKopecks,
    subtotalKopecks: order.subtotalKopecks,
    discountKopecks: order.discountKopecks,
    totalKopecks: order.totalKopecks,
    commissionKopecks: order.commissionKopecks,
    netKopecks: order.totalKopecks - order.commissionKopecks,
  };
}

function trimForYooKassaDescription(value: string): string {
  return value.trim().slice(0, 128);
}

async function readResponseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function stringifyYooKassaCancellation(paymentObject: YooKassaPaymentObject): string | null {
  return paymentObject.cancellation_details ? JSON.stringify(paymentObject.cancellation_details) : null;
}

function cleanString(value: unknown): string | null {
  const cleaned = String(value || '').trim();
  return cleaned ? cleaned : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function issue(
  code: StubCheckoutIssueDto['code'],
  label: string,
  severity: StubCheckoutIssueDto['severity'],
): StubCheckoutIssueDto {
  return { code, label, severity };
}

function errorToMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error || 'Unknown YooKassa checkout error');
}

function isPrismaUniqueViolation(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && (error as { code?: unknown }).code === 'P2002');
}

const yookassaOfferSelect = {
  id: true,
  eventId: true,
  sourceCode: true,
  title: true,
  priceRub: true,
  active: true,
  capacityTotal: true,
} satisfies Prisma.EventOfferSelect;

const yookassaAdmissionOfferSelect = {
  id: true,
  admissionProductId: true,
  sourceCode: true,
  title: true,
  priceRub: true,
  active: true,
  capacityTotal: true,
} satisfies Prisma.AdmissionOfferSelect;

const yookassaSessionSelect = {
  id: true,
  eventId: true,
  startsAt: true,
  endsAt: true,
  isActive: true,
  cancelledAt: true,
  ticketsVacant: true,
  capacityTotal: true,
  capacitySold: true,
} satisfies Prisma.EventSessionSelect;

const yookassaOrderResultSelect = {
  ...checkoutOrderResultSelect,
  currency: true,
  subtotalKopecks: true,
  discountKopecks: true,
  totalKopecks: true,
  commissionKopecks: true,
  checkoutUrl: true,
  expiresAt: true,
} satisfies Prisma.CheckoutOrderSelect;

const yookassaItemResultSelect = {
  ...checkoutItemResultSelect,
  unitPriceKopecks: true,
  totalKopecks: true,
  commissionKopecks: true,
} satisfies Prisma.CheckoutItemSelect;

const yookassaPaymentResultSelect = {
  ...paymentResultSelect,
  confirmationUrl: true,
} satisfies Prisma.PaymentSelect;

const yookassaFulfillmentResultSelect = {
  ...fulfillmentResultSelect,
  providerData: true,
} satisfies Prisma.FulfillmentItemSelect;

const yookassaReconcileCandidateSelect = {
  id: true,
  publicCode: true,
  status: true,
  expiresAt: true,
  payments: {
    where: { provider: 'YOOKASSA' },
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: {
      id: true,
      status: true,
      providerPaymentId: true,
    },
  },
} satisfies Prisma.CheckoutOrderSelect;
