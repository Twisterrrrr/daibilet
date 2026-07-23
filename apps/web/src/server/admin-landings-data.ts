import { asNumber } from '@/lib/admin-ui';
import { adminApiFetch } from '@/server/admin-api-fetch';

export type AdminLandingListRow = {
  slug: string;
  title: string;
  status: string;
  events: number;
  readyEvents: number;
  reviewEvents: number;
  blockedEvents: number;
  pinnedEvents: number;
  excludedEvents: number;
  city: string | null;
  priceFrom: number | null;
};

export type AdminLandingsListData = {
  page: number;
  pages: number;
  limit: number;
  total: number;
  rows: AdminLandingListRow[];
  metrics: {
    ready: number;
    seed: number;
    empty: number;
    matchedEvents: number;
  };
  errors: string[];
};

export type AdminLandingDetailData = {
  slug: string;
  title: string;
  subtitle: string | null;
  status: string;
  description: string | null;
  seoH1: string;
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string;
  isIndexable: boolean;
  eventsTotal: number;
  metrics: {
    pinnedEvents: number;
    excludedEvents: number;
    autoEvents: number;
    effectiveEvents: number;
  };
  sampleEvents: Array<{
    id: string;
    title: string;
    city: string;
    venue: string;
    readiness: string;
    priceFrom: number | null;
    manualStatus: string | null;
    isAutoMatch: boolean;
    groupEventIds: string[];
  }>;
  excludedSample: Array<{
    id: string;
    title: string;
    city: string;
    venue: string;
    manualStatus: string | null;
    groupEventIds: string[];
  }>;
  errors: string[];
};

const DEFAULT_LIMIT = 80;

function normalizeLandingRow(raw: unknown): AdminLandingListRow {
  const row = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    slug: String(row.slug || ''),
    title: String(row.title || row.slug || 'Лендинг'),
    status: String(row.status || 'seed'),
    events: asNumber(row.events),
    readyEvents: asNumber(row.readyEvents),
    reviewEvents: asNumber(row.reviewEvents),
    blockedEvents: asNumber(row.blockedEvents),
    pinnedEvents: asNumber(row.pinnedEvents),
    excludedEvents: asNumber(row.excludedEvents),
    city: row.city != null ? String(row.city) : null,
    priceFrom: row.priceFrom == null ? null : asNumber(row.priceFrom),
  };
}

export async function loadAdminLandingsList(searchParams: {
  q?: string;
  status?: string;
  page?: string;
}): Promise<AdminLandingsListData> {
  const errors: string[] = [];
  const params = new URLSearchParams();
  params.set('limit', String(DEFAULT_LIMIT));
  params.set('page', String(Math.max(1, asNumber(searchParams.page, 1))));
  params.set('status', searchParams.status?.trim() || 'all');
  if (searchParams.q?.trim()) params.set('q', searchParams.q.trim());

  try {
    const response = await adminApiFetch(`/api/admin/landings?${params.toString()}`);
    if (!response.ok) {
      errors.push(`landings HTTP ${response.status}`);
      return emptyLandings(errors);
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
      rows: Array.isArray(payload.rows) ? payload.rows.map(normalizeLandingRow) : [],
      metrics: {
        ready: asNumber(metricsRaw.ready),
        seed: asNumber(metricsRaw.seed),
        empty: asNumber(metricsRaw.empty),
        matchedEvents: asNumber(metricsRaw.matchedEvents),
      },
      errors,
    };
  } catch (error) {
    errors.push(`landings: ${error instanceof Error ? error.message : 'network error'}`);
    return emptyLandings(errors);
  }
}

