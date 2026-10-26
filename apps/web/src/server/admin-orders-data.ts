import { asNumber } from '@/lib/admin-ui';
import { adminApiFetch } from '@/server/admin-api-fetch';
import { issueCurrentAdminFinanceAssertion } from '@/server/admin-finance-actor';
import { mergeAdminOrderPage } from '@/server/admin-order-merge';

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
  sourceKind: 'internal' | 'external';
};

export type AdminOrdersListData = {
  page: number;
  pages: number;
  limit: number;
  total: number;
  rows: AdminOrderListRow[];
  sources: string[];
  statuses: string[];
  quickFilters: Array<{ id: string; count: number }>;
  metrics: {
    imported: number;
    confirmed: number;
    processing: number;
    needsAttention: number;
  };
  scopedMetrics?: {
    provider: string;
    total: number;
    confirmed: number;
    processing: number;
    problems: number;
    refundCases: number;
  };
  errors: string[];
};

export type AdminOrderDetailData = {
  id: string;
  found: boolean;
  externalOrderId: string;
  publicCode: string | null;
  status: string;
  displayStatus: string;
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

export type InternalAdminOrderDetail = {
  id: string;
  publicCode: string;
  status: string;
  displayStatus: string;
  eventTitle: string | null;
  amountRub: number | null;
  ticketCount: number;
  buyer: { name: string | null; email: string | null; phone: string | null };
  finance: {
    payments: Array<{ status: string; providerPaymentId: string | null; amountKopecks: number }>;
    refunds: Array<{ status: string; amountKopecks: number; reasonNote?: string | null; providerRefundId: string | null; createdAt: string | null }>;
  } | null;
};

export async function loadInternalAdminOrderDetail(code: string): Promise<{ detail: InternalAdminOrderDetail | null; error: string | null }> {
  const admin = await issueCurrentAdminFinanceAssertion();
  if (!admin) return { detail: null, error: 'Требуется действующая персональная сессия сотрудника.' };
  const base = process.env.FINANCE_API_BASE_URL || '';
  const token = process.env.DAIBILET_FINANCE_ADMIN_READ_TOKEN || '';
  if (!base || !token) return { detail: null, error: 'Подключение к финконтуру не настроено.' };
  try {
    const url = new URL(`/api/internal/admin/orders/${encodeURIComponent(code)}`, base);
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}`, 'X-Daibilet-Admin-Assertion': admin.assertion }, cache: 'no-store', signal: AbortSignal.timeout(8_000) });
    if (response.status === 404) return { detail: null, error: 'Заказ не найден.' };
    if (!response.ok) return { detail: null, error: `Финконтур ответил HTTP ${response.status}.` };
    const raw = await response.json() as Record<string, unknown>;
    if (raw.sourceKind !== 'internal') return { detail: null, error: 'Это не внутренний заказ.' };
    return { detail: raw as unknown as InternalAdminOrderDetail, error: null };
  } catch {
    return { detail: null, error: 'Не удалось получить заказ из финконтура.' };
  }
}

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
    sourceKind: row.sourceKind === 'internal' ? 'internal' : 'external',
  };
}

export async function loadAdminOrdersList(searchParams: {
  kind?: 'all' | 'internal' | 'external';
  q?: string;
  view?: string;
  page?: string;
  limit?: number;
  source?: string;
  status?: string;
}): Promise<AdminOrdersListData> {
  if (searchParams.kind === 'all') return loadCombinedAdminOrders(searchParams);
  const errors: string[] = [];
  const params = new URLSearchParams();
  params.set('limit', String(searchParams.limit || DEFAULT_LIMIT));
  params.set('page', String(Math.max(1, asNumber(searchParams.page, 1))));
  if (searchParams.q?.trim()) params.set('q', searchParams.q.trim());
  if (searchParams.view && searchParams.view !== 'all') params.set('view', searchParams.view);
  if (searchParams.source && searchParams.source !== 'all') params.set('provider', searchParams.source);
  if (searchParams.status && searchParams.status !== 'all') params.set('status', searchParams.status);

  if (searchParams.kind === 'internal') {
    params.set('provider', 'MANUAL');
    return loadFinanceAdminOrders(params);
  }

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
      sources: Array.isArray(payload.sources) ? payload.sources.map(String) : [],
      statuses: Array.isArray(payload.statuses) ? payload.statuses.map(String) : [],
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

async function loadCombinedAdminOrders(searchParams: {
  q?: string;
  view?: string;
  page?: string;
  source?: string;
  status?: string;
}): Promise<AdminOrdersListData> {
  const page = Math.max(1, Math.floor(asNumber(searchParams.page, 1)));
  const needed = page * DEFAULT_LIMIT;
  const source = searchParams.source || 'all';
  const includeInternal = source === 'all' || source === 'MANUAL';
  const includeExternal = source !== 'MANUAL';
  const perSourceLimit = 100;
  const base = { ...searchParams, page: '1', limit: perSourceLimit };
  const [internalFirst, externalFirst] = await Promise.all([
    includeInternal ? loadAdminOrdersList({ ...base, kind: 'internal', source: 'all' }) : Promise.resolve(emptyOrders([])),
    includeExternal ? loadAdminOrdersList({ ...base, kind: 'external' }) : Promise.resolve(emptyOrders([])),
  ]);
  const errors = [...internalFirst.errors, ...externalFirst.errors];
  if (errors.length) return emptyOrders(errors);

  async function throughPage(first: AdminOrdersListData, kind: 'internal' | 'external') {
    const count = Math.ceil(Math.min(first.total, needed) / perSourceLimit);
    if (count <= 1) return first.rows;
    const later = await Promise.all(Array.from({ length: count - 1 }, (_, index) =>
      loadAdminOrdersList({ ...base, kind, source: kind === 'internal' ? 'all' : source, page: String(index + 2) }),
    ));
    for (const result of later) errors.push(...result.errors);
    return [...first.rows, ...later.flatMap((result) => result.rows)];
  }

  const [internalRows, externalRows] = await Promise.all([
    includeInternal ? throughPage(internalFirst, 'internal') : Promise.resolve([] as AdminOrderListRow[]),
    includeExternal ? throughPage(externalFirst, 'external') : Promise.resolve([] as AdminOrderListRow[]),
  ]);
  if (errors.length) return emptyOrders(errors);

  const total = internalFirst.total + externalFirst.total;
  const pages = Math.max(1, Math.ceil(total / DEFAULT_LIMIT));
  const safePage = Math.min(page, pages);
  const quickFilterIds = new Set([...internalFirst.quickFilters, ...externalFirst.quickFilters].map((item) => item.id));
  return {
    page: safePage,
    pages,
    limit: DEFAULT_LIMIT,
    total,
    rows: mergeAdminOrderPage(internalRows, externalRows, safePage, DEFAULT_LIMIT),
    sources: [...new Set([...internalFirst.sources, ...externalFirst.sources])],
    statuses: [...new Set([...internalFirst.statuses, ...externalFirst.statuses])],
    quickFilters: [...quickFilterIds].map((id) => ({
      id,
      count: (internalFirst.quickFilters.find((item) => item.id === id)?.count || 0)
        + (externalFirst.quickFilters.find((item) => item.id === id)?.count || 0),
    })),
    metrics: {
      imported: internalFirst.metrics.imported + externalFirst.metrics.imported,
      confirmed: internalFirst.metrics.confirmed + externalFirst.metrics.confirmed,
      processing: internalFirst.metrics.processing + externalFirst.metrics.processing,
      needsAttention: internalFirst.metrics.needsAttention + externalFirst.metrics.needsAttention,
    },
    errors: [],
  };
}

async function loadFinanceAdminOrders(params: URLSearchParams): Promise<AdminOrdersListData> {
  const admin = await issueCurrentAdminFinanceAssertion();
  if (!admin) return emptyOrders(['Внутренние заказы доступны по персональной сессии сотрудника.']);
  const base = process.env.FINANCE_API_BASE_URL || '';
  const token = process.env.DAIBILET_FINANCE_ADMIN_READ_TOKEN || '';
  if (!base || !token) return emptyOrders(['Внутренние заказы: защищённое подключение к финконтуру не настроено.']);
  try {
    const url = new URL('/api/internal/admin/orders', base);
    url.search = params.toString();
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, 'X-Daibilet-Admin-Assertion': admin.assertion },
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return emptyOrders([`Внутренние заказы: HTTP ${response.status}`]);
    const payload = (await response.json()) as Record<string, unknown>;
    const metricsRaw = (payload.metrics && typeof payload.metrics === 'object' ? payload.metrics : {}) as Record<string, unknown>;
    const scopedRaw = (payload.scopedMetrics && typeof payload.scopedMetrics === 'object' ? payload.scopedMetrics : {}) as Record<string, unknown>;
    return {
      page: asNumber(payload.page, 1),
      pages: Math.max(1, asNumber(payload.pages, 1)),
      limit: asNumber(payload.limit, DEFAULT_LIMIT),
      total: asNumber(payload.total),
      rows: Array.isArray(payload.rows) ? payload.rows.map(normalizeOrderRow) : [],
      sources: ['MANUAL'],
      statuses: Array.isArray(payload.statuses) ? payload.statuses.map(String) : [],
      quickFilters: Array.isArray(payload.quickFilters) ? payload.quickFilters.map((item) => {
        const row = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
        return { id: String(row.id || ''), count: asNumber(row.count) };
      }) : [],
      metrics: {
        imported: asNumber(metricsRaw.internal),
        confirmed: asNumber(metricsRaw.confirmed),
        processing: asNumber(metricsRaw.processing),
        needsAttention: asNumber(metricsRaw.needsAttention),
      },
      scopedMetrics: scopedRaw.provider === 'MANUAL' ? {
        provider: 'MANUAL',
        total: asNumber(scopedRaw.total),
        confirmed: asNumber(scopedRaw.confirmed),
        processing: asNumber(scopedRaw.processing),
        problems: asNumber(scopedRaw.problems),
        refundCases: asNumber(scopedRaw.refundCases),
      } : undefined,
      errors: [],
    };
  } catch (error) {
    return emptyOrders([`Внутренние заказы: ${error instanceof Error ? error.message : 'сеть недоступна'}`]);
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
    displayStatus: '—',
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
      displayStatus: String(payload.displayStatus || payload.status || '—'),
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

export type AdminOrderEventCandidate = {
  id: string;
  title: string;
  city: string | null;
  venue: string | null;
  sourceCode: string | null;
  groupEventIds: string[];
};

export async function loadAdminOrderEventCandidates(
  query: string,
): Promise<{ rows: AdminOrderEventCandidate[]; errors: string[] }> {
  const errors: string[] = [];
  const q = query.trim();
  if (!q) return { rows: [], errors };

  try {
    const params = new URLSearchParams();
    params.set('q', q);
    params.set('limit', '12');
    const response = await adminApiFetch(`/api/admin/order-event-candidates?${params.toString()}`);
    if (!response.ok) {
      errors.push(`candidates HTTP ${response.status}`);
      return { rows: [], errors };
    }
    const payload = (await response.json()) as Record<string, unknown>;
    const rows = Array.isArray(payload.rows)
      ? payload.rows.map((item) => {
          const row = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
          return {
            id: String(row.id || ''),
            title: String(row.title || row.id || ''),
            city: row.city != null ? String(row.city) : null,
            venue: row.venue != null ? String(row.venue) : null,
            sourceCode: row.sourceCode != null ? String(row.sourceCode) : null,
            groupEventIds: Array.isArray(row.groupEventIds)
              ? row.groupEventIds.map((value) => String(value))
              : [],
          };
        })
      : [];
    return { rows, errors };
  } catch (error) {
    errors.push(`candidates: ${error instanceof Error ? error.message : 'network error'}`);
    return { rows: [], errors };
  }
}

function emptyOrders(errors: string[]): AdminOrdersListData {
  return {
    page: 1,
    pages: 1,
    limit: DEFAULT_LIMIT,
    total: 0,
    rows: [],
    sources: [],
    statuses: [],
    quickFilters: [],
    metrics: { imported: 0, confirmed: 0, processing: 0, needsAttention: 0 },
    errors,
  };
}
