'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, LogOut, Receipt, Ticket } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { BuyerOrderCard, BuyerOrdersEmptyState, type BuyerOrder } from '@/components/BuyerOrderCard.client';
import {
  filterInternalOrdersForEmail,
  readInternalOrdersFromStorage,
  type BuyerInternalOrderRecord,
} from '@/lib/buyer-checkout';
import { formatNumber } from '@/lib/format';
import { useAccountPurchases, useUserAuth } from '@/hooks/useUserAuth';

function formatCount(count: number, forms: [string, string, string]): string {
  const mod10 = Math.abs(count) % 10;
  const mod100 = Math.abs(count) % 100;
  const form = mod100 >= 11 && mod100 <= 19 ? forms[2] : mod10 === 1 ? forms[0] : mod10 >= 2 && mod10 <= 4 ? forms[1] : forms[2];
  return `${formatNumber(count)} ${form}`;
}

function internalToBuyerOrder(row: BuyerInternalOrderRecord): BuyerOrder {
  return {
    id: `internal:${row.publicCode}`,
    number: row.publicCode,
    status: row.status,
    displayStatus: row.displayStatus,
    statusTone: row.statusTone,
    providerName: 'Дайбилет',
    sourceKind: 'internal',
    buyer: {
      email: row.email,
      name: null,
      phone: null,
    },
    eventTitle: row.title,
    eventUrl: null,
    purchasedAt: row.purchasedAt,
    amountRub: row.amountRub,
    ticketCount: 1,
    message:
      row.mode === 'STUB'
        ? 'Тестовый заказ (STUB). Письмо и PDF подключает finance отдельно.'
        : null,
    tickets: [
      {
        id: `internal-ticket:${row.publicCode}`,
        number: row.publicCode,
        displayStatus: row.displayStatus,
        eventTitle: row.title,
        startsAt: null,
      },
    ],
  };
}

function widgetToBuyerOrder(row: BuyerOrder): BuyerOrder {
  return {
    ...row,
    sourceKind: row.sourceKind || 'widget',
  };
}

export function AccountPurchasesPageView() {
  const router = useRouter();
  const { user, isLoading: authLoading, isLoggedIn, logout } = useUserAuth();
  const [page, setPage] = useState(1);
  const { payload, isLoading, error } = useAccountPurchases(page);
  const [localInternal, setLocalInternal] = useState<BuyerInternalOrderRecord[]>([]);
  const [remoteInternal, setRemoteInternal] = useState<BuyerInternalOrderRecord[]>([]);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.replace(`/login?returnUrl=${encodeURIComponent('/account/purchases')}`);
    }
  }, [authLoading, isLoggedIn, router]);

  useEffect(() => {
    if (!user?.email) return;
    setLocalInternal(filterInternalOrdersForEmail(readInternalOrdersFromStorage(), user.email));

    let disposed = false;
    const run = async () => {
      try {
        const response = await fetch(
          `/api/account/internal-purchases?email=${encodeURIComponent(user.email)}`,
          { cache: 'no-store' },
        );
        const data = (await response.json().catch(() => null)) as {
          rows?: BuyerInternalOrderRecord[];
        } | null;
        if (!disposed && Array.isArray(data?.rows)) {
          setRemoteInternal(data.rows);
        }
      } catch {
        // soft-fail
      }
    };
    void run();
    return () => {
      disposed = true;
    };
  }, [user?.email]);

  const mergedRows = useMemo(() => {
    const widgetRows = (payload?.rows || []).map(widgetToBuyerOrder);
    const byCode = new Map<string, BuyerOrder>();

    for (const row of [...remoteInternal, ...localInternal].map(internalToBuyerOrder)) {
      byCode.set(row.number, row);
    }
    for (const row of widgetRows) {
      if (!byCode.has(row.number)) byCode.set(row.number, row);
    }

    return Array.from(byCode.values()).sort((a, b) => {
      const aTime = a.purchasedAt ? new Date(a.purchasedAt).getTime() : 0;
      const bTime = b.purchasedAt ? new Date(b.purchasedAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [payload?.rows, localInternal, remoteInternal]);

  if (authLoading || !isLoggedIn) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
      </div>
    );
  }

  const totalPages = payload?.pages || 1;
  const internalCount = mergedRows.filter((row) => row.sourceKind === 'internal').length;
  const widgetCount = mergedRows.filter((row) => row.sourceKind !== 'internal').length;

  return (
    <>
      <section className="bg-gradient-to-br from-primary-700 via-primary-800 to-primary-950 text-white">
        <div className="container-page py-12 sm:py-16">
          <div className="flex flex-wrap items-center gap-2 text-sm text-primary-100/78">
            <Link href="/" className="hover:text-white">
              Главная
            </Link>
            <span>/</span>
            <span className="text-white">Мои покупки</span>
          </div>
          <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-sm font-semibold text-white/86">
                <Receipt className="h-4 w-4" />
                Личный кабинет
              </div>
              <h1 className="mt-4 text-4xl font-extrabold sm:text-5xl">Мои покупки</h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-primary-50/88">
                Заказы на email {user?.email}: виджеты Ticketscloud / Teplohod и внутренние заказы Дайбилет (код заказа
                и статус).
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                void logout().then(() => {
                  window.location.href = '/';
                })
              }
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/15"
            >
              <LogOut className="h-4 w-4" />
              Выйти
            </button>
          </div>
        </div>
      </section>

      <section className="container-page py-8 sm:py-10">
        {error ? (
          <div className="rounded-xl bg-red-50 p-4 text-red-800">
            <div className="font-semibold">Не удалось загрузить покупки из виджетов</div>
            <div className="mt-1 text-sm opacity-80">{error}</div>
          </div>
        ) : null}

        {isLoading && !payload && !mergedRows.length ? (
          <div className="flex min-h-[30vh] items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
          </div>
        ) : null}

        {mergedRows.length === 0 && !isLoading ? <BuyerOrdersEmptyState lookup={user?.email || ''} /> : null}

        {mergedRows.length > 0 ? (
          <div>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-slate-950">
                  {formatCount(mergedRows.length, ['заказ', 'заказа', 'заказов'])}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Привязаны к email {user?.email}
                  {internalCount || widgetCount ? ` · Дайбилет ${internalCount} · виджеты ${widgetCount}` : null}
                </p>
              </div>
            </div>

            <div className="grid gap-4">
              {mergedRows.map((order) => (
                <BuyerOrderCard key={order.id} order={order} />
              ))}
            </div>

            {totalPages > 1 ? (
              <div className="mt-6 flex justify-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1 || isLoading}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-50"
                >
                  Назад
                </button>
                <span className="flex items-center px-3 py-1.5 text-sm text-slate-600">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages || isLoading}
                  onClick={() => setPage((current) => current + 1)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-50"
                >
                  Дальше
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {!mergedRows.length && !isLoading ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
            <Ticket className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Если вы уже покупали билеты, убедитесь, что в заказе указан тот же email, что и в аккаунте.
            </p>
          </div>
        ) : null}
      </section>
    </>
  );
}
