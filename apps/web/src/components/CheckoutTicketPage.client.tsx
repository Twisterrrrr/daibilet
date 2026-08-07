'use client';

import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { BuyerTicketCard } from '@/components/BuyerTicketCard.client';
import {
  mapFinanceOrderStatus,
  readInternalOrdersFromStorage,
  type BuyerInternalOrderRecord,
} from '@/lib/buyer-checkout';

type LookupResponse = {
  ok: boolean;
  found: boolean;
  publicCode: string;
  order: BuyerInternalOrderRecord | null;
  emailSent?: boolean;
  emailReason?: string | null;
};

type Props = {
  publicCode: string;
};

export function CheckoutTicketView({ publicCode }: Props) {
  const code = publicCode.trim();
  const [loading, setLoading] = useState(Boolean(code));
  const [order, setOrder] = useState<BuyerInternalOrderRecord | null>(null);
  const [emailHint, setEmailHint] = useState<'sent' | 'skipped' | 'unknown'>('unknown');

  useEffect(() => {
    if (!code) {
      setLoading(false);
      return;
    }

    let disposed = false;
    const run = async () => {
      const cached = readInternalOrdersFromStorage().find((row) => row.publicCode === code) || null;
      if (!disposed && cached) setOrder(cached);

      try {
        const response = await fetch(`/checkout/actions/order?order=${encodeURIComponent(code)}`, {
          cache: 'no-store',
        });
        const payload = (await response.json().catch(() => null)) as LookupResponse | null;
        if (!disposed && payload?.found && payload.order) {
          setOrder(payload.order);
        } else if (!disposed && !cached) {
          const mapped = mapFinanceOrderStatus('CONFIRMED');
          setOrder({
            publicCode: code,
            status: 'CONFIRMED',
            displayStatus: mapped.displayStatus,
            statusTone: mapped.statusTone,
            title: `Заказ ${code}`,
            email: '',
            purchasedAt: null,
            amountRub: null,
            mode: 'UNKNOWN',
            source: 'internal',
          });
        }
        if (!disposed && typeof payload?.emailSent === 'boolean') {
          setEmailHint(payload.emailSent ? 'sent' : 'skipped');
        }
      } catch {
        // keep cache
      } finally {
        if (!disposed) setLoading(false);
      }
    };

    void run();
    return () => {
      disposed = true;
    };
  }, [code]);

  if (!code) {
    return (
      <section className="container-page py-16">
        <h1 className="text-3xl font-extrabold text-slate-950">Билет не найден</h1>
        <p className="mt-3 max-w-xl text-slate-600">Укажите код заказа или откройте ссылку из письма.</p>
        <Link
          href="/account/purchases"
          className="mt-6 inline-flex rounded-full bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white"
        >
          Мои покупки
        </Link>
      </section>
    );
  }

  return (
    <>
      <section className="bg-gradient-to-br from-emerald-700 via-emerald-800 to-slate-950 text-white print:hidden">
        <div className="container-page py-10 sm:py-12">
          <p className="text-sm font-semibold text-emerald-100/80">Дайбилет</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Ваш билет</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-emerald-50/90">
            Код {code}. Сохраните страницу или распечатайте билет перед визитом.
          </p>
        </div>
      </section>

      <section className="container-page py-8 sm:py-10">
        {loading ? (
          <div className="flex min-h-[30vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : order ? (
          <BuyerTicketCard order={order} emailHint={emailHint} />
        ) : (
          <p className="text-slate-600">Не удалось загрузить билет. Попробуйте обновить страницу.</p>
        )}
      </section>
    </>
  );
}
