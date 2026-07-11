import { createHash } from 'node:crypto';

import { Prisma, prisma } from '@daibilet/db';

import type { PublicBuyerOrder, PublicBuyerOrderTicket, PublicBuyerOrdersPayload } from '@/types';

const MIN_LOOKUP_LENGTH = 4;
const PUBLIC_LOOKUP_LIMIT = 20;
const PUBLIC_CANDIDATE_LIMIT = 100;

const externalOrderInclude = {
  source: { select: { code: true, name: true } },
  siteUser: { select: { email: true, name: true, phone: true } },
  checkoutOrder: { select: { totalKopecks: true, currency: true } },
  tickets: {
    orderBy: { id: 'asc' },
    select: {
      id: true,
      externalTicketId: true,
      status: true,
      eventId: true,
      sessionId: true,
      origin: true,
    },
  },
} satisfies Prisma.ExternalOrderInclude;

const checkoutOrderInclude = {
  siteUser: { select: { email: true, name: true, phone: true } },
  items: {
    orderBy: { id: 'asc' },
    select: {
      id: true,
      externalTicketId: true,
      externalTicket: { select: { externalTicketId: true } },
      title: true,
      ticketTitle: true,
      status: true,
      quantity: true,
      totalKopecks: true,
      event: { select: { id: true, title: true, slug: true } },
      session: { select: { id: true, startsAt: true, event: { select: { id: true, title: true, slug: true } } } },
    },
  },
  payments: {
    orderBy: { updatedAt: 'desc' },
    take: 1,
    select: { status: true, confirmationUrl: true },
  },
} satisfies Prisma.CheckoutOrderInclude;

type ExternalOrderRow = Prisma.ExternalOrderGetPayload<{ include: typeof externalOrderInclude }>;
type ExternalTicketRow = ExternalOrderRow['tickets'][number];
type CheckoutOrderRow = Prisma.CheckoutOrderGetPayload<{ include: typeof checkoutOrderInclude }>;
type CheckoutItemRow = CheckoutOrderRow['items'][number];

type EventRef = {
  id: string;
  title: string;
  slug: string;
};

type SessionRef = {
  id: string;
  startsAt: Date | null;
  event: EventRef;
};

type ExternalOrderRefs = {
  events: Map<string, EventRef>;
  sessions: Map<string, SessionRef>;
};

type AccountUserKey = {
  id: string;
  email: string;
  emailVerifiedAt?: Date | null;
};

type AccountOrdersPayload = PublicBuyerOrdersPayload & {
  page: number;
  pages: number;
  limit: number;
};

export async function buildNextPublicBuyerOrders(searchParams: URLSearchParams): Promise<PublicBuyerOrdersPayload> {
  const lookup = String(searchParams.get('lookup') || searchParams.get('q') || '').trim();
  if (lookup.length < MIN_LOOKUP_LENGTH) {
    return emptyPayload({ lookupRequired: true });
  }

  const [externalIds, checkoutIds] = await Promise.all([
    lookupExternalOrderIds(lookup, PUBLIC_CANDIDATE_LIMIT),
    lookupCheckoutOrderIds(lookup, PUBLIC_CANDIDATE_LIMIT),
  ]);

  const [externalOrders, checkoutOrders] = await Promise.all([
    loadExternalOrdersByIds(externalIds),
    loadCheckoutOrdersByIds(checkoutIds),
  ]);
  const externalRefs = await loadExternalOrderRefs(externalOrders);

  const rows = [
    ...externalOrders
      .filter((order) => matchesExternalOrderLookup(order, lookup))
      .map((order) => mapExternalOrder(order, externalRefs)),
    ...checkoutOrders
      .filter((order) => matchesCheckoutOrderLookup(order, lookup))
      .map(mapCheckoutOrder),
  ]
    .sort(compareBuyerOrders)
    .slice(0, PUBLIC_LOOKUP_LIMIT);

  return payloadFromRows(rows, { lookupRequired: false });
}

