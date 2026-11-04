import Link from 'next/link';
import type { AdminOrdersListData } from '@/server/admin-orders-data';
import { formatAdminDateTime, formatAdminNumber } from '@/lib/admin-ui';

const CHANNELS = [
  { id: 'all', label: 'Все каналы' },
  { id: 'internal', label: 'Продажи Дайбилет' },
  { id: 'external', label: 'Билетные системы' },
];
const STATUSES = [
  { id: 'all', label: 'Все статусы' },
  { id: 'paid', label: 'Оплачены' },
  { id: 'pending', label: 'Ожидают' },
  { id: 'cancelled', label: 'Отменены' },
  { id: 'error', label: 'Ошибки' },
];

function salesHref(eventId: string, channel: string, status: string, page = 1) {
  const params = new URLSearchParams({ tab: 'sales' });
  if (channel !== 'all') params.set('salesChannel', channel);
  if (status !== 'all') params.set('salesStatus', status);
  if (page > 1) params.set('salesPage', String(page));
  return `/admin/events/${encodeURIComponent(eventId)}?${params.toString()}`;
}

export function AdminEventSalesPanel({ eventId, data, channel, status }: {
  eventId: string;
  data: AdminOrdersListData | null;
  channel: string;
  status: string;
}) {
  const listHref = `/admin/orders?eventId=${encodeURIComponent(eventId)}`;
  const back = salesHref(eventId, channel, status, data?.page || 1);

  return <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="text-base font-semibold">Продажи по событию</h3>
        <p className="mt-1 text-xs text-slate-600">Заказы отфильтрованы на сервере по Event и связанным билетам/слотам, включая раздельные источники каталога и финконтура.</p>
        <p className="mt-1 text-xs text-slate-500">Сумма в строке — сумма всего заказа. Если в корзине были билеты на несколько событий, она не является выручкой только этого события.</p>
      </div>
      <Link className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50" href={listHref}>Открыть в реестре заказов →</Link>
    </header>

    <div className="flex flex-wrap gap-2" aria-label="Канал продаж события">
      {CHANNELS.map((item) => <Link key={item.id} href={salesHref(eventId, item.id, status)} aria-current={channel === item.id ? 'page' : undefined} className={`rounded-md border px-2.5 py-1.5 text-xs ${channel === item.id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>{item.label}</Link>)}
    </div>
    <div className="flex flex-wrap gap-2" aria-label="Статус продаж события">
      {STATUSES.map((item) => <Link key={item.id} href={salesHref(eventId, channel, item.id)} aria-current={status === item.id ? 'page' : undefined} className={`rounded-md border px-2.5 py-1.5 text-xs ${status === item.id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>{item.label}</Link>)}
    </div>

    {!data || data.errors.length ? <div role="alert" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
      Продажи не рассчитаны: {data?.errors.join(' · ') || 'источники ещё загружаются'}. Ошибка источника не отображается как нулевые продажи.
    </div> : <>
      <p className="text-sm text-slate-600">Заказов: <strong className="text-slate-900">{formatAdminNumber(data.total)}</strong></p>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs text-slate-500">
            <tr><th className="px-3 py-2 font-medium">Заказ</th><th className="px-3 py-2 font-medium">Канал</th><th className="px-3 py-2 font-medium">Статус</th><th className="px-3 py-2 font-medium">Билеты</th><th className="px-3 py-2 font-medium">Сумма заказа</th></tr>
          </thead>
          <tbody>
            {!data.rows.length ? <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-500">Заказов по выбранному фильтру нет.</td></tr> : data.rows.map((row) => {
              const detailPath = row.sourceKind === 'internal' && row.publicCode
                ? `/admin/orders/internal/${encodeURIComponent(row.publicCode)}`
                : `/admin/orders/${encodeURIComponent(row.id)}`;
              const detailHref = `${detailPath}?back=${encodeURIComponent(back)}`;
              return <tr key={`${row.sourceKind}:${row.id}`} className="border-b border-slate-100 last:border-0">
                <td className="px-3 py-2"><Link href={detailHref} className="font-medium text-sky-700 hover:underline">{row.publicCode || row.externalOrderId}</Link><div className="mt-0.5 text-xs text-slate-500">{formatAdminDateTime(row.purchasedAt)}</div></td>
                <td className="px-3 py-2 text-slate-700">{row.sourceName}</td>
                <td className="px-3 py-2"><span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs">{row.displayStatus}</span></td>
                <td className="px-3 py-2 tabular-nums">{formatAdminNumber(row.ticketCount)}</td>
                <td className="px-3 py-2 tabular-nums">{row.amountRub == null ? '—' : `${formatAdminNumber(row.amountRub)} ₽`}</td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
      {data.pages > 1 ? <div className="flex items-center justify-between text-xs">
        {data.page > 1 ? <Link href={salesHref(eventId, channel, status, data.page - 1)} className="text-sky-700 hover:underline">← Предыдущая</Link> : <span />}
        <span className="text-slate-500">Страница {data.page} из {data.pages}</span>
        {data.page < data.pages ? <Link href={salesHref(eventId, channel, status, data.page + 1)} className="text-sky-700 hover:underline">Следующая →</Link> : <span />}
      </div> : null}
    </>}
  </section>;
}
