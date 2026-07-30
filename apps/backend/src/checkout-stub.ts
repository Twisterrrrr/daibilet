import { randomInt } from 'node:crypto';
import type {
  CheckoutSubjectType,
  StubCheckoutCreateDto,
  StubCheckoutErrorDto,
  StubCheckoutIssueCode,
  StubCheckoutIssueDto,
  StubCheckoutResultDto,
  StubCheckoutTotalsDto,
} from '@daibilet/contracts/checkout';
import { prisma, type Prisma } from '@daibilet/db';

const MIN_PRICE_RUB = 100;
const MIN_QUANTITY = 1;
const MAX_QUANTITY = 10;
const STUB_CHECKOUT_SCOPE = 'CHECKOUT_CREATE';

const stubCheckoutEventInclude = {
  supplier: {
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      defaultCommissionBps: true,
    },
  },
  supplierLinks: {
    where: { isActive: true },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    take: 5,
    select: {
      isPrimary: true,
      catalogMode: true,
      managementMode: true,
      supplier: {
        select: {
          id: true,
          slug: true,
          title: true,
          status: true,
          defaultCommissionBps: true,
        },
      },
    },
  },
  venue: {
    select: {
      id: true,
      slug: true,
      title: true,
      kind: true,
    },
  },
  primaryCity: {
    select: {
      id: true,
      slug: true,
      title: true,
    },
  },
} satisfies Prisma.EventInclude;

const stubCheckoutOfferSelect = {
  id: true,
  eventId: true,
  sourceCode: true,
  title: true,
  priceRub: true,
  active: true,
  capacityTotal: true,
} satisfies Prisma.EventOfferSelect;

const stubCheckoutSessionSelect = {
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

type StubCheckoutEventRow = Prisma.EventGetPayload<{ include: typeof stubCheckoutEventInclude }>;
type StubCheckoutOfferRow = Prisma.EventOfferGetPayload<{ select: typeof stubCheckoutOfferSelect }>;
type StubCheckoutSessionRow = Prisma.EventSessionGetPayload<{ select: typeof stubCheckoutSessionSelect }>;
type StubCheckoutSupplierRow = NonNullable<StubCheckoutEventRow['supplier']> | StubCheckoutEventRow['supplierLinks'][number]['supplier'];

interface StubCheckoutValidationInput {
  enabled: boolean;
  now: Date;
  event: StubCheckoutEventRow | null;
  offer: StubCheckoutOfferRow | null;
  session: StubCheckoutSessionRow | null;
  supplier: StubCheckoutSupplierRow | null;
  quantity: number;
}

interface StubCheckoutCreatedRows {
  order: {
    id: string;
    publicCode: string | null;
    status: string;
    createdAt: Date;
    paidAt: Date | null;
    confirmedAt: Date | null;
    buyerEmail: string | null;
    buyerName: string | null;
    buyerPhone: string | null;
  };
  item: {
    id: string;
    status: string;
    supplierId: string | null;
    ticketTitle: string | null;
    quantity: number;
  };
  payment: {
    id: string;
    status: string;
    amountKopecks: number;
    providerPaymentId: string | null;
    paidAt: Date | null;
  };
  fulfillment: {
    id: string;
    status: string;
    provider: string;
    purchaseFlow: string;
  };
}

export class StubCheckoutError extends Error {
  readonly statusCode: number;
  readonly code: StubCheckoutErrorDto['code'];
  readonly issues: StubCheckoutIssueDto[];

  constructor(code: StubCheckoutErrorDto['code'], statusCode: number, issues: StubCheckoutIssueDto[] = []) {
    super(code);
    this.name = 'StubCheckoutError';
    this.code = code;
    this.statusCode = statusCode;
    this.issues = issues;
  }

  toDto(): StubCheckoutErrorDto {
    return {
      error: 'stub_checkout_error',
      code: this.code,
      message: this.message,
      issues: this.issues,
    };
  }
}

export function isStubCheckoutError(error: unknown): error is StubCheckoutError {
  return error instanceof StubCheckoutError;
}

export function isStubCheckoutEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.DAIBILET_STUB_CHECKOUT === '1') return true;
  if (env.DAIBILET_STUB_CHECKOUT === '0') return false;
  return env.NODE_ENV === 'test';
}

