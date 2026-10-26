'use client';

import Link from 'next/link';
import type { MouseEvent } from 'react';
import { ArrowRight, CheckCircle2, Clock3, Download, ExternalLink, HelpCircle, Mail, MessageSquarePlus, XCircle } from 'lucide-react';

import { SITE_TIME_ZONE, parseSessionStartsAt } from '@/lib/datetime';
import {
  assessImportTicket,
  mapBuyerOrderToImportTicketRecord,
  orderEventHasStarted,
} from '@/lib/buyer-import-ticket';
import { upsertInternalOrderInStorage } from '@/lib/buyer-checkout';
import { buyerTicketPath, openBuyerTicketDownload } from '@/lib/buyer-ticket';
import { formatNumber } from '@/lib/format';
import { requestBuyerRefund } from '@/lib/user-api';
import { useState } from 'react';

/** Product support inbox (ContactForm + empty-state mailto). */
export const BUYER_SUPPORT_EMAIL = 'info@daibilet.ru';

export const ORDER_SUPPORT_HINT =
  'Возврат по правилам площадки. Ответим в рабочие часы.';

export type BuyerOrder = {
  id: string;
  number: string;
  status: string;
  displayStatus: string;
  statusTone: string;
  providerName?: string | null;
  /** widget = TC/TEP ExternalOrder; internal = CheckoutOrder / Daibilet */
  sourceKind?: 'widget' | 'internal';
  buyer: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  eventId?: string | null;
  eventTitle?: string | null;
  eventUrl?: string | null;
  purchasedAt?: string | null;
  amountRub?: number | null;
  ticketCount: number;
  message?: string | null;
  refundRequests?: Array<{
    id: string;
    status: string;
    amountKopecks: number;
    currency: string;
    reason: string;
    reasonNote?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
    processedAt?: string | null;
  }>;
  tickets: Array<{
    id: string;
    number?: string | null;
    displayStatus: string;
    eventId?: string | null;
    eventTitle?: string | null;
    eventUrl?: string | null;
    startsAt?: string | null;
  }>;
};

type Props = {
  order: BuyerOrder;
  /** Unmasked account email (API masks buyer.email on widget rows). */
  accountEmail?: string | null;
  accessToken?: string | null;
};

