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

export type AdminEventOverride = {
  title: string | null;
  shortDescription: string | null;
  description: string | null;
  imageUrl: string | null;
  seoH1: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalPath: string | null;
  isIndexable: boolean | null;
  editorStatus: string | null;
  mergeGroupKey: string | null;
};

export type AdminEventDetailData = {
  id: string;
  found: boolean;
  sourceTitle: string;
  sourceDescription: string | null;
  sourceImageUrl: string | null;
  slug: string | null;
  override: AdminEventOverride;
  summary: {
    slots: number;
    offers: number;
    priceFrom: number | null;
    soldTickets: number;
    orders: number;
  };
  /** Soft gate from list row when available (detail API does not return it). */
  canPublish: boolean | null;
  publishBlockers: string[];
  groupEventIds: string[];
  errors: string[];
};

function emptyOverride(): AdminEventOverride {
  return {
    title: null,
    shortDescription: null,
    description: null,
    imageUrl: null,
    seoH1: null,
    seoTitle: null,
    seoDescription: null,
    canonicalPath: null,
    isIndexable: null,
    editorStatus: null,
    mergeGroupKey: null,
  };
}

function normalizeOverride(raw: unknown): AdminEventOverride {
  const row = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    title: row.title != null ? String(row.title) : null,
    shortDescription: row.shortDescription != null ? String(row.shortDescription) : null,
    description: row.description != null ? String(row.description) : null,
    imageUrl: row.imageUrl != null ? String(row.imageUrl) : null,
    seoH1: row.seoH1 != null ? String(row.seoH1) : null,
    seoTitle: row.seoTitle != null ? String(row.seoTitle) : null,
    seoDescription: row.seoDescription != null ? String(row.seoDescription) : null,
    canonicalPath: row.canonicalPath != null ? String(row.canonicalPath) : null,
    isIndexable: typeof row.isIndexable === 'boolean' ? row.isIndexable : null,
    editorStatus: row.editorStatus != null ? String(row.editorStatus) : null,
    mergeGroupKey: row.mergeGroupKey != null ? String(row.mergeGroupKey) : null,
  };
}

export async function loadAdminEventDetail(eventId: string): Promise<AdminEventDetailData> {
  const errors: string[] = [];
  const id = eventId.trim();
  if (!id) {
    return {
      id: '',
      found: false,
      sourceTitle: '',
      sourceDescription: null,
      sourceImageUrl: null,
      slug: null,
      override: emptyOverride(),
      summary: { slots: 0, offers: 0, priceFrom: null, soldTickets: 0, orders: 0 },
      canPublish: null,
      publishBlockers: [],
      groupEventIds: [],
      errors: ['missing event id'],
    };
  }

  let canPublish: boolean | null = null;
  let publishBlockers: string[] = [];
  let slug: string | null = null;

  try {
    const listResponse = await adminApiFetch(
      `/api/admin/events?limit=5&q=${encodeURIComponent(id)}`,
    );
    if (listResponse.ok) {
      const listPayload = (await listResponse.json()) as { rows?: unknown[] };
      const match = (listPayload.rows || [])
        .map((item) => (item && typeof item === 'object' ? (item as Record<string, unknown>) : null))
        .find((row) => row && (String(row.id) === id || (Array.isArray(row.groupEventIds) && row.groupEventIds.includes(id))));
      if (match) {
        canPublish = match.canPublish !== false;
        publishBlockers = Array.isArray(match.publishBlockers)
          ? match.publishBlockers.map((item) => String(item))
          : [];
        slug = match.slug != null ? String(match.slug) : null;
      }
    }
  } catch {
    // gate info optional
  }

  try {
    const response = await adminApiFetch(`/api/admin/events/${encodeURIComponent(id)}`);
    if (!response.ok) {
      errors.push(`event detail HTTP ${response.status}`);
      return {
        id,
        found: false,
        sourceTitle: id,
        sourceDescription: null,
        sourceImageUrl: null,
        slug,
        override: emptyOverride(),
        summary: { slots: 0, offers: 0, priceFrom: null, soldTickets: 0, orders: 0 },
        canPublish,
        publishBlockers,
        groupEventIds: [],
        errors,
      };
    }
    const payload = (await response.json()) as Record<string, unknown>;
    const event = (payload.event && typeof payload.event === 'object'
      ? payload.event
      : {}) as Record<string, unknown>;
    const summaryRaw = (payload.summary && typeof payload.summary === 'object'
      ? payload.summary
      : {}) as Record<string, unknown>;
    const groupEventIds = Array.isArray(payload.eventIds)
      ? payload.eventIds.map((item) => String(item))
      : [];

    return {
      id: String(payload.eventId || id),
      found: Boolean(event.id || payload.override),
      sourceTitle: String(event.title || id),
      sourceDescription: event.description != null ? String(event.description) : null,
      sourceImageUrl: event.imageUrl != null ? String(event.imageUrl) : null,
      slug,
      override: normalizeOverride(payload.override),
      summary: {
        slots: asNumber(summaryRaw.slots),
        offers: asNumber(summaryRaw.offers),
        priceFrom: summaryRaw.priceFrom == null ? null : asNumber(summaryRaw.priceFrom),
        soldTickets: asNumber(summaryRaw.soldTickets),
        orders: asNumber(summaryRaw.orders),
      },
      canPublish,
      publishBlockers,
      groupEventIds,
      errors,
    };
  } catch (error) {
    errors.push(`event detail: ${error instanceof Error ? error.message : 'network error'}`);
    return {
      id,
      found: false,
      sourceTitle: id,
      sourceDescription: null,
      sourceImageUrl: null,
      slug,
      override: emptyOverride(),
      summary: { slots: 0, offers: 0, priceFrom: null, soldTickets: 0, orders: 0 },
      canPublish,
      publishBlockers,
      groupEventIds: [],
      errors,
    };
  }
}
