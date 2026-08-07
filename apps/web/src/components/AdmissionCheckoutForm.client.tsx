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

export function AdmissionCheckoutForm({ product }: Props) {
  const router = useRouter();
  const { user } = useUserAuth();
  const offers = product.offers;
  const defaultOfferId = useMemo(() => {
    const cheapest = [...offers].sort((a, b) => a.priceRub - b.priceRub)[0];
    return cheapest?.id || offers[0]?.id || '';
  }, [offers]);

  const [offerId, setOfferId] = useState(defaultOfferId);
  const [email, setEmail] = useState(user?.email || '');
  const [name, setName] = useState(user?.name || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = offers.find((offer) => offer.id === offerId) || offers[0];

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail.includes('@') || !offerId) {
      setError('Укажите корректный email и тариф');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/checkout/admission', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          admissionProductSlug: product.slug,
          admissionOfferId: offerId,
          quantity: 1,
          buyer: {
            email: trimmedEmail,
            name: name.trim() || null,
          },
          returnUrl: `${window.location.origin}/checkout/result`,
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
            'Не удалось создать заказ. Попробуйте позже или напишите в поддержку.',
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

      router.push(
        `/checkout/result?order=${encodeURIComponent(payload.publicCode)}&mode=${encodeURIComponent(payload.mode)}`,
      );
    } catch {
      setError('Сеть недоступна. Проверьте соединение и попробуйте снова.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={(event) => void onSubmit(event)}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)] sm:p-6"
    >
      <h2 className="text-xl font-bold text-slate-950">Контакты и тариф</h2>
      <p className="mt-1 text-sm text-slate-500">Билет и чек отправим на указанный email.</p>

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

      <label className="mt-4 block text-sm font-semibold text-slate-800">
        Имя <span className="font-normal text-slate-400">(необязательно)</span>
        <input
          type="text"
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base font-normal text-slate-900 outline-none ring-primary-500/30 focus:border-primary-500 focus:ring-4"
          placeholder="Как к вам обращаться"
        />
      </label>

      <fieldset className="mt-5">
        <legend className="text-sm font-semibold text-slate-800">Тариф</legend>
        <div className="mt-2 grid gap-2">
          {offers.map((offer) => {
            const active = offer.id === offerId;
            return (
              <label
                key={offer.id}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-3 transition ${
                  active
                    ? 'border-primary-500 bg-primary-50/70 ring-2 ring-primary-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <span className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="offer"
                    value={offer.id}
                    checked={active}
                    onChange={() => setOfferId(offer.id)}
                    className="h-4 w-4 accent-primary-600"
                  />
                  <span className="text-sm font-semibold text-slate-900">{offer.title}</span>
                </span>
                <span className="text-sm font-bold text-slate-900">{formatNumber(offer.priceRub)} ₽</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {error ? (
        <div className="mt-4 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-800">{error}</div>
      ) : null}

      <button
        type="submit"
        disabled={submitting || !selected}
        className="mt-6 inline-flex w-full min-h-12 items-center justify-center gap-2 rounded-full bg-primary-600 px-5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {submitting ? 'Создаем заказ…' : selected ? `Оплатить ${formatNumber(selected.priceRub)} ₽` : 'Оплатить'}
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
