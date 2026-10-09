import { randomBytes } from 'node:crypto';
import { prisma, type ReviewStatus } from '@daibilet/db';

import { sendReviewVerifyEmail } from './mail.js';
import { canAcceptReviews } from './review-capability.js';
import { formatReviewDisplayName, maskPurchaseRef } from './review-display.js';
import { buildRatingSummary, type RatingSummary } from './review-rating.js';
import { normalizeEmail, verifyPurchaseForReview } from './review-verification.js';

function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

const MIN_FORM_TIME_MS = 5000;
const MIN_TEXT_LENGTH = 10;
const VERIFY_TOKEN_TTL_MS = 48 * 60 * 60 * 1000;

export class ReviewServiceError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(code: string, message: string, statusCode = 400) {
    super(message);
    this.name = 'ReviewServiceError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export type CreateReviewInput = {
  eventId: string;
  rating: number;
  text: string;
  authorName: string;
  authorEmail: string;
  title?: string | null | undefined;
  orderOrTicketRef?: string | null | undefined;
  reviewRequestToken?: string | null | undefined;
  website?: string | null | undefined;
  formStartedAt?: number | string | null | undefined;
  siteUserId?: string | null | undefined;
  purchaseDate?: string | null | undefined;
};

function appUrl(): string {
  return (process.env.PUBLIC_SITE_URL || process.env.APP_URL || 'https://daibilet.ru').replace(/\/$/, '');
}

export async function createReview(input: CreateReviewInput, ip?: string) {
  if (input.website) {
    console.warn(`[reviews] honeypot from ${ip || 'unknown'}`);
    return { message: 'Спасибо! Отзыв будет опубликован после модерации.' };
  }

  if (input.formStartedAt) {
    const started = typeof input.formStartedAt === 'number' ? input.formStartedAt : Date.parse(String(input.formStartedAt));
    if (Number.isFinite(started) && Date.now() - started < MIN_FORM_TIME_MS) {
      console.warn(`[reviews] fast submit from ${ip || 'unknown'}`);
      return { message: 'Спасибо! Отзыв будет опубликован после модерации.' };
    }
  }

  if (input.rating < 1 || input.rating > 5) {
    throw new ReviewServiceError('invalid_rating', 'Рейтинг должен быть от 1 до 5');
  }
  if (!input.text || input.text.trim().length < MIN_TEXT_LENGTH) {
    throw new ReviewServiceError('invalid_text', `Текст отзыва должен быть не менее ${MIN_TEXT_LENGTH} символов`);
  }
  if (!input.authorName || input.authorName.trim().length < 2) {
    throw new ReviewServiceError('invalid_name', 'Укажите имя (минимум 2 символа)');
  }
  const email = normalizeEmail(input.authorEmail);
  if (!email || !email.includes('@')) {
    throw new ReviewServiceError('invalid_email', 'Укажите корректный email');
  }

  const event = await prisma.event.findUnique({
    where: { id: input.eventId },
    select: {
      id: true,
      title: true,
      slug: true,
      supplierId: true,
      managementMode: true,
      purchaseFlow: true,
    },
  });
  if (!event) throw new ReviewServiceError('event_not_found', 'Событие не найдено', 404);
  if (!canAcceptReviews(event)) {
    throw new ReviewServiceError('reviews_disabled', 'Отзывы недоступны для этого события', 403);
  }

  const existing = await prisma.review.findFirst({
    where: {
      authorEmail: email,
      eventId: event.id,
      status: { notIn: ['REJECTED', 'HIDDEN'] },
    },
  });
  if (existing) {
    throw new ReviewServiceError('duplicate', 'Вы уже оставляли отзыв на это событие', 409);
  }

  const verification = await verifyPurchaseForReview({
    eventId: event.id,
    email,
    orderOrTicketRef: input.orderOrTicketRef,
    reviewRequestToken: input.reviewRequestToken,
    siteUserId: input.siteUserId,
  });

  const isVerified = verification.verified;
  const canSkipEmail = isVerified || Boolean(input.reviewRequestToken && verification.verified);
  // Without SMTP, do not trap reviews in PENDING_EMAIL forever — send to moderation.
  const skipEmailVerify = canSkipEmail || !smtpConfigured();
  const verifyToken = skipEmailVerify ? null : randomBytes(32).toString('hex');
  const status: ReviewStatus = skipEmailVerify ? 'PENDING_MODERATION' : 'PENDING_EMAIL';

  const authorName = input.authorName.trim();
  const review = await prisma.review.create({
    data: {
      eventId: event.id,
      supplierId: event.supplierId,
      siteUserId: input.siteUserId || null,
      checkoutOrderId: verification.checkoutOrderId || null,
      externalOrderId: verification.externalOrderId || null,
      rating: Math.round(input.rating),
      title: input.title?.trim() || null,
      text: input.text.trim(),
      authorName,
      authorEmail: email,
      isVerified,
      purchaseRef: maskPurchaseRef(verification.purchaseRef) || verification.purchaseRef || null,
      verifyToken,
      status,
    },
  });

  await prisma.reviewActionLog.create({
    data: {
      reviewId: review.id,
      actorType: 'client',
      actorId: input.siteUserId || email,
      actionType: 'REVIEW_CREATED',
      payload: {
        isVerified,
        reason: verification.reason || null,
        status,
      },
    },
  });

  if (input.reviewRequestToken) {
    await prisma.reviewRequest.updateMany({
      where: { token: input.reviewRequestToken },
      data: { reviewId: review.id },
    });
  }

  if (!skipEmailVerify && verifyToken) {
    const verifyUrl = `${appUrl()}/api/reviews/verify?token=${verifyToken}`;
    await sendReviewVerifyEmail({
      to: email,
      authorName,
      eventTitle: event.title,
      verifyUrl,
    });
  }

  const message = canSkipEmail
    ? 'Спасибо! Отзыв будет опубликован после модерации.'
    : skipEmailVerify
      ? 'Спасибо! Отзыв отправлен на модерацию.'
      : 'Проверьте почту — мы отправили ссылку для подтверждения.';

  return {
    id: review.id,
    status: review.status,
    isVerified,
    message,
  };
}

