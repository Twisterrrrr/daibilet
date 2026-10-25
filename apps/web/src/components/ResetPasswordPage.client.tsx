'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { requestUserPasswordReset, resetUserPassword } from '@/lib/user-api';
import { useUserAuth } from '@/hooks/useUserAuth';

export function ResetPasswordPageView() {
  const resetToken = useSearchParams().get('reset') || '';
  const { logout } = useUserAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(''); setMessage('');
    try {
      if (resetToken) {
        await resetUserPassword(resetToken, password);
        await logout();
        window.history.replaceState(null, '', '/reset-password');
        setResetDone(true);
        setMessage('Пароль изменён. Теперь можно войти.');
      } else {
        await requestUserPasswordReset(email);
        setMessage('Если аккаунт с таким email существует, письмо со ссылкой отправлено.');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось выполнить запрос.');
    } finally { setBusy(false); }
  };
  return <section className="container-page py-16"><div className="mx-auto max-w-sm rounded-2xl border border-slate-200 bg-white p-6">
    <h1 className="text-2xl font-bold">{resetDone ? 'Пароль изменён' : resetToken ? 'Новый пароль' : 'Забыли пароль?'}</h1>
    {!resetDone ? <p className="mt-2 text-sm text-slate-600">{resetToken ? 'Задайте новый пароль для аккаунта.' : 'Укажите email аккаунта. Ссылка действует один час.'}</p> : null}
    {!resetDone ? <form onSubmit={(event) => void submit(event)} className="mt-6 space-y-4">
      {resetToken ? <label className="block text-sm">Новый пароль<input type="password" autoComplete="new-password" minLength={10} maxLength={200} required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
        : <label className="block text-sm">Email<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>}
      <button disabled={busy} className="w-full rounded-lg bg-primary-700 px-4 py-2.5 font-semibold text-white disabled:opacity-50">{busy ? 'Подождите...' : resetToken ? 'Сохранить пароль' : 'Отправить ссылку'}</button>
    </form> : null}
    {message ? <p role="status" className="mt-4 text-sm text-emerald-700">{message}</p> : null}
    {error ? <p role="alert" className="mt-4 text-sm text-red-700">{error}</p> : null}
    <Link href="/login" className="mt-5 inline-block text-sm text-primary-700 underline">Ко входу</Link>
  </div></section>;
}
