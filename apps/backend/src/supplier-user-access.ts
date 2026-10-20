import { prisma } from '@daibilet/db';
import type { SupplierRole } from '@daibilet/db';
import { buildAdminSupplierDetailDto } from './admin-suppliers.dto.js';

export async function updateSupplierUserAccess(
  supplierId: string,
  membershipId: string,
  input: { role: SupplierRole; isActive: boolean },
  actor: string,
) {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${supplierId}))`;
    const member = await tx.supplierUser.findFirst({
      where: { id: membershipId, supplierId },
      select: { id: true, role: true, isActive: true, acceptedAt: true },
    });
    if (!member) throwHttpError('Сотрудник поставщика не найден.', 404);
    if (input.isActive && !member.acceptedAt) throwHttpError('Ожидающее приглашение нужно выдать заново.', 409);
    if (member.role === input.role && member.isActive === input.isActive) return;

    if (member.isActive && member.role === 'OWNER' && (!input.isActive || input.role !== 'OWNER')) {
      const owners = await tx.supplierUser.count({ where: { supplierId, role: 'OWNER', isActive: true } });
      if (owners <= 1) throwHttpError('Нельзя отключить или понизить последнего владельца.', 409);
    }

    await tx.supplierUser.update({
      where: { id: member.id },
      data: {
        role: input.role,
        isActive: input.isActive,
        ...(!input.isActive ? { inviteTokenHash: null, inviteExpiresAt: null } : {}),
      },
    });
    await tx.supplierUserAccessLog.create({
      data: {
        supplierId,
        supplierUserId: member.id,
        action: member.isActive !== input.isActive ? (input.isActive ? 'ACTIVATE' : 'DEACTIVATE') : 'ROLE_CHANGE',
        previousRole: member.role,
        newRole: input.role,
        previousActive: member.isActive,
        newActive: input.isActive,
        actor,
      },
    });
  });
  return buildAdminSupplierDetailDto(supplierId);
}

function throwHttpError(message: string, statusCode: number): never {
  const error = new Error(message);
  (error as Error & { statusCode: number }).statusCode = statusCode;
  throw error;
}
