'use client';

import Link from 'next/link';
import { CheckCircle2, Clock3, Copy, Printer, Ticket } from 'lucide-react';
import { useCallback, useState } from 'react';

import { mapFinanceOrderStatus, type BuyerInternalOrderRecord } from '@/lib/buyer-checkout';
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
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);

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
      className={`buyer-ticket overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)] ${className}`}
    >
      <div className="relative grid gap-0 lg:grid-cols-[minmax(0,1fr)_200px]">
        <div className="border-b border-dashed border-slate-200 p-5 sm:p-6 lg:border-b-0 lg:border-r">
          <div className="flex flex-wrap items-center gap-2">
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

          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Дайбилет</p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">{productTitle}</h2>

          <div className="mt-5 rounded-xl bg-slate-50 px-4 py-3 sm:px-5 sm:py-4">
            <p className="text-xs font-medium text-slate-500">Код заказа</p>
            <p className="mt-1 font-mono text-3xl font-extrabold tracking-wide text-slate-950 sm:text-4xl">
              {orderCode}
            </p>
          </div>

          <div className="mt-3 rounded-xl border border-slate-100 px-4 py-3 sm:px-5">
            <p className="text-xs font-medium text-slate-500">Номер билета</p>
            <p className="mt-1 font-mono text-xl font-bold tracking-wide text-slate-900">{ticketNumber}</p>
            <p className="mt-1.5 text-xs leading-5 text-slate-500">
              {ticketIssuedSeparately
                ? 'Отдельный номер билета музея / площадки.'
                : 'Пока совпадает с кодом заказа. Отдельный номер будет выдан при подключении сканера музея.'}
            </p>
          </div>

          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            {order.amountRub != null ? (
              <div>
                <dt className="text-slate-500">Сумма</dt>
                <dd className="mt-0.5 text-lg font-bold text-slate-950">{formatNumber(order.amountRub)} ₽</dd>
              </div>
            ) : null}
            {order.email ? (
              <div className={order.amountRub != null ? '' : 'sm:col-span-2'}>
                <dt className="text-slate-500">Покупатель</dt>
                <dd className="mt-0.5 break-all font-semibold text-slate-800">{order.email}</dd>
              </div>
            ) : null}
          </dl>

          <p className="mt-5 text-sm leading-6 text-slate-600">
            {isPaid
              ? 'Покажите этот экран или распечатанный билет на входе. Сохраните код заказа и ссылку на страницу.'
              : 'После оплаты статус обновится. Сохраните код заказа и ссылку на билет.'}
          </p>

          {emailHint === 'sent' ? (
            <p className="mt-3 text-sm leading-6 text-emerald-800">
              Ссылка на билет отправлена на {order.email || 'ваш email'}.
            </p>
          ) : emailHint === 'skipped' ? (
            <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2.5 text-sm leading-6 text-amber-900">
              Письмо пока не отправляется автоматически. Сохраните код заказа выше и ссылку на эту страницу - они
              нужны, чтобы открыть билет позже.
            </p>
          ) : null}
        </div>

        <div className="flex flex-col items-center justify-center gap-3 bg-slate-50 p-5 sm:p-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrUrl}
            alt={`QR: ссылка на страницу билета ${orderCode}`}
            width={168}
            height={168}
            className="h-[168px] w-[168px] rounded-lg bg-white p-2 shadow-sm"
          />
          <p className="max-w-[11rem] text-center text-[11px] leading-4 text-slate-500">
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
