import { prisma, type Prisma } from '@daibilet/db';

export type YooKassaRefund = {
  id: string;
  status: string;
  payment_id: string;
  amount?: { value?: string; currency?: string };
  receipt_registration?: string;
};

export type YooKassaRefundConfig = {
  enabled: boolean;
  shopId: string | null;
  secretKey: string | null;
  apiUrl: string;
};

type RefundFetch = (input: string, init?: RequestInit) => Promise<Response>;

export class YooKassaRefundError extends Error {
  constructor(readonly statusCode: number, readonly code: string) { super(code); }
}

function reject(code: string, statusCode = 409): never { throw new YooKassaRefundError(statusCode, code); }
function money(kopecks: number): string { return (kopecks / 100).toFixed(2); }

export async function confirmYooKassaRefundSucceeded(input: {
  refundId: string;
  config: YooKassaRefundConfig;
  fetchImpl?: RefundFetch;
  now?: Date;
}) {
  const refundId = input.refundId.trim();
  if (!refundId) reject('provider_refund_id_missing', 400);
  if (!input.config.enabled || !input.config.shopId || !input.config.secretKey) reject('yookassa_not_configured', 503);

  const response = await (input.fetchImpl || fetch)(`${input.config.apiUrl}/refunds/${encodeURIComponent(refundId)}`, {
    method: 'GET',
    headers: {
      authorization: `Basic ${Buffer.from(`${input.config.shopId}:${input.config.secretKey}`).toString('base64')}`,
      accept: 'application/json',
    },
    signal: AbortSignal.timeout(15_000),
  });
  const remote = await response.json().catch(() => ({})) as YooKassaRefund;
  if (!response.ok) throw new YooKassaRefundError(502, `yookassa_refund_http_${response.status}`);
  if (remote.id !== refundId || !remote.payment_id) reject('provider_refund_mismatch', 502);

  const requests = await prisma.refundRequest.findMany({
    where: { providerRefundId: refundId },
    take: 2,
    include: { payment: { select: { id: true, providerPaymentId: true, checkoutOrderId: true } }, checkoutOrder: { select: { id: true, publicCode: true, totalKopecks: true, commissionKopecks: true, currency: true, items: { select: { supplierId: true } }, fulfillmentItems: { select: { id: true } } } } },
  });
  if (requests.length > 1) reject('duplicate_local_provider_refund_id', 409);
  const request = requests[0] || null;
  if (!request || !request.payment || !request.checkoutOrder || !request.supplierId) reject('refund_request_not_found', 404);
  if (!['PROCESSING', 'COMPLETED'].includes(request.status)) reject('refund_request_not_processing', 409);
  if (request.payment.providerPaymentId !== remote.payment_id
    || request.paymentId !== request.payment.id
    || request.checkoutOrderId !== request.checkoutOrder.id
    || request.amountKopecks !== request.checkoutOrder.totalKopecks
    || remote.amount?.value !== money(request.amountKopecks)
    || remote.amount?.currency !== request.currency
    || request.currency !== request.checkoutOrder.currency) reject('provider_refund_mismatch', 502);
  if (request.checkoutOrder.items.length !== 1
    || request.checkoutOrder.fulfillmentItems.length !== 1
    || request.checkoutOrder.items[0]?.supplierId !== request.supplierId) reject('refund_order_shape_changed', 409);
  if (remote.status !== 'succeeded') return { result: 'pending' as const, requestId: request.id, orderId: request.checkoutOrder.id, publicCode: request.checkoutOrder.publicCode, paymentId: request.payment.id, remote };

  await finalizeYooKassaFullRefund({
    orderId: request.checkoutOrder.id,
    requestId: request.id,
    paymentId: request.payment.id,
    supplierId: request.supplierId,
    amountKopecks: request.amountKopecks,
    commissionKopecks: request.checkoutOrder.commissionKopecks,
    providerRefund: remote,
    now: input.now || new Date(),
  });
  return { result: 'processed' as const, requestId: request.id, orderId: request.checkoutOrder.id, publicCode: request.checkoutOrder.publicCode, paymentId: request.payment.id, remote };
}

export async function finalizeYooKassaFullRefund(input: {
  orderId: string;
  requestId: string;
  paymentId: string;
  supplierId: string;
  amountKopecks: number;
  commissionKopecks: number;
  providerRefund: YooKassaRefund;
  now?: Date;
}) {
  const now = input.now || new Date();
  await prisma.$transaction(async (tx) => {
    const claimed = await tx.refundRequest.updateMany({ where: { id: input.requestId, status: { not: 'COMPLETED' } }, data: {
      status: 'COMPLETED', processedAt: now, providerRefundId: input.providerRefund.id,
      providerPayload: input.providerRefund as unknown as Prisma.InputJsonValue,
    } });
    if (claimed.count !== 1) return;
    const items = await tx.checkoutItem.findMany({ where: { checkoutOrderId: input.orderId, status: { in: ['CONFIRMED', 'FULFILLED'] } }, select: { id: true, eventId: true, sessionId: true, admissionProductId: true, quantity: true } });
    for (const item of items) {
      if (item.sessionId) await tx.eventSession.updateMany({ where: { id: item.sessionId, ticketsVacant: { not: null } }, data: { ticketsVacant: { increment: item.quantity }, capacitySold: { decrement: item.quantity } } });
      if (item.eventId) await tx.event.updateMany({ where: { id: item.eventId, ticketsVacant: { not: null } }, data: { ticketsVacant: { increment: item.quantity } } });
      if (item.admissionProductId) await tx.admissionProduct.updateMany({ where: { id: item.admissionProductId, ticketsVacant: { not: null } }, data: { ticketsVacant: { increment: item.quantity } } });
    }
    await tx.checkoutOrder.update({ where: { id: input.orderId }, data: { status: 'REFUNDED', cancelledAt: now, checkoutUrl: null } });
    await tx.issuedTicket.updateMany({ where: { checkoutOrderId: input.orderId, cancelledAt: null }, data: { cancelledAt: now } });
    await tx.checkoutItem.updateMany({ where: { checkoutOrderId: input.orderId }, data: { status: 'REFUNDED' } });
    await tx.fulfillmentItem.updateMany({ where: { checkoutOrderId: input.orderId }, data: { status: 'REFUNDED', refundedKopecks: input.amountKopecks, refundProviderId: input.providerRefund.id } });
    await tx.payment.update({ where: { id: input.paymentId }, data: { status: 'REFUNDED' } });
    await tx.supplierLedgerEntry.create({ data: { supplierId: input.supplierId, type: 'REFUND', amountKopecks: -input.amountKopecks, checkoutOrderId: input.orderId, paymentId: input.paymentId, referenceType: 'REFUND_REQUEST', referenceId: input.requestId, note: 'Полный возврат покупателю через ЮKassa' } });
    if (input.commissionKopecks > 0) await tx.supplierLedgerEntry.create({ data: { supplierId: input.supplierId, type: 'COMMISSION', amountKopecks: input.commissionKopecks, checkoutOrderId: input.orderId, paymentId: input.paymentId, referenceType: 'REFUND_REQUEST', referenceId: input.requestId, note: 'Сторнирование комиссии по полному возврату' } });
  });
}
