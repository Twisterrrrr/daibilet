'use client';

import * as React from 'react';
import { CheckCircle, Loader2, Send } from 'lucide-react';

const PARTNERS_EMAIL = 'info@daibilet.ru';

export function PartnershipForm() {
  const [step, setStep] = React.useState<'form' | 'sending' | 'success'>('form');
  const [error, setError] = React.useState('');
  const formRef = React.useRef<HTMLFormElement>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    const form = formRef.current;
    if (!form) return;

    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    const company = String(data.get('company') || '').trim();
    const city = String(data.get('city') || '').trim();
    const projectUrl = String(data.get('projectUrl') || '').trim();
    const email = String(data.get('email') || '').trim();

    if (!name || !company || !email) {
      setError('Заполните имя, компанию и email.');
      return;
    }

    setStep('sending');
    window.setTimeout(() => {
      const subject = `[Реклама и сотрудничество] ${company}`;
      const body = [
        `Имя: ${name}`,
        `Компания / мероприятие: ${company}`,
        city ? `Город: ${city}` : null,
        projectUrl ? `Ссылка на проект: ${projectUrl}` : null,
        `Email: ${email}`,
        '',
        'Хочу обсудить продажу билетов или спецпроект на Дайбилет.',
      ]
        .filter(Boolean)
        .join('\n');

      window.location.href = `mailto:${PARTNERS_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      setStep('success');
    }, 300);
  };

  if (step === 'success') {
    return (
      <div className="py-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="mb-2 text-lg font-bold text-slate-900">Откройте почтовый клиент</h3>
        <p className="mb-4 text-sm text-slate-500">
          Мы подготовили письмо на {PARTNERS_EMAIL}. Отправьте его - ответим в рабочие дни.
        </p>
        <button
          type="button"
          onClick={() => {
            setStep('form');
            formRef.current?.reset();
          }}
          className="text-sm text-primary-700 hover:underline"
        >
          Заполнить форму ещё раз
        </button>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      {error ? <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Ваше имя</label>
          <input
            type="text"
            name="name"
            required
            autoComplete="name"
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
            placeholder="Как к вам обращаться"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Email для связи</label>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
            placeholder="email@example.com"
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Название компании или мероприятия</label>
        <input
          type="text"
          name="company"
          required
          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
          placeholder="Театр, бренд, фестиваль..."
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Город</label>
          <input
            type="text"
            name="city"
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
            placeholder="Москва, Санкт-Петербург..."
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Ссылка на ваш проект</label>
          <input
            type="url"
            name="projectUrl"
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
            placeholder="https://"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={step === 'sending'}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
      >
        {step === 'sending' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {step === 'sending' ? 'Подготовка...' : 'Отправить заявку'}
      </button>
      <p className="text-center text-xs text-slate-400">
        Отправляя форму, вы соглашаетесь с{' '}
        <a href="/privacy" className="underline hover:text-slate-600">
          Политикой конфиденциальности
        </a>
      </p>
    </form>
  );
}
