import { prisma, type Prisma } from '@daibilet/db';
import {
  applyYooKassaPaymentObject,
  readYooKassaRuntimeConfig,
  releaseReservedCapacityInTransaction,
  type YooKassaPaymentObject,
} from './checkout-yookassa.js';

type Operation = 'cancel' | 'refund';
type ProviderRefund = { id: string; status: string; payment_id: string; amount?: { value?: string; currency?: string }; receipt_registration?: string };

export class AdminOrderOperationError extends Error {
  constructor(readonly statusCode: number, readonly code: string) { super(code); }
}

function reject(code: string, statusCode = 409): never { throw new AdminOrderOperationError(statusCode, code); }

function money(kopecks: number): string { return (kopecks / 100).toFixed(2); }

async function providerRequest<T>(path: string, method: 'GET' | 'POST', body?: object, key?: string): Promise<T> {
  const config = readYooKassaRuntimeConfig();
  if (!config.enabled || !config.shopId || !config.secretKey) reject('yookassa_not_configured', 503);
  const response = await fetch(`${config.apiUrl}${path}`, {
    method,
    headers: {
      authorization: `Basic ${Buffer.from(`${config.shopId}:${config.secretKey}`).toString('base64')}`,
      'content-type': 'application/json',
      ...(key ? { 'Idempotence-Key': key } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15_000),
  });
  const value = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    // Keep a durable request for an uncertain provider failure; retry uses the same key.
    throw new AdminOrderOperationError(502, `yookassa_http_${response.status}`);
  }
  return value as T;
}

async function loadOrder(key: string) {
  return prisma.checkoutOrder.findFirst({
    where: { OR: [{ id: key }, { publicCode: key }] },
    include: { payments: { orderBy: { createdAt: 'desc' } }, items: true, fulfillmentItems: true, refundRequests: true },
  });
}

export async function operateAdminInternalOrder(input: { orderKey: string; operation: Operation; confirmCode: string; reason: string }) {
  const key = input.orderKey.trim();
  const reason = input.reason.trim();
  if (!key || !reason || reason.length > 500) reject('reason_required', 400);
  const order = await loadOrder(key);
  if (!order) reject('order_not_found', 404);
  if (input.confirmCode.trim() !== order.publicCode) reject('confirmation_code_mismatch', 400);
  if (input.operation === 'cancel') return cancelUnpaidOrder(order.id, reason);
  if (input.operation === 'refund') return refundPaidOrder(order.id, reason);
  reject('unknown_operation', 400);
}

async function cancelUnpaidOrder(orderId: string, reason: string) {
  const order = await loadOrder(orderId);
  if (!order) reject('order_not_found', 404);
  if (order.status === 'CANCELLED') return { status: 'CANCELLED', orderId };
  if (order.payments.some((payment) => payment.status === 'SUCCEEDED' || payment.status === 'REFUNDED') || order.paidAt) {
    reject('paid_order_requires_refund');
  }
  if (order.payments.filter((item) => item.providerPaymentId && !['CANCELLED', 'FAILED'].includes(item.status)).length > 1) reject('multiple_payments_manual_review');
  if (!['DRAFT', 'PENDING_PAYMENT', 'FAILED', 'EXPIRED'].includes(order.status)) reject('order_not_cancellable');
  const payment = order.payments.find((item) => item.providerPaymentId);
  if (payment?.providerPaymentId) {
    const remote = await providerRequest<YooKassaPaymentObject>(`/payments/${encodeURIComponent(payment.providerPaymentId)}`, 'GET');
    if (remote.status === 'succeeded') reject('payment_already_succeeded_refresh_order');
    if (remote.status !== 'canceled') {
      if (remote.status !== 'pending' && remote.status !== 'waiting_for_capture') reject('payment_status_not_cancellable');
      await providerRequest(`/payments/${encodeURIComponent(payment.providerPaymentId)}/cancel`, 'POST', {}, `admin-cancel-${payment.id}`);
    }
    const confirmed = await providerRequest<YooKassaPaymentObject>(`/payments/${encodeURIComponent(payment.providerPaymentId)}`, 'GET');
    if (confirmed.status !== 'canceled') return { status: 'PROCESSING', orderId };
    await applyYooKassaPaymentObject(confirmed, { now: new Date() });
  } else {
    await prisma.$transaction(async (tx) => {
      const changed = await tx.checkoutOrder.updateMany({
        where: { id: orderId, status: { in: ['DRAFT', 'PENDING_PAYMENT', 'FAILED', 'EXPIRED'] }, paidAt: null },
        data: { status: 'CANCELLED', cancelledAt: new Date(), checkoutUrl: null },
      });
      if (changed.count !== 1) reject('order_changed_retry');
      await tx.payment.updateMany({ where: { checkoutOrderId: orderId, status: { not: 'SUCCEEDED' } }, data: { status: 'CANCELLED', cancelledAt: new Date(), error: `admin_cancel: ${reason}` } });
      await tx.fulfillmentItem.updateMany({ where: { checkoutOrderId: orderId }, data: { status: 'CANCELLED', lastError: `admin_cancel: ${reason}` } });
      await releaseReservedCapacityInTransaction(tx, orderId);
    });
  }
  return { status: 'CANCELLED', orderId };
}

