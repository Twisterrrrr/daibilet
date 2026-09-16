import Link from 'next/link';

import { AdminApiErrorBanner } from '@/components/admin/AdminApiErrorBanner';
import { AdminPagination } from '@/components/admin/AdminPagination';
import { formatAdminDateTime, formatAdminNumber } from '@/lib/admin-ui';
import { loadAdminBuyersList } from '@/server/admin-buyers-data';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminBuyersPage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const q = (first(raw.q) || '').trim();
  const view = first(raw.view) === 'archive' ? 'archive' : 'active';
  const page = first(raw.page) || '1';
  const data = await loadAdminBuyersList({ q, view, page });

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Покупатели</h2>
          <p className="mt-1 text-sm text-slate-600">
            Read-only список. Деталь = фильтр заказов по email/телефону.
          </p>
        </div>
      </header>

      <AdminApiErrorBanner errors={data.errors} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Покупатели" value={data.metrics.buyers} />
        <Metric label="С контактом" value={data.metrics.withContacts} />
        <Metric label="Заказы" value={data.metrics.orders} />
        <Metric label="Внимание" value={data.metrics.needsAttention} />
      </div>

      <form className="flex flex-wrap gap-2" action="/admin/buyers" method="get">
        <input type="hidden" name="view" value={view} />
        <input
          name="q"
          defaultValue={q}
          placeholder="Email / телефон / имя / заказ..."
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
        {[
          { id: 'active', label: 'Активные' },
          { id: 'archive', label: `Архив (${formatAdminNumber(data.metrics.archivedBuyers)})` },
        ].map((filter) => {
          const active = view === filter.id;
          const params = new URLSearchParams();
          if (filter.id === 'archive') params.set('view', 'archive');
          if (q) params.set('q', q);
          const qs = params.toString();
          return (
            <Link
              key={filter.id}
              href={qs ? `/admin/buyers?${qs}` : '/admin/buyers'}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
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
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Покупатель</th>
              <th className="px-3 py-2 font-medium">Заказы</th>
              <th className="px-3 py-2 font-medium">Последний</th>
              <th className="px-3 py-2 font-medium"> </th>
            </tr>
          </thead>
          <tbody>
            {data.rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-10 text-center text-slate-500">
                  Покупатели не найдены.
                </td>
              </tr>
            ) : (
              data.rows.map((buyer) => {
                const lookup = buyer.email || buyer.phone || buyer.lastOrderNumber || '';
                return (
                  <tr key={buyer.id} className="border-b border-slate-100 align-top">
                    <td className="px-3 py-3">
                      <div className="font-medium text-slate-900">{buyer.displayName}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {[buyer.email, buyer.phone].filter(Boolean).join(' · ') || 'без контакта'}
                      </div>
                      {buyer.eventTitles.length ? (
                        <div className="mt-1 line-clamp-1 text-xs text-slate-400">
                          {buyer.eventTitles.slice(0, 2).join(' · ')}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-xs">
                      <div>{formatAdminNumber(buyer.orders)} заказов</div>
                      <div className="text-slate-500">
                        {formatAdminNumber(buyer.tickets)} билетов
                        {buyer.needsAttention
                          ? ` · внимание ${formatAdminNumber(buyer.needsAttention)}`
                          : ''}
                      </div>
                      {buyer.amountRub != null ? (
                        <div className="mt-1">{formatAdminNumber(buyer.amountRub)} ₽</div>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-xs">
                      <div>{buyer.lastOrderNumber || '—'}</div>
                      <div className="text-slate-500">
                        {formatAdminDateTime(buyer.lastOrderAt)}
                      </div>
                      <div className="text-slate-500">{buyer.lastOrderStatusLabel || buyer.statusLabel}</div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      {lookup ? (
                        <Link
                          href={`/admin/orders?q=${encodeURIComponent(lookup)}`}
                          className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                        >
                          Заказы
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <AdminPagination
        page={data.page}
        pages={data.pages}
        total={data.total}
        basePath="/admin/buyers"
        current={{
          q: q || undefined,
          view: view === 'active' ? undefined : view,
        }}
      />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="text-lg font-semibold tabular-nums text-slate-900">
        {formatAdminNumber(value)}
      </div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}
