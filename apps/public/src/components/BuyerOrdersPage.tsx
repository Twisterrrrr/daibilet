import * as React from 'react';
import { ArrowRight, CheckCircle2, Clock3, HelpCircle, Loader2, Mail, Receipt, Search, ShieldCheck, Ticket, XCircle } from 'lucide-react';

import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { formatNumber } from '@/data';
import type { PublicBuyerOrder, PublicBuyerOrdersPayload } from '@/types';

import { API_BASE_URL } from '@/lib/api-base';const STORAGE_KEY = 'daibilet:last-order-lookup';

export function BuyerOrdersPage() {
  const [lookup, setLookup] = React.useState(() => window.localStorage.getItem(STORAGE_KEY) || '');
  const [submittedLookup, setSubmittedLookup] = React.useState(() => window.localStorage.getItem(STORAGE_KEY) || '');
  const [payload, setPayload] = React.useState<PublicBuyerOrdersPayload | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    document.title = 'Проверить заказ | Дайбилет';
    upsertMeta('description', 'Проверка статуса заказа и билета по номеру из письма-подтверждения. Регистрация не требуется.');
  }, []);

  React.useEffect(() => {
    if (!submittedLookup.trim()) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    setIsLoading(true);
    setError(null);

    fetch(`${API_BASE_URL}/api/public/orders?lookup=${encodeURIComponent(submittedLookup.trim())}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as PublicBuyerOrdersPayload;
      })
      .then((data) => {
        setPayload(data);
        window.localStorage.setItem(STORAGE_KEY, submittedLookup.trim());
      })
      .catch((requestError) => {
        if (!controller.signal.aborted) setError(requestError instanceof Error ? requestError.message : String(requestError));
      })
      .finally(() => {
        window.clearTimeout(timeout);
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [submittedLookup]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const value = lookup.trim();
    if (value.length < 4) {
      setPayload(null);
      setError('Введите минимум 4 символа.');
      return;
    }
    setSubmittedLookup(value);
  };

  const goSection = (section: string) => {
    if (section === 'top') window.location.href = '/';
    else if (section === 'events') window.location.href = '/events';
    else if (section === 'cities' || section === 'destinations') window.location.href = '/cities';
    else if (section === 'landings') window.location.href = '/podborki';
    else if (section === 'blog') window.location.href = '/blog';
    else window.location.href = `/#${section}`;
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header cityLabel="Все города" onSection={goSection} />
      <main>
        <section className="bg-gradient-to-br from-primary-700 via-primary-800 to-primary-950 text-white">
          <div className="container-page py-12 sm:py-16">
            <div className="flex flex-wrap items-center gap-2 text-sm text-primary-100/78">
              <a href="/" className="hover:text-white">Главная</a>
              <span>/</span>
              <span className="text-white">Проверить заказ</span>
            </div>
            <div className="mt-6 grid gap-7 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-end">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-sm font-semibold text-white/86">
                  <Receipt className="h-4 w-4" />
                  Статус покупки
                </div>
                <h1 className="mt-4 max-w-4xl text-4xl font-extrabold sm:text-5xl">Проверить заказ</h1>
                <p className="mt-4 max-w-3xl text-base leading-7 text-primary-50/88 sm:text-lg">
                  Введите номер заказа из письма после покупки в виджете. Оплата проходит в билетной системе — здесь только статус и билеты.
                </p>
              </div>
              <div className="rounded-xl bg-white/10 p-5 backdrop-blur-sm">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-200" />
                  <p className="text-sm leading-6 text-white/78">
                    Регистрация не нужна. Покупка через виджет работает без входа на Дайбилет.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container-page py-8 sm:py-10">
          <form onSubmit={submit} className="grid gap-3 rounded-2xl bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.10)] lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <label className="flex h-12 min-w-0 items-center gap-3 rounded-xl bg-slate-50 px-4 ring-1 ring-slate-200 focus-within:bg-white focus-within:ring-primary-300">
              <Search className="h-5 w-5 shrink-0 text-slate-400" />
              <input
                value={lookup}
                onChange={(event) => setLookup(event.target.value)}
                placeholder="Номер заказа из письма"
                className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-slate-400"
              />
            </label>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:cursor-wait disabled:opacity-70"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
              Найти заказ
            </button>
          </form>

          <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <Ticket className="h-4 w-4 text-slate-400" />
              Лучше всего — номер заказа из email-подтверждения
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Mail className="h-4 w-4 text-slate-400" />
              Также можно email или телефон покупателя
            </span>
          </div>

          <p className="mt-4 text-sm text-slate-500">
            Покупаете часто?{' '}
            <a href="/login?returnUrl=/account/purchases" className="font-medium text-primary-700 hover:text-primary-800">
              Войдите
            </a>
            , чтобы видеть все заказы на вашем email без повторного поиска.
          </p>

          {error ? <Notice tone="error" title="Не удалось найти заказ" text={error} /> : null}
          {!submittedLookup && !error ? <StartState /> : null}
          {submittedLookup && !isLoading && payload && payload.rows.length === 0 ? <EmptyState lookup={submittedLookup} /> : null}

          {payload && payload.rows.length > 0 ? (
            <div className="mt-8">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-950">Найдено {formatCount(payload.total, ['заказ', 'заказа', 'заказов'])}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatCount(payload.metrics.tickets, ['билет', 'билета', 'билетов'])} со статусом
                  </p>
                </div>
                <a href="mailto:hello@daibilet.ru" className="inline-flex items-center gap-2 text-sm font-semibold text-primary-700 hover:text-primary-800">
                  Нужна помощь <ArrowRight className="h-4 w-4" />
                </a>
              </div>

              <div className="grid gap-4">
                {payload.rows.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </main>
      <Footer />
    </div>
  );
}

export function BuyerOrderCard({ order }: { order: PublicBuyerOrder }) {
  return <OrderCard order={order} />;
}

function OrderCard({ order }: { order: PublicBuyerOrder }) {
  return (
    <article className="overflow-hidden rounded-2xl bg-white shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
      <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill order={order} />
            {order.providerName ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Покупка в {order.providerName}</span> : null}
          </div>
          <h2 className="mt-3 text-xl font-bold text-slate-950">Заказ №{order.number}</h2>
          {order.eventTitle ? (
            order.eventUrl ? (
              <a href={order.eventUrl} className="mt-2 inline-flex items-center gap-1 text-base font-semibold text-primary-700 hover:text-primary-800">
                {order.eventTitle}
                <ArrowRight className="h-4 w-4" />
              </a>
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
            {order.tickets.map((ticket) => (
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
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{ticket.displayStatus}</span>
              </div>
            ))}
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

function StatusPill({ order }: { order: PublicBuyerOrder }) {
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

function StartState() {
  return (
    <div className="mt-8 rounded-2xl bg-slate-50 p-8 text-center">
      <Receipt className="mx-auto h-10 w-10 text-slate-300" />
      <h2 className="mt-3 text-xl font-bold text-slate-950">Введите номер заказа</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
        Код приходит на email после покупки в виджете Ticketscloud или Teplohod. Мы покажем статус, когда заказ синхронизируется с билетной системой.
      </p>
    </div>
  );
}

export function BuyerOrdersEmptyState({ lookup }: { lookup: string }) {
  return <EmptyState lookup={lookup} />;
}

function EmptyState({ lookup }: { lookup: string }) {
  return (
    <div className="mt-8 rounded-2xl bg-slate-50 p-8 text-center">
      <HelpCircle className="mx-auto h-10 w-10 text-slate-300" />
      <h2 className="mt-3 text-xl font-bold text-slate-950">Заказ не найден</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
        По запросу “{lookup}” ничего нет. Проверьте номер заказа или используйте email/телефон, указанный при покупке.
      </p>
      <a href="mailto:hello@daibilet.ru" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary-700 hover:text-primary-800">
        Написать в поддержку <ArrowRight className="h-4 w-4" />
      </a>
    </div>
  );
}

function Notice({ tone, title, text }: { tone: 'error'; title: string; text: string }) {
  const className = tone === 'error' ? 'bg-red-50 text-red-800' : 'bg-slate-50 text-slate-800';
  return (
    <div className={`mt-6 rounded-xl p-4 ${className}`}>
      <div className="font-semibold">{title}</div>
      <div className="mt-1 text-sm opacity-80">{text}</div>
    </div>
  );
}

function formatSessionDateTime(value?: string | null): string {
  if (!value) return 'не указан';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'не указан';
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Moscow',
  }).format(date);
}

function formatPurchaseDateTime(value?: string | null): string {
  if (!value) return 'не указана';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'не указана';
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Moscow',
  }).format(date);
}

function formatCount(count: number, forms: [string, string, string]): string {
  const mod10 = Math.abs(count) % 10;
  const mod100 = Math.abs(count) % 100;
  const form = mod100 >= 11 && mod100 <= 19 ? forms[2] : mod10 === 1 ? forms[0] : mod10 >= 2 && mod10 <= 4 ? forms[1] : forms[2];
  return `${formatNumber(count)} ${form}`;
}

function upsertMeta(name: string, content: string) {
  let element = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.name = name;
    document.head.appendChild(element);
  }
  element.content = content;
}
