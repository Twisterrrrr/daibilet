import type { SupplierPortalMeDto } from '@daibilet/contracts/supplier';

export type SupplierPortalPermissions = {
  role: string;
  canSubmitRequests: boolean;
  canEditRequisites: boolean;
  canManageTeam: boolean;
};

export function resolveSupplierPortalRole(
  session: SupplierPortalMeDto | null,
  supplierKey: string,
): string {
  if (!session) return '';
  const key = supplierKey.trim();
  const membership = session.suppliers.find(
    (supplier) => supplier.id === key || supplier.slug === key,
  );
  return String(membership?.role || session.currentSupplier.role || '').trim().toUpperCase();
}

export function supplierPortalPermissions(roleInput?: string | null): SupplierPortalPermissions {
  const role = String(roleInput || '').trim().toUpperCase();
  const isAdmin = role === 'OWNER' || role === 'ADMIN';
  return {
    role,
    canSubmitRequests: isAdmin || role === 'OPERATOR',
    canEditRequisites: isAdmin || role === 'ACCOUNTANT',
    canManageTeam: isAdmin,
  };
}
