import type {
  SupplierPortalBankAccountUpdateRequestDto,
  SupplierPortalLegalProfileUpdateRequestDto,
  SupplierPortalProfileDto,
} from '@daibilet/contracts/supplier';
import { prisma, type Prisma } from '@daibilet/db';
import { z } from 'zod';
import { sendJson } from './http.js';
import type { RouteContext } from './routing.js';
import { buildSupplierPortalProfileDto } from './supplier-portal.dto.js';
import type { TypedRouteHandler } from './validated-handler.js';
import { parseJsonBody } from './validation.js';

export interface SupplierProfileWriteRouteHandlerDependencies {
  resolveSearchParams: (context: RouteContext) => Promise<URLSearchParams>;
}

const nullableString = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim() || null : value),
  z.string().nullable().optional(),
);

const requiredStringPatch = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim() : value),
  z.string().min(1).optional(),
);

const taxModeSchema = z.enum(['OSNO', 'USN_6', 'USN_15', 'AUSN', 'NPD']);

const legalProfileUpdateSchema = z.object({
  legalName: requiredStringPatch,
  legalAddress: nullableString,
  inn: nullableString,
  kpp: nullableString,
  ogrn: nullableString,
  taxMode: taxModeSchema.optional(),
  isVatPayer: z.boolean().optional(),
  defaultVatRate: z.coerce.number().int().min(0).max(100).nullable().optional(),
  signerFullName: nullableString,
  signerPosition: nullableString,
  financeEmail: nullableString,
  docsEmail: nullableString,
}).strict();

const bankAccountUpdateSchema = z.object({
  bankAccountId: nullableString,
  bankName: nullableString,
  bik: nullableString,
  accountNumber: nullableString,
  correspondentAccount: nullableString,
  isPrimary: z.boolean().optional(),
}).strict();

type SupplierOnboardingRow = {
  id: string;
  title: string;
  legalName: string | null;
  inn: string | null;
  kpp: string | null;
  ogrn: string | null;
  email: string | null;
};

type LegalProfileRef = {
  id: string;
};

type BankAccountPatchData = {
  bankName?: string | null;
  bik?: string | null;
  accountNumber?: string | null;
  correspondentAccount?: string | null;
  isPrimary?: boolean;
};

export function createSupplierProfileWriteRouteHandler(
  deps: SupplierProfileWriteRouteHandlerDependencies,
): TypedRouteHandler {
  return async (context: RouteContext) => {
    if (context.method !== 'PATCH') return false;
    if (context.pathname !== '/api/supplier/profile/legal' && context.pathname !== '/api/supplier/profile/bank-account') {
      return false;
    }

    const searchParams = await deps.resolveSearchParams(context);
    if (context.pathname === '/api/supplier/profile/legal') {
      const payload = await parseJsonBody(legalProfileUpdateSchema, context.request);
      sendJson(context.response, await updateSupplierLegalProfile(searchParams, normalizeLegalProfileUpdatePayload(payload)), { statusCode: 200 });
      return true;
    }

    const payload = await parseJsonBody(bankAccountUpdateSchema, context.request);
    sendJson(context.response, await updateSupplierBankAccount(searchParams, normalizeBankAccountUpdatePayload(payload)), { statusCode: 200 });
    return true;
  };
}

