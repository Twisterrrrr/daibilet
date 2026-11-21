import type { AdminOrdersListData } from './admin-orders-data';

export type AdminUnifiedOrderSummary = {
  total: number;
  internal: number;
  external: number;
  paid: number;
  processing: number;
  problems: number;
  refundCases: number;
};

function quickCount(data: AdminOrdersListData, id: string): number {
  return data.quickFilters.find((item) => item.id === id)?.count ?? 0;
}

/** A partial two-host response must never become a plausible dashboard total. */
export function summarizeAdminOrders(
  internal: AdminOrdersListData,
  external: AdminOrdersListData,
): AdminUnifiedOrderSummary | null {
  const scoped = internal.scopedMetrics;
  if (internal.errors.length || external.errors.length || !scoped || scoped.provider !== 'MANUAL') return null;
  return {
    total: scoped.total + external.total,
    internal: scoped.total,
    external: external.total,
    paid: scoped.confirmed + external.metrics.confirmed,
    processing: scoped.processing + external.metrics.processing,
    problems: scoped.problems + quickCount(external, 'failed_integration'),
    refundCases: scoped.refundCases + quickCount(external, 'pending_refunds'),
  };
}
