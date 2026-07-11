'use client';

import * as React from 'react';
import { CheckCircle, Loader2, Send } from 'lucide-react';

const SUPPORT_EMAIL = 'hello@daibilet.ru';

const CATEGORY_LABELS: Record<string, string> = {
  ORDER: 'Вопрос по заказу',
  REFUND: 'Возврат билета',
  VENUE: 'Вопрос о месте / мероприятии',
  TECHNICAL: 'Техническая проблема',
  OTHER: 'Другое',
};

export function ContactForm() {
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
    const email = String(data.get('email') || '').trim();
    const category = String(data.get('category') || 'OTHER');
    const orderCode = String(data.get('orderCode') || '').trim();
    const message = String(data.get('message') || '').trim();

    if (!name || !email || !message) {
      setError('Заполните обязательные поля.');
      return;
    }

    setStep('sending');
    window.setTimeout(() => {
      const subject = `[${CATEGORY_LABELS[category] || 'Обращение'}] ${orderCode || 'без кода заказа'}`;
      const body = [
        `Имя: ${name}`,
        `Email: ${email}`,
        `Тема: ${CATEGORY_LABELS[category] || category}`,
        orderCode ? `Код заказа: ${orderCode}` : null,
        '',
        message,
      ]
        .filter(Boolean)
        .join('\n');

      window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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
          Мы подготовили письмо на {SUPPORT_EMAIL}. Отправьте его — мы ответим в течение 24 часов.
        </p>
        <button
          type="button"
          onClick={() => {
            setStep('form');
            formRef.current?.reset();
          }}
          className="text-sm text-primary-700 hover:underline"
        >
          Отправить ещё одно обращение
        </button>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      {error ? <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Имя</label>
          <input
            type="text"
            name="name"
            required
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
            placeholder="Ваше имя"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
          <input
            type="email"
            name="email"
            required
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
            placeholder="email@example.com"
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Тема</label>
        <select
          name="category"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
        >
          <option value="ORDER">Вопрос по заказу</option>
          <option value="REFUND">Возврат билета</option>
          <option value="VENUE">Вопрос о месте / мероприятии</option>
          <option value="TECHNICAL">Техническая проблема</option>
          <option value="OTHER">Другое</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Код заказа (если есть)</label>
        <input
          type="text"
          name="orderCode"
          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
          placeholder="CS-XXXX"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Сообщение</label>
        <textarea
          name="message"
          required
          rows={4}
          className="w-full resize-none rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
          placeholder="Опишите вашу проблему или вопрос..."
        />
      </div>
      <button
        type="submit"
        disabled={step === 'sending'}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
      >
        {step === 'sending' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {step === 'sending' ? 'Подготовка...' : 'Отправить'}
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
