import type { AdminOrderListRow } from './admin-orders-data';

function orderTime(row: AdminOrderListRow): number {
  const parsed = Date.parse(row.purchasedAt || '');
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Both source APIs return newest first. Merge their prefixes before slicing a global page. */
export function mergeAdminOrderPage(
  internalRows: AdminOrderListRow[],
  externalRows: AdminOrderListRow[],
  page: number,
  limit: number,
): AdminOrderListRow[] {
  return [...internalRows, ...externalRows]
    .sort((a, b) => orderTime(b) - orderTime(a)
      || `${a.sourceKind}:${a.id}`.localeCompare(`${b.sourceKind}:${b.id}`))
    .slice((page - 1) * limit, page * limit);
}
