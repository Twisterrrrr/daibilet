'use client';

import Link from 'next/link';
import { ArrowRight, CheckCircle2, Clock3, HelpCircle, XCircle } from 'lucide-react';

import { SITE_TIME_ZONE, parseSessionStartsAt } from '@/lib/datetime';
import { formatNumber } from '@/lib/format';

export type BuyerOrder = {
  id: string;
  number: string;
  status: string;
  displayStatus: string;
  statusTone: string;
  providerName?: string | null;
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

export function BuyerOrderCard({ order }: { order: BuyerOrder }) {
  return (
    <article className="overflow-hidden rounded-2xl bg-white shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
      <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill order={order} />
            {order.providerName ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Покупка в {order.providerName}</span>
            ) : null}
          </div>
          <h2 className="mt-3 text-xl font-bold text-slate-950">Заказ №{order.number}</h2>
          {order.eventTitle ? (
            order.eventUrl ? (
              <Link href={order.eventUrl} className="mt-2 inline-flex items-center gap-1 text-base font-semibold text-primary-700 hover:text-primary-800">
                {order.eventTitle}
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <p className="mt-2 text-base font-semibold text-slate-800">{order.eventTitle}</p>
            )
          ) : null}
          {order.message ? <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">{order.message}</p> : null}
        </div>

        <dl className="grid gap-2 rounded-xl bg-slate-50 p-4 text-sm">
          <InfoRow label="Покупатель" value={order.buyer.name || 'не указан'} />
          <InfoRow label="Email" value={order.buyer.email || '-'} />
          <InfoRow label="Телефон" value={order.buyer.phone || '-'} />
          <InfoRow label="Дата покупки" value={formatPurchaseDateTime(order.purchasedAt)} />
          {order.amountRub ? <InfoRow label="Сумма" value={`${formatNumber(order.amountRub)} ₽`} /> : null}
        </dl>
      </div>

      <div className="bg-slate-50/70 px-5 py-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-800">Билеты</h3>
          <span className="text-xs font-semibold text-slate-500">{formatCount(order.ticketCount, ['билет', 'билета', 'билетов'])}</span>
        </div>
        {order.tickets.length ? (
          <div className="grid gap-2">
            {order.tickets.map((ticket) => {
              const reviewHref = buildReviewWriteHref({
                eventId: ticket.eventId || order.eventId || '',
                eventUrl: ticket.eventUrl || order.eventUrl || '',
                eventTitle: ticket.eventTitle || order.eventTitle || '',
                orderRef: ticket.number || order.number,
                email: order.buyer.email || '',
                name: order.buyer.name || '',
              });
              return (
                <div key={ticket.id} className="grid gap-2 rounded-xl bg-white p-3 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900">{ticket.number || 'Билет без номера'}</div>
                    <div className="mt-1 text-xs text-slate-500">{ticket.eventTitle || order.eventTitle || 'Событие уточняется'}</div>
                    {ticket.startsAt ? (
                      <div className="mt-1 text-xs text-slate-600">
                        <span className="text-slate-400">Сеанс:</span> {formatSessionDateTime(ticket.startsAt)}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{ticket.displayStatus}</span>
                    {reviewHref ? (
                      <Link
                        href={reviewHref}
                        className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700 hover:bg-primary-100"
                      >
                        Оставить отзыв
                      </Link>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="rounded-xl bg-white p-4 text-sm leading-6 text-slate-500">
            Билеты по этому заказу пока не найдены. Для отмененных или истекших заказов это нормально; для активного заказа оператор сверит статус по номеру.
          </p>
        )}
      </div>
    </article>
  );
}

export function BuyerOrdersEmptyState({ lookup }: { lookup: string }) {
  return (
    <div className="mt-8 rounded-2xl bg-slate-50 p-8 text-center">
      <HelpCircle className="mx-auto h-10 w-10 text-slate-300" />
      <h2 className="mt-3 text-xl font-bold text-slate-950">Заказов пока нет</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
        По email «{lookup}» заказов не найдено. Убедитесь, что при покупке в виджете указан тот же email, что и в аккаунте.
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
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${className}`}>
      <Icon className="h-3.5 w-3.5" />
      {order.displayStatus}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd className="min-w-0 whitespace-normal break-words text-right font-semibold text-slate-800">{value}</dd>
    </div>
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
  if (!value) return 'не указана';
  const date = parseSessionStartsAt(value);
  if (Number.isNaN(date.getTime())) return 'не указана';
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
