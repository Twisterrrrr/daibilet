'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';

import { upsertInternalOrderInStorage, type BuyerInternalOrderRecord } from '@/lib/buyer-checkout';
import { buyerResultPath } from '@/lib/buyer-ticket';
import {
  buildAdmissionCheckoutIdempotencyKey,
  isTerminalCheckoutOrderStatus,
  loadYooKassaCheckoutWidgetScript,
  pollCheckoutOrderUntilTerminal,
  type CheckoutConfirmationMode,
} from '@/lib/checkout-payment';
import { formatNumber } from '@/lib/format';
import type { FinanceAdmissionProduct } from '@/lib/finance-projection';
import { useUserAuth } from '@/hooks/useUserAuth';

type Props = {
  product: FinanceAdmissionProduct;
};

type CheckoutApiOk = {
  ok: true;
  mode: string;
  publicCode: string;
  status: string;
  confirmationUrl: string | null;
  confirmationToken?: string | null;
  confirmationMode?: CheckoutConfirmationMode;
  ticketUrl?: string;
  catalogReturnWithOrder?: string;
  emailSent?: boolean;
  emailReason?: string | null;
  order: BuyerInternalOrderRecord;
};

type OrderLookupResponse = {
  ok: boolean;
  found: boolean;
  publicCode: string;
  order: BuyerInternalOrderRecord | null;
};

const WIDGET_ROOT_ID = 'daibilet-yookassa-widget';

/**
 * Thin museum / simple-admission path:
 * email → create-payment → embedded YooKassa widget (fallback: redirect confirmationUrl).
 * Order state comes only from finance projection polling.
 */
