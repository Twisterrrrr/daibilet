import * as React from 'react';
import { ArrowRight, Loader2, LogOut, Receipt, Ticket } from 'lucide-react';

import { BuyerOrderCard, BuyerOrdersEmptyState } from '@/components/BuyerOrdersPage';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { formatNumber } from '@/data';
import { useAccountPurchases, useUserAuth } from '@/hooks/useUserAuth';

export function AccountPurchasesPage() {
  const { user, isLoading: authLoading, isLoggedIn, logout } = useUserAuth();
  const [page, setPage] = React.useState(1);
  const { payload, isLoading, error } = useAccountPurchases(page);

  React.useEffect(() => {
    document.title = 'Мои покупки | Дайбилет';
  }, []);

  React.useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      window.location.href = `/login?returnUrl=${encodeURIComponent('/account/purchases')}`;
    }
  }, [authLoading, isLoggedIn]);

  const goSection = (section: string) => {
    if (section === 'top') window.location.href = '/';
    else if (section === 'orders') window.location.href = '/account/purchases';
    else if (section === 'events') window.location.href = '/events';
    else if (section === 'cities' || section === 'destinations') window.location.href = '/cities';
    else if (section === 'landings') window.location.href = '/podborki';
    else window.location.href = `/#${section}`;
  };

  if (authLoading || !isLoggedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
      </div>
    );
  }

  const totalPages = payload?.pages || 1;

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header cityLabel="Все города" onSection={goSection} />
      <main>
        <section className="bg-gradient-to-br from-primary-700 via-primary-800 to-primary-950 text-white">
          <div className="container-page py-12 sm:py-16">
            <div className="flex flex-wrap items-center gap-2 text-sm text-primary-100/78">
              <a href="/" className="hover:text-white">
                Главная
              </a>
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
                  Заказы на email {user?.email} из Ticketscloud и Teplohod. Покупка через виджет не требует входа — аккаунт только для удобного списка.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void logout().then(() => {
                  window.location.href = '/';
                })}
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
              <div className="font-semibold">Не удалось загрузить покупки</div>
              <div className="mt-1 text-sm opacity-80">{error}</div>
            </div>
          ) : null}

          {isLoading && !payload ? (
            <div className="flex min-h-[30vh] items-center justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
            </div>
          ) : null}

          {payload && payload.rows.length === 0 ? (
            <BuyerOrdersEmptyState lookup={user?.email || ''} />
          ) : null}

          {payload && payload.rows.length > 0 ? (
            <div>
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-950">
                    {formatCount(payload.total, ['заказ', 'заказа', 'заказов'])}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">Привязаны к email {user?.email}</p>
                </div>
                <a href="/my-orders" className="inline-flex items-center gap-2 text-sm font-semibold text-primary-700 hover:text-primary-800">
                  Проверить по номеру <ArrowRight className="h-4 w-4" />
                </a>
              </div>

              <div className="grid gap-4">
                {payload.rows.map((order) => (
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

          {!payload?.rows.length && !isLoading ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
              <Ticket className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Если вы уже покупали билеты, убедитесь, что в заказе указан тот же email, что и в аккаунте.
              </p>
            </div>
          ) : null}
        </section>
      </main>
      <Footer />
    </div>
  );
}

function formatCount(count: number, forms: [string, string, string]): string {
  const mod10 = Math.abs(count) % 10;
  const mod100 = Math.abs(count) % 100;
  const form = mod100 >= 11 && mod100 <= 19 ? forms[2] : mod10 === 1 ? forms[0] : mod10 >= 2 && mod10 <= 4 ? forms[1] : forms[2];
  return `${formatNumber(count)} ${form}`;
}