export async function verifyReviewEmail(token: string) {
  const review = await prisma.review.findUnique({ where: { verifyToken: token } });
  if (!review) throw new ReviewServiceError('invalid_token', 'Ссылка недействительна', 404);
  if (Date.now() - review.createdAt.getTime() > VERIFY_TOKEN_TTL_MS) {
    await prisma.review.delete({ where: { id: review.id } });
    throw new ReviewServiceError('token_expired', 'Ссылка истекла. Оставьте отзыв заново.');
  }
  if (review.status !== 'PENDING_EMAIL') {
    return { message: 'Отзыв уже подтверждён' };
  }
  await prisma.review.update({
    where: { id: review.id },
    data: { status: 'PENDING_MODERATION', verifyToken: null },
  });
  return { message: 'Email подтверждён! Отзыв отправлен на модерацию.' };
}

export async function listApprovedReviewsByEventSlug(slugOrId: string, page = 1, limit = 10) {
  const event = await resolveReviewEvent(slugOrId);
  if (!event) throw new ReviewServiceError('event_not_found', 'Событие не найдено', 404);

  const where = { eventId: event.id, status: 'APPROVED' as const };
  const [rows, total, ratingRows] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: [{ isVerified: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        rating: true,
        title: true,
        text: true,
        authorName: true,
        isVerified: true,
        createdAt: true,
        publishedAt: true,
      },
    }),
    prisma.review.count({ where }),
    prisma.review.findMany({
      where,
      select: { rating: true, isVerified: true },
    }),
  ]);

  const summary = buildRatingSummary(event.id, ratingRows);

  return {
    eventId: event.id,
    eventSlug: event.slug,
    eventTitle: event.title,
    items: rows.map((row) => ({
      id: row.id,
      rating: row.rating,
      title: row.title,
      text: row.text,
      authorName: formatReviewDisplayName(row.authorName),
      isVerified: row.isVerified,
      createdAt: (row.publishedAt || row.createdAt).toISOString(),
    })),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    summary,
  };
}

async function resolveReviewEvent(slugOrId: string): Promise<{ id: string; slug: string; title: string } | null> {
  const raw = String(slugOrId || '').trim();
  if (!raw) return null;

  const select = { id: true, slug: true, title: true } as const;
  const direct = await prisma.event.findFirst({
    where: { OR: [{ id: raw }, { slug: raw }] },
    select,
  });
  if (direct) return direct;

  // Public URLs use transliterated slug; DB often keeps Cyrillic sourceSlug (TEP).
  // Example: ...-peterburga-706 → evt_tep_706.
  const tepSuffix = raw.match(/(?:^|-)(\d{2,6})$/);
  if (tepSuffix?.[1]) {
    const tepEvent = await prisma.event.findFirst({
      where: { id: `evt_tep_${tepSuffix[1]}` },
      select,
    });
    if (tepEvent && publicSlugLite(tepEvent.slug) === publicSlugLite(raw)) return tepEvent;
  }

  const tcPrefixMatch = raw.match(/^tc-([a-f0-9]{24})-/i);
  if (tcPrefixMatch?.[1]) {
    const tcId = tcPrefixMatch[1];
    const tcEvent = await prisma.event.findFirst({
      where: { OR: [{ id: tcId }, { id: `evt_${tcId}` }] },
      select,
    });
    if (tcEvent) return tcEvent;
  }

  const normalized = publicSlugLite(raw);
  if (normalized && normalized !== raw) {
    const byNormalized = await prisma.event.findFirst({
      where: { slug: normalized },
      select,
    });
    if (byNormalized) return byNormalized;
  }

  // Soft resolve: past dated slug may have been replaced — match by TC id prefix inside slug.
  if (tcPrefixMatch?.[1]) {
    const like = await prisma.event.findFirst({
      where: { slug: { contains: tcPrefixMatch[1], mode: 'insensitive' } },
      orderBy: { updatedAt: 'desc' },
      select,
    });
    if (like) return like;
  }

  // Last resort for Cyrillic DB slugs: match transliteration of recent candidates with same numeric tail.
  if (tepSuffix?.[1] && normalized) {
    const candidates = await prisma.event.findMany({
      where: { slug: { endsWith: `-${tepSuffix[1]}` } },
      select,
      take: 25,
      orderBy: { updatedAt: 'desc' },
    });
    const matched = candidates.find((row) => publicSlugLite(row.slug) === normalized);
    if (matched) return matched;
  }

  return null;
}

