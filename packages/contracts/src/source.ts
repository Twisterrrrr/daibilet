import type { SourceCode, Severity } from './common.js';

export type SourceHealthStatus = 'ok' | 'warning' | 'error' | 'paused' | 'unknown';

export type SourceCatalogState = 'live' | 'paused' | 'incomplete' | 'error';

export type SourceSyncMode = 'catalog' | 'orders' | 'api' | 'fixtures' | string;

export interface SourceSyncSummary {
  id?: string;
  sourceCode: SourceCode;
  mode: SourceSyncMode;
  status: 'success' | 'failed' | 'running' | string;
  startedAt?: string | null;
  finishedAt?: string | null;
  lastSuccessAt?: string | null;
  message?: string | null;
  stats?: Record<string, unknown> | null;
}

export interface SourcePurchaseState {
  ready: boolean;
  priceFromRub?: number | null;
  sampleWidgetUrl?: string | null;
  sampleDeeplinkUrl?: string | null;
}

export interface SourceOpenIssue {
  code: string;
  label: string;
  severity: Severity | string;
}

export interface SourceHealth {
  status: SourceHealthStatus;
  enabled: boolean;
  lastSuccessAt?: string | null;
  isStale: boolean;
  staleHours?: number | null;
  consecutiveErrors: number;
  runningRuns: number;
  openIssues: SourceOpenIssue[];
}

export interface AdminSourceDto {
  id: string;
  sourceCode: SourceCode;
  label: string;
  enabled: boolean;
  catalogState: SourceCatalogState;
  catalogSync?: SourceSyncSummary | null;
  ordersSync?: SourceSyncSummary | null;
  lastSync?: SourceSyncSummary | null;
  health: SourceHealth;
  purchase: SourcePurchaseState;
  counts: {
    sourceEvents: number;
    groupedEvents: number;
    venues: number;
    cities: number;
    offers: number;
    sessions: number;
    orders?: number;
  };
}

export interface AdminSourcesDto {
  generatedAt: string;
  sources: AdminSourceDto[];
  metrics: {
    sources: number;
    live: number;
    healthy: number;
    stale: number;
    openIssues: number;
    events: number;
    sessions: number;
  };
}
