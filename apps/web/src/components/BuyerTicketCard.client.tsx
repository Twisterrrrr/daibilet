'use client';

import Link from 'next/link';
import { CheckCircle2, Clock3, Copy, Printer } from 'lucide-react';
import { useCallback, useState } from 'react';

import {
  formatBuyerDateTime,
  formatBuyerTicketWhen,
  formatTicketLineItemsCompact,
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
  const [copied, setCopied] = useState(false);

  const openDate = isOpenDateOrder(order);
  const whenIso = openDate ? order.validUntil : order.sessionStartsAt;
  const whenLabel = formatBuyerTicketWhen(whenIso) || formatBuyerDateTime(whenIso);
  const whenPrefix = openDate ? 'Действует до' : null;
  const purchaseAt = formatBuyerDateTime(order.purchasedAt);
  const lineItems = Array.isArray(order.lineItems) ? order.lineItems : [];
  const composition = lineItems.length ? formatTicketLineItemsCompact(lineItems) : '';
  const eventTitle = (order.eventTitle || '').trim();
  const venueTitle = (order.venueTitle || '').trim();
  const venueAddress = (order.venueAddress || '').trim();
  const buyerName = (order.buyerName || '').trim();
  const supportPhone = (order.supplierSupportPhone || '').trim();
  const mainHeadline = eventTitle || (productTitle !== 'Входной билет' ? productTitle : '');

  const copyTicketCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(ticketNumber);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }, [ticketNumber]);

  return (
    <article
      className={`buyer-ticket mx-auto w-full max-w-[650px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.05)] sm:p-7 print:max-w-none print:border-slate-300 print:p-0 print:shadow-none ${className}`}
      data-buyer-ticket
    >
      {/* Status chips - screen only */}
      <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
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

      {/* Header: type + ticket number */}
      <header className="mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-b-2 border-dashed border-slate-200 pb-5">
        <h2 className="font-display text-xl font-extrabold uppercase tracking-wide text-slate-950 sm:text-2xl">
          {productTitle}
        </h2>
        <p className="font-mono text-base tabular-nums text-slate-600 sm:text-lg">
          <span className="text-slate-400">№</span> {ticketNumber}
        </p>
      </header>

      {/* Main: event info + QR (QR first on mobile) */}
      <div className="mb-6 grid gap-5 sm:grid-cols-[minmax(0,1fr)_160px] sm:items-start">
        <div className="order-2 min-w-0 sm:order-none">
          {whenLabel ? (
            <p className="text-lg font-bold leading-snug text-primary-600 sm:text-xl">
              {whenPrefix ? (
                <>
                  <span className="font-semibold text-primary-600/80">{whenPrefix}: </span>
                  {whenLabel}
                </>
              ) : (
                whenLabel
              )}
            </p>
          ) : null}
          {mainHeadline ? (
            <h3
              className={`text-xl font-bold leading-snug text-slate-950 sm:text-[22px] ${
                whenLabel ? 'mt-3' : ''
              }`}
            >
              {mainHeadline}
            </h3>
          ) : null}
          {venueTitle ? (
            <p
              className={`text-[15px] font-medium leading-6 text-slate-600 ${
                whenLabel || mainHeadline ? 'mt-3' : ''
              }`}
            >
              {venueTitle}
            </p>
          ) : null}
          {venueAddress ? (
            <p className="mt-1.5 text-[13px] leading-5 text-slate-500">{venueAddress}</p>
          ) : null}
          {!ticketIssuedSeparately ? (
            <p className="mt-3 text-xs leading-5 text-slate-400 print:hidden">
              Номер билета пока совпадает с кодом заказа. Отдельный номер будет выдан при подключении
              сканера музея.
            </p>
          ) : null}
        </div>

        <div className="order-1 flex flex-col items-center justify-self-center sm:order-none sm:justify-self-end">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrUrl}
            alt={`QR: ссылка на страницу билета ${orderCode}`}
            width={150}
            height={150}
            className="h-[150px] w-[150px] rounded-lg border border-slate-200 bg-white p-1.5"
          />
          <p className="mt-2 max-w-[11rem] text-center text-[11px] leading-4 text-slate-500">
            Покажите код на экране телефона или распечатайте
          </p>
        </div>
      </div>

      {/* Details */}
      <dl className="mb-6 space-y-0 rounded-xl bg-slate-50 px-4 py-4 sm:px-5 print:bg-transparent print:px-0">
        {buyerName ? (
          <div className="flex items-start justify-between gap-4 border-b border-black/[0.04] py-2 first:pt-0 last:border-b-0 last:pb-0">
            <dt className="shrink-0 text-[15px] text-slate-500">Посетитель</dt>
            <dd className="text-right text-[15px] font-semibold text-slate-900">{buyerName}</dd>
          </div>
        ) : null}
        {composition ? (
          <div className="flex items-start justify-between gap-4 border-b border-black/[0.04] py-2 first:pt-0 last:border-b-0 last:pb-0">
            <dt className="shrink-0 text-[15px] text-slate-500">Состав заказа</dt>
            <dd className="max-w-[65%] text-right text-[15px] font-semibold leading-6 text-slate-900">
              {composition}
            </dd>
          </div>
        ) : null}
        {order.amountRub != null ? (
          <div className="flex items-start justify-between gap-4 border-b border-black/[0.04] py-2 first:pt-0 last:border-b-0 last:pb-0">
            <dt className="shrink-0 text-[15px] text-slate-500">Итоговая стоимость</dt>
            <dd className="text-right text-lg font-bold text-slate-950">
              {formatNumber(order.amountRub)} ₽
            </dd>
          </div>
        ) : null}
        {ticketIssuedSeparately ? (
          <div className="flex items-start justify-between gap-4 border-b border-black/[0.04] py-2 first:pt-0 last:border-b-0 last:pb-0">
            <dt className="shrink-0 text-[15px] text-slate-500">Код заказа</dt>
            <dd className="font-mono text-right text-[15px] font-semibold tabular-nums text-slate-700">
              {orderCode}
            </dd>
          </div>
        ) : null}
        {purchaseAt ? (
          <div className="flex items-start justify-between gap-4 border-b border-black/[0.04] py-2 first:pt-0 last:border-b-0 last:pb-0">
            <dt className="shrink-0 text-[15px] text-slate-500">Дата покупки</dt>
            <dd className="text-right text-[15px] font-semibold text-slate-900">{purchaseAt}</dd>
          </div>
        ) : null}
        {order.email ? (
          <div className="flex items-start justify-between gap-4 border-b border-black/[0.04] py-2 first:pt-0 last:border-b-0 last:pb-0 print:hidden">
            <dt className="shrink-0 text-[15px] text-slate-500">Email</dt>
            <dd className="break-all text-right text-[15px] font-semibold text-slate-900">{order.email}</dd>
          </div>
        ) : null}
        {supportPhone ? (
          <div className="flex items-start justify-between gap-4 border-b border-black/[0.04] py-2 first:pt-0 last:border-b-0 last:pb-0">
            <dt className="shrink-0 text-[15px] text-slate-500">Телефон поддержки</dt>
            <dd className="text-right text-[15px] font-semibold text-slate-900">{supportPhone}</dd>
          </div>
        ) : null}
      </dl>

      {/* Warning */}
      <div className="mb-6 rounded-r-lg border-l-4 border-amber-400 bg-amber-50 px-4 py-3.5 text-[13px] leading-5 text-amber-950 print:bg-transparent">
        <p className="font-bold">Обратите внимание:</p>
        <ul className="mt-1.5 list-none space-y-1">
          <li>
            • Рекомендуем приходить за 15-20 минут до указанного времени.
            {openDate ? null : ' При опоздании билеты могут быть аннулированы.'}
          </li>
          <li>• Не публикуйте фотографии билета с открытым QR-кодом в интернете.</li>
        </ul>
      </div>

      {emailHint === 'sent' ? (
        <p className="mb-4 text-sm leading-6 text-emerald-800 print:hidden">
          Ссылка на билет отправлена на {order.email || 'ваш email'}.
        </p>
      ) : emailHint === 'skipped' ? (
        <p className="mb-4 rounded-xl bg-amber-50 px-3 py-2.5 text-sm leading-6 text-amber-900 print:hidden">
          Письмо пока не отправляется автоматически. Сохраните номер билета и ссылку на эту страницу -
          они нужны, чтобы открыть билет позже.
        </p>
      ) : null}

      {/* Actions */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-5 py-3 text-sm font-semibold text-white hover:bg-primary-700"
        >
          <Printer className="h-4 w-4" />
          Распечатать билет
        </button>
        <button
          type="button"
          onClick={() => void copyTicketCode()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-300"
        >
          <Copy className="h-4 w-4" />
          {copied ? 'Скопировано' : 'Копировать код'}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 print:hidden">
        <Link
          href="/account/purchases"
          className="inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        >
          Мои покупки
        </Link>
      </div>
    </article>
  );
}
