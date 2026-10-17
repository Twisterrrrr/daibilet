import { prisma } from '@daibilet/db';
import type { BuyerInternalOrderRecord } from '@/lib/buyer-checkout';
import { buyerTicketAbsoluteUrl } from '@/lib/buyer-ticket';
import { lookupCheckoutOrderByPublicCode } from '@/server/finance-checkout-client';
import { sendBuyerTicketEmail, type BuyerTicketMailPayload, type BuyerTicketMailResult } from '@/server/buyer-ticket-mail';

type Dependencies = {
  code?: string;
  lookup?: (code: string) => Promise<BuyerInternalOrderRecord | null>;
  send?: (payload: BuyerTicketMailPayload) => Promise<BuyerTicketMailResult>;
  now?: Date;
};

export async function enqueueBuyerTicketEmail(publicCode: string, email: string): Promise<void> {
  const code = publicCode.trim();
  const normalizedEmail = email.trim().toLowerCase();
  if (!/^\d{7}$/.test(code) || !normalizedEmail.includes('@')) return;
  await prisma.buyerTicketEmailDelivery.upsert({
    where: { publicCode: code },
    create: { publicCode: code, email: normalizedEmail },
    update: { email: normalizedEmail },
  });
}

export async function requestBuyerTicketEmailResend(publicCode: string, deps: Dependencies = {}): Promise<void> {
  const code = publicCode.trim();
  const order = await (deps.lookup || lookupCheckoutOrderByPublicCode)(code);
  const prior = await prisma.buyerTicketEmailDelivery.findUnique({ where: { publicCode: code } });
  const email = order?.email?.includes('@') ? order.email.toLowerCase() : prior?.email;
  if (!order || !isPaid(order.status) || !email) throw new Error('Paid order with buyer email was not found.');
  await prisma.buyerTicketEmailDelivery.upsert({
    where: { publicCode: code },
    create: { publicCode: code, email },
    update: { email, status: 'PENDING', sentAt: null, lastError: null, nextAttemptAt: deps.now || new Date() },
  });
}

export async function processDueBuyerTicketEmails(limit = 50, deps: Dependencies = {}) {
  const now = deps.now || new Date();
  const leaseExpired = new Date(now.getTime() - 15 * 60_000);
  const rows = await prisma.buyerTicketEmailDelivery.findMany({
    where: {
      ...(deps.code ? { publicCode: deps.code } : {}),
      OR: [
        { status: { in: ['PENDING', 'RETRY'] }, nextAttemptAt: { lte: now } },
        { status: 'PROCESSING', lockedAt: { lte: leaseExpired } },
      ],
    },
    orderBy: { nextAttemptAt: 'asc' },
    take: Math.max(1, Math.min(100, limit)),
  });
  const results: Array<{ publicCode: string; status: string }> = [];
  for (const row of rows) {
    const claimed = await prisma.buyerTicketEmailDelivery.updateMany({
      where: {
        id: row.id,
        OR: [
          { status: { in: ['PENDING', 'RETRY'] }, nextAttemptAt: { lte: now } },
          { status: 'PROCESSING', lockedAt: { lte: leaseExpired } },
        ],
      },
      data: { status: 'PROCESSING', lockedAt: now },
    });
    if (!claimed.count) continue;
    let status = 'RETRY';
    let reason: string | null = null;
    try {
      const order = await (deps.lookup || lookupCheckoutOrderByPublicCode)(row.publicCode);
      if (!order) throw new Error('finance_lookup_unavailable');
      if (!isPaid(order.status)) {
        if (['CANCELLED', 'CANCELED', 'EXPIRED', 'FAILED'].includes(order.status.toUpperCase())) {
          status = 'CANCELLED';
        } else {
          status = 'PENDING';
        }
      } else {
        const ticketUrl = buyerTicketAbsoluteUrl(row.publicCode);
        const sent = await (deps.send || sendBuyerTicketEmail)({
          to: row.email,
          publicCode: row.publicCode,
          title: order.title || 'Входной билет',
          ticketUrl,
          amountRub: order.amountRub,
          mode: order.mode,
        });
        if (sent.sent) status = 'SENT';
        else reason = sent.reason || 'smtp_error';
      }
    } catch (error) {
      reason = error instanceof Error ? error.message : 'delivery_error';
    }
    const attempts = row.attempts + (status === 'RETRY' || status === 'SENT' ? 1 : 0);
    const backoffMs = status === 'PENDING' ? 5 * 60_000 : Math.min(6 * 60 * 60_000, 60_000 * 2 ** Math.min(8, attempts));
    await prisma.buyerTicketEmailDelivery.update({
      where: { id: row.id },
      data: {
        status,
        attempts,
        lockedAt: null,
        nextAttemptAt: new Date(now.getTime() + backoffMs),
        sentAt: status === 'SENT' ? now : null,
        lastError: reason,
      },
    });
    console.info(`[buyer-ticket-delivery] code=${row.publicCode} status=${status} attempts=${attempts}${reason ? ` reason=${reason}` : ''}`);
    results.push({ publicCode: row.publicCode, status });
  }
  return results;
}

function isPaid(status: string): boolean {
  return ['CONFIRMED', 'PAID', 'SUCCEEDED'].includes(status.trim().toUpperCase());
}
