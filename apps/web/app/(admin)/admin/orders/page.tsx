import Link from 'next/link';

import { AdminApiErrorBanner } from '@/components/admin/AdminApiErrorBanner';
import { AdminPagination } from '@/components/admin/AdminPagination';
import {
  archiveAdminOrdersBulkAction,
  syncAdminOrdersTcAction,
} from '@/server/admin-order-actions';
import { loadAdminOrdersList } from '@/server/admin-orders-data';
import { formatAdminDateTime, formatAdminNumber } from '@/lib/admin-ui';

export const dynamic = 'force-dynamic';

const QUICK_FILTERS = [
  { id: 'all', label: 'Все активные' },
  { id: 'attention', label: 'Внимание' },
  { id: 'failed_integration', label: 'Проблемы' },
  { id: 'unlinked', label: 'Без связи' },
  { id: 'archive', label: 'Архив' },
];
const INTERNAL_FILTERS = [
  { id: 'all', label: 'Все' },
  { id: 'attention', label: 'Внимание' },
  { id: 'pending_refunds', label: 'Запросы на возврат' },
  { id: 'failed_integration', label: 'Проблемы' },
];
const ALL_FILTERS = [
  { id: 'all', label: 'Все активные' },
  { id: 'attention', label: 'Внимание' },
  { id: 'pending_refunds', label: 'Запросы на возврат' },
  { id: 'failed_integration', label: 'Проблемы' },
  { id: 'unlinked', label: 'Без связи' },
  { id: 'archive', label: 'Архив' },
];
const STATUS_FILTERS = [
  { id: 'all', label: 'Все статусы' },
  { id: 'paid', label: 'Оплачены' },
  { id: 'pending', label: 'В обработке' },
  { id: 'cancelled', label: 'Отменены' },
  { id: 'error', label: 'Ошибки' },
];

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

type OrdersFilterState = {
  kind: string;
  q: string;
  view: string;
  source: string;
  status: string;
};

/**
 * Every filter family keeps the rest of the state, so combining filters is
 * predictable; `page` always resets because a new selection starts at 1.
 * `source` only exists for external rows and is dropped for the internal channel.
 * Switching channel drops a `view` that the target channel does not offer.
 */
function ordersHref(state: OrdersFilterState, overrides: Partial<OrdersFilterState>): string {
  const next = { ...state, ...overrides };
  const viewsForKind = (kindName: string) =>
    (kindName === 'internal' ? INTERNAL_FILTERS : kindName === 'external' ? QUICK_FILTERS : ALL_FILTERS).map(
      (filter) => filter.id,
    );
  if (!viewsForKind(next.kind).includes(next.view)) next.view = 'all';
  const params = new URLSearchParams();
  if (next.kind !== 'all') params.set('kind', next.kind);
  if (next.q) params.set('q', next.q);
  if (next.view !== 'all') params.set('view', next.view);
  if (next.source !== 'all' && next.kind !== 'internal') params.set('source', next.source);
  if (next.status !== 'all') params.set('status', next.status);
  const qs = params.toString();
  return qs ? `/admin/orders?${qs}` : '/admin/orders';
}

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const q = first(raw.q) || '';
  const view = first(raw.view) || 'all';
  const page = first(raw.page) || '1';
  const requestedKind = first(raw.kind);
  const kind = requestedKind === 'external' || requestedKind === 'internal' ? requestedKind : 'all';
  const source = first(raw.source) || 'all';
  const requestedStatus = first(raw.status) || 'all';
  const status = STATUS_FILTERS.some((filter) => filter.id === requestedStatus) ? requestedStatus : 'all';
  const state: OrdersFilterState = { kind, q, view, source, status };
  const current = { kind, q: q || undefined, view, source, status, page };
  const data = await loadAdminOrdersList({ kind, q, view, source, status, page });
  const filteredHref = ordersHref(state, {});
  const backHref = data.page > 1
    ? `${filteredHref}${filteredHref.includes('?') ? '&' : '?'}page=${data.page}`
    : filteredHref;
