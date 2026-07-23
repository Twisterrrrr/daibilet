import { asNumber } from '@/lib/admin-ui';
import { adminApiFetch } from '@/server/admin-api-fetch';

export type AdminOrderListRow = {
  id: string;
  externalOrderId: string;
  publicCode: string | null;
  status: string;
  displayStatus: string;
  sourceCode: string;
  sourceName: string;
  buyerName: string | null;
  buyerEmail: string | null;
  purchasedAt: string | null;
  eventTitle: string | null;
  ticketCount: number;
  unlinkedTickets: number;
  amountRub: number | null;
  needsAttention: boolean;
  problems: string[];
  isArchived: boolean;
};

export type AdminOrdersListData = {
  page: number;
  pages: number;
  limit: number;
  total: number;
  rows: AdminOrderListRow[];
  quickFilters: Array<{ id: string; count: number }>;
  metrics: {
    imported: number;
    confirmed: number;
    processing: number;
    needsAttention: number;
  };
  errors: string[];
};

export type AdminOrderDetailData = {
  id: string;
  found: boolean;
  externalOrderId: string;
  publicCode: string | null;
  status: string;
  sourceCode: string;
  sourceName: string;
  buyerName: string | null;
  buyerEmail: string | null;
  buyerPhone: string | null;
  purchasedAt: string | null;
  updatedAt: string | null;
  archivedAt: string | null;
  ticketCount: number;
  unlinkedTickets: number;
  tickets: Array<{
    id: string;
    externalTicketId: string;
    status: string;
    eventTitle: string | null;
    eventId: string | null;
  }>;
  errors: string[];
};

const DEFAULT_LIMIT = 50;

function normalizeOrderRow(raw: unknown): AdminOrderListRow {
  const row = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const buyer = (row.buyer && typeof row.buyer === 'object' ? row.buyer : {}) as Record<string, unknown>;
  return {
    id: String(row.id || ''),
    externalOrderId: String(row.externalOrderId || row.id || ''),
    publicCode: row.publicCode != null ? String(row.publicCode) : null,
    status: String(row.status || '—'),
    displayStatus: String(row.displayStatus || row.status || '—'),
    sourceCode: String(row.sourceCode || '—'),
    sourceName: String(row.sourceName || row.sourceLabel || row.sourceCode || '—'),
    buyerName: buyer.name != null ? String(buyer.name) : null,
    buyerEmail: buyer.email != null ? String(buyer.email) : null,
    purchasedAt: row.purchasedAt != null ? String(row.purchasedAt) : null,
    eventTitle: row.eventTitle != null ? String(row.eventTitle) : null,
    ticketCount: asNumber(row.ticketCount),
    unlinkedTickets: asNumber(row.unlinkedTickets),
    amountRub: row.amountRub == null ? null : asNumber(row.amountRub),
    needsAttention: Boolean(row.needsAttention),
    problems: Array.isArray(row.problems) ? row.problems.map((item) => String(item)) : [],
    isArchived: Boolean(row.isArchived || row.archivedAt),
  };
}

export async function loadAdminOrdersList(searchParams: {
  q?: string;
  view?: string;
  page?: string;
  source?: string;
}): Promise<AdminOrdersListData> {
  const errors: string[] = [];
  const params = new URLSearchParams();
  params.set('limit', String(DEFAULT_LIMIT));
  params.set('page', String(Math.max(1, asNumber(searchParams.page, 1))));
  if (searchParams.q?.trim()) params.set('q', searchParams.q.trim());
  if (searchParams.view && searchParams.view !== 'all') params.set('view', searchParams.view);
  if (searchParams.source && searchParams.source !== 'all') params.set('source', searchParams.source);

  try {
    const response = await adminApiFetch(`/api/admin/orders?${params.toString()}`);
    if (!response.ok) {
      errors.push(`orders HTTP ${response.status}`);
      return emptyOrders(errors);
    }
    const payload = (await response.json()) as Record<string, unknown>;
    const metricsRaw = (payload.metrics && typeof payload.metrics === 'object'
      ? payload.metrics
      : {}) as Record<string, unknown>;
    const quickFilters = Array.isArray(payload.quickFilters)
      ? payload.quickFilters.map((item) => {
          const row = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
          return { id: String(row.id || ''), count: asNumber(row.count) };
        })
      : [];

    return {
      page: asNumber(payload.page, 1),
      pages: Math.max(1, asNumber(payload.pages, 1)),
      limit: asNumber(payload.limit, DEFAULT_LIMIT),
      total: asNumber(payload.total),
      rows: Array.isArray(payload.rows) ? payload.rows.map(normalizeOrderRow) : [],
      quickFilters,
      metrics: {
        imported: asNumber(metricsRaw.imported || metricsRaw.orders),
        confirmed: asNumber(metricsRaw.confirmed),
        processing: asNumber(metricsRaw.processing),
        needsAttention: asNumber(metricsRaw.needsAttention),
      },
      errors,
    };
  } catch (error) {
    errors.push(`orders: ${error instanceof Error ? error.message : 'network error'}`);
    return emptyOrders(errors);
  }
}

