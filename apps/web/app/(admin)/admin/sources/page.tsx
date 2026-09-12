import Link from 'next/link';
import type { ReactNode } from 'react';

import { AdminApiErrorBanner } from '@/components/admin/AdminApiErrorBanner';
import { formatAdminDateTime, formatAdminNumber } from '@/lib/admin-ui';
import { triggerSourceSyncAction } from '@/server/admin-source-actions';
import {
  loadAdminSourcesPageData,
  sourceHealthLabel,
  syncStatusLabel,
  type AdminSourceRow,
} from '@/server/admin-sources-data';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminSourcesPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const data = await loadAdminSourcesPageData();
  const synced = first(query.synced);
  const stats = first(query.stats);
  const error = first(query.error);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Источники и sync-health</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Live `/api/admin/sources`. Ручной sync TC/Teplohod через POST endpoints.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={triggerSourceSyncAction}>
            <input type="hidden" name="source" value="TICKETSCLOUD" />
            <button
              type="submit"
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Sync Ticketscloud
            </button>
          </form>
          <form action={triggerSourceSyncAction}>
            <input type="hidden" name="source" value="TEPLOHOD" />
            <button
              type="submit"
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Sync Teplohod
            </button>
          </form>
        </div>
      </header>

      <AdminApiErrorBanner errors={data.errors} />

      {synced ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {synced} sync завершён{stats ? `: ${decodeURIComponent(stats)}` : ''}.
        </div>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-800">
          Sync не прошёл: {decodeURIComponent(error)}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Здоровых" value={data.metrics.healthy} />
        <Metric label="Устарело" value={data.metrics.stale} />
        <Metric label="Открытых issues" value={data.metrics.openIssues} />
        <Metric label="Событий / сеансов" valueLabel={`${formatAdminNumber(data.metrics.events)} / ${formatAdminNumber(data.metrics.sessions)}`} />
      </div>

      {data.generatedAt ? (
        <p className="text-xs text-slate-500">Обновлено {formatAdminDateTime(data.generatedAt)}</p>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2">
        {data.sources.map((source) => (
          <SourceCard key={source.id || source.code} source={source} />
        ))}
        {!data.sources.length && !data.errors.length ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-500 lg:col-span-2">
            Источники не загружены.
          </div>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">
          Таблица sync-health
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Источник</th>
                <th className="px-3 py-2 font-medium">Здоровье</th>
                <th className="px-3 py-2 font-medium">Каталог</th>
                <th className="px-3 py-2 font-medium">Покупка</th>
                <th className="px-3 py-2 font-medium">Последний sync</th>
                <th className="px-3 py-2 font-medium">Действие</th>
              </tr>
            </thead>
            <tbody>
              {data.sources.map((source) => (
                <tr key={`row:${source.id}`} className="border-b border-slate-100 align-top">
                  <td className="px-3 py-2">
                    <div className="font-medium text-slate-900">{source.name}</div>
                    <div className="text-xs text-slate-500">{source.code}</div>
                  </td>
                  <td className="px-3 py-2">
                    <Badge>{sourceHealthLabel(source.healthStatus || source.status)}</Badge>
                    <div className="mt-1 text-xs text-slate-500">
                      {source.enabled ? 'включён' : 'выключен'}
                      {source.isStale ? ` · stale ${formatAdminNumber(source.staleHours || 0)} ч` : ''}
                    </div>
                    <Issues issues={source.openIssues} />
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600">
                    <div>{formatAdminNumber(source.events)} карточек</div>
                    <div>{formatAdminNumber(source.rawEvents)} импортных</div>
                    <div>
                      {formatAdminNumber(source.sessions)} сеансов · {formatAdminNumber(source.offers)} офферов
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <Badge tone={source.purchaseReady ? 'success' : 'warning'}>
                      {source.purchaseReady ? 'готова' : 'проверить'}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600">
                    {source.lastSync ? (
                      <>
                        <div>{syncStatusLabel(source.lastSync.status)}</div>
                        <div>{formatAdminDateTime(source.lastSync.finishedAt || source.lastSync.startedAt)}</div>
                        <div>успех: {formatAdminDateTime(source.lastSuccessAt)}</div>
                        {source.lastSync.error ? (
                          <div className="mt-1 max-w-[240px] truncate text-rose-700">{source.lastSync.error}</div>
                        ) : null}
                      </>
                    ) : (
                      <span>синхронизация не найдена</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {(source.code === 'TICKETSCLOUD' || source.code === 'TEPLOHOD') && (
                      <form action={triggerSourceSyncAction}>
                        <input type="hidden" name="source" value={source.code} />
                        <button type="submit" className="text-xs text-sky-700 hover:underline">
                          Sync
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Vite sync-health был alias на Sources. В Next тот же экран:{' '}
        <Link href="/admin/sources" className="underline">
          /admin/sources
        </Link>
        .
      </p>
    </div>
  );
}

function SourceCard({ source }: { source: AdminSourceRow }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">{source.code}</div>
          <h3 className="mt-1 text-base font-semibold text-slate-900">{source.name}</h3>
        </div>
        <Badge tone={source.healthStatus === 'ok' || source.status === 'live' ? 'success' : 'warning'}>
          {sourceHealthLabel(source.healthStatus || source.status)}
        </Badge>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <MiniMetric label="карточек" value={source.events} />
        <MiniMetric label="сеансов" value={source.sessions} />
        <MiniMetric label="площадок" value={source.venues} />
      </div>
      <div className="mt-3 space-y-1 text-xs text-slate-500">
        <div>последний успех: {formatAdminDateTime(source.lastSuccessAt)}</div>
        <div>ошибок подряд: {formatAdminNumber(source.consecutiveErrors)}</div>
        <div>{source.isStale ? `устарело ${formatAdminNumber(source.staleHours || 0)} ч` : 'импорт свежий'}</div>
      </div>
      <Issues issues={source.openIssues} />
    </article>
  );
}

function Metric({
  label,
  value,
  valueLabel,
}: {
  label: string;
  value?: number;
  valueLabel?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="text-xl font-semibold tabular-nums text-slate-900">
        {valueLabel ?? formatAdminNumber(value || 0)}
      </div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
      <div className="text-sm font-semibold tabular-nums text-slate-900">{formatAdminNumber(value)}</div>
      <div className="text-[11px] text-slate-500">{label}</div>
    </div>
  );
}

function Badge({
  children,
  tone = 'default',
}: {
  children: ReactNode;
  tone?: 'default' | 'success' | 'warning';
}) {
  const className =
    tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : tone === 'warning'
        ? 'border-amber-200 bg-amber-50 text-amber-900'
        : 'border-slate-200 bg-slate-50 text-slate-700';
  return (
    <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}

function Issues({ issues }: { issues: AdminSourceRow['openIssues'] }) {
  if (!issues.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {issues.slice(0, 4).map((issue) => (
        <span
          key={issue.code}
          className={`rounded-md border px-2 py-0.5 text-[11px] ${
            issue.severity === 'high'
              ? 'border-amber-300 bg-amber-50 text-amber-900'
              : 'border-slate-200 bg-white text-slate-600'
          }`}
        >
          {issue.label}
        </span>
      ))}
    </div>
  );
}