// A failed live API must never look like "zero orders": the counters below would
  // be taken as fact by the operator, so degrade them to an explicit dash instead.
  const degraded = data.errors.length > 0;
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
            Все продажи и заявки на возврат в одном списке.
          </p>
        </div>
        {kind === 'external' ? <div className="flex flex-wrap gap-2">
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
        </div> : null}
      </header>

      {notice ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {notice}
        </div>
      ) : null}

      <AdminApiErrorBanner errors={data.errors} />

      <div className="flex flex-wrap gap-2" role="navigation" aria-label="Канал продажи">
        <Link href={ordersHref(state, { kind: 'all' })} className={`rounded-md border px-3 py-2 text-sm ${kind === 'all' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700'}`}>Все каналы</Link>
        <Link href={ordersHref(state, { kind: 'internal', source: 'all' })} className={`rounded-md border px-3 py-2 text-sm ${kind === 'internal' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700'}`}>Продажи Дайбилет</Link>
        <Link href={ordersHref(state, { kind: 'external' })} className={`rounded-md border px-3 py-2 text-sm ${kind === 'external' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700'}`}>Внешние продажи</Link>
      </div>

      <p className="text-sm text-slate-600">Найдено заказов: {degraded ? '—' : formatAdminNumber(data.total)}</p>

      <form className="flex flex-wrap gap-2" action="/admin/orders" method="get">
        <input type="hidden" name="view" value={view} />
        <input type="hidden" name="kind" value={kind} />
        <input
          name="q"
          defaultValue={q}
          placeholder="Код заказа, email, событие..."
          className="min-w-[220px] flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
        />
        {kind !== 'internal' ? <select name="source" defaultValue={source} aria-label="Источник заказа" className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
          <option value="all">Все источники</option>
          {kind === 'all' ? <option value="MANUAL">Дайбилет</option> : null}
          {data.sources.filter((item) => item !== 'MANUAL').map((item) => <option key={item} value={item}>{item}</option>)}
        </select> : null}
        <input type="hidden" name="status" value={status} />
        <button type="submit" className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800">
          Применить
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-2" aria-label="Фильтр по статусу заказа">
        <span className="mr-1 text-xs font-medium text-slate-500">Статус:</span>
        {STATUS_FILTERS.map((filter) => {
          const active = status === filter.id;
          return <Link
            key={filter.id}
            href={ordersHref(state, { status: filter.id })}
            aria-current={active ? 'page' : undefined}
            className={`rounded-md border px-3 py-1.5 text-sm ${active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
          >{filter.label}</Link>;
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-medium text-slate-500">Дополнительно:</span>
        {(kind === 'internal' ? INTERNAL_FILTERS : kind === 'external' ? QUICK_FILTERS : ALL_FILTERS).map((filter) => {
          const count = kind === 'internal' || q || source !== 'all' || status !== 'all' ? null : data.quickFilters.find((item) => item.id === filter.id)?.count;
          const active = view === filter.id;
          return (
            <Link
              key={filter.id}
              href={ordersHref(state, { view: filter.id })}
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
        {kind !== 'all' || q || view !== 'all' || source !== 'all' || status !== 'all' ? (
          <Link
            href="/admin/orders"
            className="rounded-md border border-dashed border-slate-300 px-2.5 py-1 text-xs text-slate-500 hover:border-slate-400 hover:text-slate-700"
          >
            Сбросить фильтры
          </Link>
        ) : null}
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
                  <td colSpan={5} className="px-3 py-8 text-center">
                    {degraded ? (
                      <span className="font-medium text-red-700">
                        Не удалось загрузить заказы: live API недоступен.
                      </span>
                    ) : (
                      <span className="text-slate-500">Нет заказов по фильтру.</span>
                    )}
                  </td>
                </tr>
              ) : (
                data.rows.map((row) => {
                  const detailHref =
                    (row.sourceKind === 'internal' && row.publicCode
                      ? `/admin/orders/internal/${encodeURIComponent(row.publicCode)}`
                      : `/admin/orders/${encodeURIComponent(row.id)}`) +
                    `?back=${encodeURIComponent(backHref)}`;
                  return (
                  <tr key={row.id} className="border-b border-slate-100 align-top">
                    <td className="px-3 py-2">
                      <Link
                        href={detailHref}
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
                      {row.amountRub != null ? (
                        <div className="mt-1 text-xs tabular-nums text-slate-700">
                          {formatAdminNumber(row.amountRub)} ₽
                        </div>
                      ) : null}
                      {row.needsAttention ? (
                        <div className="mt-1 text-[11px] text-amber-700">внимание</div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-slate-700">
                      {formatAdminNumber(row.ticketCount)}
                      {row.unlinkedTickets ? ` · unlinked ${row.unlinkedTickets}` : ''}
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!degraded ? <AdminPagination
        basePath="/admin/orders"
        page={data.page}
        pages={data.pages}
        total={data.total}
        current={current}
      /> : null}
    </div>
  );
}
