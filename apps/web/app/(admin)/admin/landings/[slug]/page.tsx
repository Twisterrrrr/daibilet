import Link from 'next/link';

import { AdminApiErrorBanner } from '@/components/admin/AdminApiErrorBanner';
import { formatAdminNumber, PUBLIC_SITE_BASE, viteAdminHref } from '@/lib/admin-ui';
import { loadAdminLandingDetail } from '@/server/admin-landings-data';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function AdminLandingDetailPage({ params }: PageProps) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const data = await loadAdminLandingDetail(slug);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <Link href="/admin/landings" className="hover:underline">
          Лендинги
        </Link>
        <span>/</span>
        <span className="text-slate-700">{data.slug}</span>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{data.title}</h2>
          <p className="mt-1 text-sm text-slate-600">
            Read-only обзор. Pin/exclude и SEO-редактор - в Vite.
          </p>
          {data.description ? <p className="mt-2 max-w-3xl text-sm text-slate-600">{data.description}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={viteAdminHref('/landings')}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
          >
            Править matches в Vite
          </a>
          <a
            href={`${PUBLIC_SITE_BASE.replace(/\/$/, '')}/${encodeURIComponent(data.slug)}`}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            target="_blank"
            rel="noreferrer"
          >
            Public
          </a>
        </div>
      </header>

      <AdminApiErrorBanner errors={data.errors} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <div className="text-xs text-slate-500">Статус</div>
          <div className="mt-1 text-sm font-medium text-slate-900">{data.status}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <div className="text-xs text-slate-500">Событий в выдаче</div>
          <div className="mt-1 text-sm font-medium tabular-nums text-slate-900">
            {formatAdminNumber(data.eventsTotal)}
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">
          Сэмпл событий (до 20)
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Событие</th>
                <th className="px-3 py-2 font-medium">Город</th>
                <th className="px-3 py-2 font-medium">Площадка</th>
                <th className="px-3 py-2 font-medium">Готовность</th>
                <th className="px-3 py-2 font-medium">Цена</th>
              </tr>
            </thead>
            <tbody>
              {data.sampleEvents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                    Нет событий в сэмпле.
                  </td>
                </tr>
              ) : (
                data.sampleEvents.map((event) => (
                  <tr key={event.id} className="border-b border-slate-100">
                    <td className="px-3 py-2 font-medium text-slate-900">{event.title}</td>
                    <td className="px-3 py-2 text-slate-600">{event.city}</td>
                    <td className="px-3 py-2 text-slate-600">{event.venue}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">{event.readiness}</td>
                    <td className="px-3 py-2 tabular-nums text-slate-700">
                      {event.priceFrom == null ? '—' : `${formatAdminNumber(event.priceFrom)} ₽`}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
