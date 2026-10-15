import Link from 'next/link';

import { operateInternalAdminOrderAction } from '@/server/admin-order-actions';
import { loadInternalAdminOrderDetail } from '@/server/admin-orders-data';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ operation?: string; error?: string; back?: string }>;
};

export default async function InternalAdminOrderPage({ params, searchParams }: PageProps) {
  const { code } = await params;
  const { operation, error: operationError, back } = await searchParams;
  // `back` comes from the registry and keeps the operator's filter context.
  const backHref = back && back.startsWith('/admin/orders') ? back : '/admin/orders';
  const { detail, error } = await loadInternalAdminOrderDetail(code);
  const cancellable = detail && ['DRAFT', 'PENDING_PAYMENT', 'FAILED', 'EXPIRED'].includes(detail.status);
  const refundable = detail && ['CONFIRMED', 'FULFILLED'].includes(detail.status);
  const refund = detail?.finance?.refunds?.find((item) => ['CREATED', 'APPROVED', 'PROCESSING'].includes(item.status));
  const operationErrorLabels: Record<string, string> = {
    invalid_input: 'Укажите причину и введите код заказа.',
    not_configured: 'Операции финконтура не настроены.',
    network: 'Финконтур недоступен.',
    confirmation_code_mismatch: 'Код подтверждения не совпадает.',
    paid_order_requires_refund: 'Заказ оплачен. Используйте возврат.',
    payment_already_succeeded_refresh_order: 'Платёж уже прошёл. Обновите заказ.',
    supplier_already_paid_manual_review: 'Поставщику уже перечислены средства. Требуется ручная сверка.',
    other_refund_request_exists: 'У заказа уже есть другая заявка на возврат.',
    refund_already_in_progress: 'Возврат уже обрабатывается. Обновите страницу.',
  };

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
      <Link href={backHref} className="hover:underline">Заказы</Link>
      <span>/</span>
      <span className="text-slate-700">{detail?.publicCode || code}</span>
    </div>
    {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error}</div> : null}
    {operationError ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">Операция не выполнена: {operationErrorLabels[operationError] || operationError.replaceAll('_', ' ')} Проверьте статус заказа перед повтором.</div> : null}
    {detail ? <>
      <header>
        <h1 className="text-2xl font-semibold">Заказ {detail.publicCode}</h1>
        <p className="mt-1 text-sm text-slate-600">{detail.eventTitle || 'Билет'} · {detail.displayStatus} · {detail.amountRub?.toLocaleString('ru-RU') || '—'} ₽</p>
      </header>
      {operation ? <div className={`rounded-lg border p-3 text-sm ${operation === 'FAILED' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>Результат операции: {operation === 'PROCESSING' ? 'ЮKassa обрабатывает запрос; обновите страницу и повторите проверку.' : operation === 'REFUNDED' ? 'Деньги возвращены, билет погашен.' : operation === 'CANCELLED' ? 'Неоплаченный заказ отменён.' : operation === 'FAILED' ? 'ЮKassa отменила возврат. Проверьте платёж перед повтором.' : operation}</div> : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"><div className="text-xs text-slate-500">Статус</div><div className="mt-1 text-sm font-medium text-slate-900">{detail.displayStatus}</div></div>
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"><div className="text-xs text-slate-500">Сумма</div><div className="mt-1 text-sm font-medium tabular-nums text-slate-900">{detail.amountRub != null ? `${detail.amountRub.toLocaleString('ru-RU')} ₽` : '—'}</div></div>
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"><div className="text-xs text-slate-500">Билетов</div><div className="mt-1 text-sm font-medium tabular-nums text-slate-900">{detail.ticketCount}</div></div>
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"><div className="text-xs text-slate-500">Источник</div><div className="mt-1 text-sm font-medium text-slate-900">Продажи Дайбилет</div></div>
      </div>
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Покупатель</h3>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
          <div><dt className="text-xs text-slate-500">Имя</dt><dd>{detail.buyer.name || '—'}</dd></div>
          <div><dt className="text-xs text-slate-500">Email</dt><dd>{detail.buyer.email || '—'}</dd></div>
          <div><dt className="text-xs text-slate-500">Телефон</dt><dd>{detail.buyer.phone || '—'}</dd></div>
        </dl>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Платёж и возврат</h3>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
          <div><dt className="text-xs text-slate-500">Платежи</dt><dd>{detail.finance?.payments?.map((item) => item.status).join(', ') || '—'}</dd></div>
          <div><dt className="text-xs text-slate-500">Заявка на возврат</dt><dd>{detail.finance?.refunds?.map((item) => item.status).join(', ') || '—'}</dd></div>
          <div><dt className="text-xs text-slate-500">Билет покупателя</dt><dd><Link className="text-sky-700 hover:underline" href={`https://daibilet.ru/checkout/ticket/${encodeURIComponent(detail.publicCode)}`}>Проверить билет</Link></dd></div>
        </dl>
      </section>
      {cancellable || refundable ? <section className="rounded-xl border border-amber-300 bg-amber-50 p-4">
        <h2 className="font-semibold">{cancellable ? 'Отменить неоплаченный заказ' : refund ? 'Проверить состояние возврата' : 'Вернуть всю сумму покупателю'}</h2>
        <p className="mt-1 text-sm text-slate-700">{cancellable ? 'ЮKassa отменит незавершённый платёж, бронь освободится, билет станет недействительным.' : 'Полный возврат через ЮKassa. После успешного возврата билет погасится, баланс поставщика пересчитается.'}</p>
        <form action={operateInternalAdminOrderAction} className="mt-4 grid max-w-lg gap-3">
          <input type="hidden" name="orderKey" value={detail.publicCode} />
          <input type="hidden" name="operation" value={cancellable ? 'cancel' : 'refund'} />
          <label className="grid gap-1 text-sm">Причина
            <textarea name="reason" required minLength={3} maxLength={500} className="min-h-20 rounded-md border border-slate-300 bg-white p-2" placeholder="Например: запрос покупателя по email" />
          </label>
          <label className="grid gap-1 text-sm">Введите код заказа {detail.publicCode} для подтверждения
            <input name="confirmCode" required autoComplete="off" className="rounded-md border border-slate-300 bg-white p-2" />
          </label>
          <button type="submit" className="w-fit rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800">{cancellable ? 'Отменить заказ' : refund ? 'Проверить возврат' : 'Вернуть всю сумму'}</button>
        </form>
      </section> : null}
      {detail.status === 'REFUNDED' || detail.status === 'CANCELLED' ? <p className="text-sm text-slate-600">Заказ закрыт; билет покупателя должен отображаться как недействительный.</p> : null}
    </> : null}
  </div>;
}
