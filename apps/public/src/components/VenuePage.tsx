import * as React from 'react';
import { ArrowLeft, CalendarDays, CheckCircle2, Grid3X3, HelpCircle, ListFilter, MapPin, Navigation, Ticket } from 'lucide-react';

import { EventCard } from '@/components/EventCard';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { formatMoney, formatNumber } from '@/data';
import { eventHref } from '@/routes';
import type { PublicSession, PublicVenue, PublicVenuePage } from '@/types';

const API_BASE_URL =
  ((import.meta as ImportMeta & { env?: { VITE_DAIBILET_API_URL?: string } }).env?.VITE_DAIBILET_API_URL as string | undefined) ||
  'http://127.0.0.1:4000';
const MIN_DISPLAY_PRICE_RUB = 100;

type VenuePageProps = {
  slug: string;
};

type VenueDateFilter = 'smart' | 'today' | 'tomorrow' | 'all';

type VenueEventGroup = {
  key: string;
  title: string;
  category: string;
  tags: string[];
  representative: PublicSession;
  sessions: PublicSession[];
  priceFrom?: number | null;
  vacant?: number | null;
  firstStartsAt?: string | null;
};

export function VenuePage({ slug }: VenuePageProps) {
  const [payload, setPayload] = React.useState<PublicVenuePage | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [category, setCategory] = React.useState('all');
  const [dateFilter, setDateFilter] = React.useState<VenueDateFilter>('smart');
  const [mode, setMode] = React.useState<'cards' | 'table'>('table');

  React.useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    fetch(`${API_BASE_URL}/api/public/venues/${encodeURIComponent(slug)}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as PublicVenuePage | null;
      })
      .then((data) => {
        if (!data) throw new Error('Страница не найдена');
        setPayload(data);
        setError(null);
        applyVenueMeta(data);
      })
      .catch((requestError) => {
        if (controller.signal.aborted) return;
        setError(requestError instanceof Error ? requestError.message : String(requestError));
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [slug]);

  const baseSessions = React.useMemo(() => {
    if (!payload) return [];
    if (category === 'all') return payload.sessions;
    return payload.sessions.filter((session) => session.category === category);
  }, [category, payload]);

  const dateOptions = React.useMemo(() => buildVenueDateOptions(baseSessions), [baseSessions]);
  const sessions = React.useMemo(() => filterVenueSessionsByDate(baseSessions, dateFilter, dateOptions.smartDate), [baseSessions, dateFilter, dateOptions.smartDate]);
  const groups = React.useMemo(() => groupVenueSessions(sessions), [sessions]);
  const venue = payload?.venue;
  const categories = venue ? Object.entries(venue.categories).sort((a, b) => b[1] - a[1]) : [];

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header cityLabel={venue?.city || 'Дайбилет'} search="" onSearch={() => undefined} onSection={(section) => navigateHome(section)} />

      <main>
        {isLoading ? (
          <div className="container-page py-16 text-sm text-slate-500">Загружаем страницу...</div>
        ) : null}

        {!isLoading && error ? (
          <div className="container-page py-16">
            <button type="button" className="btn-secondary" onClick={() => navigateHome('top')}>
              <ArrowLeft className="h-4 w-4" />
              На главную
            </button>
            <h1 className="mt-6 text-3xl font-bold text-slate-950">Страница не найдена</h1>
            <p className="mt-2 text-sm text-slate-600">{error}</p>
          </div>
        ) : null}

        {venue && payload ? (
          <>
            <VenueHero venue={venue} stats={payload.stats} />
            <VenueHubSections venue={venue} stats={payload.stats} sessions={payload.sessions} relatedVenues={payload.relatedVenues} />

            <section id="venue-program" className="container-page grid gap-6 py-8 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-950">Расписание и билеты</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-600">Сначала показываем сегодня, завтра или ближайшую доступную дату; одинаковые сеансы сгруппированы по событию.</p>
                  </div>
                  <div className="inline-flex overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <button type="button" onClick={() => setMode('table')} className={`inline-flex items-center gap-2 px-4 text-sm font-medium ${mode === 'table' ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                      <ListFilter className="h-4 w-4" />
                      Таблица
                    </button>
                    <button type="button" onClick={() => setMode('cards')} className={`inline-flex items-center gap-2 border-l border-slate-200 px-4 text-sm font-medium ${mode === 'cards' ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                      <Grid3X3 className="h-4 w-4" />
                      Карточки
                    </button>
                  </div>
                </div>

                <div className="mb-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setCategory('all')} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${category === 'all' ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                    Все {formatNumber(payload.sessions.length)}
                  </button>
                  {categories.map(([name, count]) => (
                    <button key={name} type="button" onClick={() => setCategory(name)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${category === name ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                      {name} {formatNumber(count)}
                    </button>
                  ))}
                </div>

                <VenueDateFilters dateFilter={dateFilter} options={dateOptions} onChange={setDateFilter} visibleGroups={groups.length} visibleSessions={sessions.length} />

                {mode === 'table' ? <VenueEventsTable groups={groups} /> : <VenueEventsGrid groups={groups} />}
              </div>

              <aside className="space-y-4">
                <section className="rounded-xl bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
                  <h3 className="text-sm font-semibold text-slate-950">Кратко</h3>
                  <dl className="mt-4 grid gap-3 text-sm">
                    <InfoRow label="Город" value={venue.city} />
                    <InfoRow label="Адрес" value={venue.address || 'Адрес уточняется'} />
                    <InfoRow label="Тип" value={kindLabel(venue.type)} />
                    <InfoRow label="Событий" value={formatNumber(payload.stats.events)} />
                    <InfoRow label="Цена" value={formatMoney(payload.stats.priceFrom)} />
                  </dl>
                  {venue.latitude && venue.longitude ? (
                    <a className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700" href={`https://yandex.ru/maps/?pt=${venue.longitude},${venue.latitude}&z=16&l=map`} target="_blank" rel="noreferrer">
                      <Navigation className="h-4 w-4" />
                      Открыть на карте
                    </a>
                  ) : null}
                </section>

                {payload.relatedVenues.length ? (
                  <section className="rounded-xl bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
                    <h3 className="text-sm font-semibold text-slate-950">Похожие места</h3>
                    <div className="mt-3 grid gap-3">
                      {payload.relatedVenues.map((related) => (
                        <a key={related.id} href={`/venues/${related.slug || related.id}`} className="rounded-lg bg-slate-50 p-3 transition hover:bg-primary-50/70">
                          <div className="text-sm font-semibold text-slate-950">{related.name}</div>
                          <div className="mt-1 text-xs text-slate-500">{formatNumber(related.events)} событий</div>
                        </a>
                      ))}
                    </div>
                  </section>
                ) : null}
              </aside>
            </section>
          </>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}

function VenueHero({ venue, stats }: { venue: PublicVenue; stats: PublicVenuePage['stats'] }) {
  const title = venue.seoH1 || venue.title || venue.name;
  const description =
    venue.shortDescription ||
    venue.description ||
    `${venue.name}: события, экскурсии и ближайшие сеансы в городе ${venue.city}.`;

  return (
    <section className="border-b border-slate-200 bg-slate-950 text-white">
      <div className="container-page grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-end lg:py-12">
        <div>
          <button type="button" onClick={() => navigateHome('venues')} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-white/70 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Все места
          </button>
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/85">{kindLabel(venue.type)}</span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/85">{venue.city}</span>
          </div>
          <h1 className="max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-white/72">{description}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <StatChip icon={<CalendarDays className="h-4 w-4" />} label={`${formatNumber(stats.events)} событий`} />
            <StatChip icon={<Ticket className="h-4 w-4" />} label={formatMoney(stats.priceFrom)} />
            <StatChip icon={<MapPin className="h-4 w-4" />} label={venue.address || 'Адрес уточняется'} />
          </div>
        </div>
        <div className="aspect-[4/3] overflow-hidden rounded-xl border border-white/10 bg-white/10">
          {venue.heroImageUrl ? (
            <img src={venue.heroImageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.22),_rgba(255,255,255,0.04))] text-sm text-white/62">
              {venue.name}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function VenueHubSections({
  venue,
  stats,
  sessions,
  relatedVenues,
}: {
  venue: PublicVenue;
  stats: PublicVenuePage['stats'];
  sessions: PublicSession[];
  relatedVenues: PublicVenue[];
}) {
  const categories = Object.entries(venue.categories || {}).sort((a, b) => b[1] - a[1]);
  const nextSessions = sessions.slice(0, 3);
  const hasMap = Boolean(venue.latitude && venue.longitude);

  return (
    <div className="border-b border-slate-100 bg-white">
      <div className="container-page grid gap-8 py-8">
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-xs font-bold uppercase text-primary-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Страница
            </div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Что важно знать о {venue.name}</h2>
            <p className="mt-3 max-w-4xl text-base leading-7 text-slate-600">
              Здесь собраны контекст, адрес, ближайшая программа и похожие места. Афиша ниже остается покупочным модулем с фильтром по датам, а не единственным содержанием страницы.
            </p>
          </div>
          <div className="grid gap-3 rounded-xl bg-slate-50 p-4">
            <HubFact label="Тип" value={kindLabel(venue.type)} />
            <HubFact label="Локация" value={venue.city} />
            <HubFact label="В программе" value={`${formatNumber(stats.events)} событий`} />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <InfoCard title="О месте" text={venue.shortDescription || venue.description || `${venue.name} — место в ${venue.city}. Здесь собраны ближайшие события, доступные сеансы и ссылки на покупку у билетного оператора.`} />
          <InfoCard title="Как выбрать" text={categories.length ? `Сначала выберите направление: ${categories.slice(0, 3).map(([name]) => name).join(', ')}. Затем сравните дату, цену и остаток мест в таблице.` : 'Выберите ближайший сеанс в расписании и перейдите к покупке через виджет билетной системы.'} />
          <InfoCard title="Как посетить" text={venue.address ? `Адрес: ${venue.address}. ${hasMap ? 'Можно открыть точку на карте и построить маршрут.' : 'Координаты пока не указаны, адрес лучше проверить перед посещением.'}` : 'Адрес пока уточняется поставщиком. Перед покупкой проверьте детали в карточке события.'} />
        </section>

        {categories.length || nextSessions.length ? (
          <section className="rounded-xl bg-slate-50 p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-950">Программа</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">Короткая сводка перед покупочной таблицей: направления и ближайшие слоты.</p>
              </div>
              <a href="#venue-program" className="text-sm font-semibold text-primary-700 hover:text-primary-800">К расписанию</a>
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="flex flex-wrap gap-2">
                {categories.map(([name, count]) => (
                  <span key={name} className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">
                    {name} · {formatNumber(count)}
                  </span>
                ))}
              </div>
              {nextSessions.length ? (
                <div className="grid gap-2">
                  {nextSessions.map((session) => (
                    <a key={session.id} href={eventHref(session)} className="rounded-lg bg-white p-3 text-sm shadow-sm transition hover:bg-primary-50/50">
                      <div className="font-semibold text-slate-950">{session.title}</div>
                      <div className="mt-1 text-xs text-slate-500">{session.dateLabel} · {session.timeLabel} · {formatMoney(session.priceFrom)}</div>
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-xl bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
            <h2 className="text-2xl font-bold text-slate-950">Вопросы перед посещением</h2>
            <div className="mt-4 grid gap-2">
              <VenueFaqItem question="Где проходит покупка билета?" answer="Покупка проходит на стороне билетной системы или в ее виджете. Дайбилет помогает выбрать событие и хранит только факт покупки и статус билета." />
              <VenueFaqItem question="Почему много похожих сеансов?" answer="Поставщики могут отдавать каждый сеанс отдельно. Мы группируем и показываем ближайшие слоты, чтобы быстрее найти нужную дату." />
              <VenueFaqItem question="Можно ли прийти без привязки ко времени?" answer="Это зависит от конкретного события или билета. Если дата открытая, это будет отражено в карточке события и условиях билетного оператора." />
            </div>
          </div>
          {relatedVenues.length ? (
            <div className="rounded-xl bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
              <h2 className="text-lg font-bold text-slate-950">Похожие места</h2>
              <div className="mt-3 grid gap-3">
                {relatedVenues.slice(0, 4).map((related) => (
                  <a key={related.id} href={`/venues/${related.slug || related.id}`} className="rounded-lg bg-slate-50 p-3 transition hover:bg-primary-50/70">
                    <div className="text-sm font-semibold text-slate-950">{related.name}</div>
                    <div className="mt-1 text-xs text-slate-500">{formatNumber(related.events)} событий</div>
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
      <h3 className="text-base font-semibold text-slate-950">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}

function HubFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-3">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function VenueFaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group rounded-lg bg-slate-50 p-4">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-slate-950">
        <HelpCircle className="h-4 w-4 text-primary-600" />
        {question}
      </summary>
      <p className="mt-2 text-sm leading-6 text-slate-600">{answer}</p>
    </details>
  );
}

function VenueDateFilters({
  dateFilter,
  options,
  onChange,
  visibleGroups,
  visibleSessions,
}: {
  dateFilter: VenueDateFilter;
  options: ReturnType<typeof buildVenueDateOptions>;
  onChange: (value: VenueDateFilter) => void;
  visibleGroups: number;
  visibleSessions: number;
}) {
  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-950">Дата</div>
          <div className="text-xs text-slate-500">
            Показано {formatNumber(visibleGroups)} событий, {formatNumber(visibleSessions)} сеансов. Одинаковые события сгруппированы.
          </div>
        </div>
        {options.smartDate ? <div className="text-xs font-medium text-slate-500">Ближайшая дата: {formatHumanDate(options.smartDate)}</div> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <DateChip active={dateFilter === 'smart'} disabled={!options.smartDate} onClick={() => onChange('smart')} label={options.smartDate ? `Ближайшая · ${formatShortDate(options.smartDate)}` : 'Ближайшая'} />
        <DateChip active={dateFilter === 'today'} disabled={!options.hasToday} onClick={() => onChange('today')} label="Сегодня" />
        <DateChip active={dateFilter === 'tomorrow'} disabled={!options.hasTomorrow} onClick={() => onChange('tomorrow')} label="Завтра" />
        <DateChip active={dateFilter === 'all'} disabled={false} onClick={() => onChange('all')} label="Все даты" />
      </div>
    </div>
  );
}

function DateChip({ active, disabled, label, onClick }: { active: boolean; disabled: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? 'bg-primary-600 text-white'
          : disabled
            ? 'bg-slate-100 text-slate-300'
            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
      }`}
    >
      {label}
    </button>
  );
}

function VenueEventsGrid({ groups }: { groups: VenueEventGroup[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {groups.slice(0, 36).map((group) => (
        <EventCard key={group.key} event={group.representative} compact />
      ))}
      {!groups.length ? <EmptyState /> : null}
    </div>
  );
}

function VenueEventsTable({ groups }: { groups: VenueEventGroup[] }) {
  return (
    <div className="overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[900px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
            <th className="px-4 py-3 font-semibold">Ближайшие слоты</th>
            <th className="px-4 py-3 font-semibold">Событие</th>
            <th className="px-4 py-3 font-semibold">Категория</th>
            <th className="px-4 py-3 font-semibold">Цена</th>
            <th className="px-4 py-3 font-semibold">Остаток</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {groups.slice(0, 120).map((group) => (
            <tr key={group.key} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
              <td className="whitespace-nowrap px-4 py-3 align-top">
                <div className="flex flex-wrap gap-1.5">
                  {group.sessions.slice(0, 4).map((session) => (
                    <span key={session.id} className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                      {session.dateLabel} · {session.timeLabel}
                    </span>
                  ))}
                  {group.sessions.length > 4 ? <span className="rounded-lg bg-primary-50 px-2 py-1 text-xs font-semibold text-primary-700">+{group.sessions.length - 4}</span> : null}
                </div>
              </td>
              <td className="min-w-[320px] px-4 py-3">
                <a href={eventHref(group.representative)} className="font-medium text-slate-950 hover:text-primary-700">{group.title}</a>
                <div className="mt-1 text-xs text-slate-500">{group.tags.slice(0, 2).join(' · ')}</div>
              </td>
              <td className="px-4 py-3 text-slate-600">{group.category}</td>
              <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-950">{formatMoney(group.priceFrom)}</td>
              <td className="px-4 py-3 text-slate-600">{group.vacant ?? '-'}</td>
              <td className="px-4 py-3">
                <BuyLink session={group.representative} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!groups.length ? <EmptyState /> : null}
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

function EmptyState() {
  return <div className="p-8 text-sm text-slate-500">Событий по выбранному фильтру пока нет.</div>;
}

function buildVenueDateOptions(sessions: PublicSession[]) {
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const todayKey = dateKey(today);
  const tomorrowKey = dateKey(tomorrow);
  const keys = sessions
    .map((session) => sessionDateKey(session))
    .filter((key): key is string => Boolean(key))
    .sort();
  const uniqueKeys = Array.from(new Set(keys));
  const futureKey = uniqueKeys.find((key) => key >= todayKey);
  const smartDate = uniqueKeys.includes(todayKey)
    ? todayKey
    : uniqueKeys.includes(tomorrowKey)
      ? tomorrowKey
      : futureKey || uniqueKeys[0] || null;

  return {
    todayKey,
    tomorrowKey,
    smartDate,
    hasToday: uniqueKeys.includes(todayKey),
    hasTomorrow: uniqueKeys.includes(tomorrowKey),
  };
}

function filterVenueSessionsByDate(sessions: PublicSession[], filter: VenueDateFilter, smartDate: string | null) {
  if (filter === 'all') return sessions;
  const options = buildVenueDateOptions(sessions);
  const target = filter === 'today' ? options.todayKey : filter === 'tomorrow' ? options.tomorrowKey : smartDate;
  if (!target) return sessions;
  return sessions.filter((session) => sessionDateKey(session) === target);
}

function groupVenueSessions(sessions: PublicSession[]): VenueEventGroup[] {
  const groups = new Map<string, PublicSession[]>();

  for (const session of sessions) {
    const key = [session.title, session.category, session.venue].map(normalizeKey).join('|');
    const list = groups.get(key) || [];
    list.push(session);
    groups.set(key, list);
  }

  return Array.from(groups.entries())
    .map(([key, groupSessions]) => {
      const sortedSessions = [...groupSessions].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
      const representative = sortedSessions[0];
      const prices = sortedSessions.map((session) => session.priceFrom).filter((price): price is number => Number.isFinite(price) && Number(price) >= MIN_DISPLAY_PRICE_RUB);
      const vacantValues = sortedSessions.map((session) => session.vacant).filter((vacant): vacant is number => Number.isFinite(vacant));

      return {
        key,
        title: representative.title,
        category: representative.category,
        tags: representative.tags || [],
        representative,
        sessions: sortedSessions,
        priceFrom: prices.length ? Math.min(...prices) : null,
        vacant: vacantValues.length ? Math.min(...vacantValues) : null,
        firstStartsAt: representative.startsAt,
      };
    })
    .sort((a, b) => new Date(a.firstStartsAt || 0).getTime() - new Date(b.firstStartsAt || 0).getTime());
}

function sessionDateKey(session: PublicSession) {
  const date = new Date(session.startsAt);
  if (!Number.isFinite(date.getTime())) return null;
  return dateKey(startOfDay(date));
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatShortDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(date);
}

function formatHumanDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' }).format(date);
}

function normalizeKey(value: string) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[90px_1fr] gap-3">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="min-w-0 text-slate-800">{value}</dd>
    </div>
  );
}

function StatChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold text-white/85">
      {icon}
      {label}
    </span>
  );
}

function kindLabel(kind?: string | null) {
  const normalized = String(kind || 'other').toLowerCase();
  const labels: Record<string, string> = {
    venue: 'Место',
    museum_art_space: 'Музей / арт',
    theater: 'Театр',
    concert_hall: 'Концертный зал',
    club_bar_restaurant: 'Клуб / ресторан',
    pier: 'Причал',
    meeting_point: 'Точка встречи',
    outdoor_location: 'Открытая локация',
    sport_activity_space: 'Спорт / активность',
    attraction: 'Аттракцион',
    online: 'Онлайн',
    other: 'Место',
  };
  return labels[normalized] || labels.other;
}

function navigateHome(section: string) {
  if (section === 'top') {
    window.location.href = '/';
    return;
  }
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
  window.location.href = `/#${section}`;
}

function applyVenueMeta(payload: PublicVenuePage) {
  const venue = payload.venue;
  document.title = venue.seoTitle || `${venue.name}: афиша и билеты | Дайбилет`;
  upsertMeta('description', venue.seoDescription || venue.shortDescription || venue.description || `${venue.name}: события, расписание и билеты.`);
  upsertMeta('robots', venue.isIndexable === false ? 'noindex, nofollow' : 'index, follow');
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
