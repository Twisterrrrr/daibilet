import Link from 'next/link';

import { AdminApiErrorBanner } from '@/components/admin/AdminApiErrorBanner';
import { archiveAdminOrderAction, deleteAdminOrderAction, unarchiveAdminOrderAction, upsertAdminOrderTicketAction } from '@/server/admin-order-actions';
import {
  loadAdminOrderDetail,
  loadAdminOrderEventCandidates,
} from '@/server/admin-orders-data';
import { formatAdminDateTime, formatAdminNumber } from '@/lib/admin-ui';

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
  const cq = (first(rawSearch.cq) || '').trim();
  const prefillEventId = (first(rawSearch.eventId) || '').trim();
  const detail = await loadAdminOrderDetail(id);
  const candidates = cq ? await loadAdminOrderEventCandidates(cq) : { rows: [], errors: [] as string[] };

  let notice: string | null = null;
  if (first(rawSearch.archived) === '1') notice = 'Заказ архивирован.';
  if (first(rawSearch.unarchived) === '1') notice = 'Заказ разархивирован.';
  if (first(rawSearch.ticket) === '1') notice = 'Билет сохранён / привязан.';

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
            Read + archive/unarchive + ticket-link + hard delete. Отдельного DELETE ticket нет (только с заказом).
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
          ) : (
            <form action={unarchiveAdminOrderAction}>
              <input type="hidden" name="id" value={detail.id} />
              <button
                type="submit"
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Из архива
              </button>
            </form>
          )}
        </div>
      </header>

      {notice ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {notice}
        </div>
      ) : null}

      <AdminApiErrorBanner errors={[...detail.errors, ...candidates.errors]} />

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
                <th className="px-3 py-2 font-medium"> </th>
              </tr>
            </thead>
            <tbody>
              {detail.tickets.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                    Нет билетов в зеркале.
                  </td>
                </tr>
              ) : (
                detail.tickets.map((ticket) => (
                  <tr key={ticket.id} className="border-b border-slate-100">
                    <td className="px-3 py-2 font-mono text-xs">
                      {ticket.externalTicketId || ticket.id}
                    </td>
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
                    <td className="px-3 py-2 text-right">
                      <Link
                        href={`/admin/orders/${encodeURIComponent(detail.id)}?eventId=${encodeURIComponent(ticket.eventId || '')}&editTicket=${encodeURIComponent(ticket.id)}`}
                        className="text-xs text-sky-700 hover:underline"
                      >
                        Править
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <TicketUpsertForm
        orderId={detail.id}
        ticketId={first(rawSearch.editTicket) || ''}
        defaultTicketNumber={
          detail.tickets.find((ticket) => ticket.id === first(rawSearch.editTicket))
            ?.externalTicketId || ''
        }
        defaultStatus={
          detail.tickets.find((ticket) => ticket.id === first(rawSearch.editTicket))?.status ||
          'issued'
        }
        defaultEventId={
          prefillEventId ||
          detail.tickets.find((ticket) => ticket.id === first(rawSearch.editTicket))?.eventId ||
          ''
        }
      />

      <section className="rounded-xl border border-rose-200 bg-rose-50 p-4">
        <h3 className="text-sm font-semibold text-rose-900">Опасная зона</h3>
        <p className="mt-1 text-xs text-rose-800">
          Hard delete заказа удалит все билеты зеркала. Для подтверждения введи DELETE.
        </p>
        <form action={deleteAdminOrderAction} className="mt-3 flex flex-wrap items-end gap-2">
          <input type="hidden" name="id" value={detail.id} />
          <label className="block space-y-1">
            <span className="text-xs font-medium text-rose-800">Подтверждение</span>
            <input
              name="confirm"
              placeholder="DELETE"
              className="w-40 rounded-md border border-rose-200 bg-white px-3 py-2 font-mono text-sm"
            />
          </label>
          <button
            type="submit"
            className="rounded-md border border-rose-300 bg-white px-3 py-2 text-sm font-medium text-rose-800 hover:bg-rose-100"
          >
            Удалить заказ
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Поиск события для привязки</h3>
        <form className="mt-3 flex flex-wrap gap-2" method="get">
          <input type="hidden" name="editTicket" value={first(rawSearch.editTicket) || ''} />
          <input
            name="cq"
            defaultValue={cq}
            placeholder="Название / город / venue..."
            className="min-w-[220px] flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Найти
          </button>
        </form>
        {cq ? (
          <ul className="mt-3 divide-y divide-slate-100 rounded-md border border-slate-100">
            {candidates.rows.length === 0 ? (
              <li className="px-3 py-4 text-sm text-slate-500">Ничего не найдено.</li>
            ) : (
              candidates.rows.map((row) => (
                <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                  <div>
                    <div className="font-medium text-slate-900">{row.title}</div>
                    <div className="text-xs text-slate-500">
                      {[row.city, row.venue, row.sourceCode].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <Link
                    href={`/admin/orders/${encodeURIComponent(detail.id)}?cq=${encodeURIComponent(cq)}&eventId=${encodeURIComponent(row.id)}${first(rawSearch.editTicket) ? `&editTicket=${encodeURIComponent(first(rawSearch.editTicket)!)}` : ''}`}
                    className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                  >
                    Подставить eventId
                  </Link>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </section>
    </div>
  );
}

function TicketUpsertForm({
  orderId,
  ticketId,
  defaultTicketNumber,
  defaultStatus,
  defaultEventId,
}: {
  orderId: string;
  ticketId: string;
  defaultTicketNumber: string;
  defaultStatus: string;
  defaultEventId: string;
}) {
  return (
    <form
      action={upsertAdminOrderTicketAction}
      className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <input type="hidden" name="id" value={orderId} />
      {ticketId ? <input type="hidden" name="ticketId" value={ticketId} /> : null}
      <h3 className="text-sm font-semibold text-slate-900">
        {ticketId ? 'Обновить билет' : 'Добавить / привязать билет'}
      </h3>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-600">Номер билета</span>
          <input
            name="externalTicketId"
            required
            defaultValue={defaultTicketNumber}
            className="w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-sm"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-600">Статус</span>
          <input
            name="status"
            defaultValue={defaultStatus || 'issued'}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-600">eventId</span>
          <input
            name="eventId"
            defaultValue={defaultEventId}
            placeholder="evt_..."
            className="w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-sm"
          />
        </label>
      </div>
      <button
        type="submit"
        className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
      >
        Сохранить ticket-link
      </button>
    </form>
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