async function refundPaidOrder(orderId: string, reason: string) {
  const order = await loadOrder(orderId);
  if (!order) reject('order_not_found', 404);
  if (order.status === 'REFUNDED') return { status: 'REFUNDED', orderId };
  if (!['CONFIRMED', 'FULFILLED'].includes(order.status)) reject('order_not_refundable');
  const payment = order.payments.find((item) => item.status === 'SUCCEEDED' && item.providerPaymentId);
  if (!payment?.providerPaymentId || payment.amountKopecks !== order.totalKopecks || order.totalKopecks <= 0) reject('payment_not_fully_refundable');
  if (order.payments.filter((item) => item.status === 'SUCCEEDED').length !== 1) reject('multiple_payments_manual_review');
  if (order.payments.some((item) => item.id !== payment.id && !['CANCELLED', 'FAILED'].includes(item.status))) reject('multiple_payments_manual_review');
  if (order.items.length !== 1 || order.fulfillmentItems.length !== 1) reject('multiple_items_manual_review');
  const suppliers = [...new Set(order.items.map((item) => item.supplierId).filter(Boolean))];
  if (suppliers.length !== 1 || !suppliers[0]) reject('multiple_suppliers_manual_review');
  if (!(await prisma.supplierLedgerEntry.count({ where: { checkoutOrderId: orderId, paymentId: payment.id, type: 'SALE' } }))) reject('sale_ledger_missing_manual_review');
  if (await prisma.supplierLedgerEntry.count({ where: { checkoutOrderId: orderId, type: 'PAYOUT' } })) reject('supplier_already_paid_manual_review');
  const existing = order.refundRequests.filter((item) => !['FAILED', 'REJECTED'].includes(item.status));
  if (existing.length > 1 || existing.some((item) => item.amountKopecks !== order.totalKopecks || item.paymentId !== payment.id)) reject('other_refund_request_exists');
  let request = existing[0];
  if (!request) {
    try {
      request = await prisma.$transaction(async (tx) => {
        const found = await tx.refundRequest.findFirst({ where: { checkoutOrderId: orderId, status: { notIn: ['FAILED', 'REJECTED'] } } });
        if (found) return found;
        return tx.refundRequest.create({ data: {
          checkoutOrderId: orderId, paymentId: payment.id, supplierId: suppliers[0]!,
          amountKopecks: order.totalKopecks, currency: order.currency,
          reason: 'SUPPORT', reasonNote: reason, createdByType: 'ADMIN', status: 'PROCESSING',
        } });
      }, { isolationLevel: 'Serializable' });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2034') reject('refund_already_in_progress');
      throw error;
    }
  }
  if (request.status === 'COMPLETED') return { status: 'REFUNDED', orderId };
  if (request.amountKopecks !== order.totalKopecks || request.paymentId !== payment.id) reject('other_refund_request_exists');
  if (request.status === 'CREATED' || request.status === 'APPROVED') {
    await prisma.refundRequest.update({ where: { id: request.id }, data: { status: 'PROCESSING' } });
  }
  const remote = request.providerRefundId
    ? await providerRequest<ProviderRefund>(`/refunds/${encodeURIComponent(request.providerRefundId)}`, 'GET')
    : await providerRequest<ProviderRefund>('/refunds', 'POST', {
      payment_id: payment.providerPaymentId,
      amount: { value: money(order.totalKopecks), currency: order.currency },
      description: `Возврат заказа ${order.publicCode || order.id}`,
    }, `admin-refund-${request.id}`);
  if (remote.payment_id !== payment.providerPaymentId || remote.amount?.value !== money(order.totalKopecks) || remote.amount?.currency !== order.currency) {
    reject('provider_refund_mismatch', 502);
  }
  await prisma.refundRequest.update({ where: { id: request.id }, data: { providerRefundId: remote.id, providerPayload: remote as unknown as Prisma.InputJsonValue } });
  if (remote.status === 'canceled') {
    await prisma.refundRequest.update({ where: { id: request.id }, data: { status: 'FAILED', adminComment: 'ЮKassa отменила возврат' } });
    return { status: 'FAILED', orderId };
  }
  if (remote.status !== 'succeeded') return { status: 'PROCESSING', orderId, refundId: remote.id };
  await finalizeFullRefund({ orderId, requestId: request.id, paymentId: payment.id, supplierId: suppliers[0], amountKopecks: order.totalKopecks, commissionKopecks: order.commissionKopecks, providerRefund: remote });
  return { status: 'REFUNDED', orderId, refundId: remote.id };
}

