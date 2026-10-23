'use client';

import { useRef, useState, type FormEvent } from 'react';

import type { FinanceEventCheckout } from '@/server/finance-event-checkout';

export function EventCheckoutForm({ event }: { event: FinanceEventCheckout }) {
  const offers = event.offers.filter((offer) => offer.canSell);
  const [offerId, setOfferId] = useState(offers[0]?.id || '');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idempotencyKey = useRef<string | null>(null);

  async function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    idempotencyKey.current ||= crypto.randomUUID();
    try {
      const response = await fetch('/checkout/actions/event', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
        body: JSON.stringify({ eventSlug: event.slug, offerId, quantity,
          buyer: { email, name }, idempotencyKey: idempotencyKey.current }),
      });
      const result = await response.json() as {
        ok?: boolean; confirmationUrl?: string; publicCode?: string; detail?: string;
      };
      if (!response.ok || !result.ok || !result.confirmationUrl) {
        setError(result.detail || 'Не удалось открыть оплату. Попробуйте ещё раз.');
        return;
      }
      window.location.assign(result.confirmationUrl);
    } catch {
      setError('Связь с оплатой прервалась. Повторите попытку.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-xl space-y-5 rounded-card border border-slate-200 bg-white p-6 shadow-card">
      <div>
        <label htmlFor="event-offer" className="mb-1 block text-sm font-semibold">Категория билета</label>
        <select id="event-offer" value={offerId} onChange={(e) => { setOfferId(e.target.value); idempotencyKey.current = null; }}
          className="w-full rounded-xl border border-slate-300 px-3 py-3">
          {offers.map((offer) => <option key={offer.id} value={offer.id}>
            {offer.title}{offer.priceRub != null ? ` — ${offer.priceRub} ₽` : ''}
          </option>)}
        </select>
      </div>
      <div>
        <label htmlFor="event-quantity" className="mb-1 block text-sm font-semibold">Количество</label>
        <input id="event-quantity" type="number" min={1} max={10} required value={quantity}
          onChange={(e) => { setQuantity(Number(e.target.value)); idempotencyKey.current = null; }}
          className="w-full rounded-xl border border-slate-300 px-3 py-3" />
      </div>
      <div>
        <label htmlFor="event-name" className="mb-1 block text-sm font-semibold">Имя покупателя</label>
        <input id="event-name" value={name} onChange={(e) => { setName(e.target.value); idempotencyKey.current = null; }}
          className="w-full rounded-xl border border-slate-300 px-3 py-3" autoComplete="name" />
      </div>
      <div>
        <label htmlFor="event-email" className="mb-1 block text-sm font-semibold">Email для билета</label>
        <input id="event-email" type="email" required value={email}
          onChange={(e) => { setEmail(e.target.value); idempotencyKey.current = null; }}
          className="w-full rounded-xl border border-slate-300 px-3 py-3" autoComplete="email" />
      </div>
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
      <button type="submit" disabled={pending || !offers.length}
        className="btn-primary w-full py-3 disabled:cursor-not-allowed disabled:opacity-50">
        {pending ? 'Открываем оплату…' : 'Перейти к оплате'}
      </button>
      <p className="text-xs text-slate-500">Билет появится после подтверждения оплаты ЮKassa.</p>
    </form>
  );
}
