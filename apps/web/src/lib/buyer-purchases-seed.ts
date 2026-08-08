/**
 * Catalog-side buyer purchases seed for owner QA of /account/purchases compact list.
 * Used until Codex m2m / public purchases-by-email (UX.BUY-6) is live.
 * Idempotent fixture - no finance secrets, no DB write from the web app.
 *
 * Numbering (owner lock 2026-08-08):
 * - Internal: `DB…` order + `TKT-…` ticket, alphanumeric seq only (no personal-name fragments).
 * - External/widget: keep partner codes as synced (e.g. KXM-494695) - not rewritten here.
 */

import type { BuyerInternalOrderRecord } from './buyer-checkout';

/** Owner profile used for live purchases list smoke. */
export const BUYER_PURCHASES_SEED_EMAIL = 'v.butin@yandex.ru';

function normalizeEmail(email: string | null | undefined): string {
  return String(email || '')
    .trim()
    .toLowerCase();
}

const SEED_ROWS: BuyerInternalOrderRecord[] = [
  {
    publicCode: 'DB26-784501',
    ticketNumber: 'TKT-784501',
    status: 'CONFIRMED',
    displayStatus: 'Оплачен',
    statusTone: 'live',
    title: 'Третьяковская галерея - постоянная экспозиция',
    email: BUYER_PURCHASES_SEED_EMAIL,
    buyerName: 'Василий Бутин',
    eventTitle: 'Постоянная экспозиция',
    venueTitle: 'Третьяковская галерея',
    venueAddress: 'Лаврушинский переулок, 10, Москва',
    venueSlug: 'moscow-tret-yakovskaya-galereya',
    venueLatitude: 55.7415,
    venueLongitude: 37.6201,
    sessionStartsAt: '2026-08-15T11:00:00.000Z',
    validUntil: null,
    validityMode: 'SESSION',
    lineItems: [
      { ticketTitle: 'Взрослый', quantity: 2 },
      { ticketTitle: 'Льготный', quantity: 1 },
    ],
    amountRub: 1800,
    purchasedAt: '2026-08-05T09:18:00.000Z',
    supplierSupportPhone: '+7 (495) 957-07-27',
    mode: 'STUB',
    source: 'internal',
  },
  {
    publicCode: 'DB26-784502',
    ticketNumber: 'TKT-784502',
    status: 'CONFIRMED',
    displayStatus: 'Оплачен',
    statusTone: 'live',
    title: 'Государственный Эрмитаж - входной билет',
    email: BUYER_PURCHASES_SEED_EMAIL,
    buyerName: 'Василий Бутин',
    eventTitle: 'Главный музейный комплекс',
    venueTitle: 'Государственный Эрмитаж',
    venueAddress: 'Дворцовая площадь, 2, Санкт-Петербург',
    venueSlug: 'ermitazh',
    venueLatitude: 59.9398,
    venueLongitude: 30.3146,
    sessionStartsAt: null,
    validUntil: '2026-09-30T20:59:59.000Z',
    validityMode: 'OPEN_DATE',
    lineItems: [{ ticketTitle: 'Взрослый', quantity: 1 }],
    amountRub: 800,
    purchasedAt: '2026-08-06T14:42:00.000Z',
    supplierSupportPhone: '+7 (812) 710-90-79',
    mode: 'STUB',
    source: 'internal',
  },
  {
    publicCode: 'DB26-784503',
    ticketNumber: 'TKT-784503',
    status: 'PENDING',
    displayStatus: 'Ожидает оплаты',
    statusTone: 'incomplete',
    title: 'Эрарта - входной билет',
    email: BUYER_PURCHASES_SEED_EMAIL,
    buyerName: 'Василий Бутин',
    eventTitle: 'Постоянная экспозиция',
    venueTitle: 'Музей современного искусства Эрарта',
    venueAddress: '29-я линия В.О., 2, Санкт-Петербург',
    venueSlug: 'erarta',
    venueLatitude: 59.9328,
    venueLongitude: 30.2536,
    sessionStartsAt: '2026-08-20T15:00:00.000Z',
    validUntil: null,
    validityMode: 'SESSION',
    lineItems: [
      { ticketTitle: 'Взрослый', quantity: 1 },
      { ticketTitle: 'Детский', quantity: 1 },
    ],
    amountRub: 1200,
    purchasedAt: '2026-08-07T11:05:00.000Z',
    supplierSupportPhone: '+7 (812) 324-08-09',
    mode: 'STUB',
    source: 'internal',
  },
];

/** All catalog seed internal purchases (museum-style Path A). */
export function listBuyerPurchasesSeedRows(): BuyerInternalOrderRecord[] {
  return SEED_ROWS.map((row) => ({ ...row }));
}

/** Soft fan-in for account purchases by email. */
export function listBuyerPurchasesSeedForEmail(email: string | null | undefined): BuyerInternalOrderRecord[] {
  const normalized = normalizeEmail(email);
  if (!normalized) return [];
  return SEED_ROWS.filter((row) => normalizeEmail(row.email) === normalized).map((row) => ({ ...row }));
}

/** Soft order-by-code for ticket page / download. */
export function lookupBuyerPurchasesSeedByPublicCode(
  publicCode: string | null | undefined,
): BuyerInternalOrderRecord | null {
  const code = String(publicCode || '').trim();
  if (!code) return null;
  const found = SEED_ROWS.find((row) => row.publicCode === code);
  return found ? { ...found } : null;
}