export async function buildNextAccountPurchases(
  user: AccountUserKey,
  searchParams: URLSearchParams,
): Promise<AccountOrdersPayload> {
  const email = normalizeLookup(user.email);
  const includeEmailLinkedOrders = Boolean(user.emailVerifiedAt);
  const limit = clampNumber(searchParams.get('limit'), 1, 50, 10);
  const page = clampNumber(searchParams.get('page'), 1, 1000, 1);
  const offset = (page - 1) * limit;

  if (!email.includes('@')) {
    return {
      ...emptyPayload({ lookupRequired: false }),
      page,
      pages: 1,
      limit,
    };
  }

  const fetchLimit = offset + limit;
  const [externalIdRows, checkoutRows, externalTotal, checkoutTotal] = await Promise.all([
    accountExternalOrderIds(user, email, fetchLimit),
    accountCheckoutOrders(user, email, fetchLimit, includeEmailLinkedOrders),
    countAccountExternalOrders(user, email),
    countAccountCheckoutOrders(user, email, includeEmailLinkedOrders),
  ]);

  const externalOrders = await loadExternalOrdersByIds(externalIdRows.map((row) => row.id));
  const externalRefs = await loadExternalOrderRefs(externalOrders);
  const allRows = [
    ...externalOrders.map((order) => mapExternalOrder(order, externalRefs)),
    ...checkoutRows.map(mapCheckoutOrder),
  ].sort(compareBuyerOrders);

  const rows = allRows.slice(offset, offset + limit);
  const total = externalTotal + checkoutTotal;

  return {
    ...payloadFromRows(rows, { lookupRequired: false, total }),
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
    limit,
  };
}

