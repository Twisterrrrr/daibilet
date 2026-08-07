/**
 * Buyer checkout helpers for catalog (daibilet.ru) UX track.
 * Parallel Codex experiment may live on pay.daibilet.ru - do not merge.
 */

export const BUYER_INTERNAL_ORDERS_STORAGE_KEY = 'daibilet.buyer.internalOrders.v1';

export type BuyerCheckoutMode = 'stub' | 'yookassa' | 'auto';

export type BuyerInternalOrderRecord = {
  publicCode: string;
  status: string;
  displayStatus: string;
  statusTone: string;
  title: string;
  email: string;
  purchasedAt: string | null;
  amountRub: number | null;
  mode: string;
  confirmationUrl?: string | null;
  source: 'internal';
};

export function normalizeBuyerEmail(email: string | null | undefined): string {
  return String(email || '')
    .trim()
    .toLowerCase();
}

export function mapFinanceOrderStatus(status: string | null | undefined): {
  displayStatus: string;
  statusTone: string;
} {
  const raw = String(status || '')
    .trim()
    .toUpperCase();
  switch (raw) {
    case 'CONFIRMED':
    case 'SUCCEEDED':
    case 'PAID':
      return { displayStatus: 'Оплачен', statusTone: 'live' };
    case 'PENDING':
    case 'WAITING_FOR_CAPTURE':
    case 'CREATED':
      return { displayStatus: 'Ожидает оплаты', statusTone: 'incomplete' };
    case 'CANCELED':
    case 'CANCELLED':
    case 'EXPIRED':
      return { displayStatus: 'Отменен', statusTone: 'archived' };
    case 'FAILED':
      return { displayStatus: 'Ошибка оплаты', statusTone: 'error' };
    default:
      return {
        displayStatus: raw ? raw : 'Статус уточняется',
        statusTone: 'incomplete',
      };
  }
}

export function amountRubFromKopecks(kopecks: number | null | undefined): number | null {
  if (typeof kopecks !== 'number' || !Number.isFinite(kopecks)) return null;
  return Math.round(kopecks) / 100;
}

export function readInternalOrdersFromStorage(): BuyerInternalOrderRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(BUYER_INTERNAL_ORDERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => normalizeInternalOrderRecord(row))
      .filter((row): row is BuyerInternalOrderRecord => Boolean(row));
  } catch {
    return [];
  }
}

export function upsertInternalOrderInStorage(order: BuyerInternalOrderRecord): void {
  if (typeof window === 'undefined') return;
  const next = [order, ...readInternalOrdersFromStorage().filter((row) => row.publicCode !== order.publicCode)].slice(
    0,
    40,
  );
  try {
    window.localStorage.setItem(BUYER_INTERNAL_ORDERS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // quota / private mode - ignore
  }
}

export function filterInternalOrdersForEmail(
  rows: BuyerInternalOrderRecord[],
  email: string | null | undefined,
): BuyerInternalOrderRecord[] {
  const normalized = normalizeBuyerEmail(email);
  if (!normalized) return [];
  return rows.filter((row) => normalizeBuyerEmail(row.email) === normalized);
}

function normalizeInternalOrderRecord(raw: unknown): BuyerInternalOrderRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const publicCode = typeof row.publicCode === 'string' ? row.publicCode.trim() : '';
  const email = normalizeBuyerEmail(typeof row.email === 'string' ? row.email : '');
  const title = typeof row.title === 'string' ? row.title.trim() : '';
  if (!publicCode || !email) return null;
  const status = typeof row.status === 'string' ? row.status : 'PENDING';
  const mapped = mapFinanceOrderStatus(status);
  return {
    publicCode,
    status,
    displayStatus: typeof row.displayStatus === 'string' ? row.displayStatus : mapped.displayStatus,
    statusTone: typeof row.statusTone === 'string' ? row.statusTone : mapped.statusTone,
    title: title || `Заказ ${publicCode}`,
    email,
    purchasedAt: typeof row.purchasedAt === 'string' ? row.purchasedAt : null,
    amountRub: typeof row.amountRub === 'number' && Number.isFinite(row.amountRub) ? row.amountRub : null,
    mode: typeof row.mode === 'string' ? row.mode : 'STUB',
    confirmationUrl: typeof row.confirmationUrl === 'string' ? row.confirmationUrl : null,
    source: 'internal',
  };
}