function normalizeLegalProfileUpdatePayload(
  payload: z.infer<typeof legalProfileUpdateSchema>,
): SupplierPortalLegalProfileUpdateRequestDto {
  const next: SupplierPortalLegalProfileUpdateRequestDto = {};
  if (payload.legalName !== undefined) next.legalName = payload.legalName;
  if (payload.legalAddress !== undefined) next.legalAddress = payload.legalAddress;
  if (payload.inn !== undefined) next.inn = payload.inn;
  if (payload.kpp !== undefined) next.kpp = payload.kpp;
  if (payload.ogrn !== undefined) next.ogrn = payload.ogrn;
  if (payload.taxMode !== undefined) next.taxMode = payload.taxMode;
  if (payload.isVatPayer !== undefined) next.isVatPayer = payload.isVatPayer;
  if (payload.defaultVatRate !== undefined) next.defaultVatRate = payload.defaultVatRate;
  if (payload.signerFullName !== undefined) next.signerFullName = payload.signerFullName;
  if (payload.signerPosition !== undefined) next.signerPosition = payload.signerPosition;
  if (payload.financeEmail !== undefined) next.financeEmail = payload.financeEmail;
  if (payload.docsEmail !== undefined) next.docsEmail = payload.docsEmail;
  return next;
}

function normalizeBankAccountUpdatePayload(
  payload: z.infer<typeof bankAccountUpdateSchema>,
): SupplierPortalBankAccountUpdateRequestDto {
  const next: SupplierPortalBankAccountUpdateRequestDto = {};
  if (payload.bankAccountId !== undefined) next.bankAccountId = payload.bankAccountId;
  if (payload.bankName !== undefined) next.bankName = payload.bankName;
  if (payload.bik !== undefined) next.bik = payload.bik;
  if (payload.accountNumber !== undefined) next.accountNumber = payload.accountNumber;
  if (payload.correspondentAccount !== undefined) next.correspondentAccount = payload.correspondentAccount;
  if (payload.isPrimary !== undefined) next.isPrimary = payload.isPrimary;
  return next;
}

export async function updateSupplierLegalProfile(
  searchParams: URLSearchParams,
  payload: SupplierPortalLegalProfileUpdateRequestDto,
): Promise<SupplierPortalProfileDto> {
  const supplierId = requireSupplierId(searchParams);
  const supplier = await loadSupplierForOnboarding(supplierId);

  const updateData = buildLegalProfileUpdateData(payload);
  const createData = buildLegalProfileCreateData(supplier, payload);
  const supplierUpdateData = buildSupplierLegalMirrorUpdateData(payload);

  await prisma.$transaction(async (tx) => {
    await tx.supplierLegalProfile.upsert({
      where: { supplierId },
      create: createData,
      update: updateData,
    });

    if (Object.keys(supplierUpdateData).length > 0) {
      await tx.supplier.update({
        where: { id: supplierId },
        data: supplierUpdateData,
      });
    }
  });

  return buildSupplierPortalProfileDto(new URLSearchParams({ supplierId }));
}

export async function updateSupplierBankAccount(
  searchParams: URLSearchParams,
  payload: SupplierPortalBankAccountUpdateRequestDto,
): Promise<SupplierPortalProfileDto> {
  const supplierId = requireSupplierId(searchParams);
  const supplier = await loadSupplierForOnboarding(supplierId);

  await prisma.$transaction(async (tx) => {
    const legalProfile = await ensureLegalProfile(tx, supplier);
    const accountId = cleanString(payload.bankAccountId);
    const isPrimary = payload.isPrimary !== false;
    const accountData = buildBankAccountUpdateData(payload);

    if (isPrimary) {
      await tx.supplierBankAccount.updateMany({
        where: { supplierLegalProfileId: legalProfile.id },
        data: { isPrimary: false },
      });
      accountData.isPrimary = true;
    } else if (hasOwn(payload, 'isPrimary')) {
      accountData.isPrimary = false;
    }

    if (accountId) {
      const updated = await tx.supplierBankAccount.updateMany({
        where: { id: accountId, supplierLegalProfileId: legalProfile.id },
        data: accountData,
      });
      if (updated.count === 0) throwHttpError('Банковский счет не найден у текущего поставщика.', 404);
    } else {
      const existingPrimary = await tx.supplierBankAccount.findFirst({
        where: { supplierLegalProfileId: legalProfile.id, isPrimary: true },
        select: { id: true },
      });
      if (existingPrimary) {
        await tx.supplierBankAccount.update({
          where: { id: existingPrimary.id },
          data: accountData,
        });
      } else {
        await tx.supplierBankAccount.create({
          data: {
            supplierLegalProfileId: legalProfile.id,
            isPrimary: true,
            ...accountData,
          },
        });
      }
    }

    await markLegalProfileNeedsReview(tx, legalProfile.id);
  });

  return buildSupplierPortalProfileDto(new URLSearchParams({ supplierId }));
}

