export type OrderBuyerPii = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type InternalOrderAccess = {
  canReadPii: boolean;
  canReadFinance: boolean;
  canCancel: boolean;
  canExecuteRefund: boolean;
};

export type ProjectedInternalAdminOrder = Record<string, unknown> & {
  buyer: { name: string | null; email: string | null; phone: string | null };
  piiLevel: 'full' | 'masked';
  finance: unknown | null;
  permissions: { canCancel: boolean; canExecuteRefund: boolean };
};

function maskName(value: string | null | undefined): string | null {
  const parts = String(value || '').trim().split(/\s+/u).filter(Boolean).slice(0, 3);
  return parts.length ? parts.map((part) => `${Array.from(part)[0]}.`).join(' ') : null;
}

function maskEmail(value: string | null | undefined): string | null {
  const email = String(value || '').trim();
  const at = email.lastIndexOf('@');
  if (at < 1 || at === email.length - 1) return null;
  const local = Array.from(email.slice(0, at));
  return `${local.slice(0, 2).join('')}${'*'.repeat(Math.max(2, local.length - 2))}@${email.slice(at + 1)}`;
}

function maskPhone(value: string | null | undefined): string | null {
  const digits = String(value || '').replace(/\D+/gu, '');
  if (digits.length < 6) return null;
  return `+${digits[0]} ${'*'.repeat(Math.max(3, digits.length - 5))} ${digits.slice(-4)}`;
}

export function maskAdminOrderBuyer<T extends OrderBuyerPii>(buyer: T): T {
  return { name: maskName(buyer.name), email: maskEmail(buyer.email), phone: maskPhone(buyer.phone) } as T;
}

/** Project the finance-host response through the current staff permissions. */
export function projectInternalAdminOrder(
  raw: Record<string, unknown>,
  access: InternalOrderAccess,
): ProjectedInternalAdminOrder {
  const buyer = raw.buyer && typeof raw.buyer === 'object'
    ? raw.buyer as OrderBuyerPii
    : {};
  const maskedBuyer = maskAdminOrderBuyer(buyer);
  const projectedBuyer = access.canReadPii
    ? { name: buyer.name ?? null, email: buyer.email ?? null, phone: buyer.phone ?? null }
    : { name: maskedBuyer.name ?? null, email: maskedBuyer.email ?? null, phone: maskedBuyer.phone ?? null };

  return {
    id: raw.id,
    publicCode: raw.publicCode,
    status: raw.status,
    displayStatus: raw.displayStatus,
    eventTitle: raw.eventTitle,
    amountRub: access.canReadFinance ? raw.amountRub : null,
    ticketCount: raw.ticketCount,
    sourceKind: raw.sourceKind,
    buyer: projectedBuyer,
    piiLevel: access.canReadPii ? 'full' : 'masked',
    finance: access.canReadFinance && raw.finance && typeof raw.finance === 'object' ? raw.finance : null,
    permissions: {
      canCancel: access.canCancel,
      canExecuteRefund: access.canExecuteRefund,
    },
  };
}
