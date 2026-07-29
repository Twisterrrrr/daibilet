/**
 * Shared catalog saleability rules for legacy dto.js and Prisma public DTOs.
 */
export const MIN_DISPLAY_PRICE_RUB = 100;

export const START_GRACE_MS = 15 * 60 * 1000;
export const RUNNING_SESSION_MAX_MS = 36 * 60 * 60 * 1000;

/** SQL predicate: session is upcoming or currently running (not stale wide-lifetime rows). */
export const ACTIVE_SESSION_SQL = `(
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

/** Listing/sale gate: schedule + purchase. Display price (≥100) is optional. */
export function isSaleableForPublicCatalog(row: CatalogSaleableRow): boolean {
  return Boolean(hasUpcomingOrOpenSchedule(row) && row.purchaseReady);
}
