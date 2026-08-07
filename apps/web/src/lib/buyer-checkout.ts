/**
 * Buyer checkout helpers for catalog (daibilet.ru) UX track.
 * Parallel Codex experiment may live on pay.daibilet.ru - do not merge.
 */

export const BUYER_INTERNAL_ORDERS_STORAGE_KEY = 'daibilet.buyer.internalOrders.v1';

export type BuyerCheckoutMode = 'stub' | 'yookassa' | 'auto';

export type BuyerTicketLineItem = {
  ticketTitle: string;
  quantity: number;
};

export type BuyerInternalOrderRecord = {
  publicCode: string;
  status: string;
  displayStatus: string;
  statusTone: string;
  /** Admission / product title (ticket headline). */
  title: string;
  email: string;
  purchasedAt: string | null;
  amountRub: number | null;
  mode: string;
  confirmationUrl?: string | null;
  /**
   * Museum / venue ticket id when issued separately from CheckoutOrder.publicCode.
   * Absent today: UI shows publicCode as temporary ticket number with an explicit caption.
   */
  ticketNumber?: string | null;
  /** Payer display name (first + last as one string when available). */
  buyerName?: string | null;
  /** Programme / event title when order is event-backed (not plain admission). */
  eventTitle?: string | null;
  venueTitle?: string | null;
  venueAddress?: string | null;
  venueSlug?: string | null;
  admissionProductSlug?: string | null;
  /** Session start ISO; null for open-date admissions. */
  sessionStartsAt?: string | null;
  /** Open-date / validity end ISO. */
  validUntil?: string | null;
  validityMode?: string | null;
  lineItems?: BuyerTicketLineItem[];
  /** Supplier emergency support phone when present on product/supplier profile. */
  supplierSupportPhone?: string | null;
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

export function isOpenDateOrder(order: Pick<BuyerInternalOrderRecord, 'validityMode' | 'validUntil' | 'sessionStartsAt'>): boolean {
  const mode = String(order.validityMode || '').toUpperCase();
  if (mode === 'OPEN_DATE') return true;
  // Soft heuristic: validity end without session start.
  return Boolean(order.validUntil) && !order.sessionStartsAt;
}

/** Soft-merge: keep richer snapshot fields when finance lookup is sparse. */
export function mergeBuyerInternalOrders(
  primary: BuyerInternalOrderRecord,
  secondary: BuyerInternalOrderRecord | null | undefined,
): BuyerInternalOrderRecord {
  if (!secondary) return primary;

  const pickStr = (a: string | null | undefined, b: string | null | undefined): string | null => {
    const left = typeof a === 'string' ? a.trim() : '';
    if (left) return left;
    const right = typeof b === 'string' ? b.trim() : '';
    return right || null;
  };
  const pickNum = (a: number | null | undefined, b: number | null | undefined): number | null => {
    if (typeof a === 'number' && Number.isFinite(a)) return a;
    if (typeof b === 'number' && Number.isFinite(b)) return b;
    return null;
  };

  const primaryLines = Array.isArray(primary.lineItems) ? primary.lineItems : [];
  const secondaryLines = Array.isArray(secondary.lineItems) ? secondary.lineItems : [];

  return {
    ...primary,
    title: pickStr(primary.title, secondary.title) || primary.title || secondary.title || 'Входной билет',
    email: pickStr(primary.email, secondary.email) || primary.email || secondary.email || '',
    purchasedAt: pickStr(primary.purchasedAt, secondary.purchasedAt),
    amountRub: pickNum(primary.amountRub, secondary.amountRub),
    confirmationUrl: pickStr(primary.confirmationUrl, secondary.confirmationUrl),
    ticketNumber: pickStr(primary.ticketNumber, secondary.ticketNumber),
    buyerName: pickStr(primary.buyerName, secondary.buyerName),
    eventTitle: pickStr(primary.eventTitle, secondary.eventTitle),
    venueTitle: pickStr(primary.venueTitle, secondary.venueTitle),
    venueAddress: pickStr(primary.venueAddress, secondary.venueAddress),
    venueSlug: pickStr(primary.venueSlug, secondary.venueSlug),
    admissionProductSlug: pickStr(primary.admissionProductSlug, secondary.admissionProductSlug),
    sessionStartsAt: pickStr(primary.sessionStartsAt, secondary.sessionStartsAt),
    validUntil: pickStr(primary.validUntil, secondary.validUntil),
    validityMode: pickStr(primary.validityMode, secondary.validityMode),
    supplierSupportPhone: pickStr(primary.supplierSupportPhone, secondary.supplierSupportPhone),
    lineItems: primaryLines.length ? primaryLines : secondaryLines,
    source: 'internal',
  };
}

export function formatBuyerDateTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Ticket card headline date: «15 августа 2026 г. в 14:00». */
export function formatBuyerTicketWhen(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const dayPart = date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const timePart = date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${dayPart} в ${timePart}`;
}

export function formatTicketLineItem(item: BuyerTicketLineItem): string {
  const title = String(item.ticketTitle || '').trim() || 'Билет';
  const qty = Math.max(1, Math.round(Number(item.quantity) || 1));
  return `${title} - ${qty} чел`;
}

/** Compact composition line for ticket details: «Взрослый × 4, Льготный × 2». */
export function formatTicketLineItemsCompact(items: BuyerTicketLineItem[]): string {
  return items
    .map((item) => {
      const title = String(item.ticketTitle || '').trim() || 'Билет';
      const qty = Math.max(1, Math.round(Number(item.quantity) || 1));
      return `${title} × ${qty}`;
    })
    .join(', ');
}

/**
 * Catalog-only fixture for visual QA of the full ticket card.
 * Does not call finance; safe for `/checkout/ticket/demo`.
 */
export function buildDemoBuyerTicketOrder(): BuyerInternalOrderRecord {
  const mapped = mapFinanceOrderStatus('CONFIRMED');
  return {
    publicCode: 'DB26-A9K3M2',
    ticketNumber: 'TKT-78451209',
    status: 'CONFIRMED',
    displayStatus: mapped.displayStatus,
    statusTone: mapped.statusTone,
    title: 'Входной билет',
    email: 'anna.smirnova@example.com',
    buyerName: 'Анна Смирнова',
    eventTitle: 'Постоянная экспозиция',
    venueTitle: 'Третьяковская галерея',
    venueAddress: 'Лаврушинский переулок, 10, Москва',
    venueSlug: 'tretyakovskaya-galereya',
    sessionStartsAt: '2026-08-15T11:00:00.000Z',
    validUntil: null,
    validityMode: 'SESSION',
    lineItems: [
      { ticketTitle: 'Взрослый', quantity: 4 },
      { ticketTitle: 'Льготный', quantity: 2 },
      { ticketTitle: 'Детский', quantity: 1 },
    ],
    amountRub: 4700,
    purchasedAt: '2026-08-07T12:24:00.000Z',
    supplierSupportPhone: '+7 (495) 123-45-67',
    mode: 'YOOKASSA',
    source: 'internal',
  };
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

function asOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function normalizeLineItems(raw: unknown): BuyerTicketLineItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const item = row as Record<string, unknown>;
      const ticketTitle =
        asOptionalString(item.ticketTitle) ||
        asOptionalString(item.offerTitle) ||
        asOptionalString(item.title);
      const quantityRaw = item.quantity;
      const quantity =
        typeof quantityRaw === 'number' && Number.isFinite(quantityRaw)
          ? Math.max(1, Math.round(quantityRaw))
          : 1;
      if (!ticketTitle) return null;
      return { ticketTitle, quantity };
    })
    .filter((row): row is BuyerTicketLineItem => Boolean(row));
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
    title: title || 'Входной билет',
    email,
    purchasedAt: typeof row.purchasedAt === 'string' ? row.purchasedAt : null,
    amountRub: typeof row.amountRub === 'number' && Number.isFinite(row.amountRub) ? row.amountRub : null,
    mode: typeof row.mode === 'string' ? row.mode : 'STUB',
    confirmationUrl: typeof row.confirmationUrl === 'string' ? row.confirmationUrl : null,
    ticketNumber: typeof row.ticketNumber === 'string' ? row.ticketNumber.trim() || null : null,
    buyerName: asOptionalString(row.buyerName),
    eventTitle: asOptionalString(row.eventTitle),
    venueTitle: asOptionalString(row.venueTitle),
    venueAddress: asOptionalString(row.venueAddress),
    venueSlug: asOptionalString(row.venueSlug),
    admissionProductSlug: asOptionalString(row.admissionProductSlug),
    sessionStartsAt: asOptionalString(row.sessionStartsAt),
    validUntil: asOptionalString(row.validUntil),
    validityMode: asOptionalString(row.validityMode),
    lineItems: normalizeLineItems(row.lineItems),
    supplierSupportPhone: asOptionalString(row.supplierSupportPhone),
    source: 'internal',
  };
}
