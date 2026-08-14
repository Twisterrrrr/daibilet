import * as React from 'react';
import { Loader2 } from 'lucide-react';

import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { useUserAuth } from '@/hooks/useUserAuth';

function resolveReturnUrl() {
  const params = new URLSearchParams(window.location.search);
  const value = params.get('returnUrl') || '/account/purchases';
  return value.startsWith('/') ? value : '/account/purchases';
}

export function LoginPage() {
  const { login, register, isLoggedIn, isLoading: authLoading } = useUserAuth();
  const [mode, setMode] = React.useState<'login' | 'register'>('login');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [name, setName] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    document.title = mode === 'login' ? 'Вход | Дайбилет' : 'Регистрация | Дайбилет';
  }, [mode]);

  React.useEffect(() => {
    if (!authLoading && isLoggedIn) {
      window.location.href = resolveReturnUrl();
    }
  }, [authLoading, isLoggedIn]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
      window.location.href = resolveReturnUrl();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  const goSection = (section: string) => {
    if (section === 'top') window.location.href = '/';
    else if (section === 'orders') window.location.href = '/my-orders';
    else if (section === 'events') window.location.href = '/events';
    else if (section === 'cities' || section === 'destinations') window.location.href = '/cities';
    else if (section === 'landings') window.location.href = '/podborki';
    else window.location.href = `/#${section}`;
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header cityLabel="Все города" onSection={goSection} />
      <main className="container-page py-16">
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
            <a href="/my-orders" className="font-medium text-primary-600 hover:text-primary-700">
              Проверить по номеру
            </a>
          </p>

          <a href="/" className="mt-4 block text-center text-sm text-slate-500 hover:text-slate-700">
            ← На главную
          </a>
        </div>
      </main>
      <Footer />
    </div>
  );
}
