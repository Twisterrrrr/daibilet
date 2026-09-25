'use client';

import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { BuyerTicketCard } from '@/components/BuyerTicketCard.client';
import { BuyerTicketVenueMapPanel } from '@/components/BuyerTicketVenueMapPanel.client';
import {
  buyerTicketVenueCoords,
  mapFinanceOrderStatus,
  mergeBuyerInternalOrders,
  readInternalOrdersFromStorage,
  upsertInternalOrderInStorage,
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
  /** Catalog fixture - skip finance lookup (visual QA). */
  demoOrder?: BuyerInternalOrderRecord;
  /** Banner above the card for demo / preview routes. */
  demoBanner?: string;
};

export function CheckoutTicketView({ publicCode, demoOrder, demoBanner }: Props) {
  const code = publicCode.trim();
  const isDemo = Boolean(demoOrder);
  const printTriggeredRef = useRef(false);
  const [loading, setLoading] = useState(Boolean(code) && !isDemo);
  const [order, setOrder] = useState<BuyerInternalOrderRecord | null>(demoOrder || null);
  const [emailHint, setEmailHint] = useState<'sent' | 'skipped' | 'unknown'>(
    isDemo ? 'sent' : 'unknown',
  );

  useEffect(() => {
    if (isDemo || !code) {
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
          const merged = mergeBuyerInternalOrders(payload.order, cached);
          setOrder(merged);
          upsertInternalOrderInStorage(merged);
        } else if (!disposed && !cached) {
          const mapped = mapFinanceOrderStatus('CONFIRMED');
          setOrder({
            publicCode: code,
            status: 'CONFIRMED',
            displayStatus: mapped.displayStatus,
            statusTone: mapped.statusTone,
            title: 'Входной билет',
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
  }, [code, isDemo]);

  /* Purchases list "Скачать" → ?print=1 opens print / Save as PDF dialog once ticket is ready. */
  useEffect(() => {
    if (loading || !order || printTriggeredRef.current) return;
    if (typeof window === 'undefined') return;
    const wantsPrint = new URLSearchParams(window.location.search).get('print') === '1';
    if (!wantsPrint) return;
    printTriggeredRef.current = true;
    const timer = window.setTimeout(() => {
      window.print();
    }, 450);
    return () => window.clearTimeout(timer);
  }, [loading, order]);

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

  const venuePin = order ? buyerTicketVenueCoords(order) : null;

  return (
    <>
      <section className="bg-gradient-to-br from-emerald-700 via-emerald-800 to-slate-950 text-white print:hidden">
        <div className="container-page py-10 sm:py-12">
          <p className="text-sm font-semibold text-emerald-100/80">Дайбилет</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Ваш билет</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-emerald-50/90">
            Сохраните страницу или распечатайте билет перед визитом. Код заказа и QR - в карточке ниже.
          </p>
        </div>
      </section>

      <section className="container-page py-5 min-[500px]:py-8 sm:py-10 print:max-w-none print:px-[2mm] print:py-[2mm]">
        {demoBanner ? (
          <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950 print:hidden">
            {demoBanner}
          </p>
        ) : null}
        {loading ? (
          <div className="flex min-h-[30vh] items-center justify-center print:hidden">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : order ? (
          <div
            className={
              venuePin
                ? 'grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2 lg:gap-6'
                : 'grid grid-cols-1'
            }
          >
            <div className="min-w-0">
              <BuyerTicketCard order={order} emailHint={emailHint} className="mx-0 max-w-none" />
            </div>
            {venuePin ? (
              <div className="min-w-0 print:hidden">
                <BuyerTicketVenueMapPanel
                  lat={venuePin.lat}
                  lng={venuePin.lng}
                  venueTitle={order.venueTitle}
                  venueAddress={order.venueAddress}
                />
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-slate-600 print:hidden">Не удалось загрузить билет. Попробуйте обновить страницу.</p>
        )}
      </section>
    </>
  );
}
