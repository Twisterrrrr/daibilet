'use client';

import type { PublicAdmissionOfferDto, PublicAdmissionProductDto } from '@daibilet/contracts/admission';
import { AlertTriangle, ArrowRight, CheckCircle2, Loader2, MapPin, Minus, Plus, Ticket } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

import { formatNumber } from '@/lib/format';
import { watchCheckoutPayment } from '@/lib/checkout-payment';
import {
  createPublicYooKassaCheckout,
  fetchPublicAdmissionProduct,
  fetchPublicCheckoutOrder,
} from '@/lib/public-checkout-api';

type LoadState = 'loading' | 'ready' | 'error';
type WidgetSession = {
  publicCode: string;
  confirmationToken: string;
};

type YooKassaWidgetInstance = {
  render: (containerId: string) => Promise<void> | void;
  destroy: () => void;
  on: (eventName: 'complete' | 'success' | 'fail' | 'modal_close', callback: () => void) => void;
};

type YooKassaWidgetConstructor = new (config: {
  confirmation_token: string;
  error_callback?: (error: unknown) => void;
  customization?: {
    colors?: {
      control_primary?: string;
      background?: string;
    };
  };
}) => YooKassaWidgetInstance;

declare global {
  interface Window {
    YooMoneyCheckoutWidget?: YooKassaWidgetConstructor;
  }
}

const YOOKASSA_WIDGET_SCRIPT_URL = 'https://yookassa.ru/checkout-widget/v1/checkout-widget.js';
const YOOKASSA_WIDGET_CONTAINER_ID = 'yookassa-payment-form';
let yookassaWidgetScriptPromise: Promise<void> | null = null;

