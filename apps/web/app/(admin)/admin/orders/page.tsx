import Link from 'next/link';

import { AdminApiErrorBanner } from '@/components/admin/AdminApiErrorBanner';
import { AdminPagination } from '@/components/admin/AdminPagination';
import {
  archiveAdminOrdersBulkAction,
  syncAdminOrdersTcAction,
} from '@/server/admin-order-actions';
import { loadAdminOrdersList } from '@/server/admin-orders-data';
import { formatAdminDateTime, formatAdminNumber, viteAdminHref } from '@/lib/admin-ui';

export const dynamic = 'force-dynamic';

const QUICK_FILTERS = [
  { id: 'all', label: 'Активные' },
  { id: 'attention', label: 'Внимание' },
  { id: 'failed_integration', label: 'Проблемы' },
  { id: 'unlinked', label: 'Без связи' },
  { id: 'archive', label: 'Архив' },
];

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const q = first(raw.q) || '';
  const view = first(raw.view) || 'all';
  const page = first(raw.page) || '1';
  const current = { q: q || undefined, view, page };
  const data = await loadAdminOrdersList({ q, view, page });
  const notice =
    first(raw.synced) === '1'
      ? 'Синхронизация TC запущена/завершена.'
      : first(raw.archived) === 'bulk'
        ? 'Массовая архивация отменённых выполнена.'
        : null;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Заказы</h2>
          <p className="mt-1 text-sm text-slate-600">
            Зеркало TC (оплата у источника). Привязка билетов вручную - Vite `/legacy`.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={syncAdminOrdersTcAction}>
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
            >
              Sync TC
            </button>
          </form>
          <form action={archiveAdminOrdersBulkAction}>
            <button
              type="submit"
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Архив отменённых
            </button>
          </form>
          <a
            href={viteAdminHref('/orders')}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Vite tickets+
          </a>
        </div>
      </header>

      {notice ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {notice}
        </div>
      ) : null}

      <AdminApiErrorBanner errors={data.errors} />

      <div className="grid gap-3 sm:grid-cols-4">
        <Metric label="Импорт" value={data.metrics.imported} />
        <Metric label="Подтверждены" value={data.metrics.confirmed} />
        <Metric label="В обработке" value={data.metrics.processing} />
        <Metric label="Внимание" value={data.metrics.needsAttention} />
      </div>

      <form className="flex flex-wrap gap-2" action="/admin/orders" method="get">
        <input type="hidden" name="view" value={view} />
        <input
          name="q"
          defaultValue={q}
          placeholder="Код заказа, email, событие..."
          className="min-w-[220px] flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800">
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
                ? `/admin/orders?q=${encodeURIComponent(q)}`
                : '/admin/orders'
              : `/admin/orders?view=${encodeURIComponent(filter.id)}${q ? `&q=${encodeURIComponent(q)}` : ''}`;
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
                <th className="px-3 py-2 font-medium">Заказ</th>
                <th className="px-3 py-2 font-medium">Событие</th>
                <th className="px-3 py-2 font-medium">Покупатель</th>
                <th className="px-3 py-2 font-medium">Статус</th>
                <th className="px-3 py-2 font-medium">Билеты</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                    Нет заказов по фильтру.
                  </td>
                </tr>
              ) : (
                data.rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 align-top">
                    <td className="px-3 py-2">
                      <Link
                        href={`/admin/orders/${encodeURIComponent(row.id)}`}
                        className="font-medium text-sky-700 hover:underline"
                      >
                        {row.publicCode || row.externalOrderId}
                      </Link>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {row.sourceName} · {formatAdminDateTime(row.purchasedAt)}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-slate-700">{row.eventTitle || '—'}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">
                      <div>{row.buyerName || '—'}</div>
                      <div>{row.buyerEmail || ''}</div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs">
                        {row.displayStatus}
                      </span>
                      {row.needsAttention ? (
                        <div className="mt-1 text-[11px] text-amber-700">внимание</div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-slate-700">
                      {formatAdminNumber(row.ticketCount)}
                      {row.unlinkedTickets ? ` · unlinked ${row.unlinkedTickets}` : ''}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AdminPagination
        basePath="/admin/orders"
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
