export const VERIFIED_SUPPLIER_ROLE_PARAM = '__verifiedSupplierRole';

export function supplierOrderCanSeeTicketNumbers(verifiedRole: string | null): boolean {
  return ['OWNER', 'ADMIN', 'OPERATOR'].includes(verifiedRole || '');
}

export function supplierOrderBuyerFields(
  buyer: { name: string | null; email: string | null; phone: string | null },
  verifiedRole: string | null,
): { buyerPiiLevel: 'masked' | 'omitted'; buyerName: string | null; buyerEmail: string | null; buyerPhone: string | null } {
  // Unknown roles and the read-only viewer receive no buyer contact fields.
  if (!['OWNER', 'ADMIN', 'OPERATOR', 'ACCOUNTANT'].includes(verifiedRole || '')) {
    return { buyerPiiLevel: 'omitted', buyerName: null, buyerEmail: null, buyerPhone: null };
  }

  const words = buyer.name?.trim().split(/\s+/u).filter(Boolean) || [];
  const buyerName = words.length
    ? words.map((word) => `${Array.from(word)[0]}.`).join(' ')
    : null;
  const email = buyer.email?.trim() || '';
  const at = email.lastIndexOf('@');
  const buyerEmail = at > 0
    ? `${email.slice(0, Math.min(2, at))}***${email.slice(at)}`
    : null;
  const digits = buyer.phone?.replace(/\D/gu, '') || '';
  const buyerPhone = digits.length >= 2 ? `***-**-${digits.slice(-2)}` : null;

  return { buyerPiiLevel: 'masked', buyerName, buyerEmail, buyerPhone };
}
