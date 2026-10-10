import type { Metadata } from 'next';
import Link from 'next/link';

import { SiteLayout } from '@/components/SiteLayout';
import { buildShareMetadata, pageTitle } from '@/lib/seo-meta';

const TITLE = 'О проекте';
const DESCRIPTION =
  'Дайбилет - афиша и билеты на экскурсии, речные прогулки, музеи и события в городах России. Как мы работаем и чем отличаемся.';

export const metadata: Metadata = {
  title: pageTitle(TITLE),
  description: DESCRIPTION,
  alternates: { canonical: '/about' },
  ...buildShareMetadata({
    title: `${TITLE} | Дайбилет`,
    description: DESCRIPTION,
    path: '/about',
  }),
};

export default function AboutPage() {
  return (
    <SiteLayout>
      <div className="min-h-screen bg-slate-50">
        <section className="border-b border-slate-200 bg-gradient-to-b from-primary-50 to-white py-12 md:py-16">
          <div className="container-page max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary-700">Дайбилет</p>
            <h1 className="mt-2 text-3xl font-extrabold text-slate-900 md:text-4xl">О проекте</h1>
            <p className="mt-3 text-lg leading-7 text-slate-600">
              Мы собираем афишу экскурсий, прогулок и событий и помогаем купить билет без лишней суеты.
            </p>
          </div>
        </section>

        <div className="container-page max-w-3xl space-y-8 py-10 md:py-14">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-xl font-bold text-slate-900">Что это</h2>
            <p className="mt-3 leading-7 text-slate-600">
              Дайбилет - витрина с событиями по городам России: речные прогулки, экскурсии, музеи, концерты и другие
              форматы. Карточки и посадочные страницы показывают актуальное расписание и цену, когда она есть в
              каталоге.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-xl font-bold text-slate-900">Покупка билетов</h2>
            <p className="mt-3 leading-7 text-slate-600">
              Оплата проходит в виджете билетной системы партнёра (Ticketscloud или Теплоход). Мы не подменяем цену и
              не обещаем скидки, которых нет в источнике. После оплаты заказ можно найти в разделе «Мои покупки».
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-xl font-bold text-slate-900">Связь</h2>
            <p className="mt-3 leading-7 text-slate-600">
              Вопросы по заказам - на странице{' '}
              <Link href="/contacts" className="font-semibold text-primary-700 hover:text-primary-800">
                Контакты
              </Link>
              . Реклама, подключение площадок и спецпроекты - в разделе{' '}
              <Link href="/partners" className="font-semibold text-primary-700 hover:text-primary-800">
                Реклама и сотрудничество
              </Link>
              . Частые ответы - в{' '}
              <Link href="/help" className="font-semibold text-primary-700 hover:text-primary-800">
                Центре помощи
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </SiteLayout>
  );
}