export function AdmissionCheckoutForm({ product }: Props) {
  const router = useRouter();
  const { user } = useUserAuth();
  const offers = product.offers;

  const defaultOffer = useMemo(() => {
    if (!offers.length) return null;
    return [...offers].sort((a, b) => a.priceRub - b.priceRub)[0] || offers[0];
  }, [offers]);

  const [email, setEmail] = useState(user?.email || '');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publicCode, setPublicCode] = useState<string | null>(null);
  const [widgetActive, setWidgetActive] = useState(false);
  const [widgetHint, setWidgetHint] = useState<string | null>(null);
  const pollAbortRef = useRef<AbortController | null>(null);
  const widgetRef = useRef<{ destroy?: () => void } | null>(null);
  const idempotencyKeyRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      pollAbortRef.current?.abort();
      try {
        widgetRef.current?.destroy?.();
      } catch {
        // ignore
      }
    };
  }, []);

  function resultHref(code: string, mode?: string) {
    return buyerResultPath(code, mode);
  }

  async function lookupOrder(code: string, signal: AbortSignal): Promise<{
    found: boolean;
    status: string | null;
    order: BuyerInternalOrderRecord | null;
  }> {
    const response = await fetch(`/checkout/actions/order?order=${encodeURIComponent(code)}`, {
      cache: 'no-store',
      signal,
    });
    const payload = (await response.json().catch(() => null)) as OrderLookupResponse | null;
    const order = payload?.found && payload.order ? payload.order : null;
    return {
      found: Boolean(order),
      status: order?.status || null,
      order,
    };
  }

  function startOrderPolling(code: string, mode?: string) {
    pollAbortRef.current?.abort();
    const controller = new AbortController();
    pollAbortRef.current = controller;

    void pollCheckoutOrderUntilTerminal({
      publicCode: code,
      signal: controller.signal,
      lookup: async (publicCodeValue, signal) => {
        const row = await lookupOrder(publicCodeValue, signal);
        if (row.order) upsertInternalOrderInStorage(row.order);
        return row;
      },
      onUpdate: (lookup) => {
        if (lookup.found && isTerminalCheckoutOrderStatus(lookup.status)) {
          router.push(resultHref(code, mode));
        }
      },
    }).then((result) => {
      if (result.ok) {
        router.push(resultHref(code, mode));
      }
    });
  }

  async function mountEmbeddedWidget(token: string, code: string, mode?: string) {
    setWidgetActive(true);
    setWidgetHint(null);
    try {
      await loadYooKassaCheckoutWidgetScript();
      const Widget = window.YooMoneyCheckoutWidget;
      if (!Widget) throw new Error('yookassa_widget_missing');

      try {
        widgetRef.current?.destroy?.();
      } catch {
        // ignore
      }

      const widget = new Widget({
        confirmation_token: token,
        error_callback: () => {
          setWidgetHint(
            'Не удалось показать форму оплаты. Сохраните код заказа и откройте страницу статуса.',
          );
        },
      });
      widgetRef.current = widget;

      if (typeof widget.on === 'function') {
        widget.on('success', () => {
          // Immediate projection read - do not invent local paid state.
          void lookupOrder(code, new AbortController().signal).then((row) => {
            if (row.order) upsertInternalOrderInStorage(row.order);
            if (row.found && isTerminalCheckoutOrderStatus(row.status)) {
              router.push(resultHref(code, mode));
            }
          });
        });
        widget.on('fail', () => {
          setWidgetHint('Оплата не завершена. Можно попробовать снова или открыть статус заказа.');
        });
      }

      await Promise.resolve(widget.render(WIDGET_ROOT_ID));
      startOrderPolling(code, mode);
    } catch {
      setWidgetHint(
        'Виджет ЮKassa не загрузился. Код заказа сохранён - откройте страницу статуса или обновите страницу.',
      );
      startOrderPolling(code, mode);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setWidgetHint(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail.includes('@')) {
      setError('Укажите email для билета');
      return;
    }
    if (!defaultOffer) {
      setError('Тариф временно недоступен');
      return;
    }

    const payloadKey = buildAdmissionCheckoutIdempotencyKey({
      admissionProductSlug: product.slug,
      admissionOfferId: defaultOffer.id,
      quantity: 1,
      email: trimmedEmail,
      confirmationMode: 'embedded',
    });
    if (!idempotencyKeyRef.current || !idempotencyKeyRef.current.startsWith(payloadKey)) {
      // Reuse the same key for ambiguous retries of this exact payload.
      idempotencyKeyRef.current = payloadKey;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/checkout/actions/admission', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          admissionProductSlug: product.slug,
          admissionOfferId: defaultOffer.id,
          quantity: 1,
          buyer: {
            email: trimmedEmail,
            firstName: firstName.trim() || undefined,
            lastName: lastName.trim() || undefined,
            name: [firstName.trim(), lastName.trim()].filter(Boolean).join(' ') || undefined,
          },
          returnUrl: `${window.location.origin}/checkout/result`,
          mode: 'auto',
          confirmationMode: 'embedded',
          idempotencyKey: idempotencyKeyRef.current,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as CheckoutApiOk & {
        error?: string;
        detail?: string;
      };

      if (!response.ok || !payload.ok) {
        setError(
          payload.detail ||
            payload.error ||
            'Не удалось начать оплату. Попробуйте позже или напишите в поддержку.',
        );
        return;
      }

      upsertInternalOrderInStorage({
        ...payload.order,
        source: 'internal',
      });
      setPublicCode(payload.publicCode);

      if (payload.emailSent) {
        try {
          window.sessionStorage.setItem(`daibilet.ticketMailSent.${payload.publicCode}`, '1');
        } catch {
          // ignore
        }
      }

      const token = String(payload.confirmationToken || '').trim();
      if (token) {
        await mountEmbeddedWidget(token, payload.publicCode, payload.mode);
        return;
      }

      if (payload.confirmationUrl) {
        // Missing token → redirect rollback.
        window.location.href = payload.confirmationUrl;
        return;
      }

      router.push(resultHref(payload.publicCode, payload.mode));
    } catch {
      setError('Сеть недоступна. Проверьте соединение и попробуйте снова.');
    } finally {
      setSubmitting(false);
    }
  }

  const priceRub = defaultOffer?.priceRub;
  const resultPath = publicCode ? resultHref(publicCode) : null;

  return (
    <form
      onSubmit={(event) => void onSubmit(event)}
      className="max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)] sm:p-6"
    >
      <h2 className="text-xl font-bold text-slate-950">Оплата картой</h2>
      <p className="mt-1 text-sm text-slate-500">
        Укажите email - форма ЮKassa откроется прямо на этой странице.
      </p>

      {priceRub != null ? (
        <p className="mt-4 text-sm text-slate-700">
          К оплате:{' '}
          <span className="font-bold text-slate-950">{formatNumber(priceRub)} ₽</span>
          {defaultOffer?.title ? (
            <span className="text-slate-500"> · {defaultOffer.title}</span>
          ) : null}
        </p>
      ) : null}

      {!widgetActive ? (
        <>
          <label className="mt-5 block text-sm font-semibold text-slate-800">
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base font-normal text-slate-900 outline-none ring-primary-500/30 focus:border-primary-500 focus:ring-4"
              placeholder="you@example.com"
            />
          </label>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-800">
              Имя
              <input
                type="text"
                autoComplete="given-name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base font-normal text-slate-900 outline-none ring-primary-500/30 focus:border-primary-500 focus:ring-4"
                placeholder="Иван"
              />
            </label>
            <label className="block text-sm font-semibold text-slate-800">
              Фамилия
              <input
                type="text"
                autoComplete="family-name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base font-normal text-slate-900 outline-none ring-primary-500/30 focus:border-primary-500 focus:ring-4"
                placeholder="Петров"
              />
            </label>
          </div>
        </>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-800">{error}</div>
      ) : null}

      {widgetActive ? (
        <div className="mt-5">
          <p className="text-sm font-semibold text-slate-800">Оплата ЮKassa</p>
          <div
            id={WIDGET_ROOT_ID}
            className="mt-3 min-h-[220px] rounded-xl border border-slate-200 bg-slate-50 p-2"
          />
          {widgetHint ? (
            <p className="mt-3 text-sm text-amber-800">{widgetHint}</p>
          ) : (
            <p className="mt-3 text-xs text-slate-500">
              Статус заказа подтверждаем на стороне Дайбилет - не закрывайте страницу до перехода к билету.
            </p>
          )}
        </div>
      ) : (
        <button
          type="submit"
          disabled={submitting || !defaultOffer}
          className="mt-6 inline-flex w-full min-h-12 items-center justify-center gap-2 rounded-full bg-primary-600 px-5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {submitting
            ? 'Открываем оплату…'
            : priceRub != null
              ? `Оплатить ${formatNumber(priceRub)} ₽`
              : 'Оплатить'}
        </button>
      )}

      {publicCode ? (
        <p className="mt-4 text-center text-sm text-slate-600">
          Код заказа: <span className="font-semibold text-slate-900">{publicCode}</span>
          {resultPath ? (
            <>
              {' · '}
              <Link href={resultPath} className="font-semibold text-primary-700 hover:text-primary-800">
                Страница статуса
              </Link>
            </>
          ) : null}
        </p>
      ) : null}

      <p className="mt-3 text-center text-xs leading-5 text-slate-500">
        Нажимая кнопку, вы соглашаетесь с{' '}
        <Link href="/offer" className="underline hover:text-slate-700">
          офертой
        </Link>{' '}
        и{' '}
        <Link href="/privacy" className="underline hover:text-slate-700">
          политикой конфиденциальности
        </Link>
        .
      </p>
    </form>
  );
}