export async function createStubCheckoutOrder(
  payload: StubCheckoutCreateDto,
  options: { idempotencyKey?: string | null; now?: Date } = {},
): Promise<StubCheckoutResultDto> {
  const now = options.now || new Date();
  const idempotencyKey = normalizeIdempotencyKey(options.idempotencyKey || payload.idempotencyKey);
  if (idempotencyKey) {
    const existing = await prisma.idempotencyKey.findUnique({
      where: {
        scope_key: {
          scope: STUB_CHECKOUT_SCOPE,
          key: idempotencyKey,
        },
      },
    });
    if (existing?.status === 'SUCCEEDED' && existing.response) {
      return existing.response as unknown as StubCheckoutResultDto;
    }
    if (existing?.status === 'IN_PROGRESS') {
      throw new StubCheckoutError('IDEMPOTENCY_IN_PROGRESS', 409);
    }
  }

  const normalizedPayload = normalizeStubCheckoutPayload(payload);
  const event = await loadStubCheckoutEvent(normalizedPayload);
  const [offer, session] = await Promise.all([
    event
      ? prisma.eventOffer.findFirst({
          where: { id: normalizedPayload.offerId, eventId: event.id },
          select: stubCheckoutOfferSelect,
        })
      : Promise.resolve(null),
    event && normalizedPayload.sessionId
      ? prisma.eventSession.findFirst({
          where: { id: normalizedPayload.sessionId, eventId: event.id },
          select: stubCheckoutSessionSelect,
        })
      : Promise.resolve(null),
  ]);
  const supplier = event ? resolveStubCheckoutSupplier(event) : null;
  const issues = validateStubCheckoutReadiness({
    enabled: isStubCheckoutEnabled(),
    now,
    event,
    offer,
    session,
    supplier,
    quantity: normalizedPayload.quantity,
  });
  const blocking = issues.filter((issue) => issue.severity === 'high');
  if (blocking.length) throw new StubCheckoutError(blocking[0]?.code || 'EVENT_NOT_FOUND', 422, issues);
  if (!event || !offer || !supplier) throw new StubCheckoutError('EVENT_NOT_FOUND', 404, issues);

  const replayedResult = await reserveIdempotencyKey(idempotencyKey, event.id);
  if (replayedResult) return replayedResult;

  try {
    const subjectType = classifyStubCheckoutSubject({
      eventKind: String(event.kind),
      venueKind: event.venue ? String(event.venue.kind) : null,
    });
    const totals = computeStubCheckoutTotals({
      priceRub: offer.priceRub || 0,
      quantity: normalizedPayload.quantity,
      commissionBps: supplier.defaultCommissionBps || 0,
    });
    const created = await prisma.$transaction(async (tx) => {
      await decrementCapacity(tx, event, session, normalizedPayload.quantity);
      const publicCode = await createUniquePublicCode(tx);
      const order = await tx.checkoutOrder.create({
        data: {
          publicCode,
          status: 'CONFIRMED',
          currency: 'RUB',
          subtotalKopecks: totals.subtotalKopecks,
          discountKopecks: totals.discountKopecks,
          totalKopecks: totals.totalKopecks,
          commissionKopecks: totals.commissionKopecks,
          buyerEmail: normalizedPayload.buyer.email,
          buyerPhone: normalizedPayload.buyer.phone,
          buyerName: normalizedPayload.buyer.name,
          buyerSnapshot: {
            mode: 'STUB',
            buyer: {
              email: normalizedPayload.buyer.email,
              name: normalizedPayload.buyer.name,
              phone: normalizedPayload.buyer.phone,
            },
            subjectType,
          } satisfies Prisma.InputJsonObject,
          checkoutUrl: `/purchases/${publicCode}`,
          paidAt: now,
          confirmedAt: now,
        },
        select: checkoutOrderResultSelect,
      });
      const item = await tx.checkoutItem.create({
        data: {
          checkoutOrderId: order.id,
          supplierId: supplier.id,
          eventId: event.id,
          sessionId: session?.id || null,
          offerId: offer.id,
          title: event.title,
          ticketTitle: offer.title,
          status: 'CONFIRMED',
          quantity: normalizedPayload.quantity,
          unitPriceKopecks: totals.unitPriceKopecks,
          totalKopecks: totals.totalKopecks,
          commissionKopecks: totals.commissionKopecks,
          attendeeName: normalizedPayload.attendee?.name || normalizedPayload.buyer.name,
          attendeePhone: normalizedPayload.attendee?.phone || normalizedPayload.buyer.phone,
          providerPayload: {
            mode: 'STUB',
            subjectType,
            eventSlug: event.slug,
            offerId: offer.id,
            sessionId: session?.id || null,
          },
          issuedAt: now,
        },
        select: checkoutItemResultSelect,
      });
      const payment = await tx.payment.create({
        data: {
          checkoutOrderId: order.id,
          provider: 'MANUAL',
          status: 'SUCCEEDED',
          amountKopecks: totals.totalKopecks,
          currency: 'RUB',
          providerPaymentId: `stub_${publicCode}`,
          idempotenceKey: idempotencyKey,
          paidAt: now,
          capturedAt: now,
          rawPayload: {
            mode: 'STUB',
            note: 'No real payment and no fiscal receipt.',
          },
        },
        select: paymentResultSelect,
      });
      const fulfillment = await tx.fulfillmentItem.create({
        data: {
          checkoutOrderId: order.id,
          checkoutItemId: item.id,
          lineItemIndex: 0,
          offerId: offer.id,
          purchaseFlow: 'PLATFORM',
          provider: 'STUB',
          status: 'CONFIRMED',
          amountKopecks: totals.totalKopecks,
          providerData: {
            mode: 'STUB',
            publicCode,
            subjectType,
          },
        },
        select: fulfillmentResultSelect,
      });
      await writeSupplierLedgerEntries(tx, {
        supplierId: supplier.id,
        orderId: order.id,
        itemId: item.id,
        paymentId: payment.id,
        publicCode,
        totals,
      });
      return { order, item, payment, fulfillment };
    });

    const result = mapStubCheckoutResult({
      created,
      event,
      offer,
      session,
      supplier,
      totals,
      subjectType,
      warnings: issues.filter((issue) => issue.severity !== 'high'),
    });
    await markIdempotencySucceeded(idempotencyKey, created.order.id, result);
    return result;
  } catch (error) {
    await markIdempotencyFailed(idempotencyKey, event.id);
    throw error;
  }
}