async function loadSupplierForOnboarding(supplierId: string): Promise<SupplierOnboardingRow> {
  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    select: {
      id: true,
      title: true,
      legalName: true,
      inn: true,
      kpp: true,
      ogrn: true,
      email: true,
    },
  });
  if (!supplier) throwHttpError('Поставщик не найден.', 404);
  return supplier;
}

function buildLegalProfileUpdateData(
  payload: SupplierPortalLegalProfileUpdateRequestDto,
): Prisma.SupplierLegalProfileUncheckedUpdateInput {
  const data: Prisma.SupplierLegalProfileUncheckedUpdateInput = {
    status: 'INCOMPLETE',
    verifiedBySiteUserId: null,
    verifiedAt: null,
    rejectionComment: null,
  };
  if (hasOwn(payload, 'legalName')) data.legalName = requireCleanString(payload.legalName, 'Юрлицо обязательно.');
  if (hasOwn(payload, 'legalAddress')) data.legalAddress = cleanString(payload.legalAddress);
  if (hasOwn(payload, 'inn')) data.inn = cleanString(payload.inn);
  if (hasOwn(payload, 'kpp')) data.kpp = cleanString(payload.kpp);
  if (hasOwn(payload, 'ogrn')) data.ogrn = cleanString(payload.ogrn);
  if (hasOwn(payload, 'taxMode') && payload.taxMode) data.taxMode = payload.taxMode;
  if (hasOwn(payload, 'isVatPayer')) data.isVatPayer = Boolean(payload.isVatPayer);
  if (hasOwn(payload, 'defaultVatRate')) data.defaultVatRate = normalizeNullableInt(payload.defaultVatRate);
  if (hasOwn(payload, 'signerFullName')) data.signerFullName = cleanString(payload.signerFullName);
  if (hasOwn(payload, 'signerPosition')) data.signerPosition = cleanString(payload.signerPosition);
  if (hasOwn(payload, 'financeEmail')) data.financeEmail = cleanString(payload.financeEmail)?.toLowerCase() || null;
  if (hasOwn(payload, 'docsEmail')) data.docsEmail = cleanString(payload.docsEmail)?.toLowerCase() || null;
  return data;
}

function buildLegalProfileCreateData(
  supplier: SupplierOnboardingRow,
  payload: SupplierPortalLegalProfileUpdateRequestDto,
): Prisma.SupplierLegalProfileUncheckedCreateInput {
  const data: Prisma.SupplierLegalProfileUncheckedCreateInput = {
    supplierId: supplier.id,
    status: 'INCOMPLETE',
    legalName: cleanString(payload.legalName) || cleanString(supplier.legalName) || supplier.title,
  };
  if (hasOwn(payload, 'legalAddress')) data.legalAddress = cleanString(payload.legalAddress);
  if (hasOwn(payload, 'inn')) data.inn = cleanString(payload.inn);
  else if (supplier.inn) data.inn = supplier.inn;
  if (hasOwn(payload, 'kpp')) data.kpp = cleanString(payload.kpp);
  else if (supplier.kpp) data.kpp = supplier.kpp;
  if (hasOwn(payload, 'ogrn')) data.ogrn = cleanString(payload.ogrn);
  else if (supplier.ogrn) data.ogrn = supplier.ogrn;
  if (hasOwn(payload, 'taxMode') && payload.taxMode) data.taxMode = payload.taxMode;
  if (hasOwn(payload, 'isVatPayer')) data.isVatPayer = Boolean(payload.isVatPayer);
  if (hasOwn(payload, 'defaultVatRate')) data.defaultVatRate = normalizeNullableInt(payload.defaultVatRate);
  if (hasOwn(payload, 'signerFullName')) data.signerFullName = cleanString(payload.signerFullName);
  if (hasOwn(payload, 'signerPosition')) data.signerPosition = cleanString(payload.signerPosition);
  if (hasOwn(payload, 'financeEmail')) data.financeEmail = cleanString(payload.financeEmail)?.toLowerCase() || null;
  else if (supplier.email) data.financeEmail = supplier.email;
  if (hasOwn(payload, 'docsEmail')) data.docsEmail = cleanString(payload.docsEmail)?.toLowerCase() || null;
  return data;
}

