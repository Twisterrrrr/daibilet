import Link from 'next/link';
import { CalendarDays, MapPinned, Megaphone, Newspaper, Sparkles, Ticket } from 'lucide-react';

import { PartnershipForm } from '@/components/PartnershipForm';
import { PartnershipStatCounters } from '@/components/trust/PartnershipStatCounters.client';

const MARKETING_FLOORS = {
  cities: 98,
  events: 3000,
  venues: 1100,
} as const;

const ORGANIZER_POINTS = [
  {
    icon: CalendarDays,
    title: 'Быстрое подключение к афише',
    text: 'Интеграция событий в общую выдачу, календарь «Сегодня / Завтра / Выходные» и интерактивную карту.',
  },
  {
    icon: Sparkles,
    title: 'Попадание в «Выбор редакции»',
    text: 'Продвижение сильных предложений с ближайшими датами на главной странице сайта.',
  },
  {
    icon: Ticket,
    title: 'Продажа билетов онлайн',
    text: 'Готовое решение для мгновенной покупки: виджеты, платёжные шлюзы и личный кабинет партнёра.',
  },
] as const;

const AD_FORMATS = [
  {
    icon: MapPinned,
    title: 'Нативная интеграция в «Мой день»',
    text: 'Ваши точки - кафе, шоурумы, отели - как рекомендуемые или обязательные шаги в сценариях самостоятельных маршрутов.',
  },
  {
    icon: Sparkles,
    title: 'Спонсорство тематических подборок',
    text: 'Брендирование популярных категорий вроде «Ужин на теплоходе», «Разводные мосты», «Выходные в Питере» с пометкой «При поддержке...».',
  },
  {
    icon: Newspaper,
    title: 'Спецпроекты в блоге Дайбилет',
    text: 'Экспертные гайды, тест-драйвы и нестандартные сценарии путешествий с нативной интеграцией продукта.',
  },
  {
    icon: Megaphone,
    title: 'Баннерная реклама и таргетинг',
    text: 'Медийные размещения с фильтрацией по городу или категории интересов пользователя.',
  },
] as const;

type PartnershipPageContentProps = {
  cities?: number;
  events?: number;
  venues?: number;
};

export function PartnershipPageContent({
  cities = 0,
  events = 0,
  venues = 0,
}: PartnershipPageContentProps) {
  const stats = [
    {
      value: Math.max(cities, MARKETING_FLOORS.cities),
      label: 'городов присутствия',
      hint: 'От мегаполисов до туристических хабов',
    },
    {
      value: Math.max(events, MARKETING_FLOORS.events),
      label: 'активных событий',
      hint: 'Живая афиша обновляется ежедневно',
    },
    {
      value: Math.max(venues, MARKETING_FLOORS.venues),
      label: 'площадок',
      hint: 'Уже продают билеты через нас',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-gradient-to-b from-primary-50 to-white py-12 md:py-16">
        <div className="container-page max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary-700">Дайбилет</p>
          <h1 className="mt-2 text-3xl font-extrabold text-slate-900 md:text-4xl">
            Реклама и сотрудничество
          </h1>
          <p className="mt-3 text-lg leading-7 text-slate-600">
            Площадка для организаторов, площадок и брендов: афиша, подборки, «Мой день» и блог с аудиторией,
            которая планирует досуг прямо сейчас.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="#cta"
              className="inline-flex items-center justify-center rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
            >
              Оставить заявку
            </a>
            <a
              href="#formats"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:border-slate-400"
            >
              Смотреть форматы
            </a>
          </div>
        </div>
      </section>

      <div className="container-page space-y-10 py-10 md:space-y-14 md:py-14">
        <section aria-labelledby="why-us">
          <div className="max-w-3xl">
            <h2 id="why-us" className="text-2xl font-extrabold tracking-tight text-slate-900">
              Витрина в цифрах
            </h2>
            <p className="mt-2 text-base leading-7 text-slate-600">
              Рекламодатели и организаторы сразу видят масштаб площадки - на основе актуальных данных каталога.
            </p>
          </div>
          <div className="mt-6">
            <PartnershipStatCounters items={stats} />
          </div>
          <p className="mt-5 max-w-3xl rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm leading-6 text-slate-600 shadow-sm">
            <span className="font-semibold text-slate-900">Целевая аудитория:</span> самостоятельные туристы,
            локальные исследователи, молодежь и семьи, которые выбирают, куда пойти сегодня или на выходных.
          </p>
        </section>

        <section aria-labelledby="organizers" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <h2 id="organizers" className="text-2xl font-extrabold tracking-tight text-slate-900">
            Для организаторов и площадок
          </h2>
          <p className="mt-2 max-w-3xl text-base leading-7 text-slate-600">
            Раздел для театров, музеев, организаторов концертов, стендапа и речных прогулок.
          </p>
          <ul className="mt-6 grid gap-4 md:grid-cols-3">
            {ORGANIZER_POINTS.map((item) => (
              <li key={item.title} className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-sm text-slate-500">
            Юридическая рамка для партнёров - в{' '}
            <Link href="/offer" className="font-semibold text-primary-700 hover:underline">
              договоре-оферте
            </Link>
            .
          </p>
        </section>

        <section id="formats" aria-labelledby="brands" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <h2 id="brands" className="text-2xl font-extrabold tracking-tight text-slate-900">
            Форматы рекламы и спецпроектов
          </h2>
          <p className="mt-2 max-w-3xl text-base leading-7 text-slate-600">
            Для коммерческих рекламодателей: отели, банки, авиакомпании, бренды одежды и сервисы, которым важна
            аудитория в момент планирования досуга.
          </p>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {AD_FORMATS.map((item) => (
              <li key={item.title} className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section
          id="cta"
          aria-labelledby="cta-title"
          className="grid gap-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:p-8"
        >
          <div>
            <h2 id="cta-title" className="text-2xl font-extrabold tracking-tight text-slate-900">
              Хотите продавать билеты у нас или предложить спецпроект?
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-600">
              Короткая заявка - без лишних полей. Напишите, кто вы и что продвигаете: подключим к афише или
              подберём рекламный формат.
            </p>
            <p className="mt-4 text-sm leading-6 text-slate-500">
              Можно сразу написать на{' '}
              <a href="mailto:info@daibilet.ru" className="font-semibold text-primary-700 hover:underline">
                info@daibilet.ru
              </a>
              . Вопросы по уже оплаченным заказам - на странице{' '}
              <Link href="/contacts" className="font-semibold text-primary-700 hover:underline">
                Контакты
              </Link>
              .
            </p>
          </div>
          <div>
            <PartnershipForm />
          </div>
        </section>
      </div>
    </div>
  );
}
