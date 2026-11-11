import type { Metadata } from 'next';
import Link from 'next/link';

import { SiteLayout } from '@/components/SiteLayout';
import { fontUnbounded } from '@/lib/fonts';
import { pageTitle } from '@/lib/seo-meta';

const TITLE = 'О проекте - новый дизайн (превью)';

export const metadata: Metadata = {
  title: pageTitle(TITLE),
  description:
    'Превью нового дизайна страницы "О проекте". Скрыто от поисковиков до переноса на /about.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/about2' },
};

export default function About2Page() {
  return (
    <SiteLayout chromeVariant="v2">
      <div className="min-h-screen bg-white">
        <div className="border-b border-line bg-ink">
          <div className="container-page max-w-4xl py-2">
            <p className="text-xs font-semibold text-white/70">
              Превью нового дизайна - страница не индексируется (noindex, nofollow)
            </p>
          </div>
        </div>

        <section className="border-b border-line bg-gradient-to-b from-accent-soft/70 via-white to-white">
          <div className="container-page max-w-4xl py-14 sm:py-20">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">Дайбилет</p>
            <h1
              className={`${fontUnbounded.className} mt-3 text-4xl font-bold tracking-tight text-ink sm:text-5xl`}
            >
              О проекте
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-7 text-ink-muted">
              Мы собираем афишу экскурсий, прогулок и событий и помогаем купить билет без лишней суеты.
            </p>
          </div>
        </section>

        <div className="container-page max-w-4xl py-10 sm:py-14">
          <div className="grid gap-4 md:grid-cols-3">
            <section className="rounded-2xl border border-line bg-white p-6 shadow-card">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted-2">Что это</h2>
              <p className="mt-3 text-[15px] leading-6 text-ink-2">
                Дайбилет - витрина с событиями по городам России: речные прогулки, экскурсии, музеи, концерты и другие
                форматы. Карточки и посадочные страницы показывают актуальное расписание и цену, когда она есть в
                каталоге.
              </p>
            </section>

            <section className="rounded-2xl border border-line bg-white p-6 shadow-card">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted-2">Покупка билетов</h2>
              <p className="mt-3 text-[15px] leading-6 text-ink-2">
                Пока что оплата проходит в виджетах билетной системы Ticketscloud, но скоро мы перейдем на свой
                полноценный финконтур. Мы не подменяем цену и не обещаем скидки, которых нет в источнике. После оплаты
                заказ можно найти в разделе «Мои покупки».
              </p>
            </section>

            <section className="rounded-2xl border border-line bg-white p-6 shadow-card">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted-2">Связь</h2>
              <p className="mt-3 text-[15px] leading-6 text-ink-2">
                Вопросы по заказам - на странице{' '}
                <Link href="/contacts" className="font-semibold text-accent hover:text-accent-dark">
                  Контакты
                </Link>
                . Реклама, подключение площадок и спецпроекты - в разделе{' '}
                <Link href="/partners" className="font-semibold text-accent hover:text-accent-dark">
                  Реклама и сотрудничество
                </Link>
                . Частые ответы - в{' '}
                <Link href="/help" className="font-semibold text-accent hover:text-accent-dark">
                  Центре помощи
                </Link>
                .
              </p>
            </section>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}