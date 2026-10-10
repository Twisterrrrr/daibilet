import { asNumber } from '@/lib/admin-ui';
import { adminApiFetch } from '@/server/admin-api-fetch';

export type AdminSourceIssue = {
  code: string;
  label: string;
  severity: string;
};

export type AdminSourceRow = {
  id: string;
  code: string;
  name: string;
  enabled: boolean;
  status: string;
  healthStatus: string;
  purchaseReady: boolean;
  events: number;
  rawEvents: number;
  venues: number;
  cities: number;
  sessions: number;
  offers: number;
  priceFrom: number | null;
  sampleWidgetUrl: string | null;
  sampleDeeplinkUrl: string | null;
  lastSuccessAt: string | null;
  isStale: boolean;
  staleHours: number | null;
  consecutiveErrors: number;
  runningRuns: number;
  openIssues: AdminSourceIssue[];
  lastSync: {
    status: string | null;
    mode: string | null;
    startedAt: string | null;
    finishedAt: string | null;
    error: string | null;
  } | null;
};

export type AdminSourcesPageData = {
  generatedAt: string | null;
  sources: AdminSourceRow[];
  metrics: {
    sources: number;
    live: number;
    healthy: number;
    stale: number;
    openIssues: number;
    events: number;
    sessions: number;
  };
  errors: string[];
};

function normalizeIssue(raw: unknown): AdminSourceIssue {
  const row = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    code: String(row.code || 'issue'),
    label: String(row.label || row.code || 'проблема'),
    severity: String(row.severity || 'medium'),
  };
}

function normalizeSource(raw: unknown): AdminSourceRow {
  const row = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const lastSyncRaw =
    row.lastSync && typeof row.lastSync === 'object' ? (row.lastSync as Record<string, unknown>) : null;
  return {
    id: String(row.id || row.code || ''),
    code: String(row.code || ''),
    name: String(row.name || row.code || 'Источник'),
    enabled: Boolean(row.enabled),
    status: String(row.status || 'incomplete'),
    healthStatus: String(row.healthStatus || row.status || 'incomplete'),
    purchaseReady: Boolean(row.purchaseReady),
    events: asNumber(row.events),
    rawEvents: asNumber(row.rawEvents, asNumber(row.events)),
    venues: asNumber(row.venues),
    cities: asNumber(row.cities),
    sessions: asNumber(row.sessions),
    offers: asNumber(row.offers),
    priceFrom: row.priceFrom == null ? null : asNumber(row.priceFrom),
    sampleWidgetUrl: row.sampleWidgetUrl != null ? String(row.sampleWidgetUrl) : null,
    sampleDeeplinkUrl: row.sampleDeeplinkUrl != null ? String(row.sampleDeeplinkUrl) : null,
    lastSuccessAt: row.lastSuccessAt != null ? String(row.lastSuccessAt) : null,
    isStale: Boolean(row.isStale),
    staleHours: row.staleHours == null ? null : asNumber(row.staleHours),
    consecutiveErrors: asNumber(row.consecutiveErrors),
    runningRuns: asNumber(row.runningRuns),
    openIssues: Array.isArray(row.openIssues) ? row.openIssues.map(normalizeIssue) : [],
    lastSync: lastSyncRaw
      ? {
          status: lastSyncRaw.status != null ? String(lastSyncRaw.status) : null,
          mode: lastSyncRaw.mode != null ? String(lastSyncRaw.mode) : null,
          startedAt: lastSyncRaw.startedAt != null ? String(lastSyncRaw.startedAt) : null,
          finishedAt: lastSyncRaw.finishedAt != null ? String(lastSyncRaw.finishedAt) : null,
          error: lastSyncRaw.error != null ? String(lastSyncRaw.error) : null,
        }
      : null,
  };
}

export async function loadAdminSourcesPageData(): Promise<AdminSourcesPageData> {
  const errors: string[] = [];
  try {
    const response = await adminApiFetch('/api/admin/sources');
    if (!response.ok) {
      errors.push(`sources HTTP ${response.status}`);
      return emptySources(errors);
    }
    const payload = (await response.json()) as Record<string, unknown>;
    const metricsRaw =
      payload.metrics && typeof payload.metrics === 'object'
        ? (payload.metrics as Record<string, unknown>)
        : {};
    const sources = Array.isArray(payload.sources) ? payload.sources.map(normalizeSource) : [];
    return {
      generatedAt: payload.generatedAt != null ? String(payload.generatedAt) : null,
      sources,
      metrics: {
        sources: asNumber(metricsRaw.sources, sources.length),
        live: asNumber(metricsRaw.live),
        healthy: asNumber(metricsRaw.healthy, asNumber(metricsRaw.live)),
        stale: asNumber(metricsRaw.stale),
        openIssues: asNumber(metricsRaw.openIssues),
        events: asNumber(metricsRaw.events),
        sessions: asNumber(metricsRaw.sessions),
      },
      errors,
    };
  } catch (error) {
    errors.push(`sources: ${error instanceof Error ? error.message : 'network error'}`);
    return emptySources(errors);
  }
}

function emptySources(errors: string[]): AdminSourcesPageData {
  return {
    generatedAt: null,
    sources: [],
    metrics: {
      sources: 0,
      live: 0,
      healthy: 0,
      stale: 0,
      openIssues: 0,
      events: 0,
      sessions: 0,
    },
    errors,
  };
}

export function sourceHealthLabel(status?: string | null) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'ok' || normalized === 'live') return 'в работе';
  if (normalized === 'warning') return 'есть вопросы';
  if (normalized === 'error') return 'ошибка';
  if (normalized === 'paused') return 'пауза';
  if (normalized === 'incomplete') return 'неполно';
  return status || 'статус';
}

export function syncStatusLabel(status?: string | null) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'success' || normalized === 'ok' || normalized === 'completed') return 'успех';
  if (normalized === 'running' || normalized === 'started') return 'идёт';
  if (normalized === 'failed' || normalized === 'error') return 'ошибка';
  return status || '—';
}