export function BuyerOrderCard({ order, accountEmail, accessToken }: Props) {
  const [refundFormOpen, setRefundFormOpen] = useState(false);
  const [refundConfirm, setRefundConfirm] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [submittedRefund, setSubmittedRefund] = useState<{ status: string; amountKopecks: number } | null>(null);
  const isInternal = order.sourceKind === 'internal';
  const title = order.eventTitle || (isInternal ? 'Входной билет' : 'Заказ');
  const purchaseLabel = formatPurchaseDateTime(order.purchasedAt);
  const amountLabel = order.amountRub != null ? `${formatNumber(order.amountRub)} ₽` : null;
  const ticketRows = order.tickets.length
    ? order.tickets
    : [
        {
          id: `${order.id}:fallback`,
          number: order.number,
          displayStatus: order.displayStatus,
          eventId: order.eventId,
          eventTitle: order.eventTitle,
          eventUrl: order.eventUrl,
          startsAt: null as string | null,
        },
      ];

  const profileEmail = String(accountEmail || '').trim() || String(order.buyer.email || '').trim();
  const importAssessment = !isInternal ? assessImportTicket(order) : null;
  const showImportTicketActions = Boolean(importAssessment && importAssessment.richness === 'rich');
  const showEmailFallback = Boolean(importAssessment && importAssessment.richness === 'sparse');
  const showNativeTicketActions = isInternal && ['CONFIRMED', 'FULFILLED', 'SUCCEEDED', 'PAID'].includes(String(order.status || '').toUpperCase());
  const showTicketActions = showNativeTicketActions || showImportTicketActions;
  const latestRefund = order.refundRequests?.[0] || null;
  const displayedRefund = submittedRefund || latestRefund;
  const refundIsOpen = Boolean(displayedRefund && ['CREATED', 'APPROVED', 'PROCESSING'].includes(displayedRefund.status));
  const hasCompletedRefund = Boolean(displayedRefund && displayedRefund.status === 'COMPLETED');
  const canRequestRefund = Boolean(
    accessToken && isInternal && (!displayedRefund || ['REJECTED', 'FAILED'].includes(displayedRefund.status)) && ['CONFIRMED', 'FULFILLED', 'SUCCEEDED', 'PAID'].includes(String(order.status).toUpperCase()),
  );

  const reviewHref = buildOrderReviewHref(order);
  const showReview = Boolean(reviewHref && orderEventHasStarted(order));
  const supportMailto = buildOrderSupportMailto(order, profileEmail);
  const showActions = showTicketActions || showEmailFallback || showReview || Boolean(supportMailto);

  const openImportTicket = () => {
    const record = mapBuyerOrderToImportTicketRecord(order, profileEmail);
    if (!record) return;
    upsertInternalOrderInStorage(record);
    return record.publicCode;
  };

  const onDownload = () => {
    if (isInternal) {
      openBuyerTicketDownload(order.number);
      return;
    }
    const code = openImportTicket();
    if (code) openBuyerTicketDownload(code);
  };

  const ticketOpenHref = (() => {
    if (isInternal) return buyerTicketPath(order.number);
    const record = mapBuyerOrderToImportTicketRecord(order, profileEmail);
    return record ? buyerTicketPath(record.publicCode) : null;
  })();

  const onOpenImport = (event: MouseEvent<HTMLAnchorElement>) => {
    if (isInternal) return;
    const code = openImportTicket();
    if (!code) {
      event.preventDefault();
    }
  };

  const submitRefundRequest = async () => {
    if (!accessToken || !order.number) return;
    setRefundLoading(true);
    setRefundError(null);
    try {
      const result = await requestBuyerRefund(accessToken, order.number, refundReason.trim());
      setSubmittedRefund({ status: result.status, amountKopecks: result.amountKopecks });
      setRefundFormOpen(false);
      setRefundConfirm(false);
      setRefundReason('');
    } catch (error) {
      setRefundError(refundRequestErrorLabel(error instanceof Error ? error.message : String(error)));
    } finally {
      setRefundLoading(false);
    }
  };

  return (
    <article
      className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.04)]"
      data-buyer-order-row
    >
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill order={order} />
            {isInternal ? (
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                Дайбилет
              </span>
            ) : order.providerName ? (
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                {order.providerName}
              </span>
            ) : null}
            <span className="font-mono text-[11px] tabular-nums text-slate-400">№{order.number}</span>
          </div>
          <div className="mt-1.5 min-w-0">
            {order.eventUrl ? (
              <Link
                href={order.eventUrl}
                className="line-clamp-1 text-sm font-semibold text-slate-950 hover:text-primary-700"
              >
                {title}
              </Link>
            ) : (
              <p className="line-clamp-1 text-sm font-semibold text-slate-950">{title}</p>
            )}
            <p className="mt-0.5 text-xs text-slate-500">
              {purchaseLabel}
              {amountLabel ? ` · ${amountLabel}` : ''}
              {` · ${formatCount(order.ticketCount || ticketRows.length, ['билет', 'билета', 'билетов'])}`}
            </p>
          </div>
        </div>

        {showActions ? (
          <div className="flex shrink-0 flex-col items-stretch gap-1.5 sm:items-end">
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              {showTicketActions ? (
                <>
                  <button
                    type="button"
                    onClick={onDownload}
                    className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-primary-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-primary-700"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Скачать
                  </button>
                  {ticketOpenHref ? (
                    <Link
                      href={ticketOpenHref}
                      onClick={onOpenImport}
                      className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-primary-200 bg-white px-3 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-50"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Открыть
                    </Link>
                  ) : null}
                </>
              ) : null}

              {showEmailFallback ? (
                <p className="max-w-[16rem] text-xs leading-5 text-slate-600 sm:text-right">
                  Билет отправлен на e-mail {profileEmail || 'указанный при покупке'}. Проверьте входящие и
                  папку «Спам».
                </p>
              ) : null}

              {showReview && reviewHref ? (
                <Link
                  href={reviewHref}
                  className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-primary-200 bg-white px-3 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-50"
                >
                  <MessageSquarePlus className="h-3.5 w-3.5" />
                  Отзыв
                </Link>
              ) : null}

              {supportMailto ? (
                <a
                  href={supportMailto}
                  className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
                >
                  <Mail className="h-3.5 w-3.5" />
                  Вопрос по заказу
                </a>
              ) : null}
            </div>
            {supportMailto ? (
              <p className="max-w-[22rem] text-[11px] leading-4 text-slate-400 sm:text-right">{ORDER_SUPPORT_HINT}</p>
            ) : null}
          </div>
        ) : null}
      </div>

      {ticketRows.length > 1 || (!isInternal && order.tickets.length > 0) ? (
        <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-2">
          <ul className="divide-y divide-slate-100/80">
            {ticketRows.map((ticket) => (
              <li
                key={ticket.id}
                className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 py-2 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-800">
                    {ticket.number || 'Билет без номера'}
                    {ticket.startsAt ? (
                      <span className="ml-2 font-normal text-slate-500">
                        {formatSessionDateTime(ticket.startsAt)}
                      </span>
                    ) : null}
                  </p>
                  {(ticket.eventTitle || order.eventTitle) && ticket.eventTitle !== order.eventTitle ? (
                    <p className="mt-0.5 truncate text-[11px] text-slate-500">
                      {ticket.eventTitle || order.eventTitle}
                    </p>
                  ) : null}
                </div>
                <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200/80">
                  {ticket.displayStatus}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {!order.tickets.length && !isInternal ? (
        <p className="border-t border-slate-100 px-4 py-2.5 text-xs leading-5 text-slate-500">
          Билеты по этому заказу пока не найдены. Для отмененных или истекших заказов это нормально.
        </p>
      ) : null}

      {displayedRefund ? (
        <div className="border-t border-amber-100 bg-amber-50/70 px-4 py-3 text-xs leading-5 text-amber-950">
          <span className="font-semibold">Заявка на возврат: {refundStatusLabel(displayedRefund.status)}.</span>{' '}
          {displayedRefund.amountKopecks > 0 ? `Сумма ${formatNumber(displayedRefund.amountKopecks / 100)} ₽. ` : ''}
          {refundIsOpen ? 'Это запрос на рассмотрение, деньги ещё не возвращены.' : hasCompletedRefund ? 'Возврат подтверждён, билет недействителен.' : 'Можно отправить новый запрос.'}
        </div>
      ) : null}

      {canRequestRefund ? (
        <div className="border-t border-slate-100 px-4 py-3">
          {!refundFormOpen ? (
            <button type="button" onClick={() => setRefundFormOpen(true)} className="text-sm font-semibold text-primary-700 hover:text-primary-800">
              Запросить полный возврат
            </button>
          ) : (
            <div className="max-w-xl rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-900">Запрос на полный возврат</h3>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                Сумма заказа: {amountLabel || 'не рассчитана'}. Запрос уйдёт на рассмотрение; деньги не списываются и не возвращаются этой формой.
              </p>
              <label className="mt-3 grid gap-1 text-xs font-medium text-slate-700">
                Причина запроса
                <textarea value={refundReason} onChange={(event) => setRefundReason(event.target.value)} maxLength={500} minLength={5} className="min-h-20 rounded-lg border border-slate-300 p-2 text-sm font-normal" placeholder="Опишите причину (от 5 до 500 символов)" />
              </label>
              {refundError ? <p role="alert" className="mt-2 text-xs text-red-700">{refundError}</p> : null}
              {refundConfirm ? (
                <div className="mt-3 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-950">
                  Подтвердите отправку запроса на полный возврат. После рассмотрения статус обновится в этом заказе.
                </div>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {refundConfirm ? (
                  <button type="button" disabled={refundLoading} onClick={() => void submitRefundRequest()} className="rounded-lg bg-primary-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
                    {refundLoading ? 'Отправляем…' : 'Отправить запрос'}
                  </button>
                ) : (
                  <button type="button" disabled={refundReason.trim().length < 5} onClick={() => setRefundConfirm(true)} className="rounded-lg bg-primary-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
                    Продолжить
                  </button>
                )}
                <button type="button" disabled={refundLoading} onClick={() => { setRefundFormOpen(false); setRefundConfirm(false); setRefundError(null); }} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">Отмена</button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </article>
  );
}

function refundStatusLabel(status: string): string {
  switch (status) {
    case 'CREATED': return 'на рассмотрении';
    case 'APPROVED': return 'одобрена, ожидает исполнения';
    case 'PROCESSING': return 'обрабатывается';
    case 'COMPLETED': return 'завершена';
    case 'REJECTED': return 'отклонена';
    case 'FAILED': return 'не выполнена';
    default: return 'обновляется';
  }
}

function refundRequestErrorLabel(error: string): string {
  if (error === 'refund_request_blocked') return 'Этот заказ сейчас нельзя отправить на возврат. Обратитесь в поддержку.';
  if (error === 'checkout_order_not_found') return 'Заказ не найден или недоступен для этого аккаунта.';
  if (error === 'refund_reason_note_invalid') return 'Укажите причину длиной от 5 до 500 символов.';
  return 'Не удалось отправить запрос. Попробуйте позже.';
}

export function BuyerOrdersEmptyState({ lookup }: { lookup: string }) {
  return (
    <div className="mt-8 rounded-2xl bg-slate-50 p-8 text-center">
      <HelpCircle className="mx-auto h-10 w-10 text-slate-300" />
      <h2 className="mt-3 text-xl font-bold text-slate-950">Заказов пока нет</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
        По email «{lookup}» заказов не найдено. Убедитесь, что при покупке (виджет или Дайбилет) указан тот же email, что и в
        аккаунте.
      </p>
      <a href={`mailto:${BUYER_SUPPORT_EMAIL}`} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary-700 hover:text-primary-800">
        Написать в поддержку <ArrowRight className="h-4 w-4" />
      </a>
    </div>
  );
}

function StatusPill({ order }: { order: BuyerOrder }) {
  const styles = {
    live: 'bg-emerald-100 text-emerald-800',
    ready: 'bg-sky-100 text-sky-800',
    error: 'bg-red-100 text-red-800',
    archived: 'bg-slate-100 text-slate-600',
    incomplete: 'bg-amber-100 text-amber-800',
  };
  const Icon = order.statusTone === 'live' ? CheckCircle2 : order.statusTone === 'error' ? XCircle : Clock3;
  const className = styles[order.statusTone as keyof typeof styles] || styles.incomplete;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${className}`}>
      <Icon className="h-3 w-3" />
      {order.displayStatus}
    </span>
  );
}

function formatSessionDateTime(value?: string | null): string {
  if (!value) return 'не указан';
  const date = parseSessionStartsAt(value);
  if (Number.isNaN(date.getTime())) return 'не указан';
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: SITE_TIME_ZONE,
  }).format(date);
}

function formatPurchaseDateTime(value?: string | null): string {
  if (!value) return 'дата не указана';
  const date = parseSessionStartsAt(value);
  if (Number.isNaN(date.getTime())) return 'дата не указана';
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: SITE_TIME_ZONE,
  }).format(date);
}

function formatCount(count: number, forms: [string, string, string]): string {
  const mod10 = Math.abs(count) % 10;
  const mod100 = Math.abs(count) % 100;
  const form = mod100 >= 11 && mod100 <= 19 ? forms[2] : mod10 === 1 ? forms[0] : mod10 >= 2 && mod10 <= 4 ? forms[1] : forms[2];
  return `${formatNumber(count)} ${form}`;
}

function extractSlugFromEventUrl(eventUrl: string): string {
  try {
    const path = eventUrl.startsWith('http') ? new URL(eventUrl).pathname : eventUrl;
    const match = path.match(/\/events\/([^/?#]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  } catch {
    return '';
  }
}

function buildOrderSupportMailto(order: BuyerOrder, accountEmail?: string | null): string {
  const orderCode = String(order.number || '').trim();
  const eventTitle = String(order.eventTitle || '').trim() || (order.sourceKind === 'internal' ? 'Входной билет' : 'Заказ');
  const email = String(accountEmail || order.buyer.email || '').trim();
  const ticketCodes = Array.from(
    new Set(
      order.tickets
        .map((ticket) => String(ticket.number || '').trim())
        .filter((code) => Boolean(code) && code !== orderCode),
    ),
  );
  if (!ticketCodes.length) {
    const fallback = String(order.tickets[0]?.number || '').trim();
    if (fallback && fallback !== orderCode) ticketCodes.push(fallback);
  }

  const subject = `[Вопрос по заказу] ${orderCode || 'без кода'}`;
  const body = [
    'Здравствуйте!',
    '',
    'У меня вопрос по заказу.',
    '',
    orderCode ? `Код заказа: ${orderCode}` : null,
    ticketCodes.length ? `Коды билетов: ${ticketCodes.join(', ')}` : null,
    `Событие: ${eventTitle}`,
    email ? `Email покупателя: ${email}` : null,
    order.providerName ? `Площадка / провайдер: ${order.providerName}` : null,
    '',
    'Суть вопроса:',
    '',
  ]
    .filter((line) => line != null)
    .join('\n');

  return `mailto:${BUYER_SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function buildOrderReviewHref(order: BuyerOrder): string | null {
  const primary =
    order.tickets.find((ticket) => ticket.eventId || ticket.eventUrl) || order.tickets[0] || null;
  return buildReviewWriteHref({
    eventId: primary?.eventId || order.eventId || '',
    eventUrl: primary?.eventUrl || order.eventUrl || '',
    eventTitle: primary?.eventTitle || order.eventTitle || '',
    orderRef: primary?.number || order.number,
    email: order.buyer.email || '',
    name: order.buyer.name || '',
  });
}

function buildReviewWriteHref(input: {
  eventId?: string;
  eventUrl?: string;
  eventTitle: string;
  orderRef: string;
  email: string;
  name: string;
}): string | null {
  const params = new URLSearchParams();
  const slug = input.eventUrl ? extractSlugFromEventUrl(input.eventUrl) : '';
  if (input.eventId) params.set('eventId', input.eventId);
  if (slug) params.set('eventSlug', slug);
  if (input.eventTitle) params.set('eventTitle', input.eventTitle);
  if (input.orderRef) params.set('orderRef', input.orderRef);
  if (input.email) params.set('email', input.email);
  if (input.name) params.set('name', input.name);
  if (!input.eventId && !slug) return null;
  return `/reviews/write?${params.toString()}`;
}