export function CheckoutAdmissionPageView({ slug }: { slug: string }) {
  const [state, setState] = useState<LoadState>('loading');
  const [product, setProduct] = useState<PublicAdmissionProductDto | null>(null);
  const [selectedOfferId, setSelectedOfferId] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [widgetSession, setWidgetSession] = useState<WidgetSession | null>(null);
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null);
  const widgetRef = useRef<YooKassaWidgetInstance | null>(null);
  const attemptRef = useRef<{ payload: string; key: string } | null>(null);
  const [widgetAttempt, setWidgetAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState('loading');
    setError(null);
    fetchPublicAdmissionProduct(slug, controller.signal)
      .then((payload) => {
        setProduct(payload);
        setSelectedOfferId(pickDefaultOffer(payload.offers)?.id || '');
        setState('ready');
      })
      .catch((requestError) => {
        if (controller.signal.aborted) return;
        setError(requestError instanceof Error ? requestError.message : String(requestError));
        setState('error');
      });
    return () => controller.abort();
  }, [slug]);

  useEffect(() => {
    if (!widgetSession) return undefined;
    const session = widgetSession;

    let disposed = false;
    let stopPolling = () => {};

    function redirectToResult() {
      if (disposed) return;
      disposed = true;
      stopPolling();
      setPaymentNotice('Открываем заказ...');
      widgetRef.current?.destroy();
      widgetRef.current = null;
      window.location.assign(`/checkout/result?order=${encodeURIComponent(session.publicCode)}`);
    }

    function stopWidgetWithError(message: string) {
      if (disposed) return;
      widgetRef.current?.destroy();
      widgetRef.current = null;
      setPaymentNotice(null);
      setSubmitting(false);
      setError(message);
    }

    async function mountWidget() {
      try {
        await loadYooKassaWidgetScript();
        if (disposed) return;
        const Widget = window.YooMoneyCheckoutWidget;
        if (!Widget) throw new Error('widget_constructor_missing');

        const checkout = new Widget({
          confirmation_token: session.confirmationToken,
          error_callback: () => {
            stopWidgetWithError('Не удалось открыть форму оплаты. Можно повторить загрузку или проверить заказ.');
          },
          customization: {
            colors: {
              control_primary: '#2563eb',
              background: '#ffffff',
            },
          },
        });
        widgetRef.current = checkout;
        checkout.on('success', redirectToResult);
        checkout.on('fail', redirectToResult);
        await checkout.render(YOOKASSA_WIDGET_CONTAINER_ID);
        if (!disposed) setPaymentNotice('Оплата банковской картой или другим удобным способом');
      } catch {
        stopWidgetWithError('Не удалось загрузить форму оплаты. Можно повторить загрузку или проверить заказ.');
      }
    }

    setPaymentNotice('Загружаем безопасную форму оплаты...');
    void mountWidget();
    stopPolling = watchCheckoutPayment({
      read: (signal) => fetchPublicCheckoutOrder(session.publicCode, signal),
      onSettled: redirectToResult,
      onTimeout: () => {
        if (!disposed) setPaymentNotice('Проверить оплату и получить билет можно на странице заказа.');
      },
    });

    return () => {
      disposed = true;
      stopPolling();
      widgetRef.current?.destroy();
      widgetRef.current = null;
    };
  }, [widgetSession, widgetAttempt]);

  const selectedOffer = useMemo(
    () => product?.offers.find((offer) => offer.id === selectedOfferId) || pickDefaultOffer(product?.offers || []),
    [product, selectedOfferId],
  );
  const totalRub = Math.max(0, quantity) * Math.max(0, selectedOffer?.priceRub || product?.priceFromRub || 0);
  const canSubmit = Boolean(
    product?.canSell && selectedOffer?.id && buyerEmail.trim() && quantity >= 1 && !submitting && !widgetSession,
  );

  async function submit() {
    if (!product || !selectedOffer || !canSubmit) return;
    setSubmitting(true);
    setError(null);
    setPaymentNotice(null);
    setWidgetSession(null);
    try {
      const payload = {
        subjectType: 'VENUE_ADMISSION' as const,
        admissionProductSlug: product.slug,
        admissionOfferId: selectedOffer.id,
        quantity,
        buyer: {
          email: buyerEmail.trim(),
          name: cleanOptional(buyerName),
          phone: cleanOptional(buyerPhone),
        },
        attendee: {
          name: cleanOptional(buyerName),
          phone: cleanOptional(buyerPhone),
        },
        returnUrl: `${window.location.origin}/checkout/result`,
        confirmationMode: 'embedded' as const,
      };
      const fingerprint = JSON.stringify(payload);
      if (attemptRef.current?.payload !== fingerprint) {
        attemptRef.current = { payload: fingerprint, key: createIdempotencyKey() };
      }
      const idempotencyKey = attemptRef.current.key;
      const result = await createPublicYooKassaCheckout({ ...payload, idempotencyKey }, idempotencyKey);

      if (result.order.payment.confirmationToken) {
        setWidgetSession({
          publicCode: result.order.publicCode,
          confirmationToken: result.order.payment.confirmationToken,
        });
        setSubmitting(false);
        return;
      }

      const confirmationUrl = result.order.payment.confirmationUrl || result.order.checkoutUrl;
      if (confirmationUrl) {
        window.location.assign(confirmationUrl);
        return;
      }
      window.location.assign(`/checkout/result?order=${encodeURIComponent(result.order.publicCode)}`);
    } catch (requestError) {
      setError(friendlyCheckoutError(requestError instanceof Error ? requestError.message : String(requestError)));
      setSubmitting(false);
    }
  }

  return (
    <>
      <section className="bg-slate-950 text-white">
        <div className="container-page py-10 sm:py-14">
          <div className="flex flex-wrap items-center gap-2 text-sm text-white/65">
            <Link href="/" className="hover:text-white">Главная</Link>
            <span>/</span>
            <span className="text-white">Входной билет</span>
          </div>
          <div className="mt-6 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-white/86">
              <Ticket className="h-4 w-4" />
              Daibilet checkout
            </div>
            <h1 className="mt-4 text-3xl font-extrabold sm:text-5xl">
              {product?.shortTitle || product?.title || 'Оформление входного билета'}
            </h1>
            <p className="mt-4 text-base leading-7 text-white/75">
              Оплата проходит через YooKassa. После оплаты билет и номер заказа появятся на странице статуса.
            </p>
          </div>
        </div>
      </section>

      <section className="container-page py-8 sm:py-10">
        {state === 'loading' ? (
          <div className="flex min-h-[32vh] items-center justify-center rounded-2xl bg-white shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
            <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
          </div>
        ) : null}

        {state === 'error' ? (
          <ErrorPanel title="Не удалось загрузить билет" message={friendlyCheckoutError(error || 'finance_api_unavailable')} />
        ) : null}

        {state === 'ready' && product ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
            <article className="overflow-hidden rounded-2xl bg-white shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
              {product.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.imageUrl} alt="" className="h-56 w-full object-cover sm:h-72" />
              ) : null}
              <div className="p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {product.canSell ? 'Доступен к продаже' : 'Продажа недоступна'}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {validityLabel(product)}
                  </span>
                </div>
                <h2 className="mt-4 text-2xl font-bold text-slate-950">{product.title}</h2>
                {product.shortDescription ? (
                  <p className="mt-3 text-sm leading-6 text-slate-600">{product.shortDescription}</p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-500">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {[product.venue.title, product.city.title].filter(Boolean).join(', ')}
                  </span>
                  {product.supplier.title ? <span>{product.supplier.title}</span> : null}
                </div>
              </div>
            </article>

            <aside className="rounded-2xl bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
              <h2 className="text-lg font-bold text-slate-950">Оформление</h2>
              <div className="mt-4 grid gap-4">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-slate-700">Категория билета</span>
                  <select
                    value={selectedOfferId}
                    onChange={(event) => setSelectedOfferId(event.target.value)}
                    disabled={Boolean(widgetSession)}
                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-primary-500"
                  >
                    {product.offers.map((offer) => (
                      <option key={offer.id} value={offer.id}>
                        {offer.title || 'Билет'} - {formatRub(offer.priceRub)}
                      </option>
                    ))}
                  </select>
                </label>

                <div>
                  <div className="text-sm font-semibold text-slate-700">Количество</div>
                  <div className="mt-2 flex h-11 w-36 items-center justify-between rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                      disabled={Boolean(widgetSession)}
                      className="flex h-full w-11 items-center justify-center text-slate-500 hover:text-slate-950"
                      aria-label="Уменьшить количество"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="text-sm font-bold text-slate-950">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity((value) => Math.min(10, value + 1))}
                      disabled={Boolean(widgetSession)}
                      className="flex h-full w-11 items-center justify-center text-slate-500 hover:text-slate-950"
                      aria-label="Увеличить количество"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-slate-700">Имя</span>
                  <input
                    value={buyerName}
                    onChange={(event) => setBuyerName(event.target.value)}
                    disabled={Boolean(widgetSession)}
                    autoComplete="name"
                    className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-primary-500"
                    placeholder="Как указать в заказе"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-slate-700">Email для билета</span>
                  <input
                    value={buyerEmail}
                    onChange={(event) => setBuyerEmail(event.target.value)}
                    disabled={Boolean(widgetSession)}
                    autoComplete="email"
                    inputMode="email"
                    className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-primary-500"
                    placeholder="name@example.com"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-slate-700">Телефон</span>
                  <input
                    value={buyerPhone}
                    onChange={(event) => setBuyerPhone(event.target.value)}
                    disabled={Boolean(widgetSession)}
                    autoComplete="tel"
                    inputMode="tel"
                    className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-primary-500"
                    placeholder="+7"
                  />
                </label>

                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-slate-500">Итого</span>
                    <strong className="text-xl text-slate-950">{formatRub(totalRub)}</strong>
                  </div>
                </div>

                {error ? <ErrorPanel title={widgetSession ? 'Форма оплаты недоступна' : 'Не удалось создать платеж'} message={error} compact /> : null}

                {widgetSession ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <Ticket className="h-4 w-4 shrink-0 text-primary-600" />
                      <span role="status">{paymentNotice || 'Ваш заказ сохранен'}</span>
                    </div>
                    <div id={YOOKASSA_WIDGET_CONTAINER_ID} className="min-h-[430px] overflow-hidden rounded-xl bg-white" />
                    {error ? (
                      <button type="button" className="mt-3 text-sm font-semibold text-primary-700" onClick={() => {
                        setError(null);
                        setWidgetAttempt((value) => value + 1);
                      }}>Повторить загрузку оплаты</button>
                    ) : null}
                    <Link className="mt-3 block text-sm font-semibold text-primary-700" href={`/checkout/result?order=${encodeURIComponent(widgetSession.publicCode)}`}>
                      Перейти к заказу № {widgetSession.publicCode}
                    </Link>
                  </div>
                ) : null}

                <button
                  type="button"
                  disabled={!canSubmit}
                  onClick={() => void submit()}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  {widgetSession ? 'Заказ создан' : 'Перейти к оплате'}
                </button>

                {!product.canSell ? (
                  <p className="rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                    Продажа этого входного билета пока закрыта.
                  </p>
                ) : null}
              </div>
            </aside>
          </div>
        ) : null}
      </section>
    </>
  );
}

