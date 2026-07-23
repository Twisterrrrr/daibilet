import { asNumber } from '@/lib/admin-ui';
import { adminApiFetch } from '@/server/admin-api-fetch';

export type AdminEventListRow = {
  id: string;
  title: string;
  city: string;
  venue: string;
  source: string;
  readiness: string;
  status: string;
  priceFrom: number | null;
  hasImage: boolean;
  purchaseReady: boolean;
  slotCount: number;
  landingHits: string[];
  slug?: string | null;
};

export type AdminEventsListData = {
  page: number;
  pages: number;
  limit: number;
  total: number;
  rows: AdminEventListRow[];
  quickFilters: Array<{ id: string; count: number }>;
  metrics: {
    events: number;
    readyEvents: number;
    reviewEvents: number;
  };
  errors: string[];
};

const DEFAULT_LIMIT = 80;

function normalizeRow(raw: unknown): AdminEventListRow {
  const row = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const landingHits = Array.isArray(row.landingHits)
    ? row.landingHits.map((item) => String(item))
    : [];
  return {
    id: String(row.id || ''),
    title: String(row.title || 'Без названия'),
    city: String(row.city || row.destination || '—'),
    venue: String(row.venue || '—'),
    source: String(row.sourceCode || row.source || '—'),
    readiness: String(row.readiness || row.status || '—'),
    status: String(row.status || '—'),
    priceFrom: row.priceFrom == null ? null : asNumber(row.priceFrom, 0),
    hasImage: Boolean(row.hasImage),
    purchaseReady: Boolean(row.purchaseReady),
    slotCount: asNumber(row.slotCount || row.groupedEventsCount, 1),
    landingHits,
    slug: row.slug != null ? String(row.slug) : null,
  };
}

export async function loadAdminEventsList(searchParams: {
  q?: string;
  view?: string;
  page?: string;
  source?: string;
  readiness?: string;
}): Promise<AdminEventsListData> {
  const errors: string[] = [];
  const params = new URLSearchParams();
  params.set('limit', String(DEFAULT_LIMIT));
  params.set('page', String(Math.max(1, asNumber(searchParams.page, 1))));
  if (searchParams.q?.trim()) params.set('q', searchParams.q.trim());
  if (searchParams.view && searchParams.view !== 'all') params.set('view', searchParams.view);
  if (searchParams.source && searchParams.source !== 'all') params.set('source', searchParams.source);
  if (searchParams.readiness && searchParams.readiness !== 'all') {
    params.set('readiness', searchParams.readiness);
  }

  try {
    const response = await adminApiFetch(`/api/admin/events?${params.toString()}`);
    if (!response.ok) {
      errors.push(`events HTTP ${response.status}`);
      return emptyEvents(errors);
    }
    const payload = (await response.json()) as Record<string, unknown>;
    const quickFilters = Array.isArray(payload.quickFilters)
      ? payload.quickFilters.map((item) => {
          const row = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
          return { id: String(row.id || ''), count: asNumber(row.count) };
        })
      : [];
    const metricsRaw = (payload.metrics && typeof payload.metrics === 'object'
      ? payload.metrics
      : {}) as Record<string, unknown>;

    return {
      page: asNumber(payload.page, 1),
      pages: Math.max(1, asNumber(payload.pages, 1)),
      limit: asNumber(payload.limit, DEFAULT_LIMIT),
      total: asNumber(payload.total),
      rows: Array.isArray(payload.rows) ? payload.rows.map(normalizeRow) : [],
      quickFilters,
      metrics: {
        events: asNumber(metricsRaw.events || metricsRaw.groupedEvents),
        readyEvents: asNumber(metricsRaw.readyEvents),
        reviewEvents: asNumber(metricsRaw.reviewEvents),
      },
      errors,
    };
  } catch (error) {
    errors.push(`events: ${error instanceof Error ? error.message : 'network error'}`);
    return emptyEvents(errors);
  }
}

function emptyEvents(errors: string[]): AdminEventsListData {
  return {
    page: 1,
    pages: 1,
    limit: DEFAULT_LIMIT,
    total: 0,
    rows: [],
    quickFilters: [],
    metrics: { events: 0, readyEvents: 0, reviewEvents: 0 },
    errors,
  };
}
