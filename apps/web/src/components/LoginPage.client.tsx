'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';

import { useUserAuth } from '@/hooks/useUserAuth';

function resolveReturnUrl(searchParams: URLSearchParams) {
  const value = searchParams.get('returnUrl') || '/account/purchases';
  return value.startsWith('/') ? value : '/account/purchases';
}

export function LoginPageView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, register, isLoggedIn, isLoading: authLoading } = useUserAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && isLoggedIn) {
      router.replace(resolveReturnUrl(searchParams));
    }
  }, [authLoading, isLoggedIn, router, searchParams]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') await login(email, password);
      else await register(email, password, name);
      router.replace(resolveReturnUrl(searchParams));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="container-page py-16">
      <div className="mx-auto max-w-sm">
        <h1 className="text-2xl font-bold text-slate-900">{mode === 'login' ? 'История покупок' : 'Регистрация'}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {mode === 'login'
            ? 'Вход не обязателен для покупки билета. Зарегистрируйтесь или войдите, если хотите видеть все заказы на вашем email без повторного поиска.'
            : 'Укажите тот же email, что при покупке в виджете — заказы из Ticketscloud и Teplohod подтянутся автоматически.'}
        </p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : null}

          {mode === 'register' ? (
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Имя</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                placeholder="Ваше имя"
              />
            </label>
          ) : null}

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
              placeholder="email@example.com"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Пароль</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
              placeholder="Минимум 6 символов"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-base font-medium text-white transition hover:bg-primary-700 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? 'Загрузка…' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          {mode === 'login' ? (
            <>
              Нет аккаунта?{' '}
              <button type="button" onClick={() => setMode('register')} className="font-medium text-primary-600 hover:text-primary-700">
                Зарегистрироваться
              </button>
            </>
          ) : (
            <>
              Уже есть аккаунт?{' '}
              <button type="button" onClick={() => setMode('login')} className="font-medium text-primary-600 hover:text-primary-700">
                Войти
              </button>
            </>
          )}
        </p>

        <p className="mt-6 text-center text-sm text-slate-500">
          Нужен один заказ без входа?{' '}
          <Link href="/my-orders" className="font-medium text-primary-600 hover:text-primary-700">
            Проверить по номеру
          </Link>
        </p>
      </div>
    </div>
  );
}