function pickDefaultOffer(offers: PublicAdmissionOfferDto[]): PublicAdmissionOfferDto | null {
  return offers.find((offer) => typeof offer.priceRub === 'number' && offer.priceRub >= 100) || offers[0] || null;
}

function cleanOptional(value: string): string | null {
  const cleaned = value.trim();
  return cleaned || null;
}

function createIdempotencyKey(): string {
  return `wadm-${crypto.randomUUID()}`;
}

function loadYooKassaWidgetScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('window_unavailable'));
  if (window.YooMoneyCheckoutWidget) return Promise.resolve();
  if (!yookassaWidgetScriptPromise) {
    yookassaWidgetScriptPromise = new Promise<void>((resolve, reject) => {
      document.querySelector<HTMLScriptElement>('script[data-yookassa-widget="true"]')?.remove();
      const script = document.createElement('script');
      script.src = YOOKASSA_WIDGET_SCRIPT_URL;
      script.async = true;
      script.dataset.yookassaWidget = 'true';
      const fail = () => {
        window.clearTimeout(timeout);
        script.remove();
        reject(new Error('widget_script_failed'));
      };
      const timeout = window.setTimeout(fail, 15_000);
      script.addEventListener('load', () => {
        window.clearTimeout(timeout);
        if (window.YooMoneyCheckoutWidget) resolve();
        else fail();
      }, { once: true });
      script.addEventListener('error', fail, { once: true });
      document.head.appendChild(script);
    }).catch((error) => {
      yookassaWidgetScriptPromise = null;
      throw error;
    });
  }
  return yookassaWidgetScriptPromise;
}

