import { asNumber } from '@/lib/admin-ui';
import { adminApiFetch } from '@/server/admin-api-fetch';

export type AdminCityListRow = {
  id: string;
  name: string;
  slug: string | null;
  type: string;
  events: number;
  venues: number;
};

export type AdminCitiesListData = {
  page: number;
  pages: number;
  limit: number;
  total: number;
  rows: AdminCityListRow[];
  metrics: {
    destinations: number;
    cities: number;
    regions: number;
    events: number;
    venues: number;
  };
  errors: string[];
};

export type AdminCityDetailData = {
  id: string;
  found: boolean;
  title: string;
  slug: string;
  sourceTitle: string | null;
  introTitle: string | null;
  introText: string | null;
  heroImageUrl: string | null;
  seoH1: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalPath: string | null;
  isDestination: boolean;
  errors: string[];
};

const DEFAULT_LIMIT = 80;

function normalizeCityRow(raw: unknown): AdminCityListRow {
  const row = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    id: String(row.id || row.slug || ''),
    name: String(row.name || row.title || 'Город'),
    slug: row.slug != null ? String(row.slug) : row.sourceSlug != null ? String(row.sourceSlug) : null,
    type: String(row.type || 'city'),
    events: asNumber(row.events),
    venues: asNumber(row.venues),
  };
}

export async function loadAdminCitiesList(searchParams: {
  q?: string;
  page?: string;
}): Promise<AdminCitiesListData> {
  const errors: string[] = [];
  const params = new URLSearchParams();
  params.set('limit', String(DEFAULT_LIMIT));
  params.set('page', String(Math.max(1, asNumber(searchParams.page, 1))));
  if (searchParams.q?.trim()) params.set('q', searchParams.q.trim());

  try {
    const response = await adminApiFetch(`/api/admin/cities?${params.toString()}`);
    if (!response.ok) {
      errors.push(`cities HTTP ${response.status}`);
      return emptyCities(errors);
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
      rows: Array.isArray(payload.rows) ? payload.rows.map(normalizeCityRow) : [],
      metrics: {
        destinations: asNumber(metricsRaw.destinations || payload.total),
        cities: asNumber(metricsRaw.cities),
        regions: asNumber(metricsRaw.regions),
        events: asNumber(metricsRaw.events),
        venues: asNumber(metricsRaw.venues),
      },
      errors,
    };
  } catch (error) {
    errors.push(`cities: ${error instanceof Error ? error.message : 'network error'}`);
    return emptyCities(errors);
  }
}

export async function loadAdminCityDetail(cityId: string): Promise<AdminCityDetailData> {
  const errors: string[] = [];
  const id = cityId.trim();
  const empty: AdminCityDetailData = {
    id,
    found: false,
    title: id,
    slug: '',
    sourceTitle: null,
    introTitle: null,
    introText: null,
    heroImageUrl: null,
    seoH1: null,
    seoTitle: null,
    seoDescription: null,
    canonicalPath: null,
    isDestination: true,
    errors,
  };
  if (!id) return { ...empty, errors: ['missing city id'] };

  try {
    const response = await adminApiFetch(`/api/admin/cities/${encodeURIComponent(id)}`);
    if (!response.ok) {
      errors.push(`city detail HTTP ${response.status}`);
      return { ...empty, errors };
    }
    const payload = (await response.json()) as Record<string, unknown>;
    if (payload.error) {
      errors.push(String(payload.error));
      return { ...empty, errors };
    }
    return {
      id: String(payload.id || id),
      found: true,
      title: String(payload.title || payload.name || id),
      slug: String(payload.slug || ''),
      sourceTitle: payload.sourceTitle != null ? String(payload.sourceTitle) : null,
      introTitle: payload.introTitle != null ? String(payload.introTitle) : null,
      introText: payload.introText != null ? String(payload.introText) : null,
      heroImageUrl: payload.heroImageUrl != null ? String(payload.heroImageUrl) : null,
      seoH1: payload.seoH1 != null ? String(payload.seoH1) : null,
      seoTitle: payload.seoTitle != null ? String(payload.seoTitle) : null,
      seoDescription: payload.seoDescription != null ? String(payload.seoDescription) : null,
      canonicalPath: payload.canonicalPath != null ? String(payload.canonicalPath) : null,
      isDestination: payload.isDestination !== false,
      errors,
    };
  } catch (error) {
    errors.push(`city detail: ${error instanceof Error ? error.message : 'network error'}`);
    return { ...empty, errors };
  }
}

function emptyCities(errors: string[]): AdminCitiesListData {
  return {
    page: 1,
    pages: 1,
    limit: DEFAULT_LIMIT,
    total: 0,
    rows: [],
    metrics: { destinations: 0, cities: 0, regions: 0, events: 0, venues: 0 },
    errors,
  };
}