async function finalizeFullRefund(input: { orderId: string; requestId: string; paymentId: string; supplierId: string; amountKopecks: number; commissionKopecks: number; providerRefund: ProviderRefund }) {
  await prisma.$transaction(async (tx) => {
    const claimed = await tx.refundRequest.updateMany({ where: { id: input.requestId, status: { not: 'COMPLETED' } }, data: {
      status: 'COMPLETED', processedAt: new Date(), providerRefundId: input.providerRefund.id,
      providerPayload: input.providerRefund as unknown as Prisma.InputJsonValue,
    } });
    if (claimed.count !== 1) return;
    const items = await tx.checkoutItem.findMany({ where: { checkoutOrderId: input.orderId, status: { in: ['CONFIRMED', 'FULFILLED'] } }, select: { id: true, eventId: true, sessionId: true, admissionProductId: true, quantity: true } });
    for (const item of items) {
      if (item.sessionId) await tx.eventSession.updateMany({ where: { id: item.sessionId, ticketsVacant: { not: null } }, data: { ticketsVacant: { increment: item.quantity }, capacitySold: { decrement: item.quantity } } });
      if (item.eventId) await tx.event.updateMany({ where: { id: item.eventId, ticketsVacant: { not: null } }, data: { ticketsVacant: { increment: item.quantity } } });
      if (item.admissionProductId) await tx.admissionProduct.updateMany({ where: { id: item.admissionProductId, ticketsVacant: { not: null } }, data: { ticketsVacant: { increment: item.quantity } } });
    }
    await tx.checkoutOrder.update({ where: { id: input.orderId }, data: { status: 'REFUNDED', cancelledAt: new Date(), checkoutUrl: null } });
    await tx.checkoutItem.updateMany({ where: { checkoutOrderId: input.orderId }, data: { status: 'REFUNDED' } });
    await tx.fulfillmentItem.updateMany({ where: { checkoutOrderId: input.orderId }, data: { status: 'REFUNDED', refundedKopecks: input.amountKopecks, refundProviderId: input.providerRefund.id } });
    await tx.payment.update({ where: { id: input.paymentId }, data: { status: 'REFUNDED' } });
    await tx.supplierLedgerEntry.create({ data: { supplierId: input.supplierId, type: 'REFUND', amountKopecks: -input.amountKopecks, checkoutOrderId: input.orderId, paymentId: input.paymentId, referenceType: 'REFUND_REQUEST', referenceId: input.requestId, note: 'Полный возврат покупателю через ЮKassa' } });
    if (input.commissionKopecks > 0) await tx.supplierLedgerEntry.create({ data: { supplierId: input.supplierId, type: 'COMMISSION', amountKopecks: input.commissionKopecks, checkoutOrderId: input.orderId, paymentId: input.paymentId, referenceType: 'REFUND_REQUEST', referenceId: input.requestId, note: 'Сторнирование комиссии по полному возврату' } });
  });
}
