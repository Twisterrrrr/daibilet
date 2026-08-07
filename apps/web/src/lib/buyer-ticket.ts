/**
 * Buyer-visible ticket URLs and helpers (catalog track, no finance secrets).
 */

export function buyerTicketPath(publicCode: string): string {
  const code = String(publicCode || '').trim();
  return `/checkout/ticket/${encodeURIComponent(code)}`;
}

export function buyerTicketAbsoluteUrl(publicCode: string, origin?: string): string {
  const base = (origin || 'https://daibilet.ru').replace(/\/$/, '');
  return `${base}${buyerTicketPath(publicCode)}`;
}

export function buyerResultPath(publicCode: string, mode?: string | null): string {
  const params = new URLSearchParams();
  params.set('order', String(publicCode || '').trim());
  if (mode) params.set('mode', mode);
  return `/checkout/result?${params.toString()}`;
}

/** MVP QR image (external generator). Payload = ticket page URL or publicCode. */
export function buyerTicketQrImageUrl(payload: string, size = 168): string {
  const data = encodeURIComponent(String(payload || '').trim());
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&data=${data}`;
}
