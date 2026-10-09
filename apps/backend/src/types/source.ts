import type { SourceCode, Severity } from './common.js';

export type SourceHealthStatus = 'ok' | 'warning' | 'error' | 'unknown';

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
  id?: string;
  sourceCode: SourceCode;
  label: string;
  enabled: boolean;
  catalogSync?: SourceSyncSummary | null;
  ordersSync?: SourceSyncSummary | null;
  lastSync?: SourceSyncSummary | null;
  health: SourceHealth;
  counts: {
    rawEvents?: number;
    groupedEvents?: number;
    venues?: number;
    cities?: number;
    offers?: number;
    sessions?: number;
    orders?: number;
  };
}