function publicSlugLite(value: string): string {
  const letters: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
    к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
    х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  };
  return String(value || '')
    .trim()
    .toLowerCase()
    .split('')
    .map((character) => letters[character] ?? character)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export async function getEventReviewSummary(eventId: string): Promise<RatingSummary> {
  const rows = await prisma.review.findMany({
    where: { eventId, status: 'APPROVED' },
    select: { rating: true, isVerified: true },
  });
  return buildRatingSummary(eventId, rows);
}

export async function getReviewRequestInfo(token: string) {
  const request = await prisma.reviewRequest.findUnique({
    where: { token },
    include: {
      event: { select: { id: true, title: true, slug: true } },
    },
  });
  if (!request) throw new ReviewServiceError('invalid_token', 'Ссылка недействительна', 404);

  if (!request.clickedAt) {
    await prisma.reviewRequest.update({
      where: { id: request.id },
      data: { clickedAt: new Date() },
    });
  }

  return {
    eventId: request.eventId,
    eventTitle: request.event.title,
    eventSlug: request.event.slug,
    email: request.email,
    buyerName: request.buyerName,
    purchaseDate: request.purchaseDate?.toISOString() || null,
    purchaseRef: maskPurchaseRef(request.purchaseRef),
    token: request.token,
  };
}

export async function adminListReviews(filters: {
  status?: string | null | undefined;
  eventId?: string | null | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}) {
  const page = filters.page || 1;
  const limit = Math.min(100, filters.limit || 20);
  const where: { status?: ReviewStatus; eventId?: string } = {};
  if (filters.status) where.status = filters.status as ReviewStatus;
  if (filters.eventId) where.eventId = filters.eventId;

  const [items, total, pendingCount] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        event: { select: { id: true, title: true, slug: true } },
        externalOrder: {
          select: {
            id: true,
            publicCode: true,
            externalOrderId: true,
            status: true,
            purchasedAt: true,
          },
        },
      },
    }),
    prisma.review.count({ where }),
    prisma.review.count({ where: { status: 'PENDING_MODERATION' } }),
  ]);

  return {
    items: items.map((item) => ({
      id: item.id,
      rating: item.rating,
      title: item.title,
      text: item.text,
      authorName: item.authorName,
      authorEmail: item.authorEmail,
      isVerified: item.isVerified,
      status: item.status,
      adminComment: item.adminComment,
      purchaseRef: item.purchaseRef,
      createdAt: item.createdAt.toISOString(),
      publishedAt: item.publishedAt?.toISOString() || null,
      event: item.event,
      externalOrder: item.externalOrder
        ? {
            id: item.externalOrder.id,
            publicCode: item.externalOrder.publicCode,
            externalOrderId: item.externalOrder.externalOrderId,
            status: item.externalOrder.status,
            purchasedAt: item.externalOrder.purchasedAt?.toISOString() || null,
          }
        : null,
    })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
    pendingCount,
  };
}

export async function adminModerateReview(
  reviewId: string,
  action: 'approve' | 'reject' | 'hide',
  adminComment?: string | null | undefined,
) {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) throw new ReviewServiceError('not_found', 'Отзыв не найден', 404);

  const statusMap = {
    approve: 'APPROVED',
    reject: 'REJECTED',
    hide: 'HIDDEN',
  } as const;

  const status = statusMap[action];
  const updated = await prisma.review.update({
    where: { id: reviewId },
    data: {
      status,
      adminComment: adminComment || null,
      publishedAt: action === 'approve' ? new Date() : review.publishedAt,
    },
  });

  await prisma.reviewActionLog.create({
    data: {
      reviewId,
      actorType: 'admin',
      actionType: `ADMIN_${action.toUpperCase()}`,
      payload: { adminComment: adminComment || null },
    },
  });

  return {
    id: updated.id,
    status: updated.status,
    publishedAt: updated.publishedAt?.toISOString() || null,
  };
}
