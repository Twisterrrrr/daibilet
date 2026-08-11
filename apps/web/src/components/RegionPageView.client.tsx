'use client';

import * as React from 'react';
import { ArrowRight, MapPin, Ticket } from 'lucide-react';
import Link from 'next/link';

import { EventCard } from '@/components/EventCard';
import { formatNumber } from '@/lib/format';
import { buildRegionSystemBrief } from '@/lib/region-hub-seo';
import { cityHref } from '@/lib/routes';
import {
  collectSessionStartsAtTimes,
  isSameSessionDay,
  isSessionWeekend,
  resolveSessionTimeZoneForSession,
} from '@/lib/datetime';
import type {
  PublicCityPageDto,
  PublicRegionChildCityDto,
  PublicSessionDto,
} from '@daibilet/contracts/public';
import { resolveRegionLiveTier } from '@daibilet/contracts/common';

const SECTION_SCROLL_MT = 'scroll-mt-[calc(var(--site-header-height)+3.25rem)]';

type DateFilter = 'all' | 'today' | 'weekend';

export function RegionPageView({
  slug,
  initialPayload,
}: {
  slug: string;
  initialPayload: PublicCityPageDto | null;
}) {
  const [payload, setPayload] = React.useState<PublicCityPageDto | null>(initialPayload);
  const [contentReady, setContentReady] = React.useState(() => Boolean(initialPayload?.sessions?.length));
  const [error, setError] = React.useState<string | null>(null);
  const [cityFilter, setCityFilter] = React.useState<string[] | null>(null);
  const [dateFilter, setDateFilter] = React.useState<DateFilter>('all');
  const [showAllCities, setShowAllCities] = React.useState(false);

  React.useEffect(() => {
    if (initialPayload?.city) {
      setPayload(initialPayload);
      setContentReady(true);
      return;
    }
    const controller = new AbortController();
    fetch(`/api/public/cities/${encodeURIComponent(slug)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as PublicCityPageDto | null;
      })
      .then((data) => {
        if (!data?.city) throw new Error('Регион не найден');
        setPayload(data);
        setContentReady(true);
        setError(null);
      })
      .catch((err: unknown) => {
        if ((err as { name?: string })?.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Ошибка загрузки');
      });
    return () => controller.abort();
  }, [initialPayload, slug]);

  const city = payload?.city;
  const centerCity = payload?.centerCity ?? null;
  const childCities = payload?.childCities || [];
  const regionInfo = payload?.regionInfo;
  const eventTotal = payload?.stats?.events ?? city?.events ?? 0;
  const liveTier =
    payload?.regionTier ||
    resolveRegionLiveTier(
      (payload?.childCities || []).reduce((sum, item) => sum + (Number(item.eventCount) || 0), 0) ||
        eventTotal,
    );
  const isTierC = liveTier === 'C';
  const brief =
    regionInfo?.brief?.trim() ||
    (city
      ? isTierC
        ? eventTotal > 0
          ? `Сейчас в регионе немного событий — удобнее смотреть афишу ${centerCity?.name || 'административного центра'} и редкие выезды.`
          : `Сейчас за городом ничего не происходит. Загляните в афишу ${centerCity?.name || 'центра региона'}.`
        : buildRegionSystemBrief(city.name)
      : '');

  const visibleCities = React.useMemo(() => {
    if (isTierC) return [];
    const withEvents = childCities.filter((item) => item.eventCount > 0);
    if (showAllCities) return childCities;
    return withEvents;
  }, [childCities, showAllCities, isTierC]);

  const hiddenZeroCount = isTierC ? 0 : childCities.filter((item) => item.eventCount <= 0).length;

  const sessions = React.useMemo(() => {
    const list = payload?.sessions || [];
    const filterSet = cityFilter?.length
      ? new Set(cityFilter.map((name) => name.trim().toLowerCase()).filter(Boolean))
      : null;
    return list.filter((session) => {
      if (filterSet) {
        const sessionCity = String(session.city || '').trim().toLowerCase();
        if (!filterSet.has(sessionCity)) return false;
      }
      if (dateFilter === 'all') return true;
      const starts = collectSessionStartsAtTimes(session);
      if (!starts.length) return false;
      const tz = resolveSessionTimeZoneForSession(session);
      if (dateFilter === 'today') return starts.some((at) => isSameSessionDay(at, new Date(), tz));
      return starts.some((at) => isSessionWeekend(at, tz));
    });
  }, [payload?.sessions, cityFilter, dateFilter]);

  const topPlaces =
    liveTier === 'A'
      ? (regionInfo?.topPlaces || [])
          .filter((item) => item.name?.trim())
          .filter((place) => {
            const names = (place.cityNames || []).map((n) => n.trim()).filter(Boolean);
            if (!names.length) return true;
            const nameSet = new Set(names.map((n) => n.toLowerCase()));
            return childCities.some((cityItem) => nameSet.has(cityItem.name.toLowerCase()) && cityItem.eventCount > 0);
          })
      : [];
  const faqItems = isTierC
    ? []
    : regionInfo?.faq?.filter((item) => item.q?.trim() && item.a?.trim()) || [];
  const cityFilterLabel = cityFilter?.length ? cityFilter.join(', ') : null;

  const isCityFilterActive = React.useCallback(
    (names: string[]) => {
      if (!cityFilter?.length || !names.length) return false;
      if (cityFilter.length !== names.length) return false;
      const left = new Set(cityFilter.map((n) => n.toLowerCase()));
      return names.every((n) => left.has(n.toLowerCase()));
    },
    [cityFilter],
  );

  const applyCityFilter = React.useCallback((names: string[]) => {
    const cleaned = names.map((n) => n.trim()).filter(Boolean);
    setCityFilter((prev) => {
      if (prev && isSameCitySet(prev, cleaned)) return null;
      return cleaned.length ? cleaned : null;
    });
    scrollToSection('affiche');
  }, []);

  const tabs = React.useMemo(() => {
    if (isTierC) {
      return [
        { id: 'bridge', label: centerCity ? `Афиша ${centerCity.name}` : 'Центр', show: Boolean(centerCity) },
        { id: 'affiche', label: 'Афиша региона', show: eventTotal > 0 },
      ].filter((tab) => tab.show);
    }
    return [
      { id: 'cities', label: 'Города', show: childCities.some((c) => c.eventCount > 0) || childCities.length > 0 },
      { id: 'places', label: 'Куда съездить', show: topPlaces.length > 0 },
      { id: 'affiche', label: 'Афиша', show: true },
      { id: 'faq', label: 'FAQ', show: faqItems.length > 0 },
    ].filter((tab) => tab.show);
  }, [childCities, topPlaces.length, faqItems.length, isTierC, centerCity, eventTotal]);

  if (error && !city) {
    return (
      <div className="container-page py-16">
        <h1 className="text-3xl font-bold text-slate-950">Регион не найден</h1>
        <p className="mt-2 text-sm text-slate-600">{error}</p>
      </div>
    );
  }

  if (!city || !payload) {
    return (
      <div className="container-page py-16">
        <div className="h-10 w-64 animate-pulse rounded bg-slate-100" />
        <div className="mt-4 h-24 max-w-2xl animate-pulse rounded bg-slate-50" />
      </div>
    );
  }

  const h1 = city.seoH1 || `Мероприятия и загородный отдых в ${city.name}`;

  return (
    <div className="bg-white text-slate-900">
      <main>
        <section id="top" className="border-b border-slate-200 bg-gradient-to-br from-slate-50 via-white to-emerald-50/40">
          <div className="container-page py-12 sm:py-14">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Link href="/" className="hover:text-slate-800">
                Главная
              </Link>
              <span>/</span>
              <span className="text-slate-800">Направление</span>
            </div>
            <h1 className="mt-5 max-w-4xl text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">
              {city.name}
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">{brief}</p>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">{h1}</p>
            <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
              <span>
                <span className="font-semibold text-slate-900">{formatNumber(payload.stats.events)}</span> событий в
                регионе
              </span>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span>
                <span className="font-semibold text-slate-900">{formatNumber(payload.stats.venues)}</span> площадок
              </span>
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {centerCity ? (
                <Link
                  href={cityHref({ slug: centerCity.slug, name: centerCity.name })}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  <Ticket className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Афиша {centerCity.name}
                </Link>
              ) : null}
              {!isTierC || eventTotal > 0 ? (
                <a
                  href="#affiche"
                  onClick={(event) => {
                    event.preventDefault();
                    scrollToSection('affiche');
                  }}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 px-5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  {isTierC ? 'Редкие события региона' : 'Смотреть афишу региона'}
                </a>
              ) : null}
            </div>
          </div>
        </section>

        {tabs.length ? (
          <nav
            aria-label="Разделы региона"
            className="sticky top-[var(--site-header-height)] z-30 border-b border-slate-200 bg-white/95 backdrop-blur"
          >
            <div className="container-page flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {tabs.map((tab) => (
                <a
                  key={tab.id}
                  href={`#${tab.id}`}
                  onClick={(event) => {
                    event.preventDefault();
                    scrollToSection(tab.id);
                  }}
                  className="shrink-0 border-b-2 border-transparent px-3 py-3 text-sm font-medium text-slate-600 hover:text-slate-900 sm:px-4"
                >
                  {tab.label}
                </a>
              ))}
            </div>
          </nav>
        ) : null}

        {centerCity ? (
          <section id="bridge" className={`border-b border-slate-100 ${SECTION_SCROLL_MT}`}>
            <div className="container-page py-8">
              <Link
                href={cityHref({ slug: centerCity.slug, name: centerCity.name })}
                className="group flex flex-col gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/60 px-5 py-5 transition hover:border-emerald-300 hover:bg-emerald-50 sm:flex-row sm:items-center sm:justify-between sm:px-6"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800/80">
                    {isTierC ? 'Сейчас лучше смотреть центр' : 'Мост в центр'}
                  </p>
                  <p className="mt-1 text-base font-semibold text-slate-950 sm:text-lg">
                    {isTierC
                      ? eventTotal > 0
                        ? `Событий за городом мало. Полная афиша — в ${centerCity.name}`
                        : `Сейчас за городом ничего не происходит. Посмотрите афишу ${centerCity.name}`
                      : `Ищете события в самом городе? Перейти к афише ${centerCity.name}`}
                    {centerCity.eventCount > 0 ? (
                      <span className="font-medium text-slate-600">
                        {' '}
                        ({formatNumber(centerCity.eventCount)} {pluralEvents(centerCity.eventCount)})
                      </span>
                    ) : null}
                  </p>
                </div>
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-900 group-hover:gap-3">
                  Открыть хаб
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </Link>
            </div>
          </section>
        ) : null}

        {!isTierC ? (
        <section id="cities" className={`border-b border-slate-100 ${SECTION_SCROLL_MT}`}>
          <div className="container-page py-8 sm:py-10">
            <h2 className="text-2xl font-bold text-slate-950">Города региона</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Выберите город — афиша ниже отфильтруется по площадкам и событиям этого города.
            </p>
            {visibleCities.length ? (
              <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {visibleCities.map((item) => (
                  <li key={item.slug}>
                    <ChildCityTile
                      city={item}
                      active={isCityFilterActive([item.name])}
                      onSelect={() => applyCityFilter([item.name])}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-6 text-sm text-slate-500">Пока нет городов с событиями в каталоге региона.</p>
            )}
            {!showAllCities && hiddenZeroCount > 0 ? (
              <button
                type="button"
                className="mt-4 text-sm font-medium text-slate-700 underline-offset-4 hover:underline"
                onClick={() => setShowAllCities(true)}
              >
                Показать все города ({hiddenZeroCount} без событий)
              </button>
            ) : null}
            {cityFilterLabel ? (
              <button
                type="button"
                className="mt-3 block text-sm font-medium text-emerald-800 underline-offset-4 hover:underline"
                onClick={() => setCityFilter(null)}
              >
                Сбросить фильтр ({cityFilterLabel})
              </button>
            ) : null}
          </div>
        </section>
        ) : null}

        {topPlaces.length ? (
          <section id="places" className={`border-b border-slate-100 ${SECTION_SCROLL_MT}`}>
            <div className="container-page py-8 sm:py-10">
              <h2 className="text-2xl font-bold text-slate-950">Куда съездить</h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Локации с живой афишей в регионе. Нажмите карточку — лента ниже покажет события этих городов.
              </p>
              <ul className="mt-6 space-y-4">
                {topPlaces.map((place) => {
                  const names = (place.cityNames || []).map((n) => n.trim()).filter(Boolean);
                  const active = names.length ? isCityFilterActive(names) : false;
                  return (
                    <li key={place.name}>
                      <article
                        itemScope
                        itemType="https://schema.org/Place"
                        className={
                          active
                            ? 'rounded-xl border border-emerald-400 bg-emerald-50/70 px-4 py-4'
                            : 'rounded-xl border border-slate-200 bg-white px-4 py-4'
                        }
                      >
                        <h3 itemProp="name" className="font-semibold text-slate-950">
                          {place.name}
                        </h3>
                        <p itemProp="description" className="mt-1 text-sm leading-6 text-slate-600">
                          {place.desc}
                        </p>
                        {names.length ? (
                          <button
                            type="button"
                            className="mt-3 text-sm font-medium text-emerald-900 underline-offset-4 hover:underline"
                            onClick={() => applyCityFilter(names)}
                          >
                            {active ? 'Сбросить фильтр афиши' : 'Показать события в афише'}
                          </button>
                        ) : null}
                      </article>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        ) : null}

        {!isTierC || eventTotal > 0 ? (
        <section id="affiche" className={`border-b border-slate-100 ${SECTION_SCROLL_MT}`}>
          <div className="container-page py-8 sm:py-10">
            <h2 className="text-2xl font-bold text-slate-950">Афиша субъекта</h2>
            <p className="mt-2 text-sm text-slate-600">
              Только события городов региона
              {centerCity ? `, без дубля афиши ${centerCity.name}` : ''}.
              {cityFilterLabel ? ` Фильтр: ${cityFilterLabel}.` : ''}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {(
                [
                  ['all', 'Все даты'],
                  ['today', 'Сегодня'],
                  ['weekend', 'Выходные'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setDateFilter(id)}
                  className={
                    dateFilter === id
                      ? 'rounded-full bg-slate-900 px-3 py-1.5 text-sm font-medium text-white'
                      : 'rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200'
                  }
                >
                  {label}
                </button>
              ))}
            </div>
            {contentReady ? (
              sessions.length ? (
                <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {sessions.map((session) => (
                    <EventCard key={session.id || session.slug} session={session as PublicSessionDto} />
                  ))}
                </div>
              ) : (
                <p className="mt-6 text-sm text-slate-500">Нет событий по выбранным фильтрам.</p>
              )
            ) : (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="h-48 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            )}
          </div>
        </section>
        ) : null}

        {faqItems.length ? (
          <section id="faq" className={`border-b border-slate-100 ${SECTION_SCROLL_MT}`}>
            <div className="container-page py-8 sm:py-10">
              <h2 className="text-2xl font-bold text-slate-950">FAQ</h2>
              <div className="mt-6 space-y-3">
                {faqItems.map((item) => (
                  <details key={item.q} className="group rounded-xl border border-slate-200 px-4 py-3">
                    <summary className="cursor-pointer list-none font-medium text-slate-900 marker:content-none">
                      {item.q}
                    </summary>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}

function ChildCityTile({
  city,
  active,
  onSelect,
}: {
  city: PublicRegionChildCityDto;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={
        active
          ? 'flex w-full items-start gap-3 rounded-xl border border-emerald-400 bg-emerald-50 px-4 py-3 text-left'
          : 'flex w-full items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:border-slate-300 hover:bg-slate-50'
      }
    >
      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-slate-950">{city.name}</span>
        <span className="mt-0.5 block text-sm text-slate-500">
          {city.eventCount > 0
            ? `${formatNumber(city.eventCount)} ${pluralEvents(city.eventCount)}`
            : 'Пока без событий'}
        </span>
      </span>
    </button>
  );
}

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function isSameCitySet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const left = new Set(a.map((n) => n.toLowerCase()));
  return b.every((n) => left.has(n.toLowerCase()));
}

function pluralEvents(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return 'событий';
  if (mod10 === 1) return 'событие';
  if (mod10 >= 2 && mod10 <= 4) return 'события';
  return 'событий';
}
