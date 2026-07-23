import { asNumber } from '@/lib/admin-ui';
import { adminApiFetch } from '@/server/admin-api-fetch';

export type AdminVenueListRow = {
  id: string;
  name: string;
  slug: string | null;
  city: string;
  address: string | null;
  kind: string;
  pageStatus: string;
  events: number;
  isIndexable: boolean;
};

export type AdminVenuesListData = {
  page: number;
  pages: number;
  limit: number;
  total: number;
  rows: AdminVenueListRow[];
  metrics: {
    venues: number;
    candidates: number;
    published: number;
    withEvents: number;
  };
  errors: string[];
};

export type AdminVenueDetailData = {
  id: string;
  found: boolean;
  title: string;
  slug: string | null;
  city: string;
  address: string | null;
  shortDescription: string | null;
  description: string | null;
  heroImageUrl: string | null;
  seoH1: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalPath: string | null;
  isIndexable: boolean;
  kind: string;
  pageStatus: string;
  events: Array<{ id: string; title: string; status: string; priceFrom: number | null }>;
  errors: string[];
};

const DEFAULT_LIMIT = 80;

function normalizeVenueRow(raw: unknown): AdminVenueListRow {
  const row = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    id: String(row.id || ''),
    name: String(row.name || row.title || 'Площадка'),
    slug: row.slug != null ? String(row.slug) : null,
    city: String(row.city || '—'),
    address: row.address != null ? String(row.address) : null,
    kind: String(row.kind || row.proposedKind || 'VENUE'),
    pageStatus: String(row.pageStatus || 'NONE'),
    events: asNumber(row.events),
    isIndexable: Boolean(row.isIndexable),
  };
}

export async function loadAdminVenuesList(searchParams: {
  q?: string;
  family?: string;
  page?: string;
}): Promise<AdminVenuesListData> {
  const errors: string[] = [];
  const params = new URLSearchParams();
  params.set('limit', String(DEFAULT_LIMIT));
  params.set('page', String(Math.max(1, asNumber(searchParams.page, 1))));
  if (searchParams.q?.trim()) params.set('q', searchParams.q.trim());
  if (searchParams.family && searchParams.family !== 'all') params.set('family', searchParams.family);

  try {
    const response = await adminApiFetch(`/api/admin/venues?${params.toString()}`);
    if (!response.ok) {
      errors.push(`venues HTTP ${response.status}`);
      return emptyVenues(errors);
    }
    const payload = (await response.json()) as Record<string, unknown>;
    const metricsRaw = (payload.metrics && typeof payload.metrics === 'object'
      ? payload.metrics
      : {}) as Record<string, unknown>;
    return {
      page: asNumber(payload.page, 1),
      pages: Math.max(1, asNumber(payload.pages, 1)),
      limit: asNumber(payload.limit, DEFAULT_LIMIT),
      total: asNumber(payload.total),
      rows: Array.isArray(payload.rows) ? payload.rows.map(normalizeVenueRow) : [],
      metrics: {
        venues: asNumber(metricsRaw.venues || payload.total),
        candidates: asNumber(metricsRaw.candidates),
        published: asNumber(metricsRaw.published),
        withEvents: asNumber(metricsRaw.withEvents),
      },
      errors,
    };
  } catch (error) {
    errors.push(`venues: ${error instanceof Error ? error.message : 'network error'}`);
    return emptyVenues(errors);
  }
}

export async function loadAdminVenueDetail(venueId: string): Promise<AdminVenueDetailData> {
  const errors: string[] = [];
  const id = venueId.trim();
  const empty: AdminVenueDetailData = {
    id,
    found: false,
    title: id,
    slug: null,
    city: '—',
    address: null,
    shortDescription: null,
    description: null,
    heroImageUrl: null,
    seoH1: null,
    seoTitle: null,
    seoDescription: null,
    canonicalPath: null,
    isIndexable: false,
    kind: 'VENUE',
    pageStatus: 'NONE',
    events: [],
    errors,
  };
  if (!id) return { ...empty, errors: ['missing venue id'] };

  try {
    const response = await adminApiFetch(`/api/admin/venues/${encodeURIComponent(id)}`);
    if (!response.ok) {
      errors.push(`venue detail HTTP ${response.status}`);
      return { ...empty, errors };
    }
    const payload = (await response.json()) as Record<string, unknown>;
    const eventsRaw = Array.isArray(payload.events) ? payload.events : [];
    return {
      id: String(payload.id || id),
      found: true,
      title: String(payload.title || payload.name || id),
      slug: payload.slug != null ? String(payload.slug) : null,
      city: String(payload.city || '—'),
      address: payload.address != null ? String(payload.address) : null,
      shortDescription: payload.shortDescription != null ? String(payload.shortDescription) : null,
      description: payload.description != null ? String(payload.description) : null,
      heroImageUrl: payload.heroImageUrl != null ? String(payload.heroImageUrl) : null,
      seoH1: payload.seoH1 != null ? String(payload.seoH1) : null,
      seoTitle: payload.seoTitle != null ? String(payload.seoTitle) : null,
      seoDescription: payload.seoDescription != null ? String(payload.seoDescription) : null,
      canonicalPath: payload.canonicalPath != null ? String(payload.canonicalPath) : null,
      isIndexable: Boolean(payload.isIndexable),
      kind: String(payload.kind || 'VENUE'),
      pageStatus: String(payload.pageStatus || 'NONE'),
      events: eventsRaw.slice(0, 30).map((item) => {
        const row = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
        return {
          id: String(row.id || ''),
          title: String(row.title || 'Событие'),
          status: String(row.status || '—'),
          priceFrom: row.priceFrom == null ? null : asNumber(row.priceFrom),
        };
      }),
      errors,
    };
  } catch (error) {
    errors.push(`venue detail: ${error instanceof Error ? error.message : 'network error'}`);
    return { ...empty, errors };
  }
}

function emptyVenues(errors: string[]): AdminVenuesListData {
  return {
    page: 1,
    pages: 1,
    limit: DEFAULT_LIMIT,
    total: 0,
    rows: [],
    metrics: { venues: 0, candidates: 0, published: 0, withEvents: 0 },
    errors,
  };
}