async function lookupExternalOrderIds(lookup: string, limit: number): Promise<string[]> {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    select distinct ext_order.id
    from "ExternalOrder" ext_order
    left join "ExternalTicket" ticket on ticket."externalOrderId" = ext_order.id
    where
      lower(ext_order."externalOrderId") = lower(${lookup})
      or ext_order."publicCode" = ${lookup}
      or lower(coalesce(ticket."externalTicketId", '')) = lower(${lookup})
    order by ext_order.id
    limit ${limit}
  `;
  return rows.map((row) => row.id);
}

async function lookupCheckoutOrderIds(lookup: string, limit: number): Promise<string[]> {
  const normalized = normalizeLookup(lookup);
  const where: Prisma.CheckoutOrderWhereInput[] = [
    { publicCode: { equals: lookup } },
    { externalOrderId: { equals: lookup, mode: 'insensitive' } },
  ];
  if (normalized.length >= MIN_LOOKUP_LENGTH) {
    where.push({ items: { some: { externalTicket: { is: { externalTicketId: { equals: lookup, mode: 'insensitive' } } } } } });
  }

  const rows = await prisma.checkoutOrder.findMany({
    where: { OR: where },
    orderBy: [{ paidAt: 'desc' }, { updatedAt: 'desc' }],
    take: limit,
    select: { id: true },
  });
  return rows.map((row) => row.id);
}

async function accountExternalOrderIds(user: AccountUserKey, email: string, limit: number): Promise<Array<{ id: string }>> {
  if (!user.emailVerifiedAt) {
    return prisma.$queryRaw<Array<{ id: string }>>`
      select ext_order.id
      from "ExternalOrder" ext_order
      where ext_order."siteUserId" = ${user.id}
      order by coalesce(ext_order."purchasedAt", ext_order."updatedAt") desc
      limit ${limit}
    `;
  }

  return prisma.$queryRaw<Array<{ id: string }>>`
    select ext_order.id
    from "ExternalOrder" ext_order
    where
      ext_order."siteUserId" = ${user.id}
      or ext_order."buyerEmailNormalized" = ${email}
      or lower(trim(coalesce(ext_order."buyerSnapshot"->>'email', ''))) = ${email}
      or lower(trim(coalesce(ext_order."buyerSnapshot"->>'customerEmail', ''))) = ${email}
      or lower(trim(coalesce(ext_order."buyerSnapshot"->'buyer'->>'email', ''))) = ${email}
      or lower(trim(coalesce(ext_order."buyerSnapshot"->'customer'->>'email', ''))) = ${email}
    order by coalesce(ext_order."purchasedAt", ext_order."updatedAt") desc
    limit ${limit}
  `;
}

async function countAccountExternalOrders(user: AccountUserKey, email: string): Promise<number> {
  if (!user.emailVerifiedAt) {
    const rows = await prisma.$queryRaw<Array<{ total: number | bigint }>>`
      select count(*) as total
      from "ExternalOrder" ext_order
      where ext_order."siteUserId" = ${user.id}
    `;
    return Number(rows[0]?.total || 0);
  }

  const rows = await prisma.$queryRaw<Array<{ total: number | bigint }>>`
    select count(*) as total
    from "ExternalOrder" ext_order
    where
      ext_order."siteUserId" = ${user.id}
      or ext_order."buyerEmailNormalized" = ${email}
      or lower(trim(coalesce(ext_order."buyerSnapshot"->>'email', ''))) = ${email}
      or lower(trim(coalesce(ext_order."buyerSnapshot"->>'customerEmail', ''))) = ${email}
      or lower(trim(coalesce(ext_order."buyerSnapshot"->'buyer'->>'email', ''))) = ${email}
      or lower(trim(coalesce(ext_order."buyerSnapshot"->'customer'->>'email', ''))) = ${email}
  `;
  return Number(rows[0]?.total || 0);
}

async function accountCheckoutOrders(
  user: AccountUserKey,
  email: string,
  limit: number,
  includeEmailLinkedOrders: boolean,
): Promise<CheckoutOrderRow[]> {
  return prisma.checkoutOrder.findMany({
    where: accountCheckoutWhere(user, email, includeEmailLinkedOrders),
    include: checkoutOrderInclude,
    orderBy: [{ paidAt: 'desc' }, { updatedAt: 'desc' }],
    take: limit,
  });
}

async function countAccountCheckoutOrders(user: AccountUserKey, email: string, includeEmailLinkedOrders: boolean): Promise<number> {
  return prisma.checkoutOrder.count({
    where: accountCheckoutWhere(user, email, includeEmailLinkedOrders),
  });
}

function accountCheckoutWhere(user: AccountUserKey, email: string, includeEmailLinkedOrders: boolean): Prisma.CheckoutOrderWhereInput {
  if (!includeEmailLinkedOrders) return { siteUserId: user.id };
  return {
    OR: [
      { siteUserId: user.id },
      { buyerEmail: { equals: email, mode: 'insensitive' } },
    ],
  };
}

async function loadExternalOrdersByIds(ids: string[]): Promise<ExternalOrderRow[]> {
  if (!ids.length) return [];
  const rows = await prisma.externalOrder.findMany({
    where: { id: { in: ids } },
    include: externalOrderInclude,
  });
  const order = new Map(ids.map((id, index) => [id, index]));
  return rows.sort((left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0));
}

async function loadCheckoutOrdersByIds(ids: string[]): Promise<CheckoutOrderRow[]> {
  if (!ids.length) return [];
  const rows = await prisma.checkoutOrder.findMany({
    where: { id: { in: ids } },
    include: checkoutOrderInclude,
  });
  const order = new Map(ids.map((id, index) => [id, index]));
  return rows.sort((left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0));
}

async function loadExternalOrderRefs(orders: ExternalOrderRow[]): Promise<ExternalOrderRefs> {
  const eventIds = new Set<string>();
  const sessionIds = new Set<string>();
  for (const order of orders) {
    for (const ticket of order.tickets) {
      if (ticket.eventId) eventIds.add(ticket.eventId);
      if (ticket.sessionId) sessionIds.add(ticket.sessionId);
    }
  }

  const [events, sessions] = await Promise.all([
    eventIds.size
      ? prisma.event.findMany({
        where: { id: { in: [...eventIds] } },
        select: { id: true, title: true, slug: true },
      })
      : Promise.resolve([]),
    sessionIds.size
      ? prisma.eventSession.findMany({
        where: { id: { in: [...sessionIds] } },
        select: {
          id: true,
          startsAt: true,
          event: { select: { id: true, title: true, slug: true } },
        },
      })
      : Promise.resolve([]),
  ]);

  return {
    events: new Map(events.map((event) => [event.id, event])),
    sessions: new Map(sessions.map((session) => [session.id, session])),
  };
}

function mapExternalOrder(order: ExternalOrderRow, refs: ExternalOrderRefs): PublicBuyerOrder {
  const buyer = normalizeBuyerSnapshot(order.buyerSnapshot);
  const tickets = order.tickets.map((ticket) => mapExternalTicket(ticket, refs));
  const primaryTicket = tickets.find((ticket) => ticket.eventTitle || ticket.eventUrl) || tickets[0] || null;
  const status = order.status || 'unknown';
  const shouldExpectTicket = shouldExpectOrderTicket(status);
  const artifactStatus = shouldExpectTicket && tickets.length === 0 ? 'missing' : tickets.length > 0 ? 'tickets' : 'not_required';
  const sourceCode = String(order.source.code || '').toUpperCase();
  const number = order.publicCode || publicOrderCode(sourceCode || order.sourceId, order.externalOrderId || order.id);

  return {
    id: number,
    number,
    sourceOrderId: null,
    status,
    displayStatus: orderStatusLabel(status),
    statusTone: orderStatusTone(status),
    isFinal: isCanceledOrderStatus(status) || isConfirmedOrderStatus(status),
    providerName: sourceLabel(sourceCode, order.source.name),
    buyer: {
      name: buyer.name || order.siteUser?.name || null,
      email: maskEmail(buyer.email || order.buyerEmailNormalized || order.siteUser?.email),
      phone: maskPhone(buyer.phone || order.buyerPhoneNormalized || order.siteUser?.phone),
    },
    eventTitle: primaryTicket?.eventTitle || firstString(order.buyerSnapshot, 'sourceEventTitle', 'eventTitle'),
    eventUrl: primaryTicket?.eventUrl || null,
    purchasedAt: toIso(order.purchasedAt || order.updatedAt),
    updatedAt: toIso(order.updatedAt),
    amountRub: extractOrderAmountRub(order.buyerSnapshot) ?? kopecksToRub(order.checkoutOrder?.totalKopecks),
    ticketCount: tickets.length,
    artifactStatus,
    message: publicOrderMessage(status, artifactStatus),
    tickets,
  };
}

function mapExternalTicket(ticket: ExternalTicketRow, refs: ExternalOrderRefs): PublicBuyerOrderTicket {
  const session = ticket.sessionId ? refs.sessions.get(ticket.sessionId) : null;
  const event = session?.event || (ticket.eventId ? refs.events.get(ticket.eventId) : null);

  return {
    id: ticket.externalTicketId || publicOrderCode('ticket', ticket.id),
    number: ticket.externalTicketId,
    status: ticket.status || 'unknown',
    displayStatus: orderStatusLabel(ticket.status),
    eventTitle: event?.title || null,
    eventUrl: event?.slug ? `/events/${publicEventSlug(event.slug)}` : ticket.eventId ? `/events/${encodeURIComponent(ticket.eventId)}` : null,
    startsAt: toIso(session?.startsAt || null),
  };
}

function mapCheckoutOrder(order: CheckoutOrderRow): PublicBuyerOrder {
  const tickets = order.items.flatMap(mapCheckoutItemTickets);
  const firstItem = order.items[0] || null;
  const event = firstItem?.session?.event || firstItem?.event || null;
  const status = String(order.status || 'DRAFT').toLowerCase();
  const artifactStatus = tickets.length > 0 ? 'tickets' : shouldExpectOrderTicket(status) ? 'missing' : 'not_required';

  return {
    id: order.publicCode || publicOrderCode('DAIBILET', order.id),
    number: order.publicCode || publicOrderCode('DAIBILET', order.id),
    sourceOrderId: null,
    status,
    displayStatus: checkoutStatusLabel(status),
    statusTone: orderStatusTone(status),
    isFinal: isCanceledOrderStatus(status) || ['fulfilled', 'confirmed'].some((token) => status.includes(token)),
    providerName: 'Дайбилет',
    buyer: {
      name: order.buyerName || order.siteUser?.name || null,
      email: maskEmail(order.buyerEmail || order.siteUser?.email),
      phone: maskPhone(order.buyerPhone || order.siteUser?.phone),
    },
    eventTitle: event?.title || firstItem?.title || null,
    eventUrl: event?.slug ? `/events/${publicEventSlug(event.slug)}` : null,
    purchasedAt: toIso(order.paidAt || order.createdAt),
    updatedAt: toIso(order.updatedAt),
    amountRub: kopecksToRub(order.totalKopecks),
    ticketCount: tickets.length || order.items.reduce((sum, item) => sum + Math.max(1, item.quantity || 1), 0),
    artifactStatus,
    message: checkoutOrderMessage(status, artifactStatus),
    tickets,
  };
}

function mapCheckoutItemTickets(item: CheckoutItemRow): PublicBuyerOrderTicket[] {
  const event = item.session?.event || item.event || null;
  const startsAt = toIso(item.session?.startsAt || null);
  const quantity = Math.max(1, item.quantity || 1);
  const externalTicketNumber = item.externalTicket?.externalTicketId || null;
  return Array.from({ length: quantity }, (_, index) => ({
    id: quantity === 1
      ? externalTicketNumber || publicOrderCode('checkout-item', item.id)
      : `${externalTicketNumber || publicOrderCode('checkout-item', item.id)}:${index + 1}`,
    number: externalTicketNumber,
    status: String(item.status || 'DRAFT').toLowerCase(),
    displayStatus: checkoutStatusLabel(item.status),
    eventTitle: event?.title || item.title || null,
    eventUrl: event?.slug ? `/events/${publicEventSlug(event.slug)}` : null,
    startsAt,
  }));
}

function payloadFromRows(
  rows: PublicBuyerOrder[],
  options: { lookupRequired: boolean; total?: number },
): PublicBuyerOrdersPayload {
  const total = options.total ?? rows.length;
  return {
    generatedAt: new Date().toISOString(),
    lookupRequired: options.lookupRequired,
    minLookupLength: MIN_LOOKUP_LENGTH,
    total,
    rows,
    metrics: {
      orders: total,
      tickets: rows.reduce((sum, order) => sum + order.ticketCount, 0),
      active: rows.filter((order) => !order.isFinal).length,
    },
  };
}

function emptyPayload(options: { lookupRequired: boolean }): PublicBuyerOrdersPayload {
  return payloadFromRows([], options);
}

function matchesExternalOrderLookup(order: ExternalOrderRow, lookup: string): boolean {
  const normalized = normalizeLookup(lookup);

  if (normalized.length >= MIN_LOOKUP_LENGTH && normalizeLookup(order.externalOrderId) === normalized) return true;
  if (normalized.length >= MIN_LOOKUP_LENGTH && normalizeLookup(order.publicCode) === normalized) return true;
  if (normalized.length >= MIN_LOOKUP_LENGTH && order.tickets.some((ticket) => normalizeLookup(ticket.externalTicketId) === normalized)) {
    return true;
  }
  return false;
}

function matchesCheckoutOrderLookup(order: CheckoutOrderRow, lookup: string): boolean {
  const normalized = normalizeLookup(lookup);

  if (normalized.length >= MIN_LOOKUP_LENGTH && normalizeLookup(order.publicCode) === normalized) return true;
  if (normalized.length >= MIN_LOOKUP_LENGTH && normalizeLookup(order.externalOrderId) === normalized) return true;
  if (normalized.length >= MIN_LOOKUP_LENGTH && order.items.some((item) => normalizeLookup(item.externalTicket?.externalTicketId) === normalized)) {
    return true;
  }
  return false;
}

function compareBuyerOrders(left: PublicBuyerOrder, right: PublicBuyerOrder): number {
  return dateValue(right.purchasedAt || right.updatedAt) - dateValue(left.purchasedAt || left.updatedAt);
}

function normalizeBuyerSnapshot(snapshot: Prisma.JsonValue): { name: string | null; email: string | null; phone: string | null } {
  const payload = jsonObject(snapshot);
  const customer = jsonObject(payload.customer);
  const buyer = jsonObject(payload.buyer);
  return {
    name: firstText(payload.name, payload.fullName, payload.customerName, buyer.name, customer.name, customer.fullName),
    email: normalizeLookup(firstText(payload.email, payload.customerEmail, buyer.email, customer.email)),
    phone: firstText(payload.phone, payload.customerPhone, buyer.phone, customer.phone),
  };
}

function extractOrderAmountRub(snapshot: Prisma.JsonValue): number | null {
  const payload = jsonObject(snapshot);
  const values = jsonObject(payload.values);
  const raw = firstNumber(payload.amountRub, payload.amount, payload.full, payload.total, values.full, values.amount, values.total);
  if (raw == null) return null;
  return Math.round(raw > 100000 ? raw / 100 : raw);
}

function firstString(snapshot: Prisma.JsonValue, ...keys: string[]): string | null {
  const payload = jsonObject(snapshot);
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function jsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function firstText(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function firstNumber(...values: unknown[]): number | null {
  for (const value of values) {
    const number = typeof value === 'number' ? value : typeof value === 'string' ? Number(value.replace(',', '.')) : NaN;
    if (Number.isFinite(number) && number > 0) return number;
  }
  return null;
}

function sourceLabel(sourceCode: string, sourceName?: string | null): string {
  if (sourceCode === 'TEPLOHOD') return 'Teplohod.info';
  if (sourceCode === 'TICKETSCLOUD') return 'Ticketscloud';
  return sourceName || sourceCode || 'Источник';
}

function publicOrderCode(source: string, externalOrderId: string): string {
  const hex = createHash('sha256').update(`${source || 'source'}:${externalOrderId || ''}`).digest('hex').slice(0, 12);
  const number = (Number.parseInt(hex, 16) % 9000000) + 1000000;
  return String(number).padStart(7, '0');
}

function publicOrderMessage(status: string, artifactStatus: string): string {
  if (isConfirmedOrderStatus(status)) return 'Заказ подтвержден в билетной системе.';
  if (isCanceledOrderStatus(status)) return 'Заказ завершен или отменен в билетной системе.';
  if (artifactStatus === 'missing') return 'Билеты еще не попали в зеркало. Статус можно уточнить по номеру заказа.';
  if (isProcessingOrderStatus(status)) return 'Заказ обрабатывается в билетной системе.';
  return 'Статус получен из билетной системы.';
}

function checkoutOrderMessage(status: string, artifactStatus: string): string {
  if (status.includes('paid') || status.includes('confirmed') || status.includes('fulfilled')) return 'Покупка подтверждена.';
  if (isCanceledOrderStatus(status)) return 'Покупка отменена или возвращена.';
  if (artifactStatus === 'missing') return 'Билет формируется. Мы обновим статус после подтверждения.';
  if (status.includes('payment')) return 'Ожидаем оплату.';
  return 'Статус покупки обновлен.';
}

function orderStatusTone(status: string): PublicBuyerOrder['statusTone'] {
  if (isConfirmedOrderStatus(status)) return 'live';
  if (isCanceledOrderStatus(status)) return 'archived';
  if (isProblemOrderStatus(status)) return 'error';
  if (isProcessingOrderStatus(status)) return 'ready';
  return 'incomplete';
}

function orderStatusLabel(status?: string | null): string {
  const value = String(status || '').toLowerCase();
  if (isRefundStatus(value)) return 'возвращен';
  if (isConfirmedOrderStatus(value)) return 'подтвержден';
  if (isCanceledOrderStatus(value)) return 'отменен';
  if (['issued', 'ticketed', 'generated', 'delivered'].some((token) => value.includes(token))) return 'выпущен';
  if (['used', 'visited', 'redeemed', 'checked'].some((token) => value.includes(token))) return 'использован';
  if (isProcessingOrderStatus(value)) return 'в обработке';
  return value || 'неизвестно';
}

function checkoutStatusLabel(status?: string | null): string {
  const value = String(status || '').toLowerCase();
  if (value.includes('pending_payment')) return 'ожидает оплаты';
  if (value.includes('paid')) return 'оплачен';
  if (value.includes('confirmed')) return 'подтвержден';
  if (value.includes('fulfilled')) return 'билет готов';
  if (value.includes('cancelled')) return 'отменен';
  if (value.includes('refunded')) return 'возвращен';
  if (value.includes('expired')) return 'истек';
  if (value.includes('failed')) return 'ошибка';
  if (value.includes('reserved')) return 'зарезервирован';
  return orderStatusLabel(value);
}

function shouldExpectOrderTicket(status: string): boolean {
  const value = String(status || '').toLowerCase();
  if (!value || isCanceledOrderStatus(value) || isRefundStatus(value)) return false;
  return (
    isConfirmedOrderStatus(value) ||
    ['issued', 'ticketed', 'generated', 'delivered', 'voucher', 'fulfilled'].some((token) => value.includes(token))
  );
}

function isConfirmedOrderStatus(status: string): boolean {
  const value = String(status || '').toLowerCase();
  return ['done', 'paid', 'confirmed', 'completed', 'success', 'executed', 'sold', 'fulfilled'].some((token) => value.includes(token));
}

function isProcessingOrderStatus(status: string): boolean {
  const value = String(status || '').toLowerCase();
  return ['open', 'new', 'created', 'pending', 'processing', 'reserved', 'hold', 'draft'].some((token) => value.includes(token));
}

function isCanceledOrderStatus(status: string): boolean {
  const value = String(status || '').toLowerCase();
  return ['cancel', 'return', 'refund', 'reject', 'expired'].some((token) => value.includes(token));
}

function isRefundStatus(status: string): boolean {
  const value = String(status || '').toLowerCase();
  return ['refund', 'return'].some((token) => value.includes(token));
}

function isProblemOrderStatus(status: string): boolean {
  const value = String(status || '').toLowerCase();
  return ['fail', 'error', 'reject'].some((token) => value.includes(token));
}

function kopecksToRub(value?: number | null): number | null {
  if (typeof value !== 'number' || value <= 0) return null;
  return Math.round(value / 100);
}

function toIso(value?: Date | string | null): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function normalizeLookup(value?: string | null): string {
  return String(value || '').trim().toLowerCase();
}

function digitsOnly(value?: string | null): string {
  return String(value || '').replace(/\D+/g, '');
}

function maskEmail(value?: string | null): string | null {
  const email = String(value || '').trim();
  if (!email || !email.includes('@')) return null;
  const [name, domain] = email.split('@');
  if (!name || !domain) return null;
  const visible = name.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(2, name.length - visible.length))}@${domain}`;
}