export async function loadAdminLandingDetail(slug: string): Promise<AdminLandingDetailData> {
  const errors: string[] = [];
  const empty: AdminLandingDetailData = {
    slug,
    title: slug,
    subtitle: null,
    status: '—',
    description: null,
    seoH1: '',
    seoTitle: '',
    seoDescription: '',
    canonicalUrl: `/landings/${slug}`,
    isIndexable: false,
    eventsTotal: 0,
    metrics: { pinnedEvents: 0, excludedEvents: 0, autoEvents: 0, effectiveEvents: 0 },
    sampleEvents: [],
    excludedSample: [],
    errors,
  };

  try {
    const response = await adminApiFetch(
      `/api/admin/landings/${encodeURIComponent(slug)}?limit=40&page=1&excludedLimit=20&excludedPage=1`,
    );
    if (!response.ok) {
      errors.push(`landing detail HTTP ${response.status}`);
      return { ...empty, errors };
    }
    const payload = (await response.json()) as Record<string, unknown>;
    const landing = (payload.landing && typeof payload.landing === 'object'
      ? payload.landing
      : {}) as Record<string, unknown>;
    const rule = (payload.rule && typeof payload.rule === 'object' ? payload.rule : {}) as Record<
      string,
      unknown
    >;
    const seo = (payload.seo && typeof payload.seo === 'object' ? payload.seo : {}) as Record<
      string,
      unknown
    >;
    const metricsRaw = (payload.metrics && typeof payload.metrics === 'object'
      ? payload.metrics
      : {}) as Record<string, unknown>;
    const rows = Array.isArray(payload.events) ? payload.events : [];
    const excludedRows = Array.isArray(payload.excludedEvents) ? payload.excludedEvents : [];

    const mapEvent = (item: unknown) => {
      const row = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
      const groupEventIds = Array.isArray(row.groupEventIds)
        ? row.groupEventIds.map((id) => String(id))
        : [String(row.id || '')].filter(Boolean);
      return {
        id: String(row.id || ''),
        title: String(row.title || 'Событие'),
        city: String(row.city || '—'),
        venue: String(row.venue || '—'),
        readiness: String(row.readiness || '—'),
        priceFrom: row.priceFrom == null ? null : asNumber(row.priceFrom),
        manualStatus: row.manualStatus != null ? String(row.manualStatus) : null,
        isAutoMatch: Boolean(row.isAutoMatch),
        groupEventIds,
      };
    };

    return {
      slug: String(payload.slug || slug),
      title: String(landing.title || rule.title || slug),
      subtitle:
        landing.subtitle != null
          ? String(landing.subtitle)
          : rule.subtitle != null
            ? String(rule.subtitle)
            : null,
      status: String(landing.status || 'REVIEW'),
      description: landing.description != null ? String(landing.description) : null,
      seoH1: String(seo.h1 || landing.seoH1 || ''),
      seoTitle: String(seo.title || landing.seoTitle || ''),
      seoDescription: String(seo.description || landing.seoDescription || ''),
      canonicalUrl: String(seo.canonicalUrl || landing.canonicalUrl || `/landings/${slug}`),
      isIndexable: Boolean(
        landing.isIndexable ??
          (typeof seo.robots === 'string' ? String(seo.robots).includes('index') : false),
      ),
      eventsTotal: asNumber(payload.total, rows.length),
      metrics: {
        pinnedEvents: asNumber(metricsRaw.pinnedEvents),
        excludedEvents: asNumber(metricsRaw.excludedEvents),
        autoEvents: asNumber(metricsRaw.autoEvents),
        effectiveEvents: asNumber(metricsRaw.effectiveEvents),
      },
      sampleEvents: rows.slice(0, 40).map(mapEvent),
      excludedSample: excludedRows.slice(0, 20).map((item) => {
        const mapped = mapEvent(item);
        return {
          id: mapped.id,
          title: mapped.title,
          city: mapped.city,
          venue: mapped.venue,
          manualStatus: mapped.manualStatus,
          groupEventIds: mapped.groupEventIds,
        };
      }),
      errors,
    };
  } catch (error) {
    errors.push(`landing detail: ${error instanceof Error ? error.message : 'network error'}`);
    return { ...empty, errors };
  }
}

function emptyLandings(errors: string[]): AdminLandingsListData {
  return {
    page: 1,
    pages: 1,
    limit: DEFAULT_LIMIT,
    total: 0,
    rows: [],
    metrics: { ready: 0, seed: 0, empty: 0, matchedEvents: 0 },
    errors,
  };
}

export type AdminLandingCandidateRow = {
  id: string;
  title: string;
  city: string;
  venue: string;
  readiness: string;
  manualStatus: string | null;
  isAutoMatch: boolean;
  groupEventIds: string[];
};

export async function loadAdminLandingCandidates(
  slug: string,
  query: string,
): Promise<{ rows: AdminLandingCandidateRow[]; errors: string[] }> {
  const errors: string[] = [];
  const q = query.trim();
  if (!q) return { rows: [], errors };

  try {
    const params = new URLSearchParams();
    params.set('q', q);
    params.set('limit', '20');
    const response = await adminApiFetch(
      `/api/admin/landings/${encodeURIComponent(slug)}/candidates?${params.toString()}`,
    );
    if (!response.ok) {
      errors.push(`landing candidates HTTP ${response.status}`);
      return { rows: [], errors };
    }
    const payload = (await response.json()) as Record<string, unknown>;
    const rows = Array.isArray(payload.rows)
      ? payload.rows.map((item) => {
          const row = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
          const groupEventIds = Array.isArray(row.groupEventIds)
            ? row.groupEventIds.map((id) => String(id))
            : [String(row.id || '')].filter(Boolean);
          return {
            id: String(row.id || ''),
            title: String(row.title || 'Событие'),
            city: String(row.city || '—'),
            venue: String(row.venue || '—'),
            readiness: String(row.readiness || '—'),
            manualStatus: row.manualStatus != null ? String(row.manualStatus) : null,
            isAutoMatch: Boolean(row.isAutoMatch),
            groupEventIds,
          };
        })
      : [];
    return { rows, errors };
  } catch (error) {
    errors.push(`landing candidates: ${error instanceof Error ? error.message : 'network error'}`);
    return { rows: [], errors };
  }
}
