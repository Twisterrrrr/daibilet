import type { AdminSupplierDetailDto } from '@daibilet/contracts/admin';
import { prisma, type Prisma } from '@daibilet/db';
import { buildAdminSupplierDetailDto } from './admin-suppliers.dto.js';

export type AdminSupplierLegalReviewAction = 'approve' | 'reject';

export interface ReviewSupplierLegalProfileInput {
  supplierIdOrSlug: string;
  action: AdminSupplierLegalReviewAction;
  adminComment?: string | null;
  adminSiteUserId?: string | null;
}

type LegalProfileForReview = {
  id: string;
  legalName: string;
  inn: string | null;
  kpp: string | null;
  ogrn: string | null;
  taxMode: string;
  isVatPayer: boolean;
  defaultVatRate: number | null;
  metaJson: Prisma.JsonValue | null;
  bankAccounts: Array<{
    id: string;
    bankName: string | null;
    bik: string | null;
    accountNumber: string | null;
    correspondentAccount: string | null;
    isPrimary: boolean;
  }>;
};

export async function reviewSupplierLegalProfile(
  input: ReviewSupplierLegalProfileInput,
): Promise<AdminSupplierDetailDto> {
  const supplier = await loadSupplierLegalProfile(input.supplierIdOrSlug);
  if (!supplier) throwHttpError('Поставщик не найден.', 404);
  if (!supplier.legalProfile) throwHttpError('Юридический профиль не заполнен.', 422);

  const reviewedAt = new Date();
  const legalProfile = supplier.legalProfile;
  const adminComment = cleanString(input.adminComment);

  if (input.action === 'approve') {
    assertCanApproveLegalProfile(legalProfile);
  } else if (!adminComment) {
    throwHttpError('Комментарий обязателен при отклонении реквизитов.', 400);
  }

  await prisma.supplierLegalProfile.update({
    where: { id: legalProfile.id },
    data: {
      status: input.action === 'approve' ? 'VERIFIED' : 'REJECTED',
      verifiedAt: input.action === 'approve' ? reviewedAt : null,
      verifiedBySiteUserId: input.action === 'approve' ? cleanString(input.adminSiteUserId) : null,
      rejectionComment: input.action === 'reject' ? adminComment : null,
      metaJson: buildReviewMeta(legalProfile, input.action, reviewedAt, adminComment, input.adminSiteUserId),
    },
  });

  return buildAdminSupplierDetailDto(supplier.id);
}

async function loadSupplierLegalProfile(idOrSlug: string) {
  const key = requireCleanString(idOrSlug, 'Требуется поставщик.');
  return prisma.supplier.findFirst({
    where: { OR: [{ id: key }, { slug: key }] },
    select: {
      id: true,
      title: true,
      legalProfile: {
        include: {
          bankAccounts: {
            orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
            select: {
              id: true,
              bankName: true,
              bik: true,
              accountNumber: true,
              correspondentAccount: true,
              isPrimary: true,
            },
          },
        },
      },
    },
  });
}

function assertCanApproveLegalProfile(profile: LegalProfileForReview): void {
  const missing: string[] = [];
  if (!cleanString(profile.legalName)) missing.push('Юрлицо');
  if (!cleanString(profile.inn)) missing.push('ИНН');

  const primaryBankAccount = profile.bankAccounts.find((account) => account.isPrimary);
  if (!primaryBankAccount) {
    missing.push('основной банковский счет');
  } else {
    if (!cleanString(primaryBankAccount.bik)) missing.push('БИК');
    if (!cleanString(primaryBankAccount.accountNumber)) missing.push('расчетный счет');
  }

  if (missing.length > 0) {
    throwHttpError(`Нельзя одобрить реквизиты: не заполнено ${missing.join(', ')}.`, 422);
  }
}

function buildReviewMeta(
  profile: LegalProfileForReview,
  action: AdminSupplierLegalReviewAction,
  reviewedAt: Date,
  adminComment: string | null,
  adminSiteUserId?: string | null,
): Prisma.InputJsonValue {
  const current = toPlainRecord(profile.metaJson);
  const primaryBankAccount = profile.bankAccounts.find((account) => account.isPrimary) || null;
  const previousHistory = Array.isArray(current.legalReviewHistory)
    ? current.legalReviewHistory.filter(isPlainRecord).slice(-19)
    : [];
  const snapshot = {
    action,
    reviewedAt: reviewedAt.toISOString(),
    adminSiteUserId: cleanString(adminSiteUserId),
    comment: adminComment,
    legal: {
      legalName: cleanString(profile.legalName),
      inn: cleanString(profile.inn),
      kpp: cleanString(profile.kpp),
      ogrn: cleanString(profile.ogrn),
      taxMode: String(profile.taxMode),
      isVatPayer: profile.isVatPayer,
      defaultVatRate: profile.defaultVatRate ?? null,
    },
    primaryBankAccount: primaryBankAccount
      ? {
          id: primaryBankAccount.id,
          bankName: cleanString(primaryBankAccount.bankName),
          bik: cleanString(primaryBankAccount.bik),
          accountMask: maskAccount(primaryBankAccount.accountNumber),
          correspondentMask: maskAccount(primaryBankAccount.correspondentAccount),
        }
      : null,
  };

  return {
    ...current,
    lastLegalReview: snapshot,
    legalReviewHistory: [...previousHistory, snapshot],
  } as unknown as Prisma.InputJsonValue;
}

function toPlainRecord(value: unknown): Record<string, unknown> {
  if (!isPlainRecord(value)) return {};
  return { ...value };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function maskAccount(value: unknown): string | null {
  const text = cleanString(value);
  if (!text) return null;
  return text.length <= 4 ? text : `${'*'.repeat(Math.max(0, text.length - 4))}${text.slice(-4)}`;
}

function requireCleanString(value: unknown, message: string): string {
  const text = cleanString(value);
  if (!text) throwHttpError(message, 400);
  return text;
}

function cleanString(value: unknown): string | null {
  const text = String(value || '').trim();
  return text || null;
}

function throwHttpError(message: string, statusCode: number): never {
  const error = new Error(message);
  (error as Error & { statusCode: number }).statusCode = statusCode;
  throw error;
}
