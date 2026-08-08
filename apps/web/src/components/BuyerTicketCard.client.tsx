'use client';

import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Clock3, Copy, Download } from 'lucide-react';
import { useCallback, useState, type ReactNode } from 'react';

import { DaibiletLogo } from '@/components/DaibiletLogo';
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
import {
  OPEN_DATE_HOURS_HOLIDAY_NOTE,
  OPEN_DATE_HOURS_UNKNOWN_NOTE,
  SESSION_ARRIVE_EARLY_NOTE,
  resolveTicketOpeningHours,
} from '@/lib/venue-opening-hours';

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

function DetailRow({
  label,
  value,
  valueClassName = '',
  className = '',
}: {
  label: string;
  value: ReactNode;
  valueClassName?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col gap-0.5 border-b border-black/[0.04] py-2.5 first:pt-0 last:border-b-0 last:pb-0 min-[500px]:flex-row min-[500px]:items-start min-[500px]:justify-between min-[500px]:gap-4 ${className}`}
    >
      <dt className="shrink-0 text-sm text-slate-500 min-[500px]:text-[15px]">{label}</dt>
      <dd
        className={`min-w-0 text-sm font-semibold leading-6 text-slate-900 min-[500px]:max-w-[70%] min-[500px]:text-right min-[500px]:text-[15px] ${valueClassName}`}
      >
        {value}
      </dd>
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
  // Prefer real ticket/order code in QR when issued or imported; do not invent a fake barcode.
  const qrPayload =
    order.mode === 'WIDGET_IMPORT' || ticketIssuedSeparately ? ticketNumber : ticketUrl;
  const qrUrl = buyerTicketQrImageUrl(qrPayload, 180);
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
  const openingHoursText = openDate
    ? resolveTicketOpeningHours({
        venueSlug: order.venueSlug,
        venueOpeningHours: order.venueOpeningHours,
      })
    : null;
  const openDateNotice = openDate
    ? openingHoursText
      ? OPEN_DATE_HOURS_HOLIDAY_NOTE
      : OPEN_DATE_HOURS_UNKNOWN_NOTE
    : SESSION_ARRIVE_EARLY_NOTE;

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
      className={`buyer-ticket w-full max-w-[650px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.05)] min-[500px]:mx-auto min-[500px]:p-6 min-[640px]:p-7 print:mx-0 print:max-w-none print:rounded-none print:border print:border-slate-300 print:p-[12mm] print:shadow-none ${className}`}
      data-buyer-ticket
    >
      {/* Print brand row - hidden on screen so mobile QR stays uncrowded */}
      <div
        className="mb-4 hidden items-center justify-between border-b border-slate-200 pb-3 print:mb-[6mm] print:flex print:pb-[3mm]"
        data-buyer-ticket-brand
      >
        <DaibiletLogo textClassName="text-xl tracking-tight" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Электронный билет
        </span>
      </div>

      {/* Status chips - screen only */}
      <div className="mb-3 flex flex-wrap items-center gap-2 print:hidden min-[500px]:mb-4">
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
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b-2 border-dashed border-slate-200 pb-4 min-[500px]:mb-5 min-[500px]:pb-5">
        <h2 className="font-display text-lg font-extrabold uppercase tracking-wide text-slate-950 min-[500px]:text-xl min-[640px]:text-2xl">
          {productTitle}
        </h2>
        <p className="font-mono text-sm tabular-nums text-slate-600 min-[500px]:text-base min-[640px]:text-lg">
          <span className="text-slate-400">№</span> {ticketNumber}
        </p>
      </header>

      {/*
        Layout (owner / mockup max-width: 500px):
        - <500px phone: QR top-center under ticket number, text below (scan without scroll)
        - ≥500px tablet/desktop + print: text left, QR right
      */}
      <div className="buyer-ticket-main mb-5 grid grid-cols-1 gap-4 min-[500px]:mb-6 min-[500px]:grid-cols-[minmax(0,1fr)_160px] min-[500px]:items-start min-[500px]:gap-5 print:mb-5 print:grid-cols-[minmax(0,1fr)_160px] print:items-start print:gap-5">
        <div className="buyer-ticket-info order-2 min-w-0 min-[500px]:order-none print:order-none">
          {whenLabel ? (
            <p className="text-base font-bold leading-snug text-primary-600 min-[500px]:text-lg min-[640px]:text-xl">
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
              className={`text-lg font-bold leading-snug text-slate-950 min-[500px]:text-xl min-[640px]:text-[22px] ${
                whenLabel ? 'mt-2 min-[500px]:mt-3' : ''
              }`}
            >
              {mainHeadline}
            </h3>
          ) : null}
          {venueTitle ? (
            <p
              className={`text-[15px] font-medium leading-6 text-slate-600 ${
                whenLabel || mainHeadline ? 'mt-2 min-[500px]:mt-3' : ''
              }`}
            >
              {venueTitle}
            </p>
          ) : null}
          {venueAddress ? (
            <p className="mt-1 text-[13px] leading-5 text-slate-500">{venueAddress}</p>
          ) : null}
          {!ticketIssuedSeparately ? (
            <p className="mt-2 text-xs leading-5 text-slate-400 print:hidden min-[500px]:mt-3">
              Номер билета пока совпадает с кодом заказа. Отдельный номер будет выдан при подключении
              сканера музея.
            </p>
          ) : null}
        </div>

        <div className="buyer-ticket-qr order-1 flex flex-col items-center justify-self-center min-[500px]:order-none min-[500px]:justify-self-end print:order-none print:justify-self-end">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrUrl}
            alt={`QR: ссылка на страницу билета ${orderCode}`}
            width={160}
            height={160}
            className="h-[160px] w-[160px] rounded-lg border border-slate-200 bg-white p-1.5 min-[500px]:h-[150px] min-[500px]:w-[150px] print:h-[150px] print:w-[150px] print:border-slate-400"
          />
          <p className="mt-2 max-w-[12rem] text-center text-[11px] leading-4 text-slate-500 print:text-[10px]">
            Покажите код на экране телефона или распечатайте
          </p>
        </div>
      </div>

      {/* Details */}
      <dl className="mb-5 rounded-xl bg-slate-50 px-3.5 py-3.5 min-[500px]:mb-6 min-[500px]:px-5 min-[500px]:py-4 print:mb-5 print:rounded-none print:bg-transparent print:px-0 print:py-1">
        {openingHoursText ? (
          <DetailRow
            label="Часы работы"
            value={
              <span className="whitespace-pre-line text-left min-[500px]:text-right">{openingHoursText}</span>
            }
          />
        ) : null}
        {buyerName ? <DetailRow label="Посетитель" value={buyerName} /> : null}
        {composition ? <DetailRow label="Состав заказа" value={composition} /> : null}
        {order.amountRub != null ? (
          <DetailRow
            label="Итоговая стоимость"
            value={`${formatNumber(order.amountRub)} ₽`}
            valueClassName="text-base font-bold text-slate-950 min-[500px]:text-lg"
          />
        ) : null}
        {ticketIssuedSeparately ? (
          <DetailRow
            label="Код заказа"
            value={orderCode}
            valueClassName="font-mono tabular-nums text-slate-700"
          />
        ) : null}
        {purchaseAt ? <DetailRow label="Дата покупки" value={purchaseAt} /> : null}
        {order.email ? (
          <DetailRow label="Email" value={order.email} className="print:hidden" valueClassName="break-all" />
        ) : null}
        {supportPhone ? <DetailRow label="Телефон поддержки" value={supportPhone} /> : null}
      </dl>

      {/* Warning */}
      <div className="mb-5 rounded-r-lg border-l-4 border-amber-400 bg-amber-50 px-3.5 py-3 text-[13px] leading-5 text-amber-950 min-[500px]:mb-6 min-[500px]:px-4 min-[500px]:py-3.5 print:mb-0 print:border-l-2 print:border-slate-400 print:bg-transparent print:px-3 print:py-2">
        <p className="font-bold">Обратите внимание:</p>
        <ul className="mt-1.5 list-none space-y-1">
          <li>• {openDateNotice}</li>
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

      {/* Actions - never print (ink / form) */}
      <div
        className="grid grid-cols-1 gap-3 min-[500px]:grid-cols-2 print:hidden"
        data-buyer-ticket-actions
      >
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary-600 px-5 py-3 text-sm font-semibold text-white hover:bg-primary-700"
        >
          <Download className="h-4 w-4" />
          Скачать / распечатать
        </button>
        <button
          type="button"
          onClick={() => void copyTicketCode()}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-300"
        >
          <Copy className="h-4 w-4" />
          {copied ? 'Скопировано' : 'Копировать код'}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 print:hidden" data-buyer-ticket-actions>
        <Link
          href="/account/purchases"
          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Вернуться в покупки
        </Link>
      </div>
    </article>
  );
}
