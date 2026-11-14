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
    vacant: number;
    priceFrom: number | null;
    soldTickets: number;
    orders: number;
  };
  sessions: Array<{
    id: string;
    startsAt: string | null;
    sourceStatus: string | null;
    priceFrom: number | null;
    vacant: number;
    externalId: string | null;
  }>;
  offers: Array<{
    id: string;
    title: string | null;
    sourceCode: string | null;
    priceRub: number | null;
    active: boolean;
    widgetUrl: string | null;
    deeplinkUrl: string | null;
  }>;
  sales: {
    soldTickets: number;
    orders: number;
    ticketStatuses: Array<{ status: string; tickets: number }>;
  };
  /** Soft gate + source diagnostics from list row when available. */
  canPublish: boolean | null;
  publishBlockers: string[];
  groupEventIds: string[];
  classification: {
    categoryId: string | null;
    primarySubcategoryId: string | null;
    subcategoryIds: string[];
    tagIds: string[];
  };
  venueLinks: Array<{
    id: string;
    venueId: string;
    role: string;
    sortOrder: number;
    label: string | null;
    slug: string | null;
    title: string | null;
    kind: string | null;
    pageStatus: string | null;
  }>;
  source: {
    sourceLabel: string | null;
    status: string | null;
    proposedCategory: string | null;
    vacant: number | null;
    offerStatus: string | null;
    purchaseReady: boolean | null;
    problems: string[];
  };
  errors: string[];
};

export type AdminTaxonomyData = {
  categories: Array<{ id: string; title: string; slug: string }>;
  subcategories: Array<{ id: string; categoryId: string; title: string; slug: string }>;
  tags: Array<{ id: string; title: string; slug: string }>;
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

function emptyClassification() {
  return {
    categoryId: null as string | null,
    primarySubcategoryId: null as string | null,
    subcategoryIds: [] as string[],
    tagIds: [] as string[],
  };
}

function emptySource() {
  return {
    sourceLabel: null as string | null,
    status: null as string | null,
    proposedCategory: null as string | null,
    vacant: null as number | null,
    offerStatus: null as string | null,
    purchaseReady: null as boolean | null,
    problems: [] as string[],
  };
}

function emptySummary() {
  return {
    slots: 0,
    offers: 0,
    vacant: 0,
    priceFrom: null as number | null,
    soldTickets: 0,
    orders: 0,
  };
}

function emptySales() {
  return {
    soldTickets: 0,
    orders: 0,
    ticketStatuses: [] as Array<{ status: string; tickets: number }>,
  };
}

function normalizeProblems(match: Record<string, unknown>): string[] {
  const labels: string[] = [];
  if (Array.isArray(match.readinessIssues)) {
    for (const item of match.readinessIssues) {
      if (item && typeof item === 'object') {
        const row = item as Record<string, unknown>;
        if (row.label != null) labels.push(String(row.label));
        else if (row.code != null) labels.push(String(row.code));
      } else if (item != null) {
        labels.push(String(item));
      }
    }
  }
  if (Array.isArray(match.reasons)) {
    for (const item of match.reasons) labels.push(String(item));
  }
  if (Array.isArray(match.publishBlockers)) {
    for (const item of match.publishBlockers) labels.push(String(item));
  }
  const purchaseReady = match.purchaseReady !== false;
  const offerStatus = String(match.offerStatus || '').toLowerCase();
  if (
    !purchaseReady &&
    !offerStatus.includes('widget') &&
    !labels.some((label) => label.toLowerCase().includes('виджет'))
  ) {
    labels.push('нет виджета');
  }
  return Array.from(new Set(labels.filter(Boolean)));
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

function normalizeVenueLinks(raw: unknown): AdminEventDetailData['venueLinks'] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const row = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    return {
      id: String(row.id || ''),
      venueId: String(row.venueId || ''),
      role: String(row.role || 'STOP'),
      sortOrder: asNumber(row.sortOrder),
      label: row.label != null ? String(row.label) : null,
      slug: row.slug != null ? String(row.slug) : null,
      title: row.title != null ? String(row.title) : null,
      kind: row.kind != null ? String(row.kind) : null,
      pageStatus: row.pageStatus != null ? String(row.pageStatus) : null,
    };
  });
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
      summary: emptySummary(),
      sessions: [],
      offers: [],
      sales: emptySales(),
      canPublish: null,
      publishBlockers: [],
      groupEventIds: [],
      classification: emptyClassification(),
      venueLinks: [],
      source: emptySource(),
      errors: ['missing event id'],
    };
  }

  let canPublish: boolean | null = null;
  let publishBlockers: string[] = [];
  let slug: string | null = null;
  let classification = emptyClassification();
  let source = emptySource();

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
        classification = {
          categoryId: match.categoryId != null ? String(match.categoryId) : null,
          primarySubcategoryId:
            match.primarySubcategoryId != null ? String(match.primarySubcategoryId) : null,
          subcategoryIds: Array.isArray(match.subcategoryIds)
            ? match.subcategoryIds.map((item) => String(item))
            : [],
          tagIds: Array.isArray(match.tagIds) ? match.tagIds.map((item) => String(item)) : [],
        };
        source = {
          sourceLabel: String(
            match.sourceName || match.source || match.sourceCode || match.sourceLabel || '',
          ) || null,
          status: match.status != null ? String(match.status) : null,
          proposedCategory:
            match.proposedCategory != null
              ? String(match.proposedCategory)
              : match.category != null
                ? String(match.category)
                : null,
          vacant: match.vacant == null ? null : asNumber(match.vacant),
          offerStatus: match.offerStatus != null ? String(match.offerStatus) : null,
          purchaseReady: typeof match.purchaseReady === 'boolean' ? match.purchaseReady : null,
          problems: normalizeProblems(match),
        };
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
        summary: emptySummary(),
        sessions: [],
        offers: [],
        sales: emptySales(),
        canPublish,
        publishBlockers,
        groupEventIds: [],
        classification,
        venueLinks: [],
        source,
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
    const salesRaw = (payload.sales && typeof payload.sales === 'object'
      ? payload.sales
      : {}) as Record<string, unknown>;
    const groupEventIds = Array.isArray(payload.eventIds)
      ? payload.eventIds.map((item) => String(item))
      : [];
    const venueLinks = normalizeVenueLinks(payload.venueLinks);

    const sessions = Array.isArray(payload.sessions)
      ? payload.sessions.map((item) => {
          const row = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
          return {
            id: String(row.id || ''),
            startsAt: row.startsAt != null ? String(row.startsAt) : null,
            sourceStatus: row.sourceStatus != null ? String(row.sourceStatus) : null,
            priceFrom: row.priceFrom == null ? null : asNumber(row.priceFrom),
            vacant: asNumber(row.vacant),
            externalId: row.externalId != null ? String(row.externalId) : null,
          };
        })
      : [];

    const offers = Array.isArray(payload.offers)
      ? payload.offers.map((item) => {
          const row = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
          return {
            id: String(row.id || ''),
            title: row.title != null ? String(row.title) : null,
            sourceCode: row.sourceCode != null ? String(row.sourceCode) : null,
            priceRub: row.priceRub == null ? null : asNumber(row.priceRub),
            active: row.active !== false,
            widgetUrl: row.widgetUrl != null ? String(row.widgetUrl) : null,
            deeplinkUrl: row.deeplinkUrl != null ? String(row.deeplinkUrl) : null,
          };
        })
      : [];

    const ticketStatuses = Array.isArray(salesRaw.ticketStatuses)
      ? salesRaw.ticketStatuses.map((item) => {
          const row = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
          return {
            status: String(row.status || '—'),
            tickets: asNumber(row.tickets),
          };
        })
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
        slots: asNumber(summaryRaw.slots, sessions.length),
        offers: asNumber(summaryRaw.offers, offers.length),
        vacant: asNumber(summaryRaw.vacant, source.vacant || 0),
        priceFrom: summaryRaw.priceFrom == null ? null : asNumber(summaryRaw.priceFrom),
        soldTickets: asNumber(summaryRaw.soldTickets, asNumber(salesRaw.soldTickets)),
        orders: asNumber(summaryRaw.orders, asNumber(salesRaw.orders)),
      },
      sessions,
      offers,
      sales: {
        soldTickets: asNumber(salesRaw.soldTickets, asNumber(summaryRaw.soldTickets)),
        orders: asNumber(salesRaw.orders, asNumber(summaryRaw.orders)),
        ticketStatuses,
      },
      canPublish,
      publishBlockers,
      groupEventIds,
      classification,
      venueLinks,
      source,
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
      summary: emptySummary(),
      sessions: [],
      offers: [],
      sales: emptySales(),
      canPublish,
      publishBlockers,
      groupEventIds: [],
      classification,
      venueLinks: [],
      source,
      errors,
    };
  }
}

