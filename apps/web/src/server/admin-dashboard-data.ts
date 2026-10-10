import { adminApiFetch, resolveAdminApiBase } from '@/server/admin-api-fetch';

export type AdminLaunchMetrics = {
  groupedEvents: number;
  readyForSales: number;
  readyForSeo: number;
  needsAttention: number;
  priceBlocked: number;
  purchaseBlocked: number;
  noImage: number;
  landingMatched: number;
};

export type AdminDashboardMetrics = {
  events: number;
  readyEvents: number;
  reviewEvents: number;
  venues: number;
  categories?: number;
  cities?: number;
  landingRules: number;
  destinations: number;
  launch: AdminLaunchMetrics;
};

export type AdminSourceRow = {
  id: string;
  code: string;
  name: string;
  enabled: boolean;
  status: string;
  healthStatus?: string;
  purchaseReady: boolean;
  events: number;
  venues: number;
  cities: number;
  sessions: number;
  offers: number;
};

export type AdminOrderMetrics = {
  imported: number;
  confirmed: number;
  processing: number;
  failedIntegration: number;
};

export type AdminDashboardPageData = {
  apiBase: string;
  generatedAt: string | null;
  metrics: AdminDashboardMetrics;
  sources: AdminSourceRow[];
  orders: AdminOrderMetrics;
  errors: string[];
};

const EMPTY_LAUNCH: AdminLaunchMetrics = {
  groupedEvents: 0,
  readyForSales: 0,
  readyForSeo: 0,
  needsAttention: 0,
  priceBlocked: 0,
  purchaseBlocked: 0,
  noImage: 0,
  landingMatched: 0,
};

const EMPTY_METRICS: AdminDashboardMetrics = {
  events: 0,
  readyEvents: 0,
  reviewEvents: 0,
  venues: 0,
  landingRules: 0,
  destinations: 0,
  launch: EMPTY_LAUNCH,
};

const EMPTY_ORDERS: AdminOrderMetrics = {
  imported: 0,
  confirmed: 0,
  processing: 0,
  failedIntegration: 0,
};

function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeLaunch(raw: unknown): AdminLaunchMetrics {
  const row = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    groupedEvents: asNumber(row.groupedEvents),
    readyForSales: asNumber(row.readyForSales),
    readyForSeo: asNumber(row.readyForSeo),
    needsAttention: asNumber(row.needsAttention),
    priceBlocked: asNumber(row.priceBlocked),
    purchaseBlocked: asNumber(row.purchaseBlocked),
    noImage: asNumber(row.noImage),
    landingMatched: asNumber(row.landingMatched),
  };
}

function normalizeMetrics(raw: unknown): AdminDashboardMetrics {
  const row = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const launch = normalizeLaunch(row.launch);
  return {
    events: asNumber(row.events, launch.groupedEvents),
    readyEvents: asNumber(row.readyEvents, launch.readyForSeo),
    reviewEvents: asNumber(row.reviewEvents, launch.needsAttention),
    venues: asNumber(row.venues),
    categories: asNumber(row.categories),
    cities: asNumber(row.cities),
    landingRules: asNumber(row.landingRules),
    destinations: asNumber(row.destinations),
    launch,
  };
}

function normalizeSources(raw: unknown): AdminSourceRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, index) => {
    const row = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    return {
      id: String(row.id || row.code || index),
      code: String(row.code || ''),
      name: String(row.name || row.code || 'Источник'),
      enabled: Boolean(row.enabled),
      status: String(row.status || 'incomplete'),
      healthStatus: row.healthStatus != null ? String(row.healthStatus) : undefined,
      purchaseReady: Boolean(row.purchaseReady),
      events: asNumber(row.events),
      venues: asNumber(row.venues),
      cities: asNumber(row.cities),
      sessions: asNumber(row.sessions),
      offers: asNumber(row.offers),
    };
  });
}

function normalizeOrders(raw: unknown): AdminOrderMetrics {
  const row = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    imported: asNumber(row.imported),
    confirmed: asNumber(row.confirmed),
    processing: asNumber(row.processing),
    failedIntegration: asNumber(row.failedIntegration),
  };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function loadAdminDashboardPageData(): Promise<AdminDashboardPageData> {
  const apiBase = resolveAdminApiBase();
  const errors: string[] = [];

  const [dashboardRes, sourcesRes, ordersRes] = await Promise.all([
    adminApiFetch('/api/admin/dashboard').catch((error: unknown) => {
      errors.push(`dashboard: ${error instanceof Error ? error.message : 'network error'}`);
      return null;
    }),
    adminApiFetch('/api/admin/sources').catch((error: unknown) => {
      errors.push(`sources: ${error instanceof Error ? error.message : 'network error'}`);
      return null;
    }),
    adminApiFetch('/api/admin/orders?limit=1').catch((error: unknown) => {
      errors.push(`orders: ${error instanceof Error ? error.message : 'network error'}`);
      return null;
    }),
  ]);

  let metrics = EMPTY_METRICS;
  let generatedAt: string | null = null;
  let sources: AdminSourceRow[] = [];
  let orders = EMPTY_ORDERS;

  if (dashboardRes) {
    if (!dashboardRes.ok) {
      errors.push(`dashboard HTTP ${dashboardRes.status}`);
    } else {
      const payload = (await readJson(dashboardRes)) as {
        generatedAt?: string;
        metrics?: unknown;
      } | null;
      generatedAt = payload?.generatedAt || null;
      metrics = normalizeMetrics(payload?.metrics);
    }
  }

  if (sourcesRes) {
    if (!sourcesRes.ok) {
      errors.push(`sources HTTP ${sourcesRes.status}`);
    } else {
      const payload = (await readJson(sourcesRes)) as { sources?: unknown } | null;
      sources = normalizeSources(payload?.sources);
    }
  }

  if (ordersRes) {
    if (!ordersRes.ok) {
      errors.push(`orders HTTP ${ordersRes.status}`);
    } else {
      const payload = (await readJson(ordersRes)) as { metrics?: unknown } | null;
      orders = normalizeOrders(payload?.metrics);
    }
  }

  return { apiBase, generatedAt, metrics, sources, orders, errors };
}
