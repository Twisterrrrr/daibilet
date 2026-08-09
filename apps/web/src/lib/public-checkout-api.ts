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
