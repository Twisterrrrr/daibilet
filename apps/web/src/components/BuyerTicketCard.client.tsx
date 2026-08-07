'use client';

import Link from 'next/link';
import { CheckCircle2, Clock3, Copy, Printer, Ticket } from 'lucide-react';
import { useCallback, useState } from 'react';

import {
  formatBuyerDateTime,
  formatTicketLineItem,
  isOpenDateOrder,
  mapFinanceOrderStatus,
  type BuyerInternalOrderRecord,
} from '@/lib/buyer-checkout';
import { buyerTicketAbsoluteUrl, buyerTicketQrImageUrl } from '@/lib/buyer-ticket';
import { formatNumber } from '@/lib/format';

type Props = {
  order: BuyerInternalOrderRecord;
  /** Absolute origin for QR / copy link (window.location.origin on client). */
  origin?: string;
  emailHint?: 'sent' | 'skipped' | 'unknown';
  className?: string;
};

/** Avoid repeating the order code as the ticket headline when it is already shown once below. */
function ticketProductTitle(order: BuyerInternalOrderRecord): string {
  const raw = (order.title || '').trim();
  if (!raw) return 'Входной билет';
  const withoutOrderPrefix = raw.replace(/^заказ\s*№?\s*/i, '').trim();
  if (
    withoutOrderPrefix === order.publicCode ||
    withoutOrderPrefix === `#${order.publicCode}` ||
    raw === order.publicCode
  ) {
    return 'Входной билет';
  }
  return raw;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-slate-100 py-2.5 last:border-b-0 sm:py-3">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold leading-6 text-slate-900 sm:text-base">{value}</dd>
    </div>
  );
}

