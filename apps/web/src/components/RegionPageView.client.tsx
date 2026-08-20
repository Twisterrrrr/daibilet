'use client';

import * as React from 'react';
import { ArrowRight, MapPin, Ticket, Train } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { RegionEventCard } from '@/components/RegionEventCard.client';
import { RegionOrientMap, type RegionMapPoint } from '@/components/RegionOrientMap.client';
import { RegionVenueSeriesCard } from '@/components/RegionVenueSeriesCard.client';
import { IMAGE_SIZES, SafeImage } from '@/components/SafeImage.client';
import { formatNumber } from '@/lib/format';
import { buildRegionSystemBrief } from '@/lib/region-hub-seo';
import {
  buildRegionChildCityChrome,
  canonicalizeRegionChildCitySearch,
  filterSessionsForRegionChildCity,
} from '@/lib/region-child-city-scope';
import { resolveDestinationPageGuideForRegionChild } from '@/lib/city-destination-registry';
import { DestinationRegionGuide } from '@/components/DestinationRegionGuide.client';
import { cityHref } from '@/lib/routes';
import {
  buildCitySessionCoverIndex,
  resolveCityRailPreview,
  resolveTopPlacePreview,
} from '@/lib/region-place-preview';
import {
  buildCatalogDateRailChips,
  type CatalogDateRailChip,
} from '@/lib/catalog-date-rail';
import {
  collectSessionStartsAtTimes,
  isSameSessionDay,
  isSessionTomorrow,
  isSessionWeekend,
  resolveSessionTimeZoneForSession,
} from '@/lib/datetime';
import { groupRegionAfficheSessions } from '@/lib/region-affiche-group';
import {
  formatLogisticsChip,
  formatLogisticsParts,
  getRegionBeltConfig,
  REGION_BELT_FILTERS,
  regionHasBeltData,
  resolveCityBeltEntry,
  type RegionCityBelt,
} from '@/lib/region-city-belts';
import type {
  PublicCityPageDto,
  PublicRegionChildCityDto,
  PublicSessionDto,
} from '@daibilet/contracts/public';
import { resolveRegionLiveTier } from '@daibilet/contracts/common';
import { cityToGenitive, inCityPrepositional } from '@/lib/city-declension';

const SECTION_SCROLL_MT = 'scroll-mt-[calc(var(--site-header-height)+7rem)]';
const AFFICHE_FILTER_STICKY =
  'sticky top-[calc(var(--site-header-height)+2.75rem)] z-20 border-b border-slate-200 bg-slate-50/95 backdrop-blur';

type DateSelection =
  | { kind: 'preset'; value: 'all' | 'today' | 'tomorrow' | 'weekend' }
  | { kind: 'day'; iso: string };