const checkoutOrderResultSelect = {
  id: true,
  publicCode: true,
  status: true,
  createdAt: true,
  paidAt: true,
  confirmedAt: true,
  buyerEmail: true,
  buyerName: true,
  buyerPhone: true,
} satisfies Prisma.CheckoutOrderSelect;

const checkoutItemResultSelect = {
  id: true,
  status: true,
  supplierId: true,
  ticketTitle: true,
  quantity: true,
} satisfies Prisma.CheckoutItemSelect;

const paymentResultSelect = {
  id: true,
  status: true,
  amountKopecks: true,
  providerPaymentId: true,
  paidAt: true,
} satisfies Prisma.PaymentSelect;

const fulfillmentResultSelect = {
  id: true,
  status: true,
  provider: true,
  purchaseFlow: true,
} satisfies Prisma.FulfillmentItemSelect;

export function validateStubCheckoutReadiness(input: StubCheckoutValidationInput): StubCheckoutIssueDto[] {
  const issues: StubCheckoutIssueDto[] = [];
  if (!input.enabled) issues.push(issue('STUB_CHECKOUT_DISABLED', 'STUB checkout выключен', 'high'));
  if (input.quantity < MIN_QUANTITY || input.quantity > MAX_QUANTITY) {
    issues.push(issue('QUANTITY_OUT_OF_RANGE', 'Количество билетов вне допустимого диапазона', 'high'));
  }
  if (!input.event) {
    issues.push(issue('EVENT_NOT_FOUND', 'Событие не найдено', 'high'));
    return issues;
  }

  if (!['READY', 'PUBLISHED'].includes(String(input.event.status))) {
    issues.push(issue('EVENT_NOT_PUBLIC', 'Событие не готово к продаже', 'high'));
  }
  if (String(input.event.purchaseFlow) !== 'PLATFORM') {
    issues.push(issue('EVENT_NOT_INTERNAL_CHECKOUT', 'Событие не подключено к checkout Daibilet', 'high'));
  }
  if (String(input.event.managementMode) !== 'DAIBILET_MANAGED') {
    issues.push(issue('EVENT_NOT_MANAGED_BY_DAIBILET', 'Событие не ведется Daibilet вручную', 'high'));
  }
  if (!input.supplier || String(input.supplier.status) !== 'ACTIVE') {
    issues.push(issue('SUPPLIER_NOT_CONFIGURED', 'Поставщик не активен или не привязан', 'high'));
  }
  if (input.event.salesStartsAt && input.event.salesStartsAt > input.now) {
    issues.push(issue('SALES_NOT_STARTED', 'Продажи еще не начались', 'high'));
  }
  if (input.event.salesEndsAt && input.event.salesEndsAt < input.now) {
    issues.push(issue('SALES_CLOSED', 'Продажи закрыты', 'high'));
  }

  validateOffer(input.offer, issues);
  if (String(input.event.kind) === 'OPEN_DATE') {
    validateOpenDate(input.event, input.now, input.quantity, issues);
  } else {
    validateSession(input.session, input.now, input.quantity, issues);
  }
  return issues;
}