export function BuyerTicketCard({ order, origin, emailHint = 'unknown', className = '' }: Props) {
  const status = mapFinanceOrderStatus(order.status);
  const isPaid = status.statusTone === 'live';
  const productTitle = ticketProductTitle(order);
  const orderCode = order.publicCode;
  const issuedTicketNumber = (order.ticketNumber || '').trim();
  const ticketNumber = issuedTicketNumber || orderCode;
  const ticketIssuedSeparately = Boolean(issuedTicketNumber && issuedTicketNumber !== orderCode);
  const ticketUrl =
    typeof window !== 'undefined'
      ? buyerTicketAbsoluteUrl(order.publicCode, origin || window.location.origin)
      : buyerTicketAbsoluteUrl(order.publicCode, origin);
  const qrUrl = buyerTicketQrImageUrl(ticketUrl, 168);
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);

  const openDate = isOpenDateOrder(order);
  const whenLabel = openDate
    ? formatBuyerDateTime(order.validUntil)
    : formatBuyerDateTime(order.sessionStartsAt);
  const whenTitle = openDate ? 'Действует до' : 'Дата и время';
  const purchaseAt = formatBuyerDateTime(order.purchasedAt);
  const lineItems = Array.isArray(order.lineItems) ? order.lineItems : [];
  const eventTitle = (order.eventTitle || '').trim();
  const venueTitle = (order.venueTitle || '').trim();
  const venueAddress = (order.venueAddress || '').trim();
  const buyerName = (order.buyerName || '').trim();
  const supportPhone = (order.supplierSupportPhone || '').trim();

  const copyText = useCallback(async (value: string, kind: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      // ignore
    }
  }, []);

  return (
    <article
      className={`buyer-ticket overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)] print:shadow-none print:border-slate-300 ${className}`}
      data-buyer-ticket
    >
      <div className="relative grid gap-0 lg:grid-cols-[minmax(0,1fr)_200px] print:block">
        <div className="border-b border-dashed border-slate-200 p-5 sm:p-6 lg:border-b-0 lg:border-r print:border-0 print:p-0">
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
              <Ticket className="h-3.5 w-3.5" />
              Электронный билет
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                isPaid
                  ? 'bg-emerald-100 text-emerald-800'
                  : status.statusTone === 'error'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-amber-100 text-amber-800'
              }`}
            >
              {isPaid ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
              {order.displayStatus || status.displayStatus}
            </span>
            {order.mode === 'STUB' ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                Тестовый режим
              </span>
            ) : null}
          </div>

          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 print:mt-0">
            Дайбилет
          </p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
            {productTitle}
          </h2>

          <div className="mt-5 rounded-xl bg-slate-50 px-4 py-3 sm:px-5 sm:py-4 print:bg-transparent print:px-0 print:py-2">
            <p className="text-xs font-medium text-slate-500">Номер билета</p>
            <p className="mt-1 font-mono text-3xl font-extrabold tracking-wide text-slate-950 sm:text-4xl">
              {ticketNumber}
            </p>
            <p className="mt-1.5 text-xs leading-5 text-slate-500 print:hidden">
              {ticketIssuedSeparately
                ? 'Отдельный номер билета музея / площадки.'
                : 'Пока совпадает с кодом заказа. Отдельный номер будет выдан при подключении сканера музея.'}
            </p>
          </div>

          <div className="mt-3 rounded-xl border border-slate-100 px-4 py-2.5 sm:px-5 sm:py-3 print:border-0 print:px-0 print:py-1">
            <p className="text-xs font-medium text-slate-500">Код заказа</p>
            <p className="mt-1 font-mono text-base font-semibold tracking-wide text-slate-700 sm:text-lg">
              {orderCode}
            </p>
          </div>

          <dl className="mt-4 border-t border-slate-100">
            {whenLabel ? <InfoRow label={whenTitle} value={whenLabel} /> : null}
            {eventTitle ? <InfoRow label="Событие" value={eventTitle} /> : null}
            {venueTitle ? <InfoRow label="Площадка" value={venueTitle} /> : null}
            {venueAddress ? <InfoRow label="Адрес" value={venueAddress} /> : null}
            {buyerName ? <InfoRow label="Плательщик" value={buyerName} /> : null}
            {lineItems.length ? (
              <div className="border-b border-slate-100 py-2.5 last:border-b-0 sm:py-3">
                <dt className="text-xs font-medium text-slate-500">Категории билетов</dt>
                <dd className="mt-0.5 space-y-1 text-sm font-semibold leading-6 text-slate-900 sm:text-base">
                  {lineItems.map((item) => (
                    <p key={`${item.ticketTitle}-${item.quantity}`}>{formatTicketLineItem(item)}</p>
                  ))}
                </dd>
              </div>
            ) : null}
            {order.amountRub != null ? (
              <InfoRow label="Сумма заказа" value={`${formatNumber(order.amountRub)} ₽`} />
            ) : null}
            {purchaseAt ? <InfoRow label="Дата покупки" value={purchaseAt} /> : null}
            {order.email ? <InfoRow label="Email" value={order.email} /> : null}
            {supportPhone ? (
              <InfoRow label="Телефон поддержки организатора" value={supportPhone} />
            ) : null}
          </dl>

          <div className="mt-5 space-y-2 rounded-xl bg-amber-50/80 px-4 py-3 text-sm leading-6 text-amber-950 print:bg-transparent print:px-0">
            <p>Приходите за 15-20 минут до начала.</p>
            <p>При опоздании билеты могут быть аннулированы.</p>
          </div>

          <p className="mt-5 text-sm leading-6 text-slate-600 print:hidden">
            {isPaid
              ? 'Покажите этот экран или распечатанный билет на входе. Сохраните код заказа и ссылку на страницу.'
              : 'После оплаты статус обновится. Сохраните код заказа и ссылку на билет.'}
          </p>

          {emailHint === 'sent' ? (
            <p className="mt-3 text-sm leading-6 text-emerald-800 print:hidden">
              Ссылка на билет отправлена на {order.email || 'ваш email'}.
            </p>
          ) : emailHint === 'skipped' ? (
            <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2.5 text-sm leading-6 text-amber-900 print:hidden">
              Письмо пока не отправляется автоматически. Сохраните код заказа выше и ссылку на эту страницу - они
              нужны, чтобы открыть билет позже.
            </p>
          ) : null}
        </div>

        <div className="flex flex-col items-center justify-center gap-3 bg-slate-50 p-5 sm:p-6 print:bg-transparent print:p-4 print:items-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrUrl}
            alt={`QR: ссылка на страницу билета ${orderCode}`}
            width={168}
            height={168}
            className="h-[168px] w-[168px] rounded-lg bg-white p-2 shadow-sm print:shadow-none"
          />
          <p className="max-w-[11rem] text-center text-[11px] leading-4 text-slate-500 print:text-left">
            QR - ссылка на страницу билета.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-slate-100 bg-white px-5 py-4 sm:px-6 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-full bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
        >
          <Printer className="h-4 w-4" />
          Печать
        </button>
        <button
          type="button"
          onClick={() => void copyText(orderCode, 'code')}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Copy className="h-4 w-4" />
          {copied === 'code' ? 'Скопировано' : 'Копировать код заказа'}
        </button>
        <button
          type="button"
          onClick={() => void copyText(ticketUrl, 'link')}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Copy className="h-4 w-4" />
          {copied === 'link' ? 'Ссылка скопирована' : 'Ссылка на билет'}
        </button>
        <Link
          href="/account/purchases"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Мои покупки
        </Link>
      </div>
    </article>
  );
}
