import Link from 'next/link';

import { AdminApiErrorBanner } from '@/components/admin/AdminApiErrorBanner';
import { AdminPagination } from '@/components/admin/AdminPagination';
import {
  formatAdminNumber,
  PUBLIC_SITE_BASE,
} from '@/lib/admin-ui';
import { loadAdminEventsList } from '@/server/admin-events-data';

export const dynamic = 'force-dynamic';

const QUICK_FILTERS = [
  { id: 'all', label: 'Все' },
  { id: 'needs_attention', label: 'Нужно внимание' },
  { id: 'ready_publish', label: 'К публикации' },
  { id: 'purchase_blocked', label: 'Покупка не готова' },
  { id: 'no_image', label: 'Без фото' },
  { id: 'landing_match', label: 'В лендингах' },
];

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function readinessLabel(value: string) {
  const normalized = value.toLowerCase();
  if (normalized === 'ready') return 'готово';
  if (normalized === 'review' || normalized === 'needs_review') return 'доработать';
  if (normalized === 'blocked') return 'блокер';
  return value || '—';
}

export default async function AdminEventsPage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const q = first(raw.q) || '';
  const view = first(raw.view) || 'all';
  const page = first(raw.page) || '1';
  const current = { q: q || undefined, view, page };

  const data = await loadAdminEventsList({ q, view, page });

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">События</h2>
          <p className="mt-1 text-sm text-slate-600">
            Список + detail (override, taxonomy, schedule, sales, source) в Next.
          </p>
        </div>
      </header>

      <AdminApiErrorBanner errors={data.errors} />

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Карточек" value={data.metrics.events || data.total} />
        <MetricCard label="Готовых" value={data.metrics.readyEvents} />
        <MetricCard label="На проверке" value={data.metrics.reviewEvents} />
      </div>

      <form className="flex flex-wrap gap-2" action="/admin/events" method="get">
        <input type="hidden" name="view" value={view} />
        <input
          name="q"
          defaultValue={q}
          placeholder="Поиск по названию, городу, площадке..."
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
        {QUICK_FILTERS.map((filter) => {
          const count = data.quickFilters.find((item) => item.id === filter.id)?.count;
          const active = view === filter.id;
          const href =
            filter.id === 'all'
              ? q
                ? `/admin/events?q=${encodeURIComponent(q)}`
                : '/admin/events'
              : `/admin/events?view=${encodeURIComponent(filter.id)}${q ? `&q=${encodeURIComponent(q)}` : ''}`;
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
              {count != null ? ` · ${formatAdminNumber(count)}` : ''}
            </Link>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Событие</th>
                <th className="px-3 py-2 font-medium">Город</th>
                <th className="px-3 py-2 font-medium">Источник</th>
                <th className="px-3 py-2 font-medium">Готовность</th>
                <th className="px-3 py-2 font-medium">Цена</th>
                <th className="px-3 py-2 font-medium">Действия</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                    Нет событий по текущему фильтру.
                  </td>
                </tr>
              ) : (
                data.rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 align-top">
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-900">{row.title}</div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {row.venue} · {row.slotCount} слот(ов)
                        {!row.hasImage ? ' · без фото' : ''}
                        {!row.purchaseReady ? ' · покупка не готова' : ''}
                        {row.landingHits.length ? ` · лендинги: ${row.landingHits.length}` : ''}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{row.city}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">{row.source}</td>
                    <td className="px-3 py-2">
                      <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs">
                        {readinessLabel(row.readiness)}
                      </span>
                    </td>
                    <td className="px-3 py-2 tabular-nums text-slate-700">
                      {row.priceFrom == null ? '—' : `${formatAdminNumber(row.priceFrom)} ₽`}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-1 text-xs">
                        <Link href={`/admin/events/${encodeURIComponent(row.id)}`} className="text-sky-700 hover:underline">
                          Открыть
                        </Link>
                        {row.slug ? (
                          <a
                            href={`${PUBLIC_SITE_BASE.replace(/\/$/, '')}/events/${encodeURIComponent(row.slug)}`}
                            className="text-slate-500 hover:underline"
                            target="_blank"
                            rel="noreferrer"
                          >
                            Public
                          </a>
                        ) : null}
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
        basePath="/admin/events"
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
