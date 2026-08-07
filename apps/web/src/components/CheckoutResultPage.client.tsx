'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Clock3, Loader2, Receipt } from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  filterInternalOrdersForEmail,
  mapFinanceOrderStatus,
  readInternalOrdersFromStorage,
  type BuyerInternalOrderRecord,
} from '@/lib/buyer-checkout';
import { formatNumber } from '@/lib/format';
import { useUserAuth } from '@/hooks/useUserAuth';

type LookupResponse = {
  ok: boolean;
  found: boolean;
  publicCode: string;
  order: BuyerInternalOrderRecord | null;
};

export function CheckoutResultView() {
  const searchParams = useSearchParams();
  const publicCode = (searchParams.get('order') || searchParams.get('publicCode') || '').trim();
  const modeHint = (searchParams.get('mode') || '').trim();
  const { user } = useUserAuth();

  const [loading, setLoading] = useState(Boolean(publicCode));
  const [order, setOrder] = useState<BuyerInternalOrderRecord | null>(null);

  useEffect(() => {
    if (!publicCode) {
      setLoading(false);
      return;
    }

    let disposed = false;

    const run = async () => {
      const cached = readInternalOrdersFromStorage().find((row) => row.publicCode === publicCode) || null;
      if (!disposed && cached) setOrder(cached);

      try {
        const response = await fetch(`/api/checkout/order?order=${encodeURIComponent(publicCode)}`, {
          cache: 'no-store',
        });
        const payload = (await response.json().catch(() => null)) as LookupResponse | null;
        if (!disposed && payload?.found && payload.order) {
          setOrder(payload.order);
        } else if (!disposed && !cached) {
          const mapped = mapFinanceOrderStatus(modeHint === 'STUB' ? 'CONFIRMED' : 'PENDING');
          setOrder({
            publicCode,
            status: modeHint === 'STUB' ? 'CONFIRMED' : 'PENDING',
            displayStatus: mapped.displayStatus,
            statusTone: mapped.statusTone,
            title: `Заказ ${publicCode}`,
            email: user?.email || '',
            purchasedAt: null,
            amountRub: null,
            mode: modeHint || 'UNKNOWN',
            source: 'internal',
          });
        }
      } catch {
        // keep cache / fallback
      } finally {
        if (!disposed) setLoading(false);
      }
    };

    void run();
    return () => {
      disposed = true;
    };
  }, [publicCode, modeHint, user?.email]);

  if (!publicCode) {
    return (
      <section className="container-page py-16">
        <h1 className="text-3xl font-extrabold text-slate-950">Код заказа не найден</h1>
        <p className="mt-3 max-w-xl text-slate-600">
          Откройте ссылку из письма или раздела «Мои покупки», либо оформите билет заново.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/account/purchases"
            className="inline-flex rounded-full bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
          >
            Мои покупки
          </Link>
          <Link href="/" className="inline-flex rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">
            На главную
          </Link>
        </div>
      </section>
    );
  }

  const status = order ? mapFinanceOrderStatus(order.status) : mapFinanceOrderStatus('PENDING');
  const Icon = status.statusTone === 'live' ? CheckCircle2 : Clock3;

  return (
    <>
      <section className="bg-gradient-to-br from-emerald-700 via-emerald-800 to-slate-950 text-white">
        <div className="container-page py-12 sm:py-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-sm font-semibold text-white/88">
            <Receipt className="h-4 w-4" />
            Спасибо за заказ
          </div>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">Заказ принят</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-emerald-50/90">
            Сохраните код заказа - по нему можно проверить статус в личном кабинете.
          </p>
        </div>
      </section>

      <section className="container-page py-8 sm:py-10">
        {loading ? (
          <div className="flex min-h-[20vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : (
          <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
            <div className="grid gap-4 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                      status.statusTone === 'live'
                        ? 'bg-emerald-100 text-emerald-800'
                        : status.statusTone === 'error'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {order?.displayStatus || status.displayStatus}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    Дайбилет
                  </span>
                  {order?.mode ? (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                      {order.mode === 'STUB' ? 'Тестовый режим' : order.mode}
                    </span>
                  ) : null}
                </div>
                <h2 className="mt-3 text-2xl font-bold text-slate-950">№{publicCode}</h2>
                <p className="mt-2 text-base font-semibold text-slate-800">{order?.title || 'Входной билет'}</p>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                  Если оплата прошла, билет и чек придут на email. Письмо и PDF подключает платежный контур - это
                  отдельный шаг на стороне finance.
                </p>
              </div>
              <dl className="grid gap-2 rounded-xl bg-slate-50 p-4 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Код</dt>
                  <dd className="font-semibold text-slate-900">{publicCode}</dd>
                </div>
                {order?.amountRub != null ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Сумма</dt>
                    <dd className="font-semibold text-slate-900">{formatNumber(order.amountRub)} ₽</dd>
                  </div>
                ) : null}
                {order?.email ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Email</dt>
                    <dd className="max-w-[60%] break-all text-right font-semibold text-slate-900">{order.email}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
            <div className="flex flex-wrap gap-3 border-t border-slate-100 bg-slate-50/80 px-5 py-4 sm:px-6">
              <Link
                href="/account/purchases"
                className="inline-flex rounded-full bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
              >
                Мои покупки
              </Link>
              <Link
                href="/"
                className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                На главную
              </Link>
            </div>
          </article>
        )}

        {user?.email && filterInternalOrdersForEmail(readInternalOrdersFromStorage(), user.email).length > 1 ? (
          <p className="mt-6 text-sm text-slate-500">
            В этом браузере сохранены и другие заказы Дайбилет для {user.email} - они появятся в «Мои покупки».
          </p>
        ) : null}
      </section>
    </>
  );
}
