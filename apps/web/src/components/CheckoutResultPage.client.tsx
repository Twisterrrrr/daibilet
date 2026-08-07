'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Clock3, Loader2, Receipt } from 'lucide-react';
import { useEffect, useState } from 'react';

import { BuyerTicketCard } from '@/components/BuyerTicketCard.client';
import {
  filterInternalOrdersForEmail,
  mapFinanceOrderStatus,
  readInternalOrdersFromStorage,
  type BuyerInternalOrderRecord,
} from '@/lib/buyer-checkout';
import { buyerTicketPath } from '@/lib/buyer-ticket';
import { useUserAuth } from '@/hooks/useUserAuth';

type LookupResponse = {
  ok: boolean;
  found: boolean;
  publicCode: string;
  order: BuyerInternalOrderRecord | null;
};

function pickLatestStoredOrder(email?: string | null): BuyerInternalOrderRecord | null {
  const rows = readInternalOrdersFromStorage();
  const scoped = email ? filterInternalOrdersForEmail(rows, email) : rows;
  if (!scoped.length) return rows[0] || null;
  return [...scoped].sort((a, b) => {
    const aTime = a.purchasedAt ? new Date(a.purchasedAt).getTime() : 0;
    const bTime = b.purchasedAt ? new Date(b.purchasedAt).getTime() : 0;
    return bTime - aTime;
  })[0];
}

export function CheckoutResultView() {
  const searchParams = useSearchParams();
  const publicCodeParam = (searchParams.get('order') || searchParams.get('publicCode') || '').trim();
  const modeHint = (searchParams.get('mode') || '').trim();
  const fromYookassa = (searchParams.get('from') || '').toLowerCase() === 'yookassa';
  const { user } = useUserAuth();

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<BuyerInternalOrderRecord | null>(null);
  const [publicCode, setPublicCode] = useState(publicCodeParam);
  const [emailHint, setEmailHint] = useState<'sent' | 'skipped' | 'unknown'>('unknown');
  const [recoveredFromStorage, setRecoveredFromStorage] = useState(false);

  useEffect(() => {
    let disposed = false;

    const run = async () => {
      let code = publicCodeParam;

      if (!code) {
        const latest = pickLatestStoredOrder(user?.email);
        if (latest?.publicCode) {
          code = latest.publicCode;
          if (!disposed) {
            setPublicCode(code);
            setOrder(latest);
            setRecoveredFromStorage(true);
          }
        }
      }

      if (!code) {
        if (!disposed) setLoading(false);
        return;
      }

      const cached = readInternalOrdersFromStorage().find((row) => row.publicCode === code) || null;
      if (!disposed && cached) setOrder(cached);

      try {
        const response = await fetch(`/checkout/actions/order?order=${encodeURIComponent(code)}`, {
          cache: 'no-store',
        });
        const payload = (await response.json().catch(() => null)) as LookupResponse | null;
        if (!disposed && payload?.found && payload.order) {
          setOrder(payload.order);
          setPublicCode(payload.order.publicCode);
        } else if (!disposed && !cached) {
          const mapped = mapFinanceOrderStatus(modeHint === 'STUB' ? 'CONFIRMED' : 'PENDING');
          setOrder({
            publicCode: code,
            status: modeHint === 'STUB' ? 'CONFIRMED' : fromYookassa || modeHint === 'YOOKASSA' ? 'PENDING' : 'PENDING',
            displayStatus: mapped.displayStatus,
            statusTone: mapped.statusTone,
            title: `Заказ ${code}`,
            email: user?.email || '',
            purchasedAt: null,
            amountRub: null,
            mode: modeHint || (fromYookassa ? 'YOOKASSA' : 'UNKNOWN'),
            source: 'internal',
          });
        }
      } catch {
        // keep cache / fallback
      } finally {
        if (!disposed) setLoading(false);
      }

      // Best-effort notify (SMTP may be absent - UI shows save-code copy).
      // Skip if admission already mailed this code in this browser session.
      if (code && !disposed) {
        const mailFlagKey = `daibilet.ticketMailSent.${code}`;
        let already = false;
        try {
          already = window.sessionStorage.getItem(mailFlagKey) === '1';
        } catch {
          already = false;
        }
        if (already) {
          if (!disposed) setEmailHint('sent');
        } else {
          try {
            const notify = await fetch('/checkout/actions/notify-ticket', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                publicCode: code,
                email: cached?.email || user?.email || undefined,
                title: cached?.title,
                amountRub: cached?.amountRub,
                mode: cached?.mode || modeHint || undefined,
                status: cached?.status || (modeHint === 'STUB' ? 'CONFIRMED' : undefined),
              }),
            });
            const notifyPayload = (await notify.json().catch(() => null)) as {
              sent?: boolean;
              reason?: string;
            } | null;
            if (!disposed) {
              if (notifyPayload?.sent) {
                setEmailHint('sent');
                try {
                  window.sessionStorage.setItem(mailFlagKey, '1');
                } catch {
                  // ignore
                }
              } else if (
                notifyPayload?.reason === 'smtp_not_configured' ||
                notifyPayload?.reason === 'nodemailer_missing' ||
                notifyPayload?.reason === 'email_missing' ||
                (notify.ok && notifyPayload && notifyPayload.sent === false)
              ) {
                setEmailHint('skipped');
              }
            }
          } catch {
            if (!disposed) setEmailHint('skipped');
          }
        }
      }
    };

    void run();
    return () => {
      disposed = true;
    };
  }, [publicCodeParam, modeHint, fromYookassa, user?.email]);

  if (!publicCode && !loading) {
    return (
      <section className="container-page py-16">
        <h1 className="text-3xl font-extrabold text-slate-950">Код заказа не найден</h1>
        <p className="mt-3 max-w-xl text-slate-600">
          Откройте ссылку из письма или раздела «Мои покупки», либо оформите билет заново. Если вы только что оплатили в
          ЮKassa, а сюда попали без кода - откройте «Мои покупки» в том же браузере.
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
  const ticketHref = publicCode ? buyerTicketPath(publicCode) : '/account/purchases';

  return (
    <>
      <section className="bg-gradient-to-br from-emerald-700 via-emerald-800 to-slate-950 text-white print:hidden">
        <div className="container-page py-12 sm:py-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-sm font-semibold text-white/88">
            <Receipt className="h-4 w-4" />
            Спасибо за заказ
          </div>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
            {status.statusTone === 'live' ? 'Оплата прошла' : 'Заказ принят'}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-emerald-50/90">
            Ниже - ваш электронный билет. Сохраните код и ссылку
            {recoveredFromStorage ? ' (код восстановлен из этого браузера)' : ''}.
          </p>
        </div>
      </section>

      <section className="container-page py-8 sm:py-10">
        {loading ? (
          <div className="flex min-h-[20vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : order ? (
          <div className="grid gap-6">
            <div className="print:hidden flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <Icon className="h-4 w-4 text-emerald-700" />
              <span>{order.displayStatus || status.displayStatus}</span>
              <span className="text-slate-300">·</span>
              <Link href={ticketHref} className="font-semibold text-primary-700 hover:text-primary-800">
                Отдельная страница билета
              </Link>
            </div>
            <BuyerTicketCard order={order} emailHint={emailHint} />
          </div>
        ) : null}

        {user?.email && filterInternalOrdersForEmail(readInternalOrdersFromStorage(), user.email).length > 1 ? (
          <p className="mt-6 text-sm text-slate-500 print:hidden">
            В этом браузере сохранены и другие заказы Дайбилет для {user.email} - они появятся в «Мои покупки».
          </p>
        ) : null}
      </section>
    </>
  );
}