function buildSupplierLegalMirrorUpdateData(
  payload: SupplierPortalLegalProfileUpdateRequestDto,
): Prisma.SupplierUncheckedUpdateInput {
  const data: Prisma.SupplierUncheckedUpdateInput = {};
  if (hasOwn(payload, 'legalName')) data.legalName = requireCleanString(payload.legalName, 'Юрлицо обязательно.');
  if (hasOwn(payload, 'inn')) data.inn = cleanString(payload.inn);
  if (hasOwn(payload, 'kpp')) data.kpp = cleanString(payload.kpp);
  if (hasOwn(payload, 'ogrn')) data.ogrn = cleanString(payload.ogrn);
  if (hasOwn(payload, 'financeEmail')) data.email = cleanString(payload.financeEmail)?.toLowerCase() || null;
  return data;
}

function buildBankAccountUpdateData(
  payload: SupplierPortalBankAccountUpdateRequestDto,
): BankAccountPatchData {
  const data: BankAccountPatchData = {};
  if (hasOwn(payload, 'bankName')) data.bankName = cleanString(payload.bankName);
  if (hasOwn(payload, 'bik')) data.bik = cleanString(payload.bik);
  if (hasOwn(payload, 'accountNumber')) data.accountNumber = cleanString(payload.accountNumber);
  if (hasOwn(payload, 'correspondentAccount')) data.correspondentAccount = cleanString(payload.correspondentAccount);
  return data;
}

async function ensureLegalProfile(
  tx: Prisma.TransactionClient,
  supplier: SupplierOnboardingRow,
): Promise<LegalProfileRef> {
  const existing = await tx.supplierLegalProfile.findUnique({
    where: { supplierId: supplier.id },
    select: { id: true },
  });
  if (existing) return existing;

  return tx.supplierLegalProfile.create({
    data: {
      supplierId: supplier.id,
      status: 'INCOMPLETE',
      legalName: cleanString(supplier.legalName) || supplier.title,
      inn: supplier.inn,
      kpp: supplier.kpp,
      ogrn: supplier.ogrn,
      financeEmail: supplier.email,
    },
    select: { id: true },
  });
}

async function markLegalProfileNeedsReview(
  tx: Prisma.TransactionClient,
  legalProfileId: string,
): Promise<void> {
  await tx.supplierLegalProfile.update({
    where: { id: legalProfileId },
    data: {
      status: 'INCOMPLETE',
      verifiedBySiteUserId: null,
      verifiedAt: null,
      rejectionComment: null,
    },
  });
}

function requireSupplierId(searchParams: URLSearchParams): string {
  const supplierId = cleanString(searchParams.get('supplierId'));
  if (!supplierId) throwHttpError('Требуется поставщик.', 400);
  return supplierId;
}

function requireCleanString(value: unknown, message: string): string {
  const text = cleanString(value);
  if (!text) throwHttpError(message, 400);
  return text;
}

function normalizeNullableInt(value: unknown): number | null {
  if (value == null || value === '') return null;
  const parsed = Math.trunc(Number(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function hasOwn<T extends object>(value: T, key: keyof T): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
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
