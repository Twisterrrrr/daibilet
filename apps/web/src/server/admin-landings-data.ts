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
  status: string;
  description: string | null;
  eventsTotal: number;
  sampleEvents: Array<{
    id: string;
    title: string;
    city: string;
    venue: string;
    readiness: string;
    priceFrom: number | null;
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
  try {
    const response = await adminApiFetch(
      `/api/admin/landings/${encodeURIComponent(slug)}?limit=20&page=1`,
    );
    if (!response.ok) {
      errors.push(`landing detail HTTP ${response.status}`);
      return {
        slug,
        title: slug,
        status: '—',
        description: null,
        eventsTotal: 0,
        sampleEvents: [],
        errors,
      };
    }
    const payload = (await response.json()) as Record<string, unknown>;
    const landing = (payload.landing && typeof payload.landing === 'object'
      ? payload.landing
      : {}) as Record<string, unknown>;
    const rule = (payload.rule && typeof payload.rule === 'object' ? payload.rule : {}) as Record<
      string,
      unknown
    >;
    const rows = Array.isArray(payload.events) ? payload.events : [];

    return {
      slug: String(payload.slug || slug),
      title: String(landing.title || rule.title || slug),
      status: String(landing.status || '—'),
      description:
        landing.description != null
          ? String(landing.description)
          : rule.subtitle != null
            ? String(rule.subtitle)
            : null,
      eventsTotal: asNumber(payload.total, rows.length),
      sampleEvents: rows.slice(0, 20).map((item) => {
        const row = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
        return {
          id: String(row.id || ''),
          title: String(row.title || 'Событие'),
          city: String(row.city || '—'),
          venue: String(row.venue || '—'),
          readiness: String(row.readiness || '—'),
          priceFrom: row.priceFrom == null ? null : asNumber(row.priceFrom),
        };
      }),
      errors,
    };
  } catch (error) {
    errors.push(`landing detail: ${error instanceof Error ? error.message : 'network error'}`);
    return {
      slug,
      title: slug,
      status: '—',
      description: null,
      eventsTotal: 0,
      sampleEvents: [],
      errors,
    };
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
