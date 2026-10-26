'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, LogOut, Receipt, Ticket } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { BuyerOrderCard, BuyerOrdersEmptyState, ORDER_SUPPORT_HINT, type BuyerOrder } from '@/components/BuyerOrderCard.client';
import { formatNumber } from '@/lib/format';
import { useAccountPurchases, useUserAuth } from '@/hooks/useUserAuth';
import { changeUserPassword } from '@/lib/user-api';

function formatCount(count: number, forms: [string, string, string]): string {
  const mod10 = Math.abs(count) % 10;
  const mod100 = Math.abs(count) % 100;
  const form = mod100 >= 11 && mod100 <= 19 ? forms[2] : mod10 === 1 ? forms[0] : mod10 >= 2 && mod10 <= 4 ? forms[1] : forms[2];
  return `${formatNumber(count)} ${form}`;
}

function widgetToBuyerOrder(
  row: Omit<BuyerOrder, 'sourceKind'> & { sourceKind?: 'widget' | 'internal' | 'external' },
): BuyerOrder {
  return {
    ...row,
    sourceKind: row.sourceKind === 'internal' ? 'internal' : 'widget',
  };
}

export function AccountPurchasesPageView() {
  const router = useRouter();
  const { user, token, isLoading: authLoading, isLoggedIn, logout } = useUserAuth();
  const [page, setPage] = useState(1);
  const { payload, isLoading, error } = useAccountPurchases(page);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.replace(`/login?returnUrl=${encodeURIComponent('/account/purchases')}`);
    }
  }, [authLoading, isLoggedIn, router]);

  const mergedRows = useMemo(() => {
    const widgetRows = (payload?.rows || []).map(widgetToBuyerOrder);
    return widgetRows;
  }, [payload?.rows]);

  if (authLoading || !isLoggedIn) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
      </div>
    );
  }

  const totalPages = payload?.pages || 1;
  const totalOrders = payload?.total ?? mergedRows.length;

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
                Заказы на email {user?.email}: скачайте билет Дайбилет прямо из списка или откройте страницу с QR и
                картой. Также здесь покупки через виджеты Ticketscloud / Teplohod.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                void logout().then(() => {
                  router.replace('/');
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
        {token ? (
          <BuyerPasswordChange
            token={token}
            onPasswordChanged={async () => {
              await logout();
              router.replace('/login?passwordChanged=1');
            }}
          />
        ) : null}

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
                  {formatCount(totalOrders, ['заказ', 'заказа', 'заказов'])}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Привязаны к email {user?.email}
                </p>
                <p className="mt-1.5 text-xs text-slate-400">{ORDER_SUPPORT_HINT}</p>
              </div>
            </div>

            <div className="grid gap-2.5">
              {mergedRows.map((order) => (
                <BuyerOrderCard key={order.id} order={order} accountEmail={user?.email} accessToken={token} />
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

function BuyerPasswordChange({ token, onPasswordChanged }: { token: string; onPasswordChanged: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (newPassword !== confirmation) {
      setError('Новые пароли не совпадают.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('Новый пароль должен отличаться от текущего.');
      return;
    }
    setLoading(true);
    try {
      await changeUserPassword(token, currentPassword, newPassword);
      await onPasswordChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось изменить пароль.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <details
      className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="cursor-pointer list-none text-base font-semibold text-slate-900">
        Безопасность аккаунта
        <span className="ml-2 text-sm font-normal text-slate-500">Изменить пароль</span>
      </summary>
      {open ? (
        <form onSubmit={(event) => void submit(event)} className="mt-5 grid gap-4 sm:max-w-xl">
          <p className="text-sm leading-6 text-slate-600">
            После смены пароля потребуется войти заново. Если этот аккаунт используется в кабинете поставщика,
            новый пароль будет общим для обоих кабинетов.
          </p>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Текущий пароль
            <input type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2.5" />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Новый пароль
            <input type="password" autoComplete="new-password" minLength={10} maxLength={200} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2.5" />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Повторите новый пароль
            <input type="password" autoComplete="new-password" minLength={10} maxLength={200} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2.5" />
          </label>
          {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</div> : null}
          <button type="submit" disabled={loading} className="w-fit rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60">
            {loading ? 'Сохраняем...' : 'Изменить пароль'}
          </button>
        </form>
      ) : null}
    </details>
  );
}
