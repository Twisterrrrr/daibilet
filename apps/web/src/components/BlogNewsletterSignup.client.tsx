'use client';

import { FormEvent, useState } from 'react';
import { Mail } from 'lucide-react';

type Status = 'idle' | 'loading' | 'ok' | 'error';

export function BlogNewsletterSignup() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const value = email.trim();
    if (!value || !value.includes('@')) {
      setStatus('error');
      return;
    }
    setStatus('loading');
    try {
      const response = await fetch('/api/public/newsletter', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: value, source: 'blog' }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setStatus('ok');
      setEmail('');
    } catch {
      // Soft fallback: mailto stub when API is not ready.
      window.location.href = `mailto:hello@daibilet.ru?subject=${encodeURIComponent('Подписка на статьи Дайбилет')}&body=${encodeURIComponent(value)}`;
      setStatus('idle');
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="mt-5 rounded-2xl bg-white/90 p-4 ring-1 ring-slate-200/80 sm:p-5"
      aria-label="Подписка на статьи"
    >
      <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900">
        <Mail className="h-4 w-4 text-primary-600" aria-hidden />
        Нам по пути
      </p>
      <p className="mt-1 text-sm leading-relaxed text-slate-600">
        Честные статьи и редкие промокоды - без спама.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="blog-newsletter-email">
          Email
        </label>
        <input
          id="blog-newsletter-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (status !== 'idle') setStatus('idle');
          }}
          placeholder="ваш@email.ru"
          className="h-11 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          {status === 'loading' ? 'Отправляем…' : 'Нам по пути'}
        </button>
      </div>
      {status === 'ok' ? (
        <p className="mt-2 text-xs font-medium text-emerald-700">Спасибо - скоро напишем.</p>
      ) : null}
      {status === 'error' ? (
        <p className="mt-2 text-xs font-medium text-rose-600">Проверьте email и попробуйте ещё раз.</p>
      ) : null}
    </form>
  );
}
