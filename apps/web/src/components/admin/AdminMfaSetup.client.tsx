'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  beginAdminMfaEnrollmentAction,
  confirmAdminMfaEnrollmentAction,
  verifyAdminMfaAction,
} from '@/server/admin-auth-actions';

type Enrollment = { secret: string; otpauthUrl: string };

export function AdminMfaSetup({ enabled, returnUrl }: { enabled: boolean; returnUrl: string }) {
  const router = useRouter();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function startEnrollment() {
    setBusy(true);
    setError('');
    const result = await beginAdminMfaEnrollmentAction();
    if (result.enrollment) setEnrollment(result.enrollment);
    else setError(result.error || 'Не удалось начать настройку.');
    setBusy(false);
  }

  async function submitCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    if (enabled) {
      const result = await verifyAdminMfaAction(code);
      if (result.error) setError(result.error);
      else router.replace(returnUrl);
    } else {
      const result = await confirmAdminMfaEnrollmentAction(code);
      if (result.error) setError(result.error);
      else setRecoveryCodes(result.recoveryCodes || []);
    }
    setBusy(false);
  }

  return (
    <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-indigo-600">Защита рабочей учётной записи</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">{recoveryCodes ? 'Сохраните резервные коды' : enabled ? 'Подтвердите вход' : 'Настройте двухфакторную защиту'}</h1>
      <p className="mt-2 text-sm text-slate-600">
        {recoveryCodes
          ? 'Каждый код можно применить один раз. Они показаны только сейчас; сохраните их в надёжном месте.'
          : enabled
            ? 'Введите текущий код из приложения-аутентификатора или одноразовый резервный код.'
            : 'Для финансовых ролей требуется TOTP. Добавьте аккаунт в приложение-аутентификатор вручную по ключу ниже.'}
      </p>
      {error ? <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}

      {!enabled && !enrollment && !recoveryCodes ? (
        <button type="button" disabled={busy} onClick={startEnrollment} className="mt-5 w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white disabled:opacity-60">
          {busy ? 'Подготовка…' : 'Создать ключ настройки'}
        </button>
      ) : null}

      {enrollment && !recoveryCodes ? (
        <div className="mt-5 space-y-4">
          <label className="block text-sm font-medium text-slate-700">Ключ для приложения
            <input readOnly value={enrollment.secret} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-sm" />
          </label>
          <details className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            <summary className="cursor-pointer font-medium">Показать ссылку otpauth</summary>
            <p className="mt-2 break-all font-mono">{enrollment.otpauthUrl}</p>
          </details>
          <form onSubmit={submitCode} className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">Код из приложения
              <input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-mono tracking-[0.4em]" />
            </label>
            <button disabled={busy} className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white disabled:opacity-60">Подтвердить настройку</button>
          </form>
        </div>
      ) : null}

      {enabled && !recoveryCodes ? (
        <form onSubmit={submitCode} className="mt-5 space-y-3">
          <label className="block text-sm font-medium text-slate-700">Код подтверждения
            <input value={code} onChange={(event) => setCode(event.target.value)} autoFocus inputMode="text" autoComplete="one-time-code" maxLength={32} required className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-mono tracking-widest" />
          </label>
          <button disabled={busy} className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white disabled:opacity-60">Подтвердить</button>
        </form>
      ) : null}

      {recoveryCodes ? (
        <>
          <ul className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-4 font-mono text-sm">
            {recoveryCodes.map((recoveryCode) => <li key={recoveryCode}>{recoveryCode}</li>)}
          </ul>
          <button type="button" onClick={() => router.replace(returnUrl)} className="mt-5 w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white">К рабочему пространству</button>
        </>
      ) : null}
    </section>
  );
}
