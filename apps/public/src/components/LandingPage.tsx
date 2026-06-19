import * as React from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, Clock, HelpCircle, LayoutGrid, ListFilter, MapPin, Search, Shield, Sparkles, Tag, Ticket, TrendingUp } from 'lucide-react';

import { EventCard } from '@/components/EventCard';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { formatMoney, formatNumber, publicData } from '@/data';
import { eventHref } from '@/routes';
import type { PublicLanding, PublicLandingContentBlock, PublicLandingPage, PublicSession } from '@/types';

const API_BASE_URL =
  ((import.meta as ImportMeta & { env?: { VITE_DAIBILET_API_URL?: string } }).env?.VITE_DAIBILET_API_URL as string | undefined) ||
  'http://127.0.0.1:4000';

type DateFilter = 'all' | 'today' | 'tomorrow' | 'weekend' | 'evening';
type SortFilter = 'price' | 'rating' | 'time';
type ViewMode = 'table' | 'cards';
const MIN_DISPLAY_PRICE_RUB = 100;

type EventGroup = {
  key: string;
  title: string;
  city: string;
  venue: string;
  category: string;
  tags: string[];
  representative: PublicSession;
  sessions: PublicSession[];
  priceFrom?: number | null;
  vacant?: number | null;
  firstStartsAt?: string | null;
};

