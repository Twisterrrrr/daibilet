import * as React from 'react';
import { ADMIN_API_BASE } from '@/lib/admin-api';
import { AlertTriangle, RefreshCw } from 'lucide-react';

import { DataTableShell, InfoNote, PageHeader, SourceBadge, StatusBadge } from '@/components/admin/primitives';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatDateTime, formatMoney, formatNumber } from '@/data';
import type { AdminSourceRow, AdminSourcesPayload } from '@/types';

const API_BASE_URL = ADMIN_API_BASE;

const EMPTY_SOURCES_PAYLOAD: AdminSourcesPayload = {
  generatedAt: new Date().toISOString(),
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
};

const SOURCE_SYNC_CONFIG = {
  TICKETSCLOUD: {
    label: 'Ticketscloud',
    endpoint: '/api/admin/sources/ticketscloud/sync',
  },
  TEPLOHOD: {
    label: 'Teplohod',
    endpoint: '/api/v1/tep/sync',
  },
} as const;

export function SourcesPage() {
  const [payload, setPayload] = React.useState<AdminSourcesPayload>(() => EMPTY_SOURCES_PAYLOAD);
  const [loading, setLoading] = React.useState(true);
  const [syncingSource, setSyncingSource] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [backendError, setBackendError] = React.useState<string | null>(null);

  const loadSources = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/sources`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setPayload((await response.json()) as AdminSourcesPayload);
      setBackendError(null);
      setNotice(null);
    } catch (error) {
      setBackendError(`Не удалось обновить источники из backend: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadSources();
  }, [loadSources]);

  const syncSource = async (sourceCode: 'TICKETSCLOUD' | 'TEPLOHOD') => {
    const config = sourceCode === 'TEPLOHOD' ? SOURCE_SYNC_CONFIG.TEPLOHOD : SOURCE_SYNC_CONFIG.TICKETSCLOUD;
    setSyncingSource(sourceCode);
    setNotice(null);
    try {
      const response = await fetch(`${API_BASE_URL}${config.endpoint}`, { method: 'POST' });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || `HTTP ${response.status}`);
      setNotice(`${config.label} sync завершен: ${formatSyncStats(body?.stats)}.`);
      await loadSources();
    } catch (error) {
      setNotice(`${config.label} sync не прошел: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSyncingSource(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Источники"
        description="Состояние импорта, расписания и внешней покупки по билетным системам."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => syncSource('TICKETSCLOUD')} disabled={Boolean(syncingSource)}>
              <RefreshCw className={`mr-2 h-4 w-4 ${syncingSource === 'TICKETSCLOUD' ? 'animate-spin' : ''}`} />
              Синхронизировать TC
            </Button>
            <Button type="button" variant="outline" onClick={() => syncSource('TEPLOHOD')} disabled={Boolean(syncingSource)}>
              <RefreshCw className={`mr-2 h-4 w-4 ${syncingSource === 'TEPLOHOD' ? 'animate-spin' : ''}`} />
              Синхронизировать Teplohod
            </Button>
          </div>
        }
        meta={
          <>
            <StatusBadge status="live" label={`${formatNumber(payload.metrics.healthy ?? payload.metrics.live)} здоровых`} />
            {payload.metrics.stale ? <StatusBadge status="error" label={`${formatNumber(payload.metrics.stale)} устарело`} /> : null}
            <span className="text-xs text-muted-foreground">
              {formatNumber(payload.metrics.events)} событий · {formatNumber(payload.metrics.sessions)} сеансов
            </span>
          </>
        }
      />

      <div className="mb-4">
        <InfoNote>
          В колонке "событий" считаем наши сгруппированные карточки. Сырые записи Ticketscloud и Teplohod остаются видны отдельно как импортные записи и сеансы.
        </InfoNote>
        {notice ? <div className="mt-2 rounded-lg border border-border bg-surface-muted px-3 py-2 text-xs text-muted-foreground">{notice}</div> : null}
      </div>

      {backendError ? (
        <Card className="border-destructive/30 bg-destructive/5 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
            <div>
              <h2 className="text-sm font-semibold text-foreground">Backend недоступен</h2>
              <p className="mt-1 text-sm text-muted-foreground">{backendError}</p>
              <Button type="button" className="mt-4" variant="outline" onClick={() => loadSources()} disabled={loading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Повторить
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <>
          <div className="mb-4 grid gap-3 lg:grid-cols-2">
            {payload.sources.map((source) => (
              <SourceSummaryCard key={`summary:${source.id}`} source={source} />
            ))}
          </div>

          <DataTableShell
            loading={loading}
            columns={['Источник', 'Здоровье', 'Каталог', 'Расписание', 'Покупка', 'Последний sync']}
            empty={!payload.sources.length ? <div className="p-6 text-sm text-muted-foreground">Источники пока не загружены.</div> : null}
          >
            {payload.sources.map((source) => (
              <tr key={source.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
                <td className="px-4 py-3 align-top">
                  <SourceBadge source={sourceBadge(source.code)} />
                  <div className="mt-2 font-medium text-foreground">{source.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{source.code}</div>
                </td>
                <td className="px-4 py-3 align-top">
                  <StatusBadge status={sourceHealthBadge(source.healthStatus || source.status)} label={sourceHealthLabel(source.healthStatus || source.status)} />
                  <div className="mt-2 text-xs text-muted-foreground">{source.enabled ? 'включен' : 'выключен'}</div>
                  <IssueBadges issues={source.openIssues} limit={3} />
                </td>
                <td className="px-4 py-3 align-top text-sm">
                  <MetricLine label="событий" value={source.events} />
                  <MetricLine label="импортных записей" value={source.rawEvents ?? source.events} />
                  <MetricLine label="городов" value={source.cities} />
                  <MetricLine label="площадок" value={source.venues} />
                </td>
                <td className="px-4 py-3 align-top text-sm">
                  <MetricLine label="сеансов" value={source.sessions} />
                  <MetricLine label="офферов" value={source.offers} />
                  <div className="mt-1 text-xs text-muted-foreground">{formatMoney(source.priceFrom)}</div>
                </td>
                <td className="px-4 py-3 align-top">
                  <StatusBadge status={source.purchaseReady ? 'live' : 'incomplete'} label={source.purchaseReady ? 'готова' : 'проверить'} />
                  <div className="mt-2 max-w-[220px] truncate text-xs text-muted-foreground">
                    {source.sampleWidgetUrl || source.sampleDeeplinkUrl || (source.code === 'TEPLOHOD' ? 'teplohod widget.js' : 'нет ссылки')}
                  </div>
                </td>
                <td className="px-4 py-3 align-top text-sm">
                  {source.lastSync ? (
                    <>
                      <StatusBadge status={sourceStatus(source.lastSync.status || '')} label={source.lastSync.status || 'sync'} />
                      <div className="mt-2 text-xs text-muted-foreground">{formatDateTime(source.lastSync.finishedAt || source.lastSync.startedAt)}</div>
                      <div className="mt-1 max-w-[240px] truncate text-xs text-muted-foreground">{source.lastSync.mode}</div>
                      <div className="mt-1 text-xs text-muted-foreground">успешный: {source.lastSuccessAt ? formatDateTime(source.lastSuccessAt) : 'нет'}</div>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">sync не найден</span>
                  )}
                </td>
              </tr>
            ))}
          </DataTableShell>
        </>
      )}
    </div>
  );
}

function SourceSummaryCard({ source }: { source: AdminSourceRow }) {
  const isTeplohod = sourceBadge(source.code) === 'teplohod';
  return (
    <Card className="border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <SourceBadge source={sourceBadge(source.code)} />
          <h2 className="mt-3 text-base font-semibold text-foreground">{source.name}</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {isTeplohod
              ? 'API + внешний виджет Teplohod.info. Расписание импортируется как слоты внутри карточки события.'
              : 'gRPC импорт Ticketscloud. Повторяющиеся события считаются одной карточкой, слоты остаются в расписании.'}
          </p>
        </div>
        <StatusBadge status={sourceHealthBadge(source.healthStatus || source.status)} label={sourceHealthLabel(source.healthStatus || source.status)} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <SourceCardMetric label="карточек" value={source.events} />
        <SourceCardMetric label="сеансов" value={source.sessions} />
        <SourceCardMetric label="площадок" value={source.venues} />
      </div>

      <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
        <span>успешный sync: {source.lastSuccessAt ? formatDateTime(source.lastSuccessAt) : 'нет'}</span>
        <span>ошибок подряд: {formatNumber(source.consecutiveErrors ?? 0)}</span>
        <span>{source.isStale ? `устарело ${formatNumber(source.staleHours)} ч` : 'импорт свежий'}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Badge variant="outline">импорт: {formatNumber(source.rawEvents ?? source.events)}</Badge>
        <Badge variant="outline">{source.purchaseReady ? 'покупка готова' : 'покупку проверить'}</Badge>
        {isTeplohod ? <Badge variant="outline">widget.js</Badge> : <Badge variant="outline">TC widget</Badge>}
      </div>

      <IssueBadges issues={source.openIssues} limit={4} />
    </Card>
  );
}

function SourceCardMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-surface-muted p-3">
      <div className="text-lg font-semibold text-foreground">{formatNumber(value)}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function IssueBadges({ issues, limit = 3 }: { issues?: AdminSourceRow['openIssues']; limit?: number }) {
  if (!issues?.length) return null;
  const visible = issues.slice(0, limit);
  const hidden = Math.max(0, issues.length - visible.length);
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {visible.map((issue) => (
        <Badge key={issue.code} variant="outline" className={issue.severity === 'high' ? 'border-amber-300 bg-amber-50 text-amber-900' : ''}>
          {issue.label}
        </Badge>
      ))}
      {hidden ? <Badge variant="outline">+{hidden}</Badge> : null}
    </div>
  );
}

function formatSyncStats(stats?: Record<string, unknown> | null): string {
  const events = Number(stats?.importedEvents ?? stats?.events ?? stats?.createdEvents ?? 0);
  const sessions = Number(stats?.sessions ?? stats?.importedSessions ?? 0);
  const offers = Number(stats?.offers ?? stats?.importedOffers ?? 0);
  const parts = [`${formatNumber(events)} событий`];
  if (sessions) parts.push(`${formatNumber(sessions)} сеансов`);
  if (offers) parts.push(`${formatNumber(offers)} офферов`);
  return parts.join(', ');
}

function MetricLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{formatNumber(value)}</span>
    </div>
  );
}

function sourceBadge(code: string): 'ticketscloud' | 'teplohod' | 'manual' {
  const normalized = code.toUpperCase();
  if (normalized.includes('TEPLOHOD')) return 'teplohod';
  if (normalized.includes('TICKETSCLOUD') || normalized.includes('TC')) return 'ticketscloud';
  return 'manual';
}

function sourceStatus(status: string): 'live' | 'paused' | 'incomplete' | 'error' {
  const normalized = status.toLowerCase();
  if (normalized.includes('success') || normalized.includes('live')) return 'live';
  if (normalized.includes('paused')) return 'paused';
  if (normalized.includes('error') || normalized.includes('fail') || normalized.includes('blocked')) return 'error';
  return 'incomplete';
}

function sourceHealthBadge(status: string): 'live' | 'paused' | 'incomplete' | 'error' {
  const normalized = status.toLowerCase();
  if (normalized === 'ok' || normalized === 'live') return 'live';
  if (normalized === 'paused') return 'paused';
  if (normalized === 'error') return 'error';
  return 'incomplete';
}

function sourceHealthLabel(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized === 'ok') return 'здоров';
  if (normalized === 'warning') return 'есть вопросы';
  if (normalized === 'error') return 'ошибка';
  if (normalized === 'paused') return 'пауза';
  return status;
}
