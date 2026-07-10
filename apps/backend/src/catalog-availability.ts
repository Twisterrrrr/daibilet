/**
 * Shared catalog saleability rules for legacy dto.js and Prisma public DTOs.
 */
export const MIN_DISPLAY_PRICE_RUB = 100;

/** SQL predicate: session is still active (upcoming or currently running). */
export const ACTIVE_SESSION_SQL = 'coalesce(session."endsAt", session."startsAt") >= now()';

export interface CatalogScheduleRow {
  kind?: string | null;
  sourceStatus?: string | null;
  startsAt?: string | Date | null;
  endsAt?: string | Date | null;
}

export interface CatalogSaleableRow extends CatalogScheduleRow {
  purchaseReady?: boolean;
  priceFrom?: number | null;
}

export function isOpenDateCatalogRow(row: CatalogScheduleRow): boolean {
  const kind = String(row?.kind || '').toUpperCase();
  const sourceStatus = String(row?.sourceStatus || '').toLowerCase();
  return kind === 'OPEN_DATE' || sourceStatus === 'open_date';
}

export function hasUpcomingOrOpenSchedule(row: CatalogScheduleRow): boolean {
  if (isOpenDateCatalogRow(row)) return true;

  const endsAt = row?.endsAt;
  if (endsAt) {
    const endMs = Date.parse(String(endsAt));
    if (Number.isFinite(endMs) && endMs >= Date.now()) return true;
  }

  const startsAt = row?.startsAt;
  if (!startsAt) return false;
  const startMs = Date.parse(String(startsAt));
  return Number.isFinite(startMs) && startMs >= Date.now();
}

export function isSaleableForPublicCatalog(
  row: CatalogSaleableRow,
  minPrice = MIN_DISPLAY_PRICE_RUB,
): boolean {
  return Boolean(
    hasUpcomingOrOpenSchedule(row) &&
    row.purchaseReady &&
    Number.isFinite(row.priceFrom) &&
    Number(row.priceFrom) >= minPrice,
  );
}
