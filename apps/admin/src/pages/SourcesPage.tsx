import * as React from 'react';
import { RefreshCw } from 'lucide-react';

import { DataTableShell, InfoNote, PageHeader, SourceBadge, StatusBadge } from '@/components/admin/primitives';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { adminData, formatDateTime, formatMoney, formatNumber } from '@/data';
import type { AdminSourceRow, AdminSourcesPayload } from '@/types';

const API_BASE_URL =
  ((import.meta as ImportMeta & { env?: { VITE_DAIBILET_API_URL?: string } }).env?.VITE_DAIBILET_API_URL as string | undefined) ||
  'http://127.0.0.1:4000';

export function SourcesPage() {
  const [payload, setPayload] = React.useState<AdminSourcesPayload>(() => buildFallbackSourcesPayload());
  const [loading, setLoading] = React.useState(true);
  const [syncing, setSyncing] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);

  const loadSources = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/sources`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setPayload((await response.json()) as AdminSourcesPayload);
      setNotice(null);
    } catch (error) {
      setNotice(`Не удалось обновить источники из backend: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadSources();
  }, [loadSources]);

  const syncTeplohod = async () => {
    setSyncing(true);
    setNotice(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/tep/sync`, { method: 'POST' });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || `HTTP ${response.status}`);
      setNotice(`Teplohod sync завершен: ${formatNumber(body?.stats?.importedEvents ?? 0)} событий, ${formatNumber(body?.stats?.sessions ?? 0)} сеансов.`);
      await loadSources();
    } catch (error) {
      setNotice(`Teplohod sync не прошел: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Источники"
        description="Состояние импорта, расписания и внешней покупки по билетным системам."
        actions={
          <Button type="button" variant="outline" onClick={syncTeplohod} disabled={syncing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            Синхронизировать Teplohod
          </Button>
        }
        meta={
          <>
            <StatusBadge status="live" label={`${formatNumber(payload.metrics.live)} активных`} />
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

      <div className="mb-4 grid gap-3 lg:grid-cols-2">
        {payload.sources.map((source) => (
          <SourceSummaryCard key={`summary:${source.id}`} source={source} />
        ))}
      </div>

      <DataTableShell
        loading={loading}
        columns={['Источник', 'Статус', 'Каталог', 'Расписание', 'Покупка', 'Последний sync']}
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
              <StatusBadge status={sourceStatus(source.status)} label={source.status} />
              <div className="mt-2 text-xs text-muted-foreground">{source.enabled ? 'enabled' : 'disabled'}</div>
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
                </>
              ) : (
                <span className="text-xs text-muted-foreground">sync не найден</span>
              )}
            </td>
          </tr>
        ))}
      </DataTableShell>
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
        <StatusBadge status={sourceStatus(source.status)} label={source.status} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <SourceCardMetric label="карточек" value={source.events} />
        <SourceCardMetric label="сеансов" value={source.sessions} />
        <SourceCardMetric label="площадок" value={source.venues} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Badge variant="outline">импорт: {formatNumber(source.rawEvents ?? source.events)}</Badge>
        <Badge variant="outline">{source.purchaseReady ? 'покупка готова' : 'покупку проверить'}</Badge>
        {isTeplohod ? <Badge variant="outline">widget.js</Badge> : <Badge variant="outline">TC widget</Badge>}
      </div>
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

function buildFallbackSourcesPayload(): AdminSourcesPayload {
  const rows = adminData.eventRows;
  const grouped = new Map<string, AdminSourceRow>();

  for (const row of rows) {
    const code = row.offerSourceCode || row.source || 'TICKETSCLOUD';
    const current =
      grouped.get(code) ||
      ({
        id: code,
        code,
        name: code === 'TEPLOHOD' ? 'Teplohod.info' : code === 'TICKETSCLOUD' ? 'Ticketscloud' : code,
        enabled: true,
        status: 'incomplete',
        purchaseReady: false,
        events: 0,
        rawEvents: 0,
        venues: 0,
        cities: 0,
        sessions: 0,
        offers: 0,
      } satisfies AdminSourceRow);
    current.events += 1;
    current.rawEvents = (current.rawEvents ?? 0) + (row.groupedEventsCount || 1);
    current.sessions += row.slotCount || 0;
    current.offers += row.offerPriceRub ? 1 : 0;
    current.purchaseReady = current.purchaseReady || Boolean(row.offerWidgetUrl || row.offerDeeplinkUrl || code === 'TEPLOHOD');
    grouped.set(code, current);
  }

  const sources = Array.from(grouped.values()).map((source) => ({
    ...source,
    status: source.events > 0 && source.purchaseReady ? 'live' : 'incomplete',
  }));

  return {
    generatedAt: adminData.generatedAt,
    sources,
    metrics: {
      sources: sources.length,
      live: sources.filter((source) => source.status === 'live').length,
      events: sources.reduce((sum, source) => sum + source.events, 0),
      sessions: sources.reduce((sum, source) => sum + source.sessions, 0),
    },
  };
}
