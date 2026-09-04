/**
 * Buyer-visible ticket URLs and helpers (catalog track, no finance secrets).
 */

export function buyerTicketPath(publicCode: string): string {
  const code = String(publicCode || '').trim();
  return `/checkout/ticket/${encodeURIComponent(code)}`;
}

/** Opens ticket page and triggers browser print / Save as PDF dialog. */
export function buyerTicketPrintPath(publicCode: string): string {
  return `${buyerTicketPath(publicCode)}?print=1`;
}

export function buyerTicketAbsoluteUrl(publicCode: string, origin?: string): string {
  const base = (origin || 'https://daibilet.ru').replace(/\/$/, '');
  return `${base}${buyerTicketPath(publicCode)}`;
}

/** Open print-optimized ticket in a new tab (print dialog → Save as PDF). */
export function openBuyerTicketDownload(publicCode: string): void {
  const code = String(publicCode || '').trim();
  if (!code || typeof window === 'undefined') return;
  window.open(buyerTicketPrintPath(code), '_blank', 'noopener,noreferrer');
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
