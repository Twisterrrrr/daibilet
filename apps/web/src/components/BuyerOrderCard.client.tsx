'use client';

import Link from 'next/link';
import type { MouseEvent } from 'react';
import { ArrowRight, CheckCircle2, Clock3, Download, ExternalLink, HelpCircle, MessageSquarePlus, XCircle } from 'lucide-react';

import { SITE_TIME_ZONE, parseSessionStartsAt } from '@/lib/datetime';
import {
  assessImportTicket,
  mapBuyerOrderToImportTicketRecord,
  orderEventHasStarted,
} from '@/lib/buyer-import-ticket';
import { upsertInternalOrderInStorage } from '@/lib/buyer-checkout';
import { buyerTicketPath, openBuyerTicketDownload } from '@/lib/buyer-ticket';
import { formatNumber } from '@/lib/format';

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
};

export function BuyerOrderCard({ order, accountEmail }: Props) {
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
  const showNativeTicketActions = isInternal;
  const showTicketActions = showNativeTicketActions || showImportTicketActions;

  const reviewHref = buildOrderReviewHref(order);
  const showReview = Boolean(reviewHref && orderEventHasStarted(order));

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

        {showTicketActions || showEmailFallback || showReview ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
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
    </article>
  );
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
      <a href="mailto:hello@daibilet.ru" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary-700 hover:text-primary-800">
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