export async function loadAdminOrderDetail(orderId: string): Promise<AdminOrderDetailData> {
  const errors: string[] = [];
  const id = orderId.trim();
  const empty: AdminOrderDetailData = {
    id,
    found: false,
    externalOrderId: id,
    publicCode: null,
    status: '—',
    sourceCode: '—',
    sourceName: '—',
    buyerName: null,
    buyerEmail: null,
    buyerPhone: null,
    purchasedAt: null,
    updatedAt: null,
    archivedAt: null,
    ticketCount: 0,
    unlinkedTickets: 0,
    tickets: [],
    errors,
  };
  if (!id) return { ...empty, errors: ['missing order id'] };

  try {
    const response = await adminApiFetch(`/api/admin/orders/${encodeURIComponent(id)}`);
    if (!response.ok) {
      errors.push(`order detail HTTP ${response.status}`);
      return { ...empty, errors };
    }
    const payload = (await response.json()) as Record<string, unknown>;
    if (payload.error) {
      errors.push(String(payload.error));
      return { ...empty, errors };
    }
    const buyer = (payload.buyerSnapshot && typeof payload.buyerSnapshot === 'object'
      ? payload.buyerSnapshot
      : payload.buyer && typeof payload.buyer === 'object'
        ? payload.buyer
        : {}) as Record<string, unknown>;
    const ticketsRaw = Array.isArray(payload.tickets) ? payload.tickets : [];

    return {
      id: String(payload.id || id),
      found: true,
      externalOrderId: String(payload.externalOrderId || id),
      publicCode: payload.publicCode != null ? String(payload.publicCode) : null,
      status: String(payload.status || '—'),
      sourceCode: String(payload.sourceCode || '—'),
      sourceName: String(payload.sourceName || payload.sourceCode || '—'),
      buyerName: buyer.name != null ? String(buyer.name) : null,
      buyerEmail: buyer.email != null ? String(buyer.email) : null,
      buyerPhone: buyer.phone != null ? String(buyer.phone) : null,
      purchasedAt: payload.purchasedAt != null ? String(payload.purchasedAt) : null,
      updatedAt: payload.updatedAt != null ? String(payload.updatedAt) : null,
      archivedAt: payload.archivedAt != null ? String(payload.archivedAt) : null,
      ticketCount: asNumber(payload.ticketCount, ticketsRaw.length),
      unlinkedTickets: asNumber(payload.unlinkedTickets),
      tickets: ticketsRaw.map((item) => {
        const row = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
        return {
          id: String(row.id || ''),
          externalTicketId: String(row.externalTicketId || ''),
          status: String(row.status || '—'),
          eventTitle: row.eventTitle != null ? String(row.eventTitle) : null,
          eventId: row.eventId != null ? String(row.eventId) : null,
        };
      }),
      errors,
    };
  } catch (error) {
    errors.push(`order detail: ${error instanceof Error ? error.message : 'network error'}`);
    return { ...empty, errors };
  }
}

function emptyOrders(errors: string[]): AdminOrdersListData {
  return {
    page: 1,
    pages: 1,
    limit: DEFAULT_LIMIT,
    total: 0,
    rows: [],
    quickFilters: [],
    metrics: { imported: 0, confirmed: 0, processing: 0, needsAttention: 0 },
    errors,
  };
}
