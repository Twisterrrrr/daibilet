import * as React from 'react';
import { Compass, CreditCard, MapPin, Receipt, ShieldCheck, Ticket } from 'lucide-react';

import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';

const HIGHLIGHTS = [
  {
    icon: MapPin,
    title: 'Каталог по городам',
    text: 'Экскурсии, музеи, мероприятия и активный отдых — собраны в одном месте с фильтрами, подборками и городскими страницами.',
  },
  {
    icon: Ticket,
    title: 'Покупка в виджете партнёра',
    text: 'Билет оформляется в Ticketscloud или Teplohod.info. Регистрация на Дайбилете для покупки не нужна — достаточно email в виджете.',
  },
  {
    icon: CreditCard,
    title: 'Оплата у билетной системы',
    text: 'Платёж, чек и правила возврата определяются оператором. Мы не храним данные банковских карт.',
  },
  {
    icon: Receipt,
    title: 'Статус заказа',
    text: 'После покупки можно проверить заказ по номеру из письма. Вход на сайт — только если нужна история покупок на email.',
  },
  {
    icon: ShieldCheck,
    title: 'Актуальность каталога',
    text: 'Расписание и наличие мест синхронизируются с билетными системами. Перед оплатой финальные условия — в виджете партнёра.',
  },
];

export function AboutPage() {
  React.useEffect(() => {
    document.title = 'О сервисе — Дайбилет';
    upsertMeta(
      'description',
      'Дайбилет — агрегатор билетов на экскурсии, музеи и мероприятия по городам России. Покупка через виджеты билетных систем.',
    );
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header cityLabel="Все города" onSection={navigateFromAbout} />

      <section className="bg-gradient-to-b from-primary-50 to-white py-12 md:py-16">
        <div className="container-page max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary-100 px-4 py-2 text-sm font-medium text-primary-700">
            <Compass className="h-4 w-4" />
            О сервисе
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 md:text-4xl">Дайбилет — агрегатор событий</h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            Билеты на экскурсии, музеи и мероприятия по городам России. Мы помогаем найти событие и перейти к покупке в
            билетной системе организатора — быстро и без лишних шагов.
          </p>
        </div>
      </section>

      <section className="container-page max-w-4xl py-12 md:py-16">
        <div className="prose prose-slate max-w-none">
          <h2 className="text-2xl font-bold text-slate-900">Как это работает</h2>
          <p className="mt-3 text-base leading-7 text-slate-600">
            Дайбилет — информационный каталог-агрегатор. Мы импортируем события из билетных систем, показываем расписание,
            цены и описания, а покупка проходит в официальном виджете партнёра. Финансовый контур, кассовые чеки и
            большинство правил возврата остаются на стороне Ticketscloud, Teplohod.info или другого оператора.
          </p>
          <ol className="mt-6 space-y-3 text-base leading-7 text-slate-600">
            <li>Выберите город, категорию или тематическую подборку на сайте.</li>
            <li>Откройте карточку события и нажмите «Купить билет» — откроется виджет билетной системы.</li>
            <li>Оплатите и получите билет на email, указанный в виджете.</li>
            <li>При необходимости проверьте статус на странице «Проверить заказ» по номеру из письма.</li>
          </ol>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-xl border border-slate-200 bg-white p-5">
              <Icon className="mb-3 h-6 w-6 text-primary-600" />
              <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50 py-12">
        <div className="container-page max-w-3xl">
          <h2 className="text-xl font-bold text-slate-900">Контакты и документы</h2>
          <div className="mt-4 space-y-2 text-base text-slate-600">
            <p>
              Email:{' '}
              <a href="mailto:hello@daibilet.ru" className="font-medium text-primary-700 hover:text-primary-800">
                hello@daibilet.ru
              </a>
            </p>
            <p className="text-sm text-slate-500">ИП Бутин В.А. · ИНН 781125361276</p>
          </div>
          <div className="mt-6 flex flex-wrap gap-4 text-sm font-semibold">
            <a href="/help" className="text-primary-700 hover:text-primary-800">
              Помощь и FAQ
            </a>
            <a href="/my-orders" className="text-primary-700 hover:text-primary-800">
              Проверить заказ
            </a>
            <a href="/legal" className="text-primary-700 hover:text-primary-800">
              Правовая информация
            </a>
            <a href="/privacy" className="text-primary-700 hover:text-primary-800">
              Политика конфиденциальности
            </a>
            <a href="/offer" className="text-primary-700 hover:text-primary-800">
              Партнёрам
            </a>
          </div>
        </div>
      </section>

      <section className="container-page max-w-3xl py-12 text-center">
        <h2 className="text-xl font-bold text-slate-900">Готовы выбрать событие?</h2>
        <p className="mt-2 text-slate-600">Каталог, подборки и городские страницы уже ждут — покупка займёт пару минут.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a
            href="/events"
            className="inline-flex items-center rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white hover:bg-primary-700"
          >
            Открыть каталог
          </a>
          <a
            href="/podborki"
            className="inline-flex items-center rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:border-primary-200 hover:text-primary-700"
          >
            Смотреть подборки
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function navigateFromAbout(section: string) {
  if (section === 'top') window.location.href = '/';
  else if (section === 'events') window.location.href = '/events';
  else if (section === 'cities' || section === 'destinations') window.location.href = '/cities';
  else if (section === 'landings') window.location.href = '/podborki';
  else if (section === 'orders') window.location.href = '/my-orders';
  else if (section === 'blog') window.location.href = '/blog';
  else window.location.href = '/';
}

function upsertMeta(name: string, content: string) {
  let element = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.name = name;
    document.head.appendChild(element);
  }
  element.content = content;
}
