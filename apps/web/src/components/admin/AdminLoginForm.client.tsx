'use client';

import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export function AdminLoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(typeof payload.error === 'string' ? payload.error : 'Не удалось войти. Проверьте данные.');
        return;
      }
      const requestedNext = searchParams.get('next') || '/admin';
      const next = requestedNext.startsWith('/admin/') || requestedNext === '/admin' ? requestedNext : '/admin';
      router.replace(next);
      router.refresh();
    } catch {
      setError('Сервис входа временно недоступен. Попробуйте ещё раз.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Вход для сотрудников</h2>
        <p className="mt-1 text-sm text-slate-600">Используйте персональную учётную запись.</p>
      </div>
      <label className="block text-sm font-medium text-slate-700">
        Email
        <input
          autoComplete="username"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Пароль
        <input
          autoComplete="current-password"
          type="password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        />
      </label>
      {error ? <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60"
      >
        {busy ? 'Входим…' : 'Войти'}
      </button>
    </form>
  );
}