export function LandingPage({ slug }: { slug: string }) {
  const [payload, setPayload] = React.useState<PublicLandingPage | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [city, setCity] = React.useState('all');
  const [category, setCategory] = React.useState('all');
  const [dateFilter, setDateFilter] = React.useState<DateFilter>('all');
  const [sort, setSort] = React.useState<SortFilter>('time');
  const [query, setQuery] = React.useState('');
  const [mode, setMode] = React.useState<ViewMode>('table');

  React.useEffect(() => {
    let disposed = false;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 25000);

    setIsLoading(true);
    fetch(`${API_BASE_URL}/api/public/landings/${encodeURIComponent(slug)}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error('landing not found');
        return response.json() as Promise<PublicLandingPage | null>;
      })
      .then((data) => {
        if (!data) throw new Error('landing not found');
        if (disposed) return;
        setPayload(data);
        applyLandingMeta(data.landing);
        setError(null);
      })
      .catch(() => {
        if (disposed) return;
        const fallbackPayload = buildStaticLandingPage(slug);
        if (fallbackPayload) {
          setPayload(fallbackPayload);
          applyLandingMeta(fallbackPayload.landing);
          setError(null);
          return;
        }
        setError('Лендинг не найден или backend сейчас недоступен.');
      })
      .finally(() => {
        window.clearTimeout(timeout);
        if (!disposed) setIsLoading(false);
      });

    return () => {
      disposed = true;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [slug]);

  const filteredSessions = React.useMemo(() => {
    if (!payload) return [];
    const normalizedQuery = query.trim().toLowerCase();

    return payload.sessions.filter((session) => {
      const startsAt = new Date(session.startsAt);
      if (city !== 'all' && session.city !== city) return false;
      if (category !== 'all' && session.category !== category && !session.tags.includes(category)) return false;
      if (!matchesDateFilter(session, startsAt, dateFilter)) return false;

      if (!normalizedQuery) return true;

      return [session.title, session.city, session.venue, session.category, ...(session.tags || [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [category, city, dateFilter, payload, query]);

  const allGroups = React.useMemo(() => (payload ? groupLandingSessions(payload.sessions) : []), [payload]);
  const groups = React.useMemo(() => sortEventGroups(groupLandingSessions(filteredSessions), sort), [filteredSessions, sort]);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header cityLabel={city === 'all' ? 'Все города' : city} search={query} onSearch={setQuery} onSection={navigateHome} />
      <main>
        {isLoading ? <LoadingState /> : null}
        {error ? <ErrorState message={error} /> : null}
        {payload && !error ? (
          <>
            <LandingHero landing={payload.landing} visibleCount={allGroups.length} sessionsCount={payload.sessions.length} stats={payload.stats} />
            <LandingScenarioGuide landing={payload.landing} stats={payload.stats} groups={allGroups} />
            <section id="landing-schedule" className="container-page grid gap-6 py-7 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="min-w-0">
                <LandingFilters
                  stats={payload.stats}
                  city={city}
                  category={category}
                  dateFilter={dateFilter}
                  sort={sort}
                  mode={mode}
                  groupsCount={groups.length}
                  sessionsCount={filteredSessions.length}
                  setCity={setCity}
                  setCategory={setCategory}
                  setDateFilter={setDateFilter}
                  setSort={setSort}
                  setMode={setMode}
                  reset={() => {
                    setCity('all');
                    setCategory('all');
                    setDateFilter('all');
                    setQuery('');
                    setSort('time');
                  }}
                />
                {mode === 'table' ? <LandingEventsTable groups={groups} /> : <LandingEventsGrid groups={groups} />}
              </div>
              <aside className="grid content-start gap-4">
                <LandingContext landing={payload.landing} stats={payload.stats} />
                <RelatedLandings landings={payload.relatedLandings} />
              </aside>
            </section>
            <LandingEditorialIntro landing={payload.landing} stats={payload.stats} groups={allGroups} />
            <LandingContentBlocks blocks={payload.blocks || []} landing={payload.landing} stats={payload.stats} />
            <LandingHowToChoose landing={payload.landing} stats={payload.stats} />
          </>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}

function LandingHero({
  landing,
  visibleCount,
  sessionsCount,
  stats,
}: {
  landing: PublicLanding;
  visibleCount: number;
  sessionsCount: number;
  stats: PublicLandingPage['stats'];
}) {
  const heroImage = landing.heroImageUrl || landing.imageUrl || null;
  const badge = landing.heroBadge || 'Страница подборки';
  return (
    <section className="relative overflow-hidden border-b border-primary-950 bg-gradient-to-br from-primary-700 via-primary-800 to-primary-950 text-white">
      {heroImage ? (
        <div className="absolute inset-0">
          <img src={heroImage} alt="" className="h-full w-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-primary-950/70" />
        </div>
      ) : null}
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-950/25 to-transparent" />
      <div className="container-page relative py-14 sm:py-16">
        <div className="flex flex-wrap items-center gap-2 text-sm text-primary-100/78">
          <button type="button" onClick={() => navigateHome('top')} className="hover:text-white">
            Главная
          </button>
          <span>/</span>
          <button type="button" onClick={() => navigateHome('landings')} className="hover:text-white">
            Подборки
          </button>
          <span>/</span>
          <span className="text-white">{landing.title}</span>
        </div>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
          <div>
            <div className="mb-4 mt-7 inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-sm font-semibold text-white/86 backdrop-blur">
              <Sparkles className="h-4 w-4" />
              {badge}
            </div>
            <h1 className="max-w-4xl text-4xl font-extrabold sm:text-5xl">{landing.heroTitle || landing.title}</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-primary-50/88 sm:text-lg">{landing.heroSubtitle || landing.subtitle}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {landing.chips.map((chip) => (
                <span key={chip} className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
                  {chip}
                </span>
              ))}
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#landing-schedule" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-5 text-sm font-semibold text-primary-700 hover:bg-primary-50">
                <Ticket className="mr-2 h-4 w-4" />
                Показать варианты
              </a>
              <a href="#how-to-choose" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/25 px-5 text-sm font-semibold text-white hover:bg-white/10">
                Как выбрать
              </a>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <HeroStat label="Вариантов" value={visibleCount} />
            <HeroStat label="Сеансов" value={sessionsCount} />
            <HeroStat label="Городов" value={Object.keys(stats.cities).length} />
            <HeroStat label="Цена от" value={formatMoney(stats.priceFrom)} raw />
          </div>
        </div>
      </div>
    </section>
  );
}

function LandingScenarioGuide({
  landing,
  stats,
  groups,
}: {
  landing: PublicLanding;
  stats: PublicLandingPage['stats'];
  groups: EventGroup[];
}) {
  const scenario = landingScenario(landing);
  const topCities = topEntries(stats.cities, 4);
  const topVenues = topEntries(stats.venues, 4);
  const firstGroup = groups[0];

  return (
    <section className="border-b border-slate-100 bg-slate-50/70">
      <div className="container-page grid gap-6 py-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold uppercase text-primary-700 shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            {scenario.eyebrow}
          </div>
          <h2 className="mt-3 max-w-4xl text-2xl font-bold text-slate-950">{scenario.title}</h2>
          <p className="mt-3 max-w-4xl text-base leading-7 text-slate-600">{scenario.text}</p>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {scenario.cards.map((card) => (
              <div key={card.title} className="rounded-lg bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                  <span className="text-primary-600">{card.icon}</span>
                  {card.title}
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{card.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {topCities.map(([name, count]) => (
              <button key={name} type="button" onClick={() => scrollToSchedule()} className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:text-primary-700">
                {name} · {formatNumber(count)}
              </button>
            ))}
          </div>
        </div>

        <aside className="rounded-lg bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
          <h3 className="text-base font-semibold text-slate-950">{scenario.asideTitle}</h3>
          <div className="mt-4 grid gap-3 text-sm leading-6 text-slate-600">
            <ScenarioFact icon={<Ticket className="h-4 w-4" />} label="Вариантов" value={formatNumber(stats.events)} />
            <ScenarioFact icon={<CalendarDays className="h-4 w-4" />} label="Ближайших сеансов" value={formatNumber(stats.sessions)} />
            <ScenarioFact icon={<MapPin className="h-4 w-4" />} label="Цена" value={formatMoney(stats.priceFrom)} />
          </div>
          {topVenues.length ? (
            <div className="mt-5">
              <div className="text-xs font-bold uppercase text-slate-400">Популярные площадки</div>
              <div className="mt-2 grid gap-2">
                {topVenues.slice(0, 3).map(([name, count]) => (
                  <div key={name} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <span className="truncate text-slate-700">{name}</span>
                    <span className="shrink-0 text-xs font-semibold text-slate-400">{formatNumber(count)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {firstGroup ? (
            <a href={eventHref(firstGroup.representative)} className="mt-5 inline-flex w-full min-h-11 items-center justify-center rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700">
              Открыть ближайший вариант
            </a>
          ) : null}
        </aside>
      </div>
    </section>
  );
}

function ScenarioFact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
      <span className="flex items-center gap-2 text-slate-500">
        <span className="text-primary-600">{icon}</span>
        {label}
      </span>
      <span className="font-semibold text-slate-950">{value}</span>
    </div>
  );
}

function landingScenario(landing: PublicLanding) {
  const key = `${landing.slug} ${landing.title} ${landing.subtitle}`.toLowerCase();
  if (key.includes('salute') || key.includes('9') || key.includes('салют')) {
    return {
      eyebrow: 'Праздничный сценарий',
      title: 'Выберите город, место просмотра и удобное время',
      text: 'Для событий вроде салюта важны не только цена и дата, но и точка старта, видимость, длительность программы и то, насколько быстро можно перейти к покупке.',
      asideTitle: 'Быстрая покупка к дате',
      cards: [
        { icon: <CalendarDays className="h-5 w-5" />, title: 'Дата и время', text: 'Фильтр по ближайшим датам помогает не прокручивать десятки одинаковых слотов.' },
        { icon: <MapPin className="h-5 w-5" />, title: 'Точка старта', text: 'Сравнивайте площадки и маршруты, особенно если событие привязано к конкретному виду или району.' },
        { icon: <Ticket className="h-5 w-5" />, title: 'Билет от поставщика', text: 'Оплата остается в официальном виджете, а здесь собрана витрина для быстрого выбора.' },
      ],
    };
  }

  if (key.includes('river') || key.includes('теплоход') || key.includes('речн') || key.includes('мост')) {
    return {
      eyebrow: 'Маршруты и форматы',
      title: 'Сравните прогулки по маршруту, причалу, времени и цене',
      text: 'Для речных прогулок важны причал отправления, длительность, время суток и наличие ближайших рейсов. Поэтому таблица ниже показывает сгруппированные события со слотами, а не сотни одинаковых карточек.',
      asideTitle: 'Что проверить перед покупкой',
      cards: [
        { icon: <MapPin className="h-5 w-5" />, title: 'Причал', text: 'Выбирайте удобную точку отправления и смотрите площадку до перехода в виджет.' },
        { icon: <Clock className="h-5 w-5" />, title: 'Время', text: 'Дневные, вечерние и ночные рейсы лучше сравнивать отдельно, особенно для мостов.' },
        { icon: <Ticket className="h-5 w-5" />, title: 'Цена', text: 'В каталоге показываем цены не ниже 100 рублей, чтобы не подменять основной тариф младенческим.' },
      ],
    };
  }

  return {
    eyebrow: 'Подборка Дайбилет',
    title: 'Сначала отфильтруйте варианты, затем переходите к покупке',
    text: 'Лендинг работает как тематическая витрина: собирает события из импорта, группирует повторы в одну карточку и дает быстрые фильтры по городу, дате, формату и цене.',
    asideTitle: 'Сводка по подборке',
    cards: [
      { icon: <ListFilter className="h-5 w-5" />, title: 'Фильтры', text: 'Город, категория, дата и сортировка помогают быстро сузить выдачу.' },
      { icon: <MapPin className="h-5 w-5" />, title: 'Площадки', text: 'Переходы на страницы площадок и городов усиливают SEO и помогают с навигацией.' },
      { icon: <Shield className="h-5 w-5" />, title: 'Покупка', text: 'Финансовый контур остается у билетной системы, Дайбилет хранит только нужные статусы.' },
    ],
  };
}

function scrollToSchedule() {
  document.getElementById('landing-schedule')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function LandingEditorialIntro({
  landing,
  stats,
  groups,
}: {
  landing: PublicLanding;
  stats: PublicLandingPage['stats'];
  groups: EventGroup[];
}) {
  const topCities = topEntries(stats.cities, 5);
  const topCategories = topEntries(stats.categories, 4);
  const topVenues = topEntries(stats.venues, 4);
  const sample = groups[0]?.representative;

  return (
    <section className="container-page py-10">
      <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-xs font-bold uppercase text-primary-700">
            <Sparkles className="h-3.5 w-3.5" />
            Быстрый выбор
          </div>
          <h2 className="mt-3 text-2xl font-bold text-slate-950">Что есть в подборке</h2>
          <p className="mt-3 max-w-4xl text-base leading-7 text-slate-600">
            {landing.subtitle} Мы собираем варианты из билетных систем, группируем одинаковые события по карточкам и оставляем покупку в официальном виджете поставщика.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <EditorialFact icon={<TrendingUp className="h-5 w-5" />} title="Варианты" text={`${formatNumber(stats.events)} карточек с расписанием и ценами`} />
            <EditorialFact icon={<MapPin className="h-5 w-5" />} title="География" text={topCities.length ? topCities.map(([name]) => name).join(', ') : 'подборка по доступным городам'} />
            <EditorialFact icon={<Ticket className="h-5 w-5" />} title="Цена" text={`от ${formatMoney(stats.priceFrom).replace(/^от\s+/i, '')}`} />
          </div>
        </div>

        <div className="rounded-lg bg-slate-50 p-5">
          <h3 className="text-base font-semibold text-slate-950">Советы перед покупкой</h3>
          <ul className="mt-4 grid gap-3 text-sm leading-6 text-slate-600">
            <li className="flex gap-2">
              <Clock className="mt-1 h-4 w-4 shrink-0 text-primary-600" />
              Сначала отфильтруйте дату: сегодня, завтра, выходные или вечер.
            </li>
            <li className="flex gap-2">
              <MapPin className="mt-1 h-4 w-4 shrink-0 text-primary-600" />
              Сравните город и площадку: это особенно важно для прогулок, экскурсий и больших мероприятий.
            </li>
            <li className="flex gap-2">
              <Shield className="mt-1 h-4 w-4 shrink-0 text-primary-600" />
              Оплата и билет проходят в виджете билетной системы, Дайбилет хранит только статус и факт покупки.
            </li>
          </ul>
          {sample ? (
            <a href={eventHref(sample)} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary-700 hover:text-primary-800">
              Открыть пример карточки <ArrowRight className="h-4 w-4" />
            </a>
          ) : null}
        </div>
      </div>

      <div className="mt-7 grid gap-4 lg:grid-cols-3">
        <LandingMiniList title="Города" items={topCities} empty="Города появятся после синхронизации" />
        <LandingMiniList title="Форматы" items={topCategories} empty="Форматы появятся после типизации" />
        <LandingMiniList title="Площадки" items={topVenues} empty="Площадки появятся после импорта" />
      </div>
    </section>
  );
}

function EditorialFact({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
        <span className="text-primary-600">{icon}</span>
        {title}
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}

function LandingMiniList({ title, items, empty }: { title: string; items: Array<[string, number]>; empty: string }) {
  return (
    <section className="rounded-lg bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
      <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.length ? (
          items.map(([name, count]) => (
            <span key={name} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
              <Tag className="h-3.5 w-3.5 text-primary-600" />
              {name}
              <span className="text-slate-400">{formatNumber(count)}</span>
            </span>
          ))
        ) : (
          <span className="text-sm text-slate-500">{empty}</span>
        )}
      </div>
    </section>
  );
}

function LandingHowToChoose({ landing, stats }: { landing: PublicLanding; stats: PublicLandingPage['stats'] }) {
  const steps = [
    {
      icon: <Clock className="h-6 w-6" />,
      title: 'Выберите дату',
      text: 'Для быстрых сценариев используйте фильтры “сегодня”, “завтра”, “выходные” и “вечером”.',
    },
    {
      icon: <MapPin className="h-6 w-6" />,
      title: 'Уточните город и место',
      text: Object.keys(stats.cities).length > 1 ? 'Для мультигородских подборок начните с города, затем сравните площадки.' : 'Проверьте площадку, адрес старта и удобство маршрута.',
    },
    {
      icon: <Ticket className="h-6 w-6" />,
      title: 'Сравните цену',
      text: `В подборке цена начинается ${formatMoney(stats.priceFrom)}. Детали тарифа откроются в виджете поставщика.`,
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: 'Покупайте в виджете',
      text: 'Финансовый контур остается у билетной системы, а Дайбилет помогает быстро найти подходящий вариант.',
    },
  ];

  return (
    <section id="how-to-choose" className="container-page py-10">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-950">Как выбрать: {landing.title}</h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-600">Четыре шага перед переходом к покупке.</p>
      </div>
      <div className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => (
          <div key={step.title} className="rounded-lg bg-white p-5 text-center shadow-[0_10px_28px_rgba(15,23,42,0.06)] transition hover:shadow-[0_16px_34px_rgba(15,23,42,0.1)]">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-600">{step.icon}</div>
            <div className="mt-4 text-xs font-bold uppercase text-primary-700">Шаг {index + 1}</div>
            <h3 className="mt-2 text-base font-semibold text-slate-950">{step.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{step.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function LandingContentBlocks({
  blocks,
  landing,
  stats,
}: {
  blocks: PublicLandingContentBlock[];
  landing: PublicLanding;
  stats: PublicLandingPage['stats'];
}) {
  if (!blocks.length) return null;
  const sorted = [...blocks].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  return (
    <div className="border-b border-slate-100 bg-white">
      <div className="container-page grid gap-5 py-7">
        {sorted.map((block) => (
          <LandingContentBlock key={block.id || `${block.type}:${block.sortOrder}`} block={block} landing={landing} stats={stats} />
        ))}
      </div>
    </div>
  );
}

function LandingContentBlock({
  block,
  landing,
  stats,
}: {
  block: PublicLandingContentBlock;
  landing: PublicLanding;
  stats: PublicLandingPage['stats'];
}) {
  if (block.type === 'TRUST_BADGES') return <TrustBadgesBlock block={block} />;
  if (block.type === 'VALUE_PROPS' || block.type === 'HIGHLIGHTS' || block.type === 'INFO_ICONS') return <ValuePropsBlock block={block} />;
  if (block.type === 'CITY_GRID') return <CityGridBlock block={block} />;
  if (block.type === 'FAQ') return <FaqBlock block={block} />;
  if (block.type === 'CTA_BANNER') return <CtaBlock block={block} landing={landing} stats={stats} />;
  if (block.type === 'STORY' || block.type === 'SEO_TEXT' || block.type === 'RAW_RICH_TEXT') return <StoryBlock block={block} />;
  return <StoryBlock block={block} />;
}

function TrustBadgesBlock({ block }: { block: PublicLandingContentBlock }) {
  const items = blockItems(block);
  if (!items.length) return null;
  return (
    <section className="grid gap-3 md:grid-cols-3">
      {items.slice(0, 3).map((item, index) => (
        <div key={`${item.title}:${index}`} className="rounded-lg bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
            <CheckCircle2 className="h-4 w-4 text-primary-600" />
            {item.title}
          </div>
          {item.text ? <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p> : null}
        </div>
      ))}
    </section>
  );
}

function ValuePropsBlock({ block }: { block: PublicLandingContentBlock }) {
  const items = blockItems(block);
  return (
    <section className="grid gap-4 rounded-xl bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
      <BlockHeader block={block} />
      {items.length ? (
        <div className="grid gap-3 md:grid-cols-3">
          {items.slice(0, 6).map((item, index) => (
            <div key={`${item.title}:${index}`} className="rounded-lg bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-950">{item.title}</div>
              {item.text ? <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p> : null}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function CityGridBlock({ block }: { block: PublicLandingContentBlock }) {
  const items = blockItems(block);
  if (!items.length) return null;
  return (
    <section className="grid gap-4 rounded-xl bg-slate-950 p-5 text-white shadow-[0_10px_28px_rgba(15,23,42,0.12)]">
      <BlockHeader block={block} tone="dark" />
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item, index) => (
          <a key={`${item.title}:${index}`} href={`/?city=${encodeURIComponent(item.title)}`} className="rounded-lg bg-white/10 p-4 transition hover:bg-white/15">
            <div className="font-semibold">{item.title}</div>
            <div className="mt-1 text-sm text-white/65">{formatNumber(Number(item.count || 0))} событий</div>
          </a>
        ))}
      </div>
    </section>
  );
}

function StoryBlock({ block }: { block: PublicLandingContentBlock }) {
  if (!block.title && !block.subtitle && !block.body) return null;
  return (
    <section className="grid gap-3 py-2 lg:grid-cols-[280px_minmax(0,1fr)]">
      <div>
        {block.eyebrow ? <div className="text-xs font-bold uppercase text-primary-700">{block.eyebrow}</div> : null}
        {block.title ? <h2 className="mt-1 text-2xl font-bold text-slate-950">{block.title}</h2> : null}
      </div>
      <div>
        {block.subtitle ? <p className="text-base font-medium leading-7 text-slate-700">{block.subtitle}</p> : null}
        {block.body ? <p className="mt-2 text-sm leading-7 text-slate-600">{block.body}</p> : null}
      </div>
    </section>
  );
}

function FaqBlock({ block }: { block: PublicLandingContentBlock }) {
  const items = blockItems(block);
  if (!items.length) return null;
  return (
    <section className="grid gap-4 rounded-xl bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
      <BlockHeader block={block} fallbackTitle="Вопросы перед покупкой" />
      <div className="grid gap-2">
        {items.map((item, index) => (
          <details key={`${item.question}:${index}`} className="rounded-lg bg-slate-50 p-4">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-slate-950">
              <HelpCircle className="h-4 w-4 text-primary-600" />
              {item.question || item.title}
            </summary>
            {item.answer || item.text ? <p className="mt-2 text-sm leading-6 text-slate-600">{item.answer || item.text}</p> : null}
          </details>
        ))}
      </div>
    </section>
  );
}

function CtaBlock({
  block,
  landing,
  stats,
}: {
  block: PublicLandingContentBlock;
  landing: PublicLanding;
  stats: PublicLandingPage['stats'];
}) {
  return (
    <section className="rounded-xl bg-primary-600 p-5 text-white">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xs font-bold uppercase text-white/70">{block.eyebrow || 'К покупке'}</div>
          <h2 className="mt-1 text-2xl font-bold">{block.title || landing.title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">{block.body || `Доступно ${formatNumber(stats.events)} вариантов. Отфильтруйте дату, город и цену в таблице ниже.`}</p>
        </div>
        <a href="#landing-schedule" className="inline-flex h-11 items-center justify-center rounded-lg bg-white px-5 text-sm font-semibold text-primary-700 hover:bg-primary-50">
          Выбрать билет
        </a>
      </div>
    </section>
  );
}

function BlockHeader({ block, fallbackTitle, tone = 'light' }: { block: PublicLandingContentBlock; fallbackTitle?: string; tone?: 'light' | 'dark' }) {
  const muted = tone === 'dark' ? 'text-white/65' : 'text-slate-500';
  return (
    <div>
      {block.eyebrow ? <div className={`text-xs font-bold uppercase ${tone === 'dark' ? 'text-white/60' : 'text-primary-700'}`}>{block.eyebrow}</div> : null}
      {block.title || fallbackTitle ? <h2 className="text-2xl font-bold">{block.title || fallbackTitle}</h2> : null}
      {block.subtitle ? <p className={`mt-2 max-w-3xl text-sm leading-6 ${muted}`}>{block.subtitle}</p> : null}
    </div>
  );
}

function blockItems(block: PublicLandingContentBlock): Array<Record<string, string | number>> {
  const items = block.payload?.items;
  if (!Array.isArray(items)) return [];
  return items
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item) => ({
      title: String(item.title ?? ''),
      text: String(item.text ?? ''),
      question: String(item.question ?? ''),
      answer: String(item.answer ?? ''),
      count: typeof item.count === 'number' ? item.count : Number(item.count || 0),
    }))
    .filter((item) => item.title || item.question);
}

function LandingFilters({
  stats,
  city,
  category,
  dateFilter,
  sort,
  mode,
  groupsCount,
  sessionsCount,
  setCity,
  setCategory,
  setDateFilter,
  setSort,
  setMode,
  reset,
}: {
  stats: PublicLandingPage['stats'];
  city: string;
  category: string;
  dateFilter: DateFilter;
  sort: SortFilter;
  mode: ViewMode;
  groupsCount: number;
  sessionsCount: number;
  setCity: (value: string) => void;
  setCategory: (value: string) => void;
  setDateFilter: (value: DateFilter) => void;
  setSort: (value: SortFilter) => void;
  setMode: (value: ViewMode) => void;
  reset: () => void;
}) {
  const cityOptions = Object.entries(stats.cities).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const categoryOptions = Object.entries(stats.categories).sort((a, b) => b[1] - a[1]).slice(0, 8);

  return (
    <section className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Расписание</h2>
            <p className="mt-1 text-sm text-slate-500">
              {formatNumber(groupsCount)} вариантов, {formatNumber(sessionsCount)} сеансов. Дубли одинаковых событий сгруппированы.
            </p>
          </div>
          <div className="inline-flex w-fit overflow-hidden rounded-lg border border-slate-200 bg-white">
            <button type="button" onClick={() => setMode('table')} className={`inline-flex h-10 items-center gap-2 px-3 text-sm font-semibold ${mode === 'table' ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
              <ListFilter className="h-4 w-4" />
              Таблица
            </button>
            <button type="button" onClick={() => setMode('cards')} className={`inline-flex h-10 items-center gap-2 border-l border-slate-200 px-3 text-sm font-semibold ${mode === 'cards' ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
              <LayoutGrid className="h-4 w-4" />
              Карточки
            </button>
          </div>
        </div>

        <ChipRow
          items={[
            { label: 'По цене', value: 'price' },
            { label: 'По популярности', value: 'rating' },
            { label: 'По времени', value: 'time' },
          ]}
          active={sort}
          onChange={(value) => setSort(value as SortFilter)}
        />

        <ChipRow
          items={[
            { label: 'Любая дата', value: 'all' },
            { label: 'Сегодня', value: 'today' },
            { label: 'Завтра', value: 'tomorrow' },
            { label: 'Выходные', value: 'weekend' },
            { label: 'Вечером', value: 'evening' },
          ]}
          active={dateFilter}
          onChange={(value) => setDateFilter(value as DateFilter)}
        />

        <ChipRow
          items={[{ label: 'Все города', value: 'all' }, ...cityOptions.map(([name, count]) => ({ label: `${name} · ${count}`, value: name }))]}
          active={city}
          onChange={setCity}
        />

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <label className="grid gap-1 text-xs font-semibold text-slate-500">
            Категория или формат
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900">
              <option value="all">Любой формат</option>
              {categoryOptions.map(([name, count]) => (
                <option key={name} value={name}>{name} · {count}</option>
              ))}
            </select>
          </label>
          <button type="button" onClick={reset} className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            Сбросить фильтры
          </button>
        </div>
      </div>
    </section>
  );
}

function LandingEventsTable({ groups }: { groups: EventGroup[] }) {
  return (
    <div className="overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[980px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
            <th className="px-4 py-3 font-semibold">Ближайшие слоты</th>
            <th className="px-4 py-3 font-semibold">Событие</th>
            <th className="px-4 py-3 font-semibold">Город</th>
            <th className="px-4 py-3 font-semibold">Площадка</th>
            <th className="px-4 py-3 font-semibold">Цена</th>
            <th className="px-4 py-3 font-semibold">Места</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <tr key={group.key} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
              <td className="whitespace-nowrap px-4 py-3 align-top">
                <div className="flex flex-wrap gap-1.5">
                  {group.sessions.slice(0, 3).map((session) => (
                    <span key={session.id} className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                      {session.dateLabel} · {session.timeLabel}
                    </span>
                  ))}
                  {group.sessions.length > 3 ? <span className="rounded-lg bg-primary-50 px-2 py-1 text-xs font-semibold text-primary-700">+{group.sessions.length - 3}</span> : null}
                </div>
              </td>
              <td className="min-w-[320px] px-4 py-3 align-top">
                <a href={eventHref(group.representative)} className="font-medium text-slate-950 hover:text-primary-700">{group.title}</a>
                <div className="mt-1 text-xs text-slate-500">{group.category} · {group.tags[0] ?? 'событие'}</div>
              </td>
              <td className="px-4 py-3 align-top">
                {group.representative.citySlug ? <a href={`/cities/${group.representative.citySlug}`} className="font-medium text-slate-700 hover:text-primary-700">{group.city}</a> : group.city}
              </td>
              <td className="max-w-[240px] px-4 py-3 align-top text-slate-600">
                {group.representative.venueSlug ? <a href={`/venues/${group.representative.venueSlug}`} className="hover:text-primary-700">{group.venue}</a> : group.venue}
              </td>
              <td className="px-4 py-3 align-top font-semibold text-slate-950">{formatMoney(group.priceFrom)}</td>
              <td className="px-4 py-3 align-top text-slate-600">{group.vacant ?? '-'}</td>
              <td className="px-4 py-3 align-top"><BuyLink session={group.representative} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      {!groups.length ? <EmptyFilteredState /> : null}
    </div>
  );
}

function LandingEventsGrid({ groups }: { groups: EventGroup[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {groups.slice(0, 60).map((group) => (
        <EventCard key={group.key} event={group.representative} compact />
      ))}
      {!groups.length ? <EmptyFilteredState /> : null}
    </div>
  );
}

function BuyLink({ session }: { session: PublicSession }) {
  if (!session.purchaseUrl) {
    return (
      <span className="inline-flex min-h-9 items-center justify-center rounded-lg bg-slate-100 px-4 text-sm font-semibold text-slate-400">
        Нет ссылки
      </span>
    );
  }

  return (
    <a href={session.purchaseUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center justify-center rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700">
      Купить
    </a>
  );
}

function LandingContext({ landing, stats }: { landing: PublicLanding; stats: PublicLandingPage['stats'] }) {
  const topVenues = Object.entries(stats.venues).sort((a, b) => b[1] - a[1]).slice(0, 8);

  return (
    <section className="rounded-xl bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
      <h3 className="text-sm font-semibold text-slate-950">Контекст лендинга</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{landing.subtitle}</p>
      <div className="mt-4 grid gap-2">
        {topVenues.map(([venue, count]) => (
          <div key={venue} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
            <span className="min-w-0 truncate text-slate-700">{venue}</span>
            <span className="shrink-0 font-semibold text-slate-950">{formatNumber(count)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function RelatedLandings({ landings }: { landings: PublicLanding[] }) {
  if (!landings.length) return null;

  return (
    <section className="rounded-xl bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
      <h3 className="text-sm font-semibold text-slate-950">Похожие подборки</h3>
      <div className="mt-3 grid gap-3">
        {landings.slice(0, 6).map((landing) => (
          <a key={landing.slug} href={`/landings/${landing.slug}`} className="rounded-lg bg-slate-50 p-3 transition hover:bg-primary-50/70">
            <div className="text-sm font-semibold text-slate-950">{landing.title}</div>
            <div className="mt-1 text-xs text-slate-500">{formatNumber(landing.events)} событий · {formatMoney(landing.priceFrom)}</div>
          </a>
        ))}
      </div>
    </section>
  );
}

function HeroStat({ label, value, raw = false }: { label: string; value: number | string; raw?: boolean }) {
  return (
    <div className="rounded-xl bg-white/10 p-4">
      <div className="text-2xl font-bold">{raw ? value : formatNumber(Number(value))}</div>
      <div className="mt-1 text-xs font-medium text-white/60">{label}</div>
    </div>
  );
}

function ChipRow({ items, active, onChange }: { items: Array<{ label: string; value: string }>; active: string; onChange: (value: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onChange(item.value)}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            active === item.value
              ? 'bg-primary-600 text-white'
              : 'border border-slate-200 bg-white text-slate-600 hover:border-primary-300 hover:text-primary-700'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function EmptyFilteredState() {
  return (
    <div className="grid min-h-[220px] place-items-center p-6 text-center">
      <div>
        <Search className="mx-auto h-7 w-7 text-slate-300" />
        <div className="mt-3 text-sm font-semibold text-slate-950">По этим фильтрам вариантов нет</div>
        <div className="mt-1 text-sm text-slate-500">Снимите город, формат или дату.</div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <section className="container-page py-12">
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">Загружаем лендинг...</div>
    </section>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <section className="container-page py-12">
      <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-sm font-medium text-red-700">{message}</div>
    </section>
  );
}

function buildStaticLandingPage(slug: string): PublicLandingPage | null {
  const landing = publicData.landings.find((item) => item.slug === slug);
  if (!landing) return null;

  const sessions = publicData.sessions.filter((session) => session.landingSlugs.includes(slug));
  return {
    generatedAt: publicData.generatedAt,
    landing,
    sessions,
    relatedLandings: publicData.landings.filter((item) => item.slug !== slug && item.events > 0).slice(0, 6),
    blocks: [],
    stats: buildLandingStats(sessions),
  };
}

function buildLandingStats(sessions: PublicSession[]): PublicLandingPage['stats'] {
  const prices = sessions.map((session) => session.priceFrom).filter((price): price is number => Number.isFinite(price) && Number(price) >= MIN_DISPLAY_PRICE_RUB);
  return {
    events: groupLandingSessions(sessions).length,
    sessions: sessions.length,
    cities: countBy(sessions.map((session) => session.city)),
    categories: countBy(sessions.flatMap((session) => [session.category, ...session.tags.slice(0, 2)]).filter(Boolean)),
    venues: countBy(sessions.map((session) => session.venue)),
    priceFrom: prices.length ? Math.min(...prices) : null,
  };
}

function groupLandingSessions(sessions: PublicSession[]): EventGroup[] {
  const groups = new Map<string, PublicSession[]>();

  for (const session of sessions) {
    const key = [session.title, session.city, session.venue].map((value) => normalizeKey(value)).join('|');
    const list = groups.get(key) || [];
    list.push(session);
    groups.set(key, list);
  }

  return [...groups.entries()].map(([key, groupSessions]) => {
    const sortedSessions = [...groupSessions].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    const representative = sortedSessions[0];
    const prices = sortedSessions.map((session) => session.priceFrom).filter((price): price is number => Number.isFinite(price) && Number(price) >= MIN_DISPLAY_PRICE_RUB);
    const vacantValues = sortedSessions.map((session) => session.vacant).filter((vacant): vacant is number => Number.isFinite(vacant));

    return {
      key,
      title: representative.title,
      city: representative.city,
      venue: representative.venue,
      category: representative.category,
      tags: representative.tags,
      representative,
      sessions: sortedSessions,
      priceFrom: prices.length ? Math.min(...prices) : null,
      vacant: vacantValues.length ? Math.min(...vacantValues) : null,
      firstStartsAt: representative.startsAt,
    };
  });
}

function sortEventGroups(groups: EventGroup[], sort: SortFilter): EventGroup[] {
  const sorted = [...groups];

  if (sort === 'price') {
    return sorted.sort((a, b) => (a.priceFrom || Number.MAX_SAFE_INTEGER) - (b.priceFrom || Number.MAX_SAFE_INTEGER));
  }

  if (sort === 'rating') {
    return sorted.sort((a, b) => b.sessions.length - a.sessions.length || (a.priceFrom || 0) - (b.priceFrom || 0));
  }

  return sorted.sort((a, b) => new Date(a.firstStartsAt || 0).getTime() - new Date(b.firstStartsAt || 0).getTime());
}

function matchesDateFilter(session: PublicSession, date: Date, filter: DateFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'evening') return session.timeBucket === 'evening' || date.getHours() >= 18;
  if (Number.isNaN(date.getTime())) return false;

  const today = startOfDay(new Date());
  const sessionDay = startOfDay(date);

  if (filter === 'today') return sessionDay.getTime() === today.getTime();
  if (filter === 'tomorrow') return sessionDay.getTime() === today.getTime() + 86_400_000;
  if (filter === 'weekend') return [0, 6].includes(date.getDay());
  return true;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function countBy(values: string[]): Record<string, number> {
  return values.reduce<Record<string, number>>((acc, value) => {
    if (!value) return acc;
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function topEntries(values: Record<string, number>, limit: number): Array<[string, number]> {
  return Object.entries(values)
    .filter(([name, count]) => Boolean(name) && count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

function normalizeKey(value: string): string {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function applyLandingMeta(landing: PublicLanding) {
  document.title = landing.seoTitle || `${landing.title} | Дайбилет`;
  setMeta('description', landing.seoDescription || landing.subtitle);
  setMeta('robots', 'index,follow');
}

function setMeta(name: string, content: string) {
  let element = document.querySelector(`meta[name="${name}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute('name', name);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function navigateHome(section: string) {
  if (section === 'events') {
    window.location.href = '/events';
    return;
  }
  if (section === 'cities' || section === 'destinations') {
    window.location.href = '/cities';
    return;
  }
  if (section === 'blog') {
    window.location.href = '/blog';
    return;
  }
  window.location.href = section === 'top' ? '/' : `/#${section}`;
}
