'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { Loader2, Search } from 'lucide-react';

const STORAGE_KEY = 'daibilet:last-order-lookup';

type BuyerOrder = {
  id: string;
  lookupCode?: string | null;
  status?: string | null;
  title?: string | null;
  totalRub?: number | null;
};

export function MyOrdersPageView() {
  const [lookup, setLookup] = useState('');
  const [submittedLookup, setSubmittedLookup] = useState('');
  const [orders, setOrders] = useState<BuyerOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY) || '';
    if (saved) {
      setLookup(saved);
      setSubmittedLookup(saved);
    }
  }, []);

  useEffect(() => {
    if (!submittedLookup.trim()) return;

    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    fetch(`/api/public/orders?lookup=${encodeURIComponent(submittedLookup.trim())}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as { orders?: BuyerOrder[] };
      })
      .then((data) => {
        setOrders(Array.isArray(data.orders) ? data.orders : []);
        window.localStorage.setItem(STORAGE_KEY, submittedLookup.trim());
      })
      .catch((requestError) => {
        if (!controller.signal.aborted) {
          setError(requestError instanceof Error ? requestError.message : String(requestError));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [submittedLookup]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = lookup.trim();
    if (value.length < 4) {
      setOrders([]);
      setError('Введите минимум 4 символа.');
      return;
    }
    setSubmittedLookup(value);
  };

  return (
    <>
      <section className="bg-gradient-to-br from-primary-700 via-primary-800 to-primary-950 py-12 text-white">
        <div className="container-page max-w-2xl">
          <h1 className="text-3xl font-extrabold">Проверить заказ</h1>
          <p className="mt-3 text-white/85">
            Введите номер заказа или email из письма-подтверждения. Регистрация не требуется.
          </p>
          <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={lookup}
              onChange={(event) => setLookup(event.target.value)}
              placeholder="Номер заказа или email"
              className="flex-1 rounded-xl border-0 px-4 py-3 text-sm text-slate-900 outline-none"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-primary-700 hover:bg-primary-50"
            >
              <Search className="h-4 w-4" />
              Найти
            </button>
          </form>
        </div>
      </section>

      <section className="container-page max-w-2xl py-10">
        {isLoading ? (
          <p className="inline-flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Ищем заказ...
          </p>
        ) : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {!isLoading && submittedLookup && !error && orders.length === 0 ? (
          <p className="text-sm text-slate-600">
            Заказ не найден. Проверьте код или напишите нам через{' '}
            <Link href="/help#contact" className="font-semibold text-primary-600 hover:underline">
              форму помощи
            </Link>
            .
          </p>
        ) : null}
        {orders.length ? (
          <ul className="space-y-3">
            {orders.map((order) => (
              <li key={order.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="font-semibold text-slate-900">{order.title || 'Заказ'}</p>
                <p className="mt-1 text-sm text-slate-500">Статус: {order.status || '—'}</p>
                {order.lookupCode ? <p className="mt-1 text-xs text-slate-400">Код: {order.lookupCode}</p> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </>
  );
}
