'use client';

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

import { ContactForm } from '@/components/ContactForm';
import { HELP_FAQ_CATEGORIES, type HelpFaqCategory } from '@/data/help-faq';

export function HelpPageView() {
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
          <QuickAction href="/account/purchases" icon={<Search className="h-5 w-5" />} title="Мои покупки" subtitle="История по email аккаунта" />
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
          <h2 className="mb-2 text-xl font-bold text-slate-900">Мои покупки</h2>
          <p className="mb-6 text-sm text-slate-600">
            Войдите с email из письма-подтверждения — заказы появятся в личном кабинете.
          </p>
          <a
            href="/account/purchases"
            className="inline-flex rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
          >
            Перейти к покупкам
          </a>
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
            className="group rounded-xl border border-slate-200 bg-white open:shadow-sm"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-slate-900">
              {item.q}
              <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-180" />
            </summary>
            <div className="border-t border-slate-100 px-4 py-3 text-sm leading-6 text-slate-600">{item.a}</div>
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