export function RegionPageView({
  slug,
  initialPayload,
}: {
  slug: string;
  initialPayload: PublicCityPageDto | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [payload, setPayload] = React.useState<PublicCityPageDto | null>(initialPayload);
  const [contentReady, setContentReady] = React.useState(() => Boolean(initialPayload?.sessions?.length));
  const [error, setError] = React.useState<string | null>(null);
  const [dateSelection, setDateSelection] = React.useState<DateSelection>({ kind: 'preset', value: 'all' });
  const [beltFilter, setBeltFilter] = React.useState<'all' | RegionCityBelt>('all');
  const [categoryFilter, setCategoryFilter] = React.useState<string | null>(null);
  const [showAllCities, setShowAllCities] = React.useState(false);
  const [mapOpen, setMapOpen] = React.useState(true);
  const [expandedSeries, setExpandedSeries] = React.useState<Record<string, boolean>>({});

  const dateChips = React.useMemo(() => buildCatalogDateRailChips(new Date(), 10), []);
  const hasBelts = regionHasBeltData(slug);
  const beltConfig = getRegionBeltConfig(slug);

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
  const centerCityGenitive = centerCity ? cityToGenitive(centerCity.name) : '';
  const centerCityIn = centerCity ? inCityPrepositional(centerCity.name) : '';
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
  const childChrome = React.useMemo(
    () =>
      city
        ? buildRegionChildCityChrome({
            search: searchParams,
            regionName: city.name,
            regionSlug: slug,
            centerSlug: centerCity?.slug,
            childCities,
          })
        : null,
    [searchParams, city, slug, centerCity?.slug, childCities],
  );
  const destinationGuide = React.useMemo(
    () =>
      childChrome
        ? resolveDestinationPageGuideForRegionChild({
            childSlug: childChrome.child.slug,
            childName: childChrome.child.name,
            regionSlug: slug,
          })
        : null,
    [childChrome, slug],
  );
  const cityFilter = childChrome ? [childChrome.child.name] : null;
  const heading = childChrome?.h1 || city?.name || '';
  const regionBrief =
    regionInfo?.brief?.trim() ||
    (city
      ? isTierC
        ? eventTotal > 0
          ? `Сейчас в регионе немного событий - удобнее смотреть афишу ${centerCityGenitive || 'административного центра'} и редкие выезды.`
          : `Сейчас за городом ничего не происходит. Загляните в афишу ${centerCityGenitive || 'центра региона'}.`
        : buildRegionSystemBrief(city.name)
      : '');
  const guideHeroLead = destinationGuide
    ? [destinationGuide.brief, destinationGuide.whyGo]
        .map((part) => String(part || '').trim())
        .filter(Boolean)
        .filter((part, index, all) => all.indexOf(part) === index)
        .join(' ')
    : '';
  const brief = guideHeroLead || childChrome?.lead || regionBrief;
  const statsEvents = payload?.stats?.events ?? eventTotal;
  const statsVenues = payload?.stats?.venues ?? 0;

  React.useEffect(() => {
    const next = canonicalizeRegionChildCitySearch(searchParams);
    if (!next) return;
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [searchParams, pathname, router]);

  // Do not render <title>/<meta> in this client tree: Next metadata runtime
  // treats them as resources and crashes the hub (`undefined.call` in webpack).
  React.useEffect(() => {
    if (!childChrome) return;
    const previousTitle = document.title;
    document.title = childChrome.title;
    let robots = document.querySelector('meta[name="robots"]');
    const previousRobots = robots?.getAttribute('content') ?? null;
    let created = false;
    if (!robots) {
      robots = document.createElement('meta');
      robots.setAttribute('name', 'robots');
      document.head.appendChild(robots);
      created = true;
    }
    robots.setAttribute('content', 'noindex, follow');
    return () => {
      document.title = previousTitle;
      if (!robots) return;
      if (created) robots.remove();
      else if (previousRobots != null) robots.setAttribute('content', previousRobots);
      else robots.removeAttribute('content');
    };
  }, [childChrome]);

  const replaceCityQuery = React.useCallback(
    (nextSlug: string | null) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const key of [...next.keys()]) {
        if (key === 'city' || /^city-/i.test(key)) next.delete(key);
      }
      if (nextSlug) next.set('city', nextSlug);
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, pathname, router],
  );

  const visibleCities = React.useMemo(() => {
    if (isTierC) return [];
    let list = showAllCities ? childCities : childCities.filter((item) => item.eventCount > 0);
    if (hasBelts && beltFilter !== 'all') {
      list = list.filter((item) => resolveCityBeltEntry(slug, item)?.belt === beltFilter);
    }
    if (childChrome) {
      const scoped = childCities.find(
        (item) =>
          item.name.toLowerCase() === childChrome.child.name.toLowerCase() ||
          item.slug === childChrome.child.slug,
      );
      if (scoped && !list.some((item) => item.slug === scoped.slug || item.name === scoped.name)) {
        list = [scoped, ...list];
      }
    }
    return list;
  }, [childCities, showAllCities, isTierC, hasBelts, beltFilter, slug, childChrome]);

  const hiddenZeroCount = isTierC ? 0 : childCities.filter((item) => item.eventCount <= 0).length;

  const sessions = React.useMemo(() => {
    const list = payload?.sessions || [];
    const scoped = filterSessionsForRegionChildCity(list, childChrome?.child || null, childCities);
    return scoped.filter((session) => {
      if (hasBelts && beltFilter !== 'all') {
        const entry = resolveCityBeltEntry(slug, {
          slug: session.citySlug,
          name: session.city,
          sourceSlug: 'sourceCitySlug' in session ? session.sourceCitySlug : null,
        });
        if (!entry || entry.belt !== beltFilter) return false;
      }
      if (categoryFilter) {
        if (String(session.category || '').trim() !== categoryFilter) return false;
      }
      return sessionMatchesDate(session, dateSelection);
    });
  }, [
    payload?.sessions,
    childChrome,
    childCities,
    dateSelection,
    beltFilter,
    categoryFilter,
    hasBelts,
    slug,
  ]);

  const cityCoverIndex = React.useMemo(
    () => buildCitySessionCoverIndex(payload?.sessions || []),
    [payload?.sessions],
  );

  const categoryChips = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const session of payload?.sessions || []) {
      const cat = String(session.category || '').trim();
      if (!cat) continue;
      counts.set(cat, (counts.get(cat) || 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ru'))
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));
  }, [payload?.sessions]);

  const afficheRows = React.useMemo(() => groupRegionAfficheSessions(sessions), [sessions]);

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

  const mapPoints = React.useMemo((): RegionMapPoint[] => {
    if (!beltConfig) return [];
    const seen = new Set<string>();
    const points: RegionMapPoint[] = [];
    for (const child of childCities) {
      if (child.eventCount <= 0 && !showAllCities && childChrome?.child.slug !== child.slug) continue;
      const entry = resolveCityBeltEntry(slug, child);
      if (!entry?.lat || !entry?.lng) continue;
      const id = child.slug || child.name;
      if (seen.has(id)) continue;
      seen.add(id);
      points.push({
        id,
        name: child.name,
        lat: entry.lat,
        lng: entry.lng,
        active: Boolean(cityFilter && isSameCitySet(cityFilter, [child.name])),
      });
    }
    return points;
  }, [beltConfig, childCities, showAllCities, slug, cityFilter, childChrome]);

  const isCityFilterActive = React.useCallback(
    (names: string[]) => {
      if (!cityFilter?.length || !names.length) return false;
      if (cityFilter.length !== names.length) return false;
      const left = new Set(cityFilter.map((n) => n.toLowerCase()));
      return names.every((n) => left.has(n.toLowerCase()));
    },
    [cityFilter],
  );

  const applyCityFilter = React.useCallback(
    (names: string[]) => {
      const cleaned = names.map((n) => n.trim()).filter(Boolean);
      if (cityFilter && isSameCitySet(cityFilter, cleaned)) {
        replaceCityQuery(null);
      } else {
        const match = childCities.find((item) =>
          cleaned.some((name) => name.toLowerCase() === item.name.toLowerCase()),
        );
        replaceCityQuery(match?.slug || null);
      }
      scrollToSection('affiche');
    },
    [cityFilter, childCities, replaceCityQuery],
  );

  const tabs = React.useMemo(() => {
    if (isTierC) {
      return [
        { id: 'bridge', label: centerCity ? `Афиша ${centerCityGenitive}` : 'Центр', show: Boolean(centerCity) },
        { id: 'affiche', label: 'События', show: eventTotal > 0 },
      ].filter((tab) => tab.show);
    }
    return [
      { id: 'guide', label: 'Места', show: Boolean(destinationGuide) },
      { id: 'cities', label: 'Города', show: childCities.some((c) => c.eventCount > 0) || childCities.length > 0 },
      { id: 'places', label: 'Куда съездить', show: topPlaces.length > 0 },
      { id: 'affiche', label: 'События', show: true },
      { id: 'faq', label: 'FAQ', show: faqItems.length > 0 },
    ].filter((tab) => tab.show);
  }, [childCities, topPlaces.length, faqItems.length, isTierC, centerCity, centerCityGenitive, eventTotal, destinationGuide]);

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

  return (
    <div className="bg-white text-slate-900">
      <main>
        <section id="top" className="border-b border-slate-200 bg-white">
          <div className="container-page py-12 sm:py-14">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Link href="/" className="hover:text-slate-800">
                Главная
              </Link>
              <span>/</span>
              <span className="text-slate-800">Направление</span>
            </div>
            <h1 className="mt-5 max-w-4xl text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">
              {heading}
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">{brief}</p>
            <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
              <span>
                <span className="font-semibold text-slate-900">
                  {formatNumber(childChrome ? sessions.length : statsEvents)}
                </span>{' '}
                {childChrome ? `событий ${inCityPrepositional(childChrome.child.name)}` : 'событий в регионе'}
              </span>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span>
                <span className="font-semibold text-slate-900">{formatNumber(statsVenues)}</span> площадок
              </span>
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {centerCity ? (
                <Link
                  href={cityHref({ slug: centerCity.slug, name: centerCity.name })}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  <Ticket className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Афиша {centerCityGenitive}
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
                  {childChrome
                    ? `Смотреть события ${cityToGenitive(childChrome.child.name)}`
                    : isTierC
                      ? 'Редкие события области'
                      : 'Смотреть события'}
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
          <section id="bridge" className={`border-b border-slate-100 bg-white ${SECTION_SCROLL_MT}`}>
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
                        ? `Событий за городом мало. Полная афиша - ${centerCityIn}`
                        : `Сейчас за городом ничего не происходит. Посмотрите афишу ${centerCityGenitive}`
                      : `Ищете события в самом городе? Перейти к афише ${centerCityGenitive}`}
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

        {destinationGuide ? (
          <section id="guide" className={`border-b border-slate-200 bg-white ${SECTION_SCROLL_MT}`}>
            <div className="container-page py-8 sm:py-10">
              <h2 className="text-2xl font-bold text-slate-950">
                Главные места {inCityPrepositional(destinationGuide.name)}
              </h2>
              <div className="mt-6">
                <DestinationRegionGuide guide={destinationGuide} hideIntro />
              </div>
            </div>
          </section>
        ) : null}

        {!isTierC ? (
          <section id="cities" className={`border-b border-slate-200 bg-slate-50 ${SECTION_SCROLL_MT}`}>
            <div className="container-page py-8 sm:py-10">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-slate-950">Города региона</h2>
                  <p className="mt-2 max-w-2xl text-sm text-slate-600">
                    Выберите город - афиша ниже отфильтруется. Спросите себя: далеко ли ехать и что там будет.
                  </p>
                </div>
                {cityFilterLabel ? (
                  <button
                    type="button"
                    className="text-sm font-semibold text-emerald-800 underline-offset-4 hover:underline"
                    onClick={() => replaceCityQuery(null)}
                  >
                    Сбросить ({cityFilterLabel})
                  </button>
                ) : null}
              </div>

              {visibleCities.length ? (
                <div className="mt-6 flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {visibleCities.map((item) => (
                    <ChildCityAvatar
                      key={item.slug || item.name}
                      city={item}
                      active={isCityFilterActive([item.name])}
                      logistics={formatLogisticsParts(resolveCityBeltEntry(slug, item))}
                      imageUrl={resolveCityRailPreview({
                        slug: item.slug,
                        name: item.name,
                        coverIndex: cityCoverIndex,
                      })}
                      onSelect={() => applyCityFilter([item.name])}
                    />
                  ))}
                </div>
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

              {mapPoints.length >= 2 ? (
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={() => setMapOpen((v) => !v)}
                    className="text-sm font-semibold text-slate-800 underline-offset-4 hover:underline"
                  >
                    {mapOpen ? 'Свернуть карту' : 'Карта городов региона'}
                  </button>
                  {mapOpen && beltConfig ? (
                    <div className="mt-3">
                      <RegionOrientMap
                        points={mapPoints}
                        center={beltConfig.anchor}
                        onSelect={(point) => applyCityFilter([point.name])}
                      />
                      <p className="mt-2 text-xs text-slate-500">Нажмите точку на карте - лента афиши отфильтруется.</p>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {topPlaces.length ? (
          <section id="places" className={`border-b border-slate-200 bg-white ${SECTION_SCROLL_MT}`}>
            <div className="container-page py-8 sm:py-10">
              <h2 className="text-2xl font-bold text-slate-950">Куда съездить</h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Локации с живой афишей в регионе. Нажмите карточку - лента ниже покажет события этих городов.
              </p>
              <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {topPlaces.map((place) => {
                  const names = (place.cityNames || []).map((n) => n.trim()).filter(Boolean);
                  const active = names.length ? isCityFilterActive(names) : false;
                  const preview = resolveTopPlacePreview({
                    imageUrl: place.imageUrl,
                    cityNames: names,
                    childCities,
                    coverIndex: cityCoverIndex,
                  });
                  return (
                    <li key={place.name}>
                      <article
                        itemScope
                        itemType="https://schema.org/Place"
                        className={
                          active
                            ? 'flex h-full flex-col overflow-hidden rounded-2xl border border-emerald-400 bg-emerald-50/70'
                            : 'flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50'
                        }
                      >
                        <div className="relative aspect-[16/10] bg-gradient-to-br from-slate-200 to-emerald-100">
                          {preview ? (
                            <SafeImage
                              src={preview}
                              alt=""
                              fill
                              sizes={IMAGE_SIZES.cityCard}
                              className="object-cover"
                            />
                          ) : (
                            <span className="absolute inset-0 flex items-center justify-center text-slate-400">
                              <MapPin className="h-8 w-8" aria-hidden />
                            </span>
                          )}
                        </div>
                        <div className="flex flex-1 flex-col px-4 py-4">
                          <h3 itemProp="name" className="font-semibold text-slate-950">
                            {place.name}
                          </h3>
                          <p itemProp="description" className="mt-1 text-sm leading-6 text-slate-600">
                            {place.desc}
                          </p>
                          {names.length ? (
                            <button
                              type="button"
                              className="mt-3 self-start text-sm font-medium text-emerald-900 underline-offset-4 hover:underline"
                              onClick={() => applyCityFilter(names)}
                            >
                              {active ? 'Сбросить фильтр афиши' : 'Показать события в афише'}
                            </button>
                          ) : null}
                        </div>
                      </article>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        ) : null}

        {!isTierC || eventTotal > 0 ? (
          <section id="affiche" className={`border-b border-slate-200 bg-slate-50 ${SECTION_SCROLL_MT}`}>
            <div className={AFFICHE_FILTER_STICKY}>
              <div className="container-page space-y-3 py-3">
                <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {dateChips.map((chip) => {
                    const active = isDateChipActive(chip, dateSelection);
                    return (
                      <button
                        key={chip.kind === 'day' ? chip.iso : chip.value}
                        type="button"
                        onClick={() => setDateSelection(chipToSelection(chip))}
                        className={
                          active
                            ? 'shrink-0 rounded-full bg-slate-900 px-3 py-1.5 text-sm font-medium text-white'
                            : 'shrink-0 rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100'
                        }
                      >
                        {chip.shortLabel}
                      </button>
                    );
                  })}
                </div>

                {hasBelts ? (
                  <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {REGION_BELT_FILTERS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setBeltFilter(item.id)}
                        className={
                          beltFilter === item.id
                            ? 'inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-800 px-3 py-1.5 text-sm font-medium text-white'
                            : 'inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100'
                        }
                      >
                        <Train className="h-3.5 w-3.5" aria-hidden />
                        {item.label}
                      </button>
                    ))}
                  </div>
                ) : null}

                {categoryChips.length ? (
                  <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <button
                      type="button"
                      onClick={() => setCategoryFilter(null)}
                      className={
                        !categoryFilter
                          ? 'shrink-0 rounded-full bg-slate-900 px-3 py-1.5 text-sm font-medium text-white'
                          : 'shrink-0 rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-700 ring-1 ring-slate-200'
                      }
                    >
                      Все жанры
                    </button>
                    {categoryChips.map((chip) => (
                      <button
                        key={chip.name}
                        type="button"
                        onClick={() =>
                          setCategoryFilter((prev) => (prev === chip.name ? null : chip.name))
                        }
                        className={
                          categoryFilter === chip.name
                            ? 'shrink-0 rounded-full bg-slate-900 px-3 py-1.5 text-sm font-medium text-white'
                            : 'shrink-0 rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-700 ring-1 ring-slate-200'
                        }
                      >
                        {chip.name}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="container-page py-8 sm:py-10">
              <h2 className="text-2xl font-bold text-slate-950">
                {cityFilterLabel
                  ? `Ближайшие события ${inCityPrepositional(cityFilterLabel)}`
                  : 'Ближайшие события'}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                {cityFilterLabel
                  ? 'Концерты, спектакли и экскурсии на ближайшие дни'
                  : centerCity
                    ? `События по области - без дубля афиши ${centerCityGenitive}`
                    : 'Концерты, спектакли и выезды по области'}
              </p>

              {contentReady ? (
                sessions.length ? (
                  <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {afficheRows.map((row) => {
                      if (row.kind === 'series') {
                        const logistics = formatLogisticsChip(
                          resolveCityBeltEntry(slug, {
                            name: row.city,
                            slug: row.sessions[0]?.citySlug,
                          }),
                        );
                        return (
                          <RegionVenueSeriesCard
                            key={row.key}
                            venueName={row.venueName}
                            venueSlug={row.venueSlug}
                            city={row.city}
                            sessions={row.sessions}
                            logisticsChip={logistics}
                            expanded={Boolean(expandedSeries[row.key])}
                            onToggle={() =>
                              setExpandedSeries((prev) => ({
                                ...prev,
                                [row.key]: !prev[row.key],
                              }))
                            }
                          />
                        );
                      }
                      const logistics = formatLogisticsChip(
                        resolveCityBeltEntry(slug, {
                          slug: row.session.citySlug,
                          name: row.session.city,
                          sourceSlug:
                            'sourceCitySlug' in row.session ? row.session.sourceCitySlug : null,
                        }),
                      );
                      return (
                        <RegionEventCard
                          key={row.session.id || row.session.slug}
                          session={row.session}
                          logisticsChip={logistics}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-6 text-sm text-slate-500">Нет событий по выбранным фильтрам.</p>
                )
              ) : (
                <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="h-64 animate-pulse rounded-2xl bg-white" />
                  ))}
                </div>
              )}
            </div>
          </section>
        ) : null}

        {faqItems.length ? (
          <section id="faq" className={`border-b border-slate-200 bg-white ${SECTION_SCROLL_MT}`}>
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

function shortCityRailName(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*$/u, '').trim() || name;
}

function ChildCityAvatar({
  city,
  active,
  logistics,
  imageUrl,
  onSelect,
}: {
  city: PublicRegionChildCityDto;
  active: boolean;
  logistics: { transit: string | null; km: string | null } | null;
  imageUrl: string | null;
  onSelect: () => void;
}) {
  const label = shortCityRailName(city.name);
  return (
    <button
      type="button"
      onClick={onSelect}
      title={city.name}
      className={
        active
          ? 'w-[6.75rem] shrink-0 snap-start text-center sm:w-28'
          : 'w-[6.75rem] shrink-0 snap-start text-center opacity-95 hover:opacity-100 sm:w-28'
      }
    >
      <span
        className={
          active
            ? 'relative mx-auto block h-16 w-16 overflow-hidden rounded-full ring-2 ring-emerald-500 ring-offset-2 sm:h-[4.5rem] sm:w-[4.5rem]'
            : 'relative mx-auto block h-16 w-16 overflow-hidden rounded-full ring-1 ring-slate-200 sm:h-[4.5rem] sm:w-[4.5rem]'
        }
      >
        {imageUrl ? (
          <SafeImage src={imageUrl} alt="" fill sizes={IMAGE_SIZES.cityCard} className="object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-200 to-emerald-100 text-slate-500">
            <MapPin className="h-5 w-5" aria-hidden />
          </span>
        )}
      </span>
      <span className="mt-2 block text-xs font-semibold leading-snug text-slate-900">{label}</span>
      <span className="mt-0.5 block text-[11px] text-slate-500">
        {city.eventCount > 0 ? formatNumber(city.eventCount) : '—'}
      </span>
      {logistics?.transit ? (
        <span className="mt-0.5 block text-[10px] leading-tight text-slate-400">{logistics.transit}</span>
      ) : null}
      {logistics?.km ? (
        <span className="block text-[10px] leading-tight text-slate-400">{logistics.km}</span>
      ) : null}
    </button>
  );
}

function sessionMatchesDate(session: PublicSessionDto, selection: DateSelection): boolean {
  if (selection.kind === 'preset' && selection.value === 'all') return true;
  const starts = collectSessionStartsAtTimes(session);
  if (!starts.length) return false;
  const tz = resolveSessionTimeZoneForSession(session);

  if (selection.kind === 'preset') {
    if (selection.value === 'today') return starts.some((at) => isSameSessionDay(at, new Date(), tz));
    if (selection.value === 'tomorrow') return starts.some((at) => isSessionTomorrow(at, tz));
    if (selection.value === 'weekend') return starts.some((at) => isSessionWeekend(at, tz));
    return true;
  }

  const target = selection.iso;
  return starts.some((at) => sessionIsoDay(at, tz) === target);
}

function sessionIsoDay(startsAt: string, timeZone: string): string | null {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date(startsAt));
    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const d = parts.find((p) => p.type === 'day')?.value;
    if (!y || !m || !d) return null;
    return `${y}-${m}-${d}`;
  } catch {
    return null;
  }
}

function chipToSelection(chip: CatalogDateRailChip): DateSelection {
  if (chip.kind === 'day') return { kind: 'day', iso: chip.iso };
  return { kind: 'preset', value: chip.value };
}

function isDateChipActive(chip: CatalogDateRailChip, selection: DateSelection): boolean {
  if (chip.kind === 'day') {
    return selection.kind === 'day' && selection.iso === chip.iso;
  }
  return selection.kind === 'preset' && selection.value === chip.value;
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