export function computeStubCheckoutTotals(input: {
  priceRub: number;
  quantity: number;
  commissionBps?: number | null;
}): StubCheckoutTotalsDto {
  const quantity = Math.max(MIN_QUANTITY, Math.trunc(input.quantity || 0));
  const unitPriceKopecks = Math.max(0, Math.trunc(input.priceRub || 0) * 100);
  const subtotalKopecks = unitPriceKopecks * quantity;
  const discountKopecks = 0;
  const totalKopecks = subtotalKopecks - discountKopecks;
  const commissionBps = Math.min(10000, Math.max(0, Math.trunc(input.commissionBps || 0)));
  const commissionKopecks = Math.round((totalKopecks * commissionBps) / 10000);
  return {
    currency: 'RUB',
    unitPriceKopecks,
    subtotalKopecks,
    discountKopecks,
    totalKopecks,
    commissionKopecks,
    netKopecks: totalKopecks - commissionKopecks,
  };
}

export function classifyStubCheckoutSubject(input: {
  eventKind: string;
  venueKind?: string | null;
}): CheckoutSubjectType {
  if (input.eventKind === 'OPEN_DATE' && ['MUSEUM_ART_SPACE', 'ATTRACTION'].includes(String(input.venueKind || ''))) {
    return 'VENUE_ADMISSION';
  }
  return 'EVENT';
}

function validateOffer(offer: StubCheckoutOfferRow | null, issues: StubCheckoutIssueDto[]): void {
  if (!offer) {
    issues.push(issue('OFFER_NOT_FOUND', 'Категория билета не найдена', 'high'));
    return;
  }
  if (!offer.active) issues.push(issue('OFFER_INACTIVE', 'Категория билета выключена', 'high'));
  if (String(offer.sourceCode) !== 'MANUAL') {
    issues.push(issue('OFFER_NOT_MANUAL', 'Категория билета не ручная', 'high'));
  }
  if (offer.priceRub == null) {
    issues.push(issue('MISSING_PRICE', 'Цена билета не задана', 'high'));
  } else if (offer.priceRub < MIN_PRICE_RUB) {
    issues.push(issue('PRICE_TOO_LOW', 'Цена билета ниже 100 рублей', 'high'));
  }
}

function validateOpenDate(
  event: StubCheckoutEventRow,
  now: Date,
  quantity: number,
  issues: StubCheckoutIssueDto[],
): void {
  if (event.openDateValidFrom && event.openDateValidFrom > now) {
    issues.push(issue('OPEN_DATE_NOT_ACTIVE', 'Open-date билет еще не действует', 'high'));
  }
  if (event.openDateValidTo && event.openDateValidTo < now) {
    issues.push(issue('OPEN_DATE_NOT_ACTIVE', 'Open-date билет уже не действует', 'high'));
  }
  if (event.ticketsVacant != null && event.ticketsVacant < quantity) {
    issues.push(issue('NOT_ENOUGH_CAPACITY', 'Недостаточно доступных билетов', 'high'));
  }
}

function validateSession(
  session: StubCheckoutSessionRow | null,
  now: Date,
  quantity: number,
  issues: StubCheckoutIssueDto[],
): void {
  if (!session) {
    issues.push(issue('SESSION_REQUIRED', 'Для события нужен конкретный слот', 'high'));
    return;
  }
  if (!session.isActive || session.cancelledAt || !session.startsAt) {
    issues.push(issue('SESSION_NOT_ACTIVE', 'Слот недоступен', 'high'));
    return;
  }
  const effectiveEnd = session.endsAt || session.startsAt;
  if (effectiveEnd < now) {
    issues.push(issue('SESSION_IN_PAST', 'Слот уже прошел', 'high'));
  }
  if (session.ticketsVacant != null && session.ticketsVacant < quantity) {
    issues.push(issue('NOT_ENOUGH_CAPACITY', 'Недостаточно доступных билетов', 'high'));
  }
  if (session.capacityTotal != null && session.capacityTotal - session.capacitySold < quantity) {
    issues.push(issue('NOT_ENOUGH_CAPACITY', 'Недостаточно мест в слоте', 'high'));
  }
}

