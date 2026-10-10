import { randomBytes } from 'node:crypto';
import { prisma } from '@daibilet/db';

import { sendReviewRequestEmail } from './mail.js';
import { isConfirmedOrderStatus, normalizeEmail } from './review-verification.js';

export type SendReviewRequestsOptions = {
  dryRun?: boolean;
  now?: Date;
  lookbackHoursStart?: number;
  lookbackHoursEnd?: number;
  limit?: number;
};

export type SendReviewRequestsResult = {
  candidates: number;
  created: number;
  emailed: number;
  skippedNoEmail: number;
  skippedExisting: number;
  smtpSkipped: number;
};

function appUrl(): string {
  return (process.env.PUBLIC_SITE_URL || process.env.APP_URL || 'https://daibilet.ru').replace(/\/$/, '');
}

function formatRuDate(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}

function extractBuyerName(snapshot: unknown): string | null {
  if (!snapshot || typeof snapshot !== 'object') return null;
  const root = snapshot as Record<string, unknown>;
  const buyer = (root.buyer && typeof root.buyer === 'object' ? root.buyer : root) as Record<string, unknown>;
  for (const candidate of [buyer.name, buyer.fullName, root.name]) {
    const value = String(candidate || '').trim();
    if (value) return value;
  }
  return null;
}

/**
 * Post-session follow-up: ExternalOrder tickets whose session was yesterday (1–2 days ago).
 * Requires buyer email. TEP without email → skip.
 */
export async function sendReviewRequestBatch(
  options: SendReviewRequestsOptions = {},
): Promise<SendReviewRequestsResult> {
  const now = options.now || new Date();
  const startHours = options.lookbackHoursStart ?? 48;
  const endHours = options.lookbackHoursEnd ?? 24;
  const windowStart = new Date(now.getTime() - startHours * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() - endHours * 60 * 60 * 1000);
  const limit = options.limit ?? 200;

  const tickets = await prisma.externalTicket.findMany({
    where: {
      eventId: { not: null },
      sessionId: { not: null },
      order: {
        archivedAt: null,
        buyerEmailNormalized: { not: null },
      },
    },
    include: {
      order: true,
    },
    take: limit * 3,
    orderBy: { order: { purchasedAt: 'desc' } },
  });

  const sessionIds = [...new Set(tickets.map((t) => t.sessionId).filter(Boolean))] as string[];
  const sessions =
    sessionIds.length > 0
      ? await prisma.eventSession.findMany({
          where: {
            id: { in: sessionIds },
            startsAt: { gte: windowStart, lt: windowEnd },
          },
          select: { id: true, startsAt: true, eventId: true },
        })
      : [];
  const sessionById = new Map(sessions.map((s) => [s.id, s]));

  const eventIds = [
    ...new Set(
      tickets
        .filter((t) => t.sessionId && sessionById.has(t.sessionId) && t.eventId)
        .map((t) => t.eventId as string),
    ),
  ];
  const events =
    eventIds.length > 0
      ? await prisma.event.findMany({
          where: { id: { in: eventIds } },
          select: { id: true, title: true, slug: true },
        })
      : [];
  const eventById = new Map(events.map((e) => [e.id, e]));

  const result: SendReviewRequestsResult = {
    candidates: 0,
    created: 0,
    emailed: 0,
    skippedNoEmail: 0,
    skippedExisting: 0,
    smtpSkipped: 0,
  };

  const seen = new Set<string>();

  for (const ticket of tickets) {
    if (result.created >= limit) break;
    if (!ticket.eventId || !ticket.sessionId) continue;
    const session = sessionById.get(ticket.sessionId);
    if (!session?.startsAt) continue;
    const event = eventById.get(ticket.eventId);
    if (!event) continue;
    if (!isConfirmedOrderStatus(ticket.order.status)) continue;

    const email = normalizeEmail(ticket.order.buyerEmailNormalized);
    if (!email) {
      result.skippedNoEmail += 1;
      continue;
    }

    const dedupeKey = `${email}::${ticket.eventId}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    result.candidates += 1;

    const existing = await prisma.reviewRequest.findUnique({
      where: { email_eventId: { email, eventId: ticket.eventId } },
    });
    if (existing) {
      result.skippedExisting += 1;
      continue;
    }

    const token = randomBytes(32).toString('hex');
    const buyerName = extractBuyerName(ticket.order.buyerSnapshot) || email.split('@')[0] || 'Гость';
    const purchaseRef = ticket.externalTicketId || ticket.order.publicCode || ticket.order.externalOrderId;
    const reviewUrl = `${appUrl()}/reviews/write?token=${token}`;

    if (options.dryRun) {
      console.log(`[review-requests] dry-run → ${email} event=${event.slug} ${reviewUrl}`);
      result.created += 1;
      continue;
    }

    await prisma.reviewRequest.create({
      data: {
        email,
        eventId: ticket.eventId,
        externalOrderId: ticket.order.id,
        token,
        purchaseDate: session.startsAt,
        purchaseRef,
        buyerName,
      },
    });
    result.created += 1;

    const mail = await sendReviewRequestEmail({
      to: email,
      customerName: buyerName,
      eventTitle: event.title,
      eventDate: formatRuDate(session.startsAt),
      reviewUrl,
      appUrl: appUrl(),
    });
    if (mail.sent) result.emailed += 1;
    else result.smtpSkipped += 1;
  }

  return result;
}

/** Sunday reminder for requests without a review after 7 days. */
export async function sendReviewReminderBatch(options: { dryRun?: boolean; limit?: number } = {}) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const pending = await prisma.reviewRequest.findMany({
    where: {
      sentAt: { lt: sevenDaysAgo },
      reminderSentAt: null,
      reviewId: null,
    },
    include: { event: { select: { title: true, slug: true } } },
    take: options.limit ?? 100,
  });

  let emailed = 0;
  let smtpSkipped = 0;
  for (const req of pending) {
    const reviewUrl = `${appUrl()}/reviews/write?token=${req.token}`;
    if (options.dryRun) {
      console.log(`[review-reminders] dry-run → ${req.email} ${reviewUrl}`);
      continue;
    }
    const mail = await sendReviewRequestEmail({
      to: req.email,
      customerName: req.buyerName || req.email.split('@')[0] || 'Гость',
      eventTitle: req.event.title,
      eventDate: req.purchaseDate ? formatRuDate(req.purchaseDate) : formatRuDate(req.sentAt),
      reviewUrl,
      appUrl: appUrl(),
    });
    if (mail.sent) emailed += 1;
    else smtpSkipped += 1;
    await prisma.reviewRequest.update({
      where: { id: req.id },
      data: { reminderSentAt: new Date() },
    });
  }

  return { pending: pending.length, emailed, smtpSkipped };
}
