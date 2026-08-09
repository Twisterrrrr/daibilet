import type { PublicAdmissionProductDto } from '@daibilet/contracts/admission';
import type { YooKassaCheckoutCreateDto, YooKassaCheckoutResultDto } from '@daibilet/contracts/checkout';

export type PublicCheckoutOrder = {
  publicCode: string;
  status: string;
  buyer: {
    email: string;
    name: string | null;
    phone: string | null;
  };
  title: string;
  venueTitle: string | null;
  venueAddress: string | null;
  venueSlug: string | null;
  admissionProductSlug: string | null;
  validityMode: string | null;
  validTo: string | null;
  paidAt: string | null;
  confirmedAt: string | null;
  purchasedAt: string | null;
  ticketNumber: string | null;
  ticketNumbers: string[];
  supplierSupportPhone: string | null;
  items: Array<{
    id: string;
    title: string;
    ticketTitle: string | null;
    quantity: number;
    unitPriceKopecks: number;
    totalKopecks: number;
    ticketNumbers: string[];
  }>;
  totals: {
    currency: string;
    subtotalKopecks: number;
    discountKopecks: number;
    totalKopecks: number;
    commissionKopecks: number;
  };
  payment: {
    provider: string | null;
    status: string | null;
    confirmationUrl: string | null;
    paidAt: string | null;
  };
};

export async function fetchPublicAdmissionProduct(
  slug: string,
  signal?: AbortSignal,
): Promise<PublicAdmissionProductDto> {
  const response = await fetch(`/api/public/finance/admission-products/${encodeURIComponent(slug)}`, {
    cache: 'no-store',
    credentials: 'same-origin',
    signal,
    headers: { accept: 'application/json' },
  });
  const payload = (await response.json().catch(() => ({}))) as PublicAdmissionProductDto & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || `HTTP ${response.status}`);
  }
  return payload;
}

export async function createPublicYooKassaCheckout(
  payload: YooKassaCheckoutCreateDto,
  idempotencyKey: string,
): Promise<YooKassaCheckoutResultDto> {
  const response = await fetch('/api/public/checkout/yookassa', {
    method: 'POST',
    cache: 'no-store',
    credentials: 'same-origin',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'idempotency-key': idempotencyKey,
    },
    body: JSON.stringify(payload),
  });
  const result = (await response.json().catch(() => ({}))) as YooKassaCheckoutResultDto & {
    error?: string;
    code?: string;
    message?: string;
  };
  if (!response.ok) {
    throw new Error(result.message || result.code || result.error || `HTTP ${response.status}`);
  }
  return result;
}

export async function fetchPublicCheckoutOrder(
  publicCode: string,
  signal?: AbortSignal,
): Promise<PublicCheckoutOrder> {
  const response = await fetch(`/api/public/checkout/orders/${encodeURIComponent(publicCode)}`, {
    cache: 'no-store',
    credentials: 'same-origin',
    signal,
    headers: { accept: 'application/json' },
  });
  const payload = (await response.json().catch(() => ({}))) as PublicCheckoutOrder & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || `HTTP ${response.status}`);
  }
  return payload;
}
