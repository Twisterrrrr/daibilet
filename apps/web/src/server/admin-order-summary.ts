import type { AdminOrdersListData } from './admin-orders-data';

export type AdminUnifiedOrderSummary = {
  total: number;
  internal: number;
  external: number;
  paid: number;
  processing: number;
  problems: number;
  pendingRefunds: number;
};

function quickCount(data: AdminOrdersListData, id: string): number {
  return data.quickFilters.find((item) => item.id === id)?.count ?? 0;
}

/** A partial two-host response must never become a plausible dashboard total. */
export function summarizeAdminOrders(
  internal: AdminOrdersListData,
  external: AdminOrdersListData,
): AdminUnifiedOrderSummary | null {
  if (internal.errors.length || external.errors.length) return null;
  return {
    total: internal.total + external.total,
    internal: internal.total,
    external: external.total,
    paid: internal.metrics.confirmed + external.metrics.confirmed,
    processing: internal.metrics.processing + external.metrics.processing,
    problems: quickCount(internal, 'failed_integration') + quickCount(external, 'failed_integration'),
    pendingRefunds: quickCount(internal, 'pending_refunds') + quickCount(external, 'pending_refunds'),
  };
}
