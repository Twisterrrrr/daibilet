import Link from 'next/link';

import { AdminApiErrorBanner } from '@/components/admin/AdminApiErrorBanner';
import { AdminPagination } from '@/components/admin/AdminPagination';
import { formatAdminNumber, PUBLIC_SITE_BASE } from '@/lib/admin-ui';
import { loadAdminLandingsList } from '@/server/admin-landings-data';

export const dynamic = 'force-dynamic';

const STATUS_FILTERS = [
  { id: 'all', label: 'Все' },
  { id: 'ready', label: 'Готово' },
  { id: 'seed', label: 'Черновик' },
  { id: 'empty', label: 'Пусто' },
];

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function statusLabel(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === 'ready') return 'готово';
  if (normalized === 'seed') return 'черновик';
  if (normalized === 'empty') return 'пусто';
  return status || '—';
}

export default async function AdminLandingsPage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const q = first(raw.q) || '';
  const status = first(raw.status) || 'all';
  const page = first(raw.page) || '1';
  const current = { q: q || undefined, status, page };

  const data = await loadAdminLandingsList({ q, status, page });

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Лендинги</h2>
          <p className="mt-1 text-sm text-slate-600">
            SEO, pin/exclude, candidates и blocks preview - в Next detail.
          </p>
        </div>
      </header>

      <AdminApiErrorBanner errors={data.errors} />

      <div className="grid gap-3 sm:grid-cols-4">
        <MetricCard label="Готовых" value={data.metrics.ready} />
        <MetricCard label="Черновиков" value={data.metrics.seed} />
        <MetricCard label="Пустых" value={data.metrics.empty} />
        <MetricCard label="Событий в выборках" value={data.metrics.matchedEvents} />
      </div>

      <form className="flex flex-wrap gap-2" action="/admin/landings" method="get">
        <input type="hidden" name="status" value={status} />
        <input
          name="q"
          defaultValue={q}
          placeholder="Поиск по slug / title..."
          className="min-w-[220px] flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Найти
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => {
          const active = status === filter.id;
          const href =
            filter.id === 'all'
              ? q
                ? `/admin/landings?q=${encodeURIComponent(q)}`
                : '/admin/landings'
              : `/admin/landings?status=${encodeURIComponent(filter.id)}${q ? `&q=${encodeURIComponent(q)}` : ''}`;
          return (
            <Link
              key={filter.id}
              href={href}
              className={`rounded-md border px-2.5 py-1 text-xs ${
                active
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Лендинг</th>
                <th className="px-3 py-2 font-medium">Статус</th>
                <th className="px-3 py-2 font-medium">События</th>
                <th className="px-3 py-2 font-medium">Город</th>
                <th className="px-3 py-2 font-medium">Действия</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                    Нет лендингов по текущему фильтру.
                  </td>
                </tr>
              ) : (
                data.rows.map((row) => (
                  <tr key={row.slug} className="border-b border-slate-100 align-top">
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-900">{row.title}</div>
                      <div className="mt-0.5 text-xs text-slate-500">{row.slug}</div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs">
                        {statusLabel(row.status)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600">
                      {formatAdminNumber(row.events)} всего
                      {row.readyEvents ? ` · ${formatAdminNumber(row.readyEvents)} ready` : ''}
                      {row.pinnedEvents ? ` · pin ${formatAdminNumber(row.pinnedEvents)}` : ''}
                      {row.excludedEvents ? ` · excl ${formatAdminNumber(row.excludedEvents)}` : ''}
                    </td>
                    <td className="px-3 py-2 text-slate-600">{row.city || '—'}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-1 text-xs">
                        <Link href={`/admin/landings/${encodeURIComponent(row.slug)}`} className="text-sky-700 hover:underline">
                          SEO + matches
                        </Link>
                        <a
                          href={`${PUBLIC_SITE_BASE.replace(/\/$/, '')}/${encodeURIComponent(row.slug)}`}
                          className="text-slate-500 hover:underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Public
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AdminPagination
        basePath="/admin/landings"
        page={data.page}
        pages={data.pages}
        total={data.total}
        current={current}
      />
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="text-xl font-semibold tabular-nums text-slate-900">{formatAdminNumber(value)}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}