async function loadStubCheckoutEvent(payload: StubCheckoutCreateDto): Promise<StubCheckoutEventRow | null> {
  const eventId = cleanString(payload.eventId);
  const eventSlug = cleanString(payload.eventSlug);
  if (!eventId && !eventSlug) return null;
  return prisma.event.findFirst({
    where: eventId ? { id: eventId } : { slug: eventSlug || '' },
    include: stubCheckoutEventInclude,
  });
}

function resolveStubCheckoutSupplier(event: StubCheckoutEventRow): StubCheckoutSupplierRow | null {
  if (event.supplier) return event.supplier;
  const primaryLink = event.supplierLinks.find((link) => link.isPrimary) || event.supplierLinks[0] || null;
  return primaryLink?.supplier || null;
}

function normalizeStubCheckoutPayload(payload: StubCheckoutCreateDto): StubCheckoutCreateDto {
  return {
    ...payload,
    eventId: cleanString(payload.eventId),
    eventSlug: cleanString(payload.eventSlug),
    offerId: cleanString(payload.offerId) || '',
    sessionId: cleanString(payload.sessionId),
    quantity: Math.trunc(Number(payload.quantity || 0)),
    buyer: {
      email: cleanString(payload.buyer?.email)?.toLowerCase() || '',
      name: cleanString(payload.buyer?.name),
      phone: cleanString(payload.buyer?.phone),
    },
    attendee: payload.attendee
      ? {
          name: cleanString(payload.attendee.name),
          phone: cleanString(payload.attendee.phone),
        }
      : null,
    idempotencyKey: normalizeIdempotencyKey(payload.idempotencyKey),
  };
}

async function decrementCapacity(
  tx: Prisma.TransactionClient,
  event: StubCheckoutEventRow,
  session: StubCheckoutSessionRow | null,
  quantity: number,
): Promise<void> {
  if (session) {
    if (session.ticketsVacant != null) {
      const updated = await tx.eventSession.updateMany({
        where: {
          id: session.id,
          ticketsVacant: { gte: quantity },
        },
        data: {
          capacitySold: { increment: quantity },
          ticketsVacant: { decrement: quantity },
        },
      });
      if (updated.count !== 1) throw new StubCheckoutError('NOT_ENOUGH_CAPACITY', 409);
    } else {
      await tx.eventSession.update({
        where: { id: session.id },
        data: {
          capacitySold: { increment: quantity },
        },
      });
    }
  }
  if (event.ticketsVacant != null) {
    const updated = await tx.event.updateMany({
      where: {
        id: event.id,
        ticketsVacant: { gte: quantity },
      },
      data: {
        ticketsVacant: { decrement: quantity },
      },
    });
    if (updated.count !== 1) throw new StubCheckoutError('NOT_ENOUGH_CAPACITY', 409);
  }
}

async function createUniquePublicCode(tx: Prisma.TransactionClient): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = String(randomInt(1000000, 10000000));
    const existing = await tx.checkoutOrder.findUnique({ where: { publicCode: code }, select: { id: true } });
    if (!existing) return code;
  }
  throw new StubCheckoutError('IDEMPOTENCY_CONFLICT', 409);
}

async function writeSupplierLedgerEntries(
  tx: Prisma.TransactionClient,
  input: {
    supplierId: string;
    orderId: string;
    itemId: string;
    paymentId: string;
    publicCode: string;
    totals: StubCheckoutTotalsDto;
  },
): Promise<void> {
  const entries: Prisma.SupplierLedgerEntryCreateManyInput[] = [
    {
      supplierId: input.supplierId,
      type: 'SALE',
      amountKopecks: input.totals.totalKopecks,
      currency: 'RUB',
      referenceType: 'CHECKOUT_ITEM',
      referenceId: input.itemId,
      checkoutOrderId: input.orderId,
      checkoutItemId: input.itemId,
      paymentId: input.paymentId,
      note: `STUB sale ${input.publicCode}`,
      metaJson: { mode: 'STUB' },
    },
  ];
  if (input.totals.commissionKopecks > 0) {
    entries.push({
      supplierId: input.supplierId,
      type: 'COMMISSION',
      amountKopecks: -input.totals.commissionKopecks,
      currency: 'RUB',
      referenceType: 'CHECKOUT_ITEM',
      referenceId: input.itemId,
      checkoutOrderId: input.orderId,
      checkoutItemId: input.itemId,
      paymentId: input.paymentId,
      note: `STUB commission ${input.publicCode}`,
      metaJson: { mode: 'STUB' },
    });
  }
  await tx.supplierLedgerEntry.createMany({ data: entries });
}

