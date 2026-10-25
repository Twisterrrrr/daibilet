'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { verifyUserEmail } from '@/lib/user-api';

export function VerifyEmailPageView() {
  const token = useSearchParams().get('token') || '';
  const [state, setState] = useState<'idle' | 'loading' | 'verified' | 'error'>('idle');
  return (
    <section className="container-page py-16">
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8">
        <h1 className="text-2xl font-bold">Подтвердить email</h1>
        {state === 'verified' ? (
          <p className="mt-4 text-emerald-700">Адрес подтверждён. Теперь покупки на этот email доступны в вашем аккаунте.</p>
        ) : state === 'error' ? (
          <p className="mt-4 text-red-700">Ссылка недействительна или срок её действия истёк. Запросите новое письмо в личном кабинете.</p>
        ) : (
          <p className="mt-4 text-slate-600">Подтвердите адрес, чтобы подключить покупки, оформленные без входа.</p>
        )}
        {state === 'idle' && token ? (
          <button type="button" onClick={() => {
            setState('loading');
            void verifyUserEmail(token).then(() => {
              window.history.replaceState(null, '', '/account/verify-email');
              setState('verified');
            }).catch(() => setState('error'));
          }} className="mt-6 rounded-lg bg-primary-700 px-5 py-2.5 font-semibold text-white">
            Подтвердить адрес
          </button>
        ) : null}
        {!token && state === 'idle' ? <p className="mt-4 text-red-700">В ссылке нет кода подтверждения.</p> : null}
        {state === 'loading' ? <p className="mt-4 text-slate-600">Подтверждаем...</p> : null}
        <div className="mt-6"><Link href="/account/purchases" className="text-primary-700 underline">К моим покупкам</Link></div>
      </div>
    </section>
  );
}
