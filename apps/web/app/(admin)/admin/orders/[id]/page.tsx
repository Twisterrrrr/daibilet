import Link from 'next/link';

import { AdminApiErrorBanner } from '@/components/admin/AdminApiErrorBanner';
import { archiveAdminOrderAction } from '@/server/admin-order-actions';
import { loadAdminOrderDetail } from '@/server/admin-orders-data';
import { formatAdminDateTime, formatAdminNumber, viteAdminHref } from '@/lib/admin-ui';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminOrderDetailPage({ params, searchParams }: PageProps) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);
  const rawSearch = await searchParams;
  const detail = await loadAdminOrderDetail(id);
  const notice = first(rawSearch.archived) === '1' ? 'Заказ архивирован.' : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <Link href="/admin/orders" className="hover:underline">
          Заказы
        </Link>
        <span>/</span>
        <span className="text-slate-700">{detail.publicCode || detail.externalOrderId}</span>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            {detail.publicCode || detail.externalOrderId}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Read + archive. Ручная привязка билетов/событий - в Vite.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!detail.archivedAt ? (
            <form action={archiveAdminOrderAction}>
              <input type="hidden" name="id" value={detail.id} />
              <button
                type="submit"
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                В архив
              </button>
            </form>
          ) : null}
          <a
            href={viteAdminHref('/orders')}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
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

      <AdminApiErrorBanner errors={detail.errors} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Info label="Статус" value={detail.status} />
        <Info label="Источник" value={detail.sourceName} />
        <Info label="Куплено" value={formatAdminDateTime(detail.purchasedAt)} />
        <Info
          label="Билеты"
          value={`${formatAdminNumber(detail.ticketCount)}${
            detail.unlinkedTickets ? ` · unlinked ${detail.unlinkedTickets}` : ''
          }`}
        />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Покупатель</h3>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-slate-500">Имя</dt>
            <dd>{detail.buyerName || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Email</dt>
            <dd>{detail.buyerEmail || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Телефон</dt>
            <dd>{detail.buyerPhone || '—'}</dd>
          </div>
        </dl>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">
          Билеты
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Номер</th>
                <th className="px-3 py-2 font-medium">Статус</th>
                <th className="px-3 py-2 font-medium">Событие</th>
              </tr>
            </thead>
            <tbody>
              {detail.tickets.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-3 py-8 text-center text-slate-500">
                    Нет билетов в зеркале.
                  </td>
                </tr>
              ) : (
                detail.tickets.map((ticket) => (
                  <tr key={ticket.id} className="border-b border-slate-100">
                    <td className="px-3 py-2 font-mono text-xs">{ticket.externalTicketId || ticket.id}</td>
                    <td className="px-3 py-2">{ticket.status}</td>
                    <td className="px-3 py-2">
                      {ticket.eventId ? (
                        <Link
                          href={`/admin/events/${encodeURIComponent(ticket.eventId)}`}
                          className="text-sky-700 hover:underline"
                        >
                          {ticket.eventTitle || ticket.eventId}
                        </Link>
                      ) : (
                        ticket.eventTitle || '—'
                      )}
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}
