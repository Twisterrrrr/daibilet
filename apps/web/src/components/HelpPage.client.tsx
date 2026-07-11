'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  CalendarCheck,
  ChevronDown,
  HelpCircle,
  Mail,
  RotateCcw,
  Search,
  ShieldCheck,
  Ticket,
} from 'lucide-react';
import { FormEvent } from 'react';

import { ContactForm } from '@/components/ContactForm';
import { HELP_FAQ_CATEGORIES, type HelpFaqCategory } from '@/data/help-faq';

const ORDER_LOOKUP_KEY = 'daibilet:last-order-lookup';

export function HelpPageView() {
  const router = useRouter();

  const handleOrderLookup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = new FormData(event.currentTarget).get('code');
    const value = String(code || '').trim();
    if (!value) return;
    window.localStorage.setItem(ORDER_LOOKUP_KEY, value);
    router.push('/my-orders');
  };

  return (
    <>
      <section className="bg-gradient-to-b from-primary-50 to-white py-12 md:py-16">
        <div className="container-page max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary-100 px-4 py-2 text-sm font-medium text-primary-700">
            <HelpCircle className="h-4 w-4" />
            Центр помощи
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 md:text-4xl">Как мы можем помочь?</h1>
          <p className="mt-3 text-lg text-slate-600">
            Ответы на частые вопросы о билетах, заказах, возвратах и работе сервиса
          </p>
        </div>
      </section>

      <section className="container-page -mt-6 max-w-4xl md:-mt-8">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <QuickAction href="#check-order" icon={<Search className="h-5 w-5" />} title="Проверить заказ" subtitle="По коду или email" />
          <QuickAction href="#refunds" icon={<RotateCcw className="h-5 w-5" />} title="Оформить возврат" subtitle="Инструкция" />
          <QuickAction href="#contact" icon={<Mail className="h-5 w-5" />} title="Написать нам" subtitle="Форма обратной связи" />
        </div>
      </section>

      <section className="container-page max-w-4xl py-12 md:py-16">
        <div className="space-y-10">
          {HELP_FAQ_CATEGORIES.map((category) => (
            <FaqCategorySection key={category.id} category={category} />
          ))}
        </div>
      </section>

      <section id="check-order" className="bg-slate-50 py-12">
        <div className="container-page max-w-xl text-center">
          <h2 className="mb-2 text-xl font-bold text-slate-900">Проверить заказ</h2>
          <p className="mb-6 text-sm text-slate-600">
            Номер заказа из письма после покупки в виджете. Вход на сайт не нужен.
          </p>
          <form onSubmit={handleOrderLookup} className="mx-auto flex max-w-sm gap-2">
            <input
              type="text"
              name="code"
              placeholder="Номер заказа из письма"
              className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
              required
            />
            <button
              type="submit"
              className="rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
            >
              Найти
            </button>
          </form>
        </div>
      </section>

      <section id="contact" className="container-page max-w-xl py-12 md:py-16">
        <h2 className="mb-2 text-center text-xl font-bold text-slate-900">Не нашли ответ?</h2>
        <p className="mb-6 text-center text-sm text-slate-600">
          Отправьте нам сообщение — мы ответим в течение 24 часов
        </p>
        <ContactForm />
      </section>
    </>
  );
}

function QuickAction({
  href,
  icon,
  title,
  subtitle,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <a
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-primary-300 hover:shadow-md"
    >
      <div className="rounded-lg bg-primary-50 p-2 text-primary-600 transition-colors group-hover:bg-primary-100">{icon}</div>
      <div>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
    </a>
  );
}

function FaqCategorySection({ category }: { category: HelpFaqCategory }) {
  return (
    <div id={category.id}>
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
          <CategoryIcon name={category.icon} />
        </div>
        <h2 className="text-xl font-bold text-slate-900">{category.title}</h2>
      </div>
      <div className="space-y-2">
        {category.items.map((item, index) => (
          <details
            key={`${category.id}-${index}`}
            className="group rounded-xl border border-slate-200 bg-white transition-colors hover:border-slate-300"
          >
            <summary className="flex cursor-pointer list-none select-none items-center justify-between p-4">
              <span className="pr-4 text-sm font-medium text-slate-900">{item.q}</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
            </summary>
            <div className="px-4 pb-4 text-sm leading-relaxed text-slate-600">{item.a}</div>
          </details>
        ))}
      </div>
    </div>
  );
}

function CategoryIcon({ name }: { name: HelpFaqCategory['icon'] }) {
  const cls = 'h-5 w-5';
  switch (name) {
    case 'ticket':
      return <Ticket className={cls} />;
    case 'calendar':
      return <CalendarCheck className={cls} />;
    case 'refund':
      return <RotateCcw className={cls} />;
    case 'building':
      return <Building2 className={cls} />;
    case 'shield':
      return <ShieldCheck className={cls} />;
    default:
      return <HelpCircle className={cls} />;
  }
}
