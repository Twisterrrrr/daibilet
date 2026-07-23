import Link from 'next/link';
import { Building2, HelpCircle, Mail, Scale } from 'lucide-react';

import { ContactForm } from '@/components/ContactForm';

const LEGAL_LINKS = [
  { href: '/offer', label: 'Договор-оферта' },
  { href: '/privacy#privacy-policy', label: 'Политика конфиденциальности' },
  { href: '/privacy#user-agreement', label: 'Пользовательское соглашение' },
  { href: '/legal#refunds', label: 'Правила возврата' },
  { href: '/requisites', label: 'Реквизиты' },
  { href: '/help', label: 'Центр помощи' },
] as const;

export function ContactsPageContent() {
  return (
    <div className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-gradient-to-b from-primary-50 to-white py-12 md:py-16">
        <div className="container-page max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary-700">Дайбилет</p>
          <h1 className="mt-2 text-3xl font-extrabold text-slate-900 md:text-4xl">Контакты</h1>
          <p className="mt-3 text-lg leading-7 text-slate-600">
            Свяжитесь с нами по вопросам заказов, возвратов и партнёрства. Ответим в рабочие дни в течение 24 часов.
          </p>
        </div>
      </section>

      <div className="container-page grid gap-8 py-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:py-14">
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-primary-50 p-2.5 text-primary-700">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Электронная почта</h2>
                <a
                  href="mailto:info@daibilet.ru"
                  className="mt-1 inline-block text-lg font-semibold text-primary-700 hover:text-primary-800"
                >
                  info@daibilet.ru
                </a>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Для заказов укажите email из письма-подтверждения и номер заказа, если он есть.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-slate-100 p-2.5 text-slate-600">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Организация</h2>
                <p className="mt-1 text-sm font-medium leading-6 text-slate-800">
                  Индивидуальный предприниматель Бутин Василий Александрович
                </p>
                <dl className="mt-3 space-y-1.5 text-sm">
                  <div className="flex flex-wrap gap-x-2">
                    <dt className="font-semibold text-slate-700">ИНН</dt>
                    <dd className="font-mono font-medium text-slate-900">781125361276</dd>
                  </div>
                  <div className="flex flex-wrap gap-x-2">
                    <dt className="font-semibold text-slate-700">ОГРНИП</dt>
                    <dd className="font-mono font-medium text-slate-900">306784709000338</dd>
                  </div>
                </dl>
                <Link href="/requisites" className="mt-3 inline-block text-sm font-semibold text-primary-700 hover:underline">
                  Полные реквизиты
                </Link>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-slate-100 p-2.5 text-slate-600">
                <Scale className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-bold text-slate-900">Документы и поддержка</h2>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {LEGAL_LINKS.map((item) => (
                    <li key={item.href}>
                      <Link href={item.href} className="text-sm font-medium text-slate-700 hover:text-primary-700">
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 flex items-start gap-2 text-sm leading-6 text-slate-500">
                  <HelpCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  Частые вопросы о билетах и возвратах - в{' '}
                  <Link href="/help" className="font-semibold text-primary-700 hover:underline">
                    центре помощи
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <h2 className="text-xl font-bold text-slate-900">Написать нам</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Опишите ситуацию - ответим на info@daibilet.ru. Для срочных вопросов по уже оплаченному заказу приложите
            email покупки.
          </p>
          <div className="mt-6">
            <ContactForm />
          </div>
        </div>
      </div>
    </div>
  );
}
