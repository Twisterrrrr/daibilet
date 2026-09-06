import type {
  AdminSupplierInviteRequestDto,
  AdminSupplierInviteResultDto,
} from '@daibilet/contracts/admin';
import { prisma } from '@daibilet/db';
import { createHash, randomBytes } from 'node:crypto';
import { buildAdminSupplierDetailDto } from './admin-suppliers.dto.js';
import { hashPassword } from './user-auth.js';

const DEFAULT_INVITE_TTL_HOURS = 48;
const PENDING_PASSWORD_HASH = 'invite:pending';

export async function inviteSupplierUser(
  supplierIdOrSlug: string,
  input: AdminSupplierInviteRequestDto,
): Promise<AdminSupplierInviteResultDto> {
  const email = normalizeEmail(input.email);
  const name = cleanString(input.name);
  if (!email.includes('@')) throwHttpError('Укажите корректный email.', 422);

  const supplier = await prisma.supplier.findFirst({
    where: {
      OR: [{ id: supplierIdOrSlug }, { slug: supplierIdOrSlug }],
      status: { not: 'ARCHIVED' },
    },
    select: { id: true },
  });
  if (!supplier) throwHttpError('Поставщик не найден.', 404);

  const token = randomBytes(32).toString('base64url');
  const inviteTokenHash = hashSupplierInviteToken(token);
  const inviteExpiresAt = new Date(Date.now() + inviteTtlHours() * 60 * 60 * 1000);

  const access = await prisma.$transaction(async (tx) => {
    let siteUser = await tx.siteUser.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, passwordHash: true, isActive: true },
    });

    if (siteUser && !siteUser.isActive) {
      throwHttpError('Пользователь с этим email отключен.', 409);
    }

    if (!siteUser) {
      siteUser = await tx.siteUser.create({
        data: {
          email,
          name,
          passwordHash: PENDING_PASSWORD_HASH,
          isActive: true,
        },
        select: { id: true, email: true, name: true, passwordHash: true, isActive: true },
      });
    } else if (name && !siteUser.name) {
      siteUser = await tx.siteUser.update({
        where: { id: siteUser.id },
        data: { name },
        select: { id: true, email: true, name: true, passwordHash: true, isActive: true },
      });
    }

    const existingAccount = siteUser.passwordHash !== PENDING_PASSWORD_HASH;
    const now = new Date();
    await tx.supplierUser.upsert({
      where: {
        supplierId_siteUserId: {
          supplierId: supplier.id,
          siteUserId: siteUser.id,
        },
      },
      create: {
        supplierId: supplier.id,
        siteUserId: siteUser.id,
        role: input.role,
        isActive: true,
        invitedAt: now,
        acceptedAt: existingAccount ? now : null,
        inviteTokenHash: existingAccount ? null : inviteTokenHash,
        inviteExpiresAt: existingAccount ? null : inviteExpiresAt,
      },
      update: {
        role: input.role,
        isActive: true,
        invitedAt: now,
        ...(existingAccount
          ? { acceptedAt: now, inviteTokenHash: null, inviteExpiresAt: null }
          : { acceptedAt: null, inviteTokenHash, inviteExpiresAt }),
      },
    });

    return {
      email: siteUser.email,
      role: input.role,
      existingAccount,
      inviteUrl: existingAccount ? null : buildSupplierInviteUrl(token),
      expiresAt: existingAccount ? null : inviteExpiresAt.toISOString(),
    };
  });

  return {
    supplier: await buildAdminSupplierDetailDto(supplier.id),
    access,
  };
}

export async function acceptSupplierInvite(input: {
  token: string;
  password: string;
}): Promise<{ siteUserId: string; supplierId: string; email: string }> {
  const token = cleanString(input.token);
  if (!token || token.length < 32) throwHttpError('Ссылка приглашения недействительна.', 422);
  if (input.password.length < 10) throwHttpError('Пароль должен быть не короче 10 символов.', 422);

  const membership = await prisma.supplierUser.findUnique({
    where: { inviteTokenHash: hashSupplierInviteToken(token) },
    select: {
      id: true,
      supplierId: true,
      isActive: true,
      acceptedAt: true,
      inviteExpiresAt: true,
      supplier: { select: { status: true } },
      siteUser: { select: { id: true, email: true, isActive: true } },
    },
  });

  if (!membership || !membership.isActive || !membership.siteUser.isActive) {
    throwHttpError('Ссылка приглашения недействительна.', 404);
  }
  if (membership.supplier.status === 'ARCHIVED') throwHttpError('Доступ к поставщику закрыт.', 403);
  if (membership.acceptedAt) throwHttpError('Приглашение уже использовано.', 409);
  if (!membership.inviteExpiresAt || membership.inviteExpiresAt.getTime() <= Date.now()) {
    throwHttpError('Срок действия приглашения истек. Попросите администратора выдать новое.', 410);
  }

  const passwordHash = await hashPassword(input.password);
  const expectedTokenHash = hashSupplierInviteToken(token);
  await prisma.$transaction(async (tx) => {
    const claimed = await tx.supplierUser.updateMany({
      where: {
        id: membership.id,
        acceptedAt: null,
        inviteTokenHash: expectedTokenHash,
        inviteExpiresAt: { gt: new Date() },
        isActive: true,
      },
      data: {
        acceptedAt: new Date(),
        inviteTokenHash: null,
        inviteExpiresAt: null,
      },
    });
    if (claimed.count !== 1) throwHttpError('Приглашение уже использовано или истекло.', 409);

    await tx.siteUser.update({
      where: { id: membership.siteUser.id },
      data: {
        passwordHash,
        emailVerifiedAt: new Date(),
        refreshTokenHash: null,
      },
    });
  });

  return {
    siteUserId: membership.siteUser.id,
    supplierId: membership.supplierId,
    email: membership.siteUser.email,
  };
}

export function hashSupplierInviteToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function buildSupplierInviteUrl(token: string): string {
  const base = String(process.env.SUPPLIER_PORTAL_BASE_URL || 'https://supplier.daibilet.ru').replace(/\/$/, '');
  return `${base}/?invite=${encodeURIComponent(token)}`;
}

function inviteTtlHours(): number {
  const parsed = Number(process.env.SUPPLIER_INVITE_TTL_HOURS || DEFAULT_INVITE_TTL_HOURS);
  return Number.isFinite(parsed) && parsed >= 1 && parsed <= 168 ? parsed : DEFAULT_INVITE_TTL_HOURS;
}

function normalizeEmail(value: unknown): string {
  return String(value || '').trim().toLowerCase();
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