export async function loadAdminTaxonomy(): Promise<AdminTaxonomyData> {
  const errors: string[] = [];
  try {
    const response = await adminApiFetch('/api/admin/taxonomy');
    if (!response.ok) {
      errors.push(`taxonomy HTTP ${response.status}`);
      return { categories: [], subcategories: [], tags: [], errors };
    }
    const payload = (await response.json()) as Record<string, unknown>;
    return {
      categories: Array.isArray(payload.categories)
        ? payload.categories.map((item) => {
            const row = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
            return {
              id: String(row.id || ''),
              title: String(row.title || row.slug || ''),
              slug: String(row.slug || ''),
            };
          })
        : [],
      subcategories: Array.isArray(payload.subcategories)
        ? payload.subcategories.map((item) => {
            const row = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
            return {
              id: String(row.id || ''),
              categoryId: String(row.categoryId || ''),
              title: String(row.title || row.slug || ''),
              slug: String(row.slug || ''),
            };
          })
        : [],
      tags: Array.isArray(payload.tags)
        ? payload.tags.map((item) => {
            const row = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
            return {
              id: String(row.id || ''),
              title: String(row.title || row.slug || ''),
              slug: String(row.slug || ''),
            };
          })
        : [],
      errors,
    };
  } catch (error) {
    errors.push(`taxonomy: ${error instanceof Error ? error.message : 'network error'}`);
    return { categories: [], subcategories: [], tags: [], errors };
  }
}