function maskPhone(value?: string | null): string | null {
  const phone = String(value || '').trim();
  const digits = digitsOnly(phone);
  if (digits.length < 6) return null;
  return `${digits.slice(0, 2)}***${digits.slice(-2)}`;
}

function dateValue(value?: string | null): number {
  if (!value) return 0;
  const date = new Date(value).getTime();
  return Number.isFinite(date) ? date : 0;
}

function clampNumber(value: string | null, min: number, max: number, fallback: number): number {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(number)));
}

function publicEventSlug(value: string): string {
  const letters: Record<string, string> = {
    а: 'a',
    б: 'b',
    в: 'v',
    г: 'g',
    д: 'd',
    е: 'e',
    ё: 'e',
    ж: 'zh',
    з: 'z',
    и: 'i',
    й: 'y',
    к: 'k',
    л: 'l',
    м: 'm',
    н: 'n',
    о: 'o',
    п: 'p',
    р: 'r',
    с: 's',
    т: 't',
    у: 'u',
    ф: 'f',
    х: 'h',
    ц: 'c',
    ч: 'ch',
    ш: 'sh',
    щ: 'sch',
    ъ: '',
    ы: 'y',
    ь: '',
    э: 'e',
    ю: 'yu',
    я: 'ya',
  };

  return String(value || '')
    .trim()
    .toLowerCase()
    .split('')
    .map((char) => letters[char] ?? char)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}
