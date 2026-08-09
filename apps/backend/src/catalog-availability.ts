/**
 * Shared catalog saleability rules for legacy dto.js and Prisma public DTOs.
 */
export const MIN_DISPLAY_PRICE_RUB = 100;

export const START_GRACE_MS = 15 * 60 * 1000;
export const RUNNING_SESSION_MAX_MS = 36 * 60 * 60 * 1000;

/**
 * Event/session `sourceStatus` values that mean sales are closed or suspended.
 * Keep in sync across catalog SQL, mapper slot filter, and event-page sessions.
 * Ticketscloud `STAND_BY` = продажи остановлены (docs/integrations.md).
 */
export const PUBLIC_SALES_BLOCKED_STATUSES = [
  'widget_blocked',
  'paused',
  'suspended',
  'stopped',
  'cancelled',
  'canceled',
  'draft',
  'hidden',
  'stand_by',
  'closed',
  'sales_closed',
  'sale_closed',
  'not_for_sale',
] as const;

/** Comma-separated SQL literals for `lower(sourceStatus) not in (...)`. */
export const PUBLIC_SALES_BLOCKED_STATUS_SQL = PUBLIC_SALES_BLOCKED_STATUSES
  .map((status) => `'${status}'`)
  .join(', ');

/** SQL predicate: session is upcoming or currently running and still on sale. */
export const ACTIVE_SESSION_SQL = `(
  session."isActive" is not false
  and session."cancelledAt" is null
  and lower(coalesce(session."sourceStatus", '')) not in (${PUBLIC_SALES_BLOCKED_STATUS_SQL})
  and (
    (
      session."startsAt" is not null
      and session."startsAt" >= now() - interval '15 minutes'
    )
    or (
      session."startsAt" is not null
      and session."endsAt" is not null
      and session."startsAt" < now()
      and session."endsAt" >= now()
      and session."endsAt" - session."startsAt" < interval '36 hours'
    )
  )
)`;

export interface CatalogScheduleRow {
  kind?: string | null | undefined;
  sourceStatus?: string | null | undefined;
  startsAt?: string | Date | null | undefined;
  endsAt?: string | Date | null | undefined;
}

export interface CatalogSaleableRow extends CatalogScheduleRow {
  purchaseReady?: boolean | undefined;
  priceFrom?: number | null | undefined;
  isActive?: boolean | null | undefined;
  cancelledAt?: string | Date | null | undefined;
}

export function isPublicSalesStatusBlocked(sourceStatus?: string | null): boolean {
  const status = String(sourceStatus || '').toLowerCase().trim();
  if (!status) return false;
  return (PUBLIC_SALES_BLOCKED_STATUSES as readonly string[]).includes(status);
}

/** Slot/session still offered for public purchase (DB flags + source status). */
export function isPublicSessionRowOnSale(row: {
  isActive?: boolean | null | undefined;
  cancelledAt?: string | Date | null | undefined;
  sourceStatus?: string | null | undefined;
}): boolean {
  if (row.isActive === false) return false;
  if (row.cancelledAt) return false;
  if (isPublicSalesStatusBlocked(row.sourceStatus)) return false;
  return true;
}

export function isOpenDateCatalogRow(row: CatalogScheduleRow): boolean {
  const kind = String(row?.kind || '').toUpperCase();
  const sourceStatus = String(row?.sourceStatus || '').toLowerCase();
  return kind === 'OPEN_DATE' || sourceStatus === 'open_date';
}

export function isWideLifetimeSession(
  startsAt?: string | Date | null,
  endsAt?: string | Date | null,
): boolean {
  if (!startsAt || !endsAt) return false;
  const startMs = Date.parse(String(startsAt));
  const endMs = Date.parse(String(endsAt));
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return false;
  return endMs - startMs >= RUNNING_SESSION_MAX_MS;
}

export function isFutureSlotStart(
  startsAt?: string | Date | null,
  graceMs = START_GRACE_MS,
): boolean {
  if (!startsAt) return false;
  const startMs = Date.parse(String(startsAt));
  return Number.isFinite(startMs) && startMs >= Date.now() - graceMs;
}

export function hasUpcomingOrOpenSchedule(row: CatalogScheduleRow): boolean {
  if (String(row?.sourceStatus || '').toLowerCase() === 'widget') return true;
  if (isOpenDateCatalogRow(row)) return true;

  const now = Date.now();
  const startsAtMs = row?.startsAt ? Date.parse(String(row.startsAt)) : NaN;
  const endsAtMs = row?.endsAt ? Date.parse(String(row.endsAt)) : NaN;

  if (Number.isFinite(startsAtMs) && startsAtMs >= now - START_GRACE_MS) {
    return true;
  }

  if (
    Number.isFinite(startsAtMs) &&
    Number.isFinite(endsAtMs) &&
    startsAtMs < now &&
    endsAtMs >= now
  ) {
    const duration = endsAtMs - startsAtMs;
    if (duration <= RUNNING_SESSION_MAX_MS) return true;
    if (isWideLifetimeSession(row.startsAt, row.endsAt)) return false;
    const kind = String(row?.kind || '').toUpperCase();
    if (kind === 'RECURRING' || kind === 'SERIES') return true;
    return false;
  }

  return false;
}

export function hasDisplayPrice(priceFrom?: number | null, minPrice = MIN_DISPLAY_PRICE_RUB): boolean {
  return Number.isFinite(priceFrom) && Number(priceFrom) >= minPrice;
}

/** Listing/sale gate: schedule + purchase + not sales-blocked. Display price (≥100) is optional. */
export function isSaleableForPublicCatalog(row: CatalogSaleableRow): boolean {
  return Boolean(
    isPublicSessionRowOnSale(row) &&
    hasUpcomingOrOpenSchedule(row) &&
    row.purchaseReady,
  );
}

/** Alias kept for dto.js / event DTO call sites (F5.1). */
export const isSaleableEventForPublic = isSaleableForPublicCatalog;