function mapStubCheckoutResult(input: {
  created: StubCheckoutCreatedRows;
  event: StubCheckoutEventRow;
  offer: StubCheckoutOfferRow;
  session: StubCheckoutSessionRow | null;
  supplier: StubCheckoutSupplierRow;
  totals: StubCheckoutTotalsDto;
  subjectType: CheckoutSubjectType;
  warnings: StubCheckoutIssueDto[];
}): StubCheckoutResultDto {
  const publicCode = input.created.order.publicCode || input.created.order.id.slice(-7);
  return {
    generatedAt: new Date().toISOString(),
    mode: 'STUB',
    order: {
      id: input.created.order.id,
      publicCode,
      status: input.created.order.status,
      createdAt: input.created.order.createdAt.toISOString(),
      paidAt: toIso(input.created.order.paidAt),
      confirmedAt: toIso(input.created.order.confirmedAt),
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
        provider: 'MANUAL',
        status: input.created.payment.status,
        amountKopecks: input.created.payment.amountKopecks,
        providerPaymentId: input.created.payment.providerPaymentId,
        paidAt: toIso(input.created.payment.paidAt),
      },
      fulfillment: {
        id: input.created.fulfillment.id,
        status: input.created.fulfillment.status,
        provider: 'STUB',
        purchaseFlow: 'PLATFORM',
      },
    },
    warnings: input.warnings,
  };
}

async function reserveIdempotencyKey(key: string | null, eventId: string): Promise<StubCheckoutResultDto | null> {
  if (!key) return null;
  try {
    await prisma.idempotencyKey.create({
      data: {
        scope: STUB_CHECKOUT_SCOPE,
        key,
        entityId: eventId,
        status: 'IN_PROGRESS',
        metaJson: { mode: 'STUB' },
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
        scope: STUB_CHECKOUT_SCOPE,
        key,
      },
    },
  });
  if (existing?.status === 'SUCCEEDED' && existing.response) {
    return existing.response as unknown as StubCheckoutResultDto;
  }
  if (existing?.status === 'IN_PROGRESS') {
    throw new StubCheckoutError('IDEMPOTENCY_IN_PROGRESS', 409);
  }
  await prisma.idempotencyKey.update({
    where: {
      scope_key: {
        scope: STUB_CHECKOUT_SCOPE,
        key,
      },
    },
    data: {
      entityId: eventId,
      status: 'IN_PROGRESS',
      metaJson: { mode: 'STUB' },
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  return null;
}

function isPrismaUniqueViolation(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && (error as { code?: unknown }).code === 'P2002');
}

async function markIdempotencySucceeded(
  key: string | null,
  orderId: string,
  result: StubCheckoutResultDto,
): Promise<void> {
  if (!key) return;
  await prisma.idempotencyKey.update({
    where: {
      scope_key: {
        scope: STUB_CHECKOUT_SCOPE,
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

async function markIdempotencyFailed(key: string | null, eventId: string): Promise<void> {
  if (!key) return;
  await prisma.idempotencyKey.updateMany({
    where: {
      scope: STUB_CHECKOUT_SCOPE,
      key,
      status: 'IN_PROGRESS',
    },
    data: {
      entityId: eventId,
      status: 'FAILED',
    },
  });
}

function issue(
  code: StubCheckoutIssueCode,
  label: string,
  severity: StubCheckoutIssueDto['severity'],
): StubCheckoutIssueDto {
  return { code, label, severity };
}

function cleanString(value: string | null | undefined): string | null {
  const cleaned = String(value || '').trim();
  return cleaned ? cleaned : null;
}

function normalizeIdempotencyKey(value: string | null | undefined): string | null {
  const cleaned = cleanString(value);
  if (!cleaned) return null;
  return cleaned.slice(0, 120);
}

function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}
