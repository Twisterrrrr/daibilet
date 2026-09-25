import Link from 'next/link';

import { AdminApiErrorBanner } from '@/components/admin/AdminApiErrorBanner';
import { AdminPagination } from '@/components/admin/AdminPagination';
import { formatAdminNumber } from '@/lib/admin-ui';
import { loadAdminVenuesList } from '@/server/admin-venues-data';

export const dynamic = 'force-dynamic';

const FAMILY_FILTERS = [
  { id: 'all', label: 'Все' },
  { id: 'institution', label: 'Площадки' },
  { id: 'location', label: 'Локации' },
];

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminVenuesPage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const q = first(raw.q) || '';
  const family = first(raw.family) || 'all';
  const page = first(raw.page) || '1';
  const current = { q: q || undefined, family, page };
  const data = await loadAdminVenuesList({ q, family, page });

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Площадки</h2>
          <p className="mt-1 text-sm text-slate-600">
            SEO / kind / pageStatus в Next.
          </p>
        </div>
      </header>

      <AdminApiErrorBanner errors={data.errors} />

      <div className="grid gap-3 sm:grid-cols-4">
        <Metric label="Всего" value={data.metrics.venues || data.total} />
        <Metric label="С событиями" value={data.metrics.withEvents} />
        <Metric label="Кандидаты" value={data.metrics.candidates} />
        <Metric label="Опубликованы" value={data.metrics.published} />
      </div>

      <form className="flex flex-wrap gap-2" action="/admin/venues" method="get">
        <input type="hidden" name="family" value={family} />
        <input
          name="q"
          defaultValue={q}
          placeholder="Поиск по названию, городу, адресу..."
          className="min-w-[220px] flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800">
          Найти
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        {FAMILY_FILTERS.map((filter) => {
          const active = family === filter.id;
          const href =
            filter.id === 'all'
              ? q
                ? `/admin/venues?q=${encodeURIComponent(q)}`
                : '/admin/venues'
              : `/admin/venues?family=${encodeURIComponent(filter.id)}${q ? `&q=${encodeURIComponent(q)}` : ''}`;
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
                <th className="px-3 py-2 font-medium">Площадка</th>
                <th className="px-3 py-2 font-medium">Город</th>
                <th className="px-3 py-2 font-medium">Тип</th>
                <th className="px-3 py-2 font-medium">Страница</th>
                <th className="px-3 py-2 font-medium">События</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                    Нет площадок.
                  </td>
                </tr>
              ) : (
                data.rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 align-top">
                    <td className="px-3 py-2">
                      <Link
                        href={`/admin/venues/${encodeURIComponent(row.id)}`}
                        className="font-medium text-sky-700 hover:underline"
                      >
                        {row.name}
                      </Link>
                      <div className="mt-0.5 text-xs text-slate-500">{row.address || row.slug || ''}</div>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{row.city}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">{row.kind}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">{row.pageStatus}</td>
                    <td className="px-3 py-2 tabular-nums">{formatAdminNumber(row.events)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AdminPagination
        basePath="/admin/venues"
        page={data.page}
        pages={data.pages}
        total={data.total}
        current={current}
      />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="text-xl font-semibold tabular-nums text-slate-900">{formatAdminNumber(value)}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}
