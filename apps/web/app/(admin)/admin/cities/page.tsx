import Link from 'next/link';

import { AdminApiErrorBanner } from '@/components/admin/AdminApiErrorBanner';
import { AdminPagination } from '@/components/admin/AdminPagination';
import { formatAdminNumber, PUBLIC_SITE_BASE, viteAdminHref } from '@/lib/admin-ui';
import { loadAdminCitiesList } from '@/server/admin-cities-data';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminCitiesPage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const q = first(raw.q) || '';
  const page = first(raw.page) || '1';
  const current = { q: q || undefined, page };
  const data = await loadAdminCitiesList({ q, page });

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Города</h2>
          <p className="mt-1 text-sm text-slate-600">
            Название, slug, SEO и intro в Next. Регионы/маппинг сложного уровня - Vite при необходимости.
          </p>
        </div>
        <a
          href={viteAdminHref('/cities')}
          className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          Vite cities
        </a>
      </header>

      <AdminApiErrorBanner errors={data.errors} />

      <div className="grid gap-3 sm:grid-cols-4">
        <Metric label="Городов" value={data.metrics.cities || data.total} />
        <Metric label="Регионов" value={data.metrics.regions} />
        <Metric label="Событий" value={data.metrics.events} />
        <Metric label="Площадок" value={data.metrics.venues} />
      </div>

      <form className="flex flex-wrap gap-2" action="/admin/cities" method="get">
        <input
          name="q"
          defaultValue={q}
          placeholder="Поиск по городу / slug..."
          className="min-w-[220px] flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800">
          Найти
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Город</th>
                <th className="px-3 py-2 font-medium">Тип</th>
                <th className="px-3 py-2 font-medium">События</th>
                <th className="px-3 py-2 font-medium">Площадки</th>
                <th className="px-3 py-2 font-medium">Public</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                    Нет городов.
                  </td>
                </tr>
              ) : (
                data.rows.map((row) => (
                  <tr key={row.id || row.slug || row.name} className="border-b border-slate-100">
                    <td className="px-3 py-2">
                      <Link
                        href={`/admin/cities/${encodeURIComponent(row.id)}`}
                        className="font-medium text-sky-700 hover:underline"
                      >
                        {row.name}
                      </Link>
                      <div className="mt-0.5 text-xs text-slate-500">{row.slug || ''}</div>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600">{row.type}</td>
                    <td className="px-3 py-2 tabular-nums">{formatAdminNumber(row.events)}</td>
                    <td className="px-3 py-2 tabular-nums">{formatAdminNumber(row.venues)}</td>
                    <td className="px-3 py-2 text-xs">
                      {row.slug ? (
                        <a
                          href={`${PUBLIC_SITE_BASE.replace(/\/$/, '')}/cities/${encodeURIComponent(row.slug)}`}
                          className="text-slate-500 hover:underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          /cities/{row.slug}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AdminPagination
        basePath="/admin/cities"
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
