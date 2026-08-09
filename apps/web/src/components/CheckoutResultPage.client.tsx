'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowRight, CheckCircle2, Clock3, Loader2, RefreshCw, Ticket, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { formatNumber } from '@/lib/format';
import { fetchPublicCheckoutOrder, type PublicCheckoutOrder } from '@/lib/public-checkout-api';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

const POLL_INTERVAL_MS = 6000;

export function CheckoutResultPageView({ initialOrderCode }: { initialOrderCode: string }) {
  const orderCode = initialOrderCode.trim();
  const [state, setState] = useState<LoadState>(orderCode ? 'loading' : 'error');
  const [order, setOrder] = useState<PublicCheckoutOrder | null>(null);
  const [error, setError] = useState<string | null>(orderCode ? null : 'Не найден номер заказа.');

  useEffect(() => {
    if (!orderCode) return;
    const controller = new AbortController();
    void loadOrder(orderCode, controller.signal, { quiet: false });
    return () => controller.abort();
  }, [orderCode]);

  useEffect(() => {
    if (!orderCode || !order || !shouldPollOrder(order)) return;
    const timer = window.setInterval(() => {
      const controller = new AbortController();
      void loadOrder(orderCode, controller.signal, { quiet: true });
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [orderCode, order?.status, order?.payment.status]);

  const status = useMemo(() => statusView(order), [order]);
  const ticketNumbers = order?.ticketNumbers || [];

  async function loadOrder(code: string, signal?: AbortSignal, options: { quiet: boolean } = { quiet: false }) {
    if (!options.quiet) setState('loading');
    setError(null);
    try {
      const payload = await fetchPublicCheckoutOrder(code, signal);
      setOrder(payload);
      setState('ready');
    } catch (requestError) {
      if (signal?.aborted) return;
      setError(requestError instanceof Error ? requestError.message : String(requestError));
      setState('error');
    }
  }

  return (
    <>
      <section className="bg-slate-950 text-white">
        <div className="container-page py-10 sm:py-14">
          <div className="flex flex-wrap items-center gap-2 text-sm text-white/65">
            <Link href="/" className="hover:text-white">Главная</Link>
            <span>/</span>
            <span className="text-white">Статус заказа</span>
          </div>
          <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-white/86">
                <Ticket className="h-4 w-4" />
                Заказ {orderCode || '-'}
              </div>
              <h1 className="mt-4 text-3xl font-extrabold sm:text-5xl">Статус оплаты и билеты</h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-white/75">
                После успешной оплаты билеты появятся здесь автоматически. Если оплата еще открыта в YooKassa, можно вернуться к форме оплаты.
              </p>
            </div>
            <button
              type="button"
              disabled={!orderCode || state === 'loading'}
              onClick={() => void loadOrder(orderCode)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/15 disabled:opacity-55"
            >
              {state === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Обновить
            </button>
          </div>
        </div>
      </section>

      <section className="container-page py-8 sm:py-10">
        {state === 'loading' && !order ? (
          <div className="flex min-h-[30vh] items-center justify-center rounded-2xl bg-white shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
            <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-red-800">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <div className="font-semibold">Не удалось загрузить заказ</div>
                <div className="mt-1 text-sm opacity-80">{friendlyError(error)}</div>
              </div>
            </div>
          </div>
        ) : null}

        {order ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            <article className="overflow-hidden rounded-2xl bg-white shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
              <div className="border-b border-slate-100 p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill status={status} />
                  {order.payment.status ? (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      Оплата: {paymentStatusLabel(order.payment.status)}
                    </span>
                  ) : null}
                </div>
                <h2 className="mt-4 text-2xl font-bold text-slate-950">{order.title}</h2>
                {order.venueTitle || order.venueAddress ? (
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {[order.venueTitle, order.venueAddress].filter(Boolean).join(', ')}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-4 p-5 sm:p-6">
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoPanel label="Номер заказа" value={order.publicCode} />
                  <InfoPanel label="Сумма" value={formatKopecks(order.totals.totalKopecks, order.totals.currency)} />
                  <InfoPanel label="Покупатель" value={order.buyer.name || 'не указан'} />
                  <InfoPanel label="Email" value={order.buyer.email || '-'} />
                </div>

                {status.kind === 'pending' && order.payment.confirmationUrl ? (
                  <a
                    href={order.payment.confirmationUrl}
                    className="inline-flex w-fit items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
                  >
                    Вернуться к оплате
                    <ArrowRight className="h-4 w-4" />
                  </a>
                ) : null}

                {status.kind === 'pending' ? (
                  <p className="rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                    Платеж еще не подтвержден. Когда YooKassa пришлет статус оплаты, билеты появятся в этом заказе.
                  </p>
                ) : null}

                {status.kind === 'success' && !ticketNumbers.length ? (
                  <p className="rounded-xl bg-sky-50 p-4 text-sm leading-6 text-sky-900">
                    Оплата подтверждена. Билеты готовятся, обновите страницу через несколько секунд.
                  </p>
                ) : null}
              </div>
            </article>

            <aside className="rounded-2xl bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
              <h2 className="text-lg font-bold text-slate-950">Билеты</h2>
              {ticketNumbers.length ? (
                <div className="mt-4 grid gap-3">
                  {ticketNumbers.map((ticketNumber) => (
                    <div key={ticketNumber} className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Номер билета</div>
                      <div className="mt-1 break-words font-mono text-lg font-bold text-emerald-950">{ticketNumber}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-500">
                  Номера билетов появятся после подтверждения оплаты.
                </p>
              )}

              {order.items.length ? (
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <div className="text-sm font-semibold text-slate-800">Состав заказа</div>
                  <div className="mt-3 grid gap-3">
                    {order.items.map((item) => (
                      <div key={item.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                        <div className="font-semibold text-slate-900">{item.ticketTitle || item.title}</div>
                        <div className="mt-1 text-slate-500">
                          {item.quantity} шт. - {formatKopecks(item.totalKopecks, order.totals.currency)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-5 border-t border-slate-100 pt-4">
                <Link href="/account/purchases" className="inline-flex items-center gap-2 text-sm font-semibold text-primary-700 hover:text-primary-800">
                  Перейти в мои покупки
                  <ArrowRight className="h-4 w-4" />
                </Link>
                {order.supplierSupportPhone ? (
                  <div className="mt-3 text-sm text-slate-500">
                    Поддержка площадки: <span className="font-semibold text-slate-800">{order.supplierSupportPhone}</span>
                  </div>
                ) : null}
              </div>
            </aside>
          </div>
        ) : null}
      </section>
    </>
  );
}

function shouldPollOrder(order: PublicCheckoutOrder): boolean {
  return ['DRAFT', 'PENDING_PAYMENT', 'PAID'].includes(order.status) || ['CREATED', 'PENDING', 'WAITING_FOR_CAPTURE'].includes(order.payment.status || '');
}

function statusView(order: PublicCheckoutOrder | null): { kind: 'pending' | 'success' | 'error' | 'neutral'; label: string } {
  if (!order) return { kind: 'neutral', label: 'Загрузка' };
  if (['CONFIRMED', 'FULFILLED'].includes(order.status)) return { kind: 'success', label: 'Билеты готовы' };
  if (['CANCELLED', 'EXPIRED', 'FAILED', 'REFUNDED'].includes(order.status)) return { kind: 'error', label: orderStatusLabel(order.status) };
  return { kind: 'pending', label: orderStatusLabel(order.status) };
}

function StatusPill({ status }: { status: ReturnType<typeof statusView> }) {
  const styles = {
    pending: 'bg-amber-100 text-amber-800',
    success: 'bg-emerald-100 text-emerald-800',
    error: 'bg-red-100 text-red-800',
    neutral: 'bg-slate-100 text-slate-600',
  };
  const Icon = status.kind === 'success' ? CheckCircle2 : status.kind === 'error' ? XCircle : Clock3;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${styles[status.kind]}`}>
      <Icon className="h-3.5 w-3.5" />
      {status.label}
    </span>
  );
}

function InfoPanel({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 break-words text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function orderStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    DRAFT: 'Черновик',
    PENDING_PAYMENT: 'Ожидает оплату',
    PAID: 'Оплачен',
    CONFIRMED: 'Подтвержден',
    FULFILLED: 'Выдан',
    CANCELLED: 'Отменен',
    REFUNDED: 'Возвращен',
    EXPIRED: 'Истек',
    FAILED: 'Ошибка оплаты',
  };
  return labels[status] || status;
}

function paymentStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    CREATED: 'создана',
    PENDING: 'ожидает оплату',
    WAITING_FOR_CAPTURE: 'ожидает подтверждения',
    SUCCEEDED: 'успешно',
    CANCELLED: 'отменена',
    FAILED: 'ошибка',
  };
  return labels[status] || status.toLowerCase();
}

function formatKopecks(value: number, currency: string): string {
  const amount = Math.max(0, Math.round(value || 0)) / 100;
  const suffix = currency === 'RUB' ? '₽' : currency;
  return `${formatNumber(amount)} ${suffix}`;
}

function friendlyError(error: string): string {
  if (error === 'not_found') return 'Проверьте номер заказа в ссылке.';
  if (error === 'finance_api_unavailable') return 'Сервис оплаты временно недоступен. Попробуйте обновить страницу.';
  return error;
}
