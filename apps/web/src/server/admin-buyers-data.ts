import { asNumber } from '@/lib/admin-ui';
import { adminApiFetch } from '@/server/admin-api-fetch';

export type AdminBuyerRow = {
  id: string;
  displayName: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  orders: number;
  tickets: number;
  activeOrders: number;
  needsAttention: number;
  amountRub: number | null;
  lastOrderAt: string | null;
  lastOrderNumber: string | null;
  lastOrderStatusLabel: string | null;
  providers: string[];
  eventTitles: string[];
  statusLabel: string;
  hasContact: boolean;
};

export type AdminBuyersListData = {
  page: number;
  pages: number;
  total: number;
  view: string;
  rows: AdminBuyerRow[];
  metrics: {
    buyers: number;
    withContacts: number;
    orders: number;
    tickets: number;
    needsAttention: number;
    archivedBuyers: number;
  };
  errors: string[];
};

function normalizeBuyer(raw: unknown): AdminBuyerRow {
  const row = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    id: String(row.id || ''),
    displayName: String(row.displayName || row.name || row.email || row.phone || 'Покупатель'),
    name: row.name != null ? String(row.name) : null,
    email: row.email != null ? String(row.email) : null,
    phone: row.phone != null ? String(row.phone) : null,
    orders: asNumber(row.orders),
    tickets: asNumber(row.tickets),
    activeOrders: asNumber(row.activeOrders),
    needsAttention: asNumber(row.needsAttention),
    amountRub: row.amountRub == null ? null : asNumber(row.amountRub),
    lastOrderAt: row.lastOrderAt != null ? String(row.lastOrderAt) : null,
    lastOrderNumber: row.lastOrderNumber != null ? String(row.lastOrderNumber) : null,
    lastOrderStatusLabel:
      row.lastOrderStatusLabel != null ? String(row.lastOrderStatusLabel) : null,
    providers: Array.isArray(row.providers) ? row.providers.map((item) => String(item)) : [],
    eventTitles: Array.isArray(row.eventTitles)
      ? row.eventTitles.map((item) => String(item))
      : [],
    statusLabel: String(row.statusLabel || '—'),
    hasContact: Boolean(row.hasContact),
  };
}

export async function loadAdminBuyersList(searchParams: {
  q?: string;
  view?: string;
  page?: string;
}): Promise<AdminBuyersListData> {
  const errors: string[] = [];
  const params = new URLSearchParams();
  params.set('limit', '80');
  params.set('page', String(Math.max(1, asNumber(searchParams.page, 1))));
  const view = searchParams.view === 'archive' ? 'archive' : 'active';
  params.set('view', view);
  if (searchParams.q?.trim()) params.set('q', searchParams.q.trim());

  try {
    const response = await adminApiFetch(`/api/admin/buyers?${params.toString()}`);
    if (!response.ok) {
      errors.push(`buyers HTTP ${response.status}`);
      return emptyBuyers(errors, view);
    }
    const payload = (await response.json()) as Record<string, unknown>;
    const metricsRaw = (payload.metrics && typeof payload.metrics === 'object'
      ? payload.metrics
      : {}) as Record<string, unknown>;
    return {
      page: asNumber(payload.page, 1),
      pages: Math.max(1, asNumber(payload.pages, 1)),
      total: asNumber(payload.total),
      view: String(payload.view || view),
      rows: Array.isArray(payload.rows) ? payload.rows.map(normalizeBuyer) : [],
      metrics: {
        buyers: asNumber(metricsRaw.buyers),
        withContacts: asNumber(metricsRaw.withContacts),
        orders: asNumber(metricsRaw.orders),
        tickets: asNumber(metricsRaw.tickets),
        needsAttention: asNumber(metricsRaw.needsAttention),
        archivedBuyers: asNumber(metricsRaw.archivedBuyers),
      },
      errors,
    };
  } catch (error) {
    errors.push(`buyers: ${error instanceof Error ? error.message : 'network error'}`);
    return emptyBuyers(errors, view);
  }
}

function emptyBuyers(errors: string[], view: string): AdminBuyersListData {
  return {
    page: 1,
    pages: 1,
    total: 0,
    view,
    rows: [],
    metrics: {
      buyers: 0,
      withContacts: 0,
      orders: 0,
      tickets: 0,
      needsAttention: 0,
      archivedBuyers: 0,
    },
    errors,
  };
}
