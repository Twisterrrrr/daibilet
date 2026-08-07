'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';

import { upsertInternalOrderInStorage } from '@/lib/buyer-checkout';
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
  order: {
    publicCode: string;
    status: string;
    displayStatus: string;
    statusTone: string;
    title: string;
    email: string;
    purchasedAt: string | null;
    amountRub: number | null;
    mode: string;
    confirmationUrl?: string | null;
    source: 'internal';
  };
};

/**
 * Thin museum / simple-admission path (owner 2026-08-07):
 * email (required by API) → create-payment → redirect confirmationUrl.
 * No multi-step calc here - complex pricing UI lives under /checkout/calc (future).
 */
export function AdmissionCheckoutForm({ product }: Props) {
  const router = useRouter();
  const { user } = useUserAuth();
  const offers = product.offers;

  // Silent default offer (cheapest) - not a buyer-facing calculator.
  const defaultOffer = useMemo(() => {
    if (!offers.length) return null;
    return [...offers].sort((a, b) => a.priceRub - b.priceRub)[0] || offers[0];
  }, [offers]);

  const [email, setEmail] = useState(user?.email || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail.includes('@')) {
      setError('Укажите email для билета');
      return;
    }
    if (!defaultOffer) {
      setError('Тариф временно недоступен');
      return;
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
          buyer: { email: trimmedEmail },
          returnUrl: `${window.location.origin}/checkout/result`,
          // Prefer YooKassa confirmationUrl; stub only if finance admits no yookassa path yet.
          mode: 'auto',
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

      if (payload.confirmationUrl) {
        window.location.href = payload.confirmationUrl;
        return;
      }

      // Soft path while Codex finishes public admission→YooKassa: show result with publicCode.
      router.push(
        `/checkout/result?order=${encodeURIComponent(payload.publicCode)}&mode=${encodeURIComponent(payload.mode)}`,
      );
    } catch {
      setError('Сеть недоступна. Проверьте соединение и попробуйте снова.');
    } finally {
      setSubmitting(false);
    }
  }

  const priceRub = defaultOffer?.priceRub;

  return (
    <form
      onSubmit={(event) => void onSubmit(event)}
      className="max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)] sm:p-6"
    >
      <h2 className="text-xl font-bold text-slate-950">Оплата картой</h2>
      <p className="mt-1 text-sm text-slate-500">
        Укажите email - сразу перейдём к оплате в ЮKassa.
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

      {error ? (
        <div className="mt-4 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-800">{error}</div>
      ) : null}

      <button
        type="submit"
        disabled={submitting || !defaultOffer}
        className="mt-6 inline-flex w-full min-h-12 items-center justify-center gap-2 rounded-full bg-primary-600 px-5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {submitting
          ? 'Переходим к оплате…'
          : priceRub != null
            ? `Оплатить ${formatNumber(priceRub)} ₽`
            : 'Оплатить'}
      </button>

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