function formatRub(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'цена уточняется';
  return `${formatNumber(value)} руб.`;
}

function validityLabel(product: PublicAdmissionProductDto): string {
  if (product.validityMode === 'VALID_DAYS_AFTER_PURCHASE' && product.validDaysAfterPurchase) {
    return `${product.validDaysAfterPurchase} дн. после покупки`;
  }
  if (product.validityMode === 'FIXED_WINDOW' && product.validTo) return `действует до ${formatDate(product.validTo)}`;
  return 'открытая дата';
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
}

function friendlyCheckoutError(error: string): string {
  if (error === 'finance_api_unavailable') return 'Сервис оплаты временно недоступен. Попробуйте обновить страницу.';
  if (error === 'admission_product_not_found') return 'Входной билет не найден или снят с продажи.';
  if (error === 'YOOKASSA_CHECKOUT_DISABLED') return 'YooKassa checkout пока выключен для этого контура.';
  if (error === 'YOOKASSA_CONFIG_MISSING') return 'Не завершена настройка YooKassa для продаж.';
  if (error === 'ADMISSION_PRODUCT_NOT_PUBLIC') return 'Входной билет пока не опубликован.';
  if (error === 'ADMISSION_OFFER_NOT_FOUND') return 'Выбранная категория билета недоступна.';
  return error;
}

function ErrorPanel({ title, message, compact = false }: { title: string; message: string; compact?: boolean }) {
  return (
    <div className={`rounded-2xl border border-red-100 bg-red-50 ${compact ? 'p-4' : 'p-5'} text-red-800`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <div className="font-semibold">{title}</div>
          <div className="mt-1 text-sm opacity-80">{message}</div>
        </div>
      </div>
    </div>
  );
}
