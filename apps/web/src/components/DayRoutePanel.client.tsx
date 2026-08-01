'use client';

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, Copy, ExternalLink, MapPin, Route, Sparkles, Trash2, X } from 'lucide-react';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';

import { IMAGE_SIZES, SafeImage } from '@/components/SafeImage.client';
import { AddToDayRouteButton } from '@/components/AddToDayRouteButton.client';
import { buildCatalogHref } from '@/lib/catalog-url';
import {
  DAY_ROUTE_CHANGED_EVENT,
  DAY_ROUTE_MAX,
  DAY_ROUTE_MIN,
  addToDayRoute,
  buildDayRouteCoordsMap,
  buildDayRouteSharePath,
  buildYandexMultiStopRouteUrl,
  clearDayRoute,
  dayRouteDominantCitySlug,
  dayRouteFullCoveredCount,
  dayRouteHasMixedCities,
  dayRouteSegmentMeters,
  enrichDayRouteFromMatchVenues,
  formatDayRouteDistance,
  isInDayRoute,
  lookupDayRouteCoords,
  moveDayRouteVenue,
  optimizeDayRouteNearestNeighbor,
  parseDayRouteQueryParam,
  readDayRoute,
  removeFromDayRoute,
  reorderDayRoute,
  hydrateDayRouteFromShare,
  type DayRouteCoords,
  type DayRouteState,
  type DayRouteVenueItem,
} from '@/lib/day-route';
import { formatPriceFrom } from '@/lib/format';
import { eventHref, venueHref } from '@/lib/routes';

type MatchVenueStub = {
  id: string;
  slug: string | null;
  title: string;
  cityId: string | null;
  cityTitle: string | null;
  citySlug?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  heroImageUrl: string | null;
};

type MatchPayload = {
  cityId: string | null;
  multiCityWarning: boolean;
  venues: MatchVenueStub[];
  matches: Array<{
    eventId: string;
    slug: string;
    title: string;
    imageUrl: string | null;
    priceFromRub: number | null;
    score: number;
    coveragePct: number;
    covered: { stop: string[]; start: string[]; nearby: string[] };
    missing: string[];
    routeVenues?: MatchVenueStub[];
  }>;
};

function matchVenueToDayRouteItem(venue: MatchVenueStub): DayRouteVenueItem {
  return {
    id: venue.id,
    slug: venue.slug,
    title: venue.title,
    city: venue.cityTitle,
    cityId: venue.cityId,
    citySlug: venue.citySlug ?? null,
    imageUrl: venue.heroImageUrl,
    latitude: venue.latitude ?? null,
    longitude: venue.longitude ?? null,
    href: venue.slug
      ? venueHref({ id: venue.id, slug: venue.slug, name: venue.title, type: 'park' })
      : null,
  };
}

export function DayRoutePanel() {
  return (
    <Suspense fallback={<DayRoutePanelFallback />}>
      <DayRoutePanelInner />
    </Suspense>
  );
}

function DayRoutePanelFallback() {
  return (
    <div className="container-page px-4 py-6 sm:px-6 sm:py-10">
      <p className="text-sm text-slate-500">Загружаем маршрут…</p>
    </div>
  );
}

function DayRoutePanelInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const dayParam = searchParams.get('day');
  const [route, setRoute] = useState<DayRouteState>(() =>
    typeof window === 'undefined' ? { cityId: null, venues: [] } : readDayRoute(),
  );
  const [payload, setPayload] = useState<MatchPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'ok' | 'err'>('idle');
  const hydratedDayRef = useRef<string | null>(null);

  useEffect(() => {
    const sync = () => setRoute(readDayRoute());
    sync();
    window.addEventListener(DAY_ROUTE_CHANGED_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(DAY_ROUTE_CHANGED_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  // Share hydrate: /my-day?day=id1,slug2 → resolve → localStorage (без затирания уже набранных точек).
  useEffect(() => {
    const locators = parseDayRouteQueryParam(dayParam);
    if (!locators.length) {
      setReady(true);
      return;
    }
    const key = locators.join(',');
    if (hydratedDayRef.current === key) {
      setReady(true);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/day-route/matches?venueIds=${encodeURIComponent(key)}`, {
      signal: controller.signal,
    })
      .then(async (response) => (response.ok ? ((await response.json()) as MatchPayload) : null))
      .then((data) => {
        if (!data?.venues?.length) {
          setReady(true);
          return;
        }
        const items: DayRouteVenueItem[] = data.venues.map((venue) => ({
          id: venue.id,
          slug: venue.slug,
          title: venue.title,
          city: venue.cityTitle,
          cityId: venue.cityId,
          citySlug: venue.citySlug ?? null,
          imageUrl: venue.heroImageUrl,
          latitude: venue.latitude ?? null,
          longitude: venue.longitude ?? null,
          href: venue.slug
            ? venueHref({ id: venue.id, slug: venue.slug, name: venue.title, type: 'park' })
            : null,
        }));
        hydratedDayRef.current = key;
        setRoute(hydrateDayRouteFromShare(items, data.cityId));
        setPayload(data);
        setReady(true);
        // Strip ?day= so refresh / back не затирает последующие add.
        router.replace('/my-day', { scroll: false });
      })
      .catch(() => {
        setReady(true);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [dayParam, router]);

  const venueIds = useMemo(() => route.venues.map((v) => v.id).join(','), [route.venues]);
  const titleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const v of route.venues) {
      map.set(v.id, v.title);
      if (v.slug) map.set(v.slug, v.title);
    }
    for (const v of payload?.venues || []) {
      map.set(v.id, v.title);
      if (v.slug) map.set(v.slug, v.title);
    }
    for (const match of payload?.matches || []) {
      for (const v of match.routeVenues || []) {
        map.set(v.id, v.title);
        if (v.slug) map.set(v.slug, v.title);
      }
    }
    return map;
  }, [route.venues, payload]);

  const mixedCities = useMemo(
    () => dayRouteHasMixedCities(route.venues) || Boolean(payload?.multiCityWarning),
    [route.venues, payload?.multiCityWarning],
  );
  const belowMin = route.venues.length > 0 && route.venues.length < DAY_ROUTE_MIN;
  const atMax = route.venues.length >= DAY_ROUTE_MAX;
  const citySlug = dayRouteDominantCitySlug(route.venues);
  const cityTitle = useMemo(() => {
    const counts = new Map<string, number>();
    for (const venue of route.venues) {
      const title = String(venue.city || '').trim();
      if (!title) continue;
      counts.set(title, (counts.get(title) || 0) + 1);
    }
    let best: string | null = null;
    let bestCount = 0;
    for (const [title, count] of counts) {
      if (count > bestCount) {
        best = title;
        bestCount = count;
      }
    }
    return best;
  }, [route.venues]);
  const afishaHref = citySlug
    ? buildCatalogHref({ city: citySlug })
    : cityTitle
      ? buildCatalogHref({ city: cityTitle })
      : '/events';
  // Catalog city filter matches venue.city titles; slug (moscow/spb) yields 0 rows.
  const locationsHref = cityTitle
    ? `/locations?city=${encodeURIComponent(cityTitle)}`
    : citySlug
      ? `/locations?city=${encodeURIComponent(citySlug)}`
      : '/locations';
  const venuesHref = cityTitle
    ? `/venues?city=${encodeURIComponent(cityTitle)}`
    : citySlug
      ? `/venues?city=${encodeURIComponent(citySlug)}`
      : '/venues';

  const allMatchVenues = useMemo(() => {
    const list: MatchVenueStub[] = [...(payload?.venues || [])];
    const seen = new Set(list.map((v) => v.id));
    for (const match of payload?.matches || []) {
      for (const v of match.routeVenues || []) {
        if (seen.has(v.id)) continue;
        seen.add(v.id);
        list.push(v);
      }
    }
    return list;
  }, [payload]);

  const coordsById = useMemo(
    () => buildDayRouteCoordsMap(route.venues, allMatchVenues),
    [route.venues, allMatchVenues],
  );

  const orderedCoords = useMemo(
    () => route.venues.map((venue) => lookupDayRouteCoords(venue, coordsById)),
    [route.venues, coordsById],
  );
  const coordsCount = orderedCoords.filter(Boolean).length;
  const missingCoordsCount = route.venues.length - coordsCount;
  const yandexUrl = useMemo(() => buildYandexMultiStopRouteUrl(orderedCoords, 'pd'), [orderedCoords]);
  const segmentMeters = useMemo(
    () => dayRouteSegmentMeters(route.venues, coordsById),
    [route.venues, coordsById],
  );
  const canOptimize = coordsCount >= 2;

  useEffect(() => {
    if (!ready) return;
    if (!route.venues.length) {
      setPayload(null);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/day-route/matches?venueIds=${encodeURIComponent(venueIds)}`, {
      signal: controller.signal,
    })
      .then(async (response) => (response.ok ? ((await response.json()) as MatchPayload) : null))
      .then((data) => {
        if (!data) return;
        setPayload(data);
        // Pull coords into localStorage; DAY_ROUTE_CHANGED syncs React state.
        const stubs = [...(data.venues || [])];
        const seen = new Set(stubs.map((v) => v.id));
        for (const match of data.matches || []) {
          for (const v of match.routeVenues || []) {
            if (seen.has(v.id)) continue;
            seen.add(v.id);
            stubs.push(v);
          }
        }
        enrichDayRouteFromMatchVenues(stubs);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [venueIds, route.venues.length, ready]);

  async function copyShareLink() {
    if (!route.venues.length || typeof window === 'undefined') return;
    const path = buildDayRouteSharePath(route.venues);
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopyStatus('ok');
    } catch {
      setCopyStatus('err');
    }
    window.setTimeout(() => setCopyStatus('idle'), 2200);
  }

  function optimizeOrder() {
    if (!canOptimize) return;
    const nextVenues = optimizeDayRouteNearestNeighbor(route.venues, coordsById);
    setRoute(reorderDayRoute(nextVenues.map((venue) => venue.id)));
  }

  return (
    <div className="container-page px-4 py-6 sm:px-6 sm:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Собери свой день</p>
          <h1 className="mt-1 font-display text-2xl font-extrabold text-slate-900 sm:text-3xl">Мой день</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
            Наберите {DAY_ROUTE_MIN}-{DAY_ROUTE_MAX} точек одного города - покажем экскурсии с лучшим покрытием
            маршрута.
          </p>
        </div>
        {route.venues.length ? (
          <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
            <button
              type="button"
              onClick={() => {
                void copyShareLink();
              }}
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:flex-none"
            >
              <Copy className="h-3.5 w-3.5" />
              {copyStatus === 'ok' ? 'Скопировано' : copyStatus === 'err' ? 'Не удалось' : 'Копировать ссылку'}
            </button>
            <button
              type="button"
              onClick={() => {
                clearDayRoute();
                setRoute(readDayRoute());
              }}
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 sm:flex-none"
            >
              <Trash2 className="h-3.5 w-3.5" /> Очистить
            </button>
          </div>
        ) : null}
      </div>

      {copyStatus === 'ok' ? (
        <p
          role="status"
          className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900"
        >
          Ссылка скопирована - можно отправить другу.
        </p>
      ) : null}

      {!route.venues.length ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center sm:mt-8 sm:p-10">
          <Route className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-3 text-base font-semibold text-slate-800">Пока нет точек</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
            Откройте гид города и нажмите «В мой маршрут» на карточке места. Нужно минимум {DAY_ROUTE_MIN} точки
            одного города.
          </p>
          <div className="mt-5 flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:items-center">
            <Link
              href="/locations"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-600"
            >
              К локациям
            </Link>
            <Link
              href="/cities"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Выбрать город
            </Link>
          </div>
        </div>
      ) : (
        <>
          {mixedCities ? (
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Точки из разных городов. Матч считается по доминирующему городу - лучше оставить один город.
            </p>
          ) : null}
          {belowMin ? (
            <p className="mt-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
              Добавьте ещё {DAY_ROUTE_MIN - route.venues.length}{' '}
              {DAY_ROUTE_MIN - route.venues.length === 1 ? 'точку' : 'точки'} (минимум {DAY_ROUTE_MIN}), чтобы день
              сложился.
            </p>
          ) : null}
          {atMax ? (
            <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              Лимит {DAY_ROUTE_MAX} точек. Удалите одну, чтобы добавить другую.
            </p>
          ) : null}
          {!atMax ? (
            <div
              className={`mt-4 rounded-2xl border px-4 py-4 sm:px-5 ${
                belowMin ? 'border-sky-300 bg-sky-50' : 'border-slate-200 bg-white'
              }`}
            >
              <p className={`text-sm font-semibold ${belowMin ? 'text-sky-950' : 'text-slate-900'}`}>
                Добавить точку
              </p>
              <p className={`mt-1 text-sm leading-relaxed ${belowMin ? 'text-sky-800' : 'text-slate-600'}`}>
                Точки добавляются кнопкой «В мой маршрут» на карточках мест. Карточки экскурсий ниже - это ссылки
                на покупку, а не добавление стопов.
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Link
                  href={locationsHref}
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-600"
                >
                  Локации города
                </Link>
                <Link
                  href={venuesHref}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  Площадки и музеи
                </Link>
              </div>
            </div>
          ) : null}

          <section className="mt-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                Точки · {route.venues.length}/{DAY_ROUTE_MAX}
              </h2>
              <div className="flex flex-wrap gap-2">
                {canOptimize ? (
                  <button
                    type="button"
                    onClick={optimizeOrder}
                    className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Оптимизировать порядок
                  </button>
                ) : null}
                {yandexUrl ? (
                  <a
                    href={yandexUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-sky-600 px-4 py-2 text-xs font-bold text-white hover:bg-sky-700"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Маршрут в Яндекс.Картах
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled
                    title="Нужны координаты минимум у 2 точек"
                    className="inline-flex min-h-10 cursor-not-allowed items-center justify-center gap-1.5 rounded-full bg-slate-200 px-4 py-2 text-xs font-bold text-slate-500"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Маршрут в Яндекс.Картах
                  </button>
                )}
              </div>
            </div>
            {missingCoordsCount > 0 ? (
              <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {coordsCount < 2
                  ? `У ${missingCoordsCount} ${missingCoordsCount === 1 ? 'точки' : 'точек'} нет координат - Яндекс.Карты пока недоступны.`
                  : `Без координат: ${missingCoordsCount}. В Яндекс уйдут только ${coordsCount} точки с координатами (в текущем порядке).`}
              </p>
            ) : null}
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {route.venues.map((venue, index) => (
                <DayRouteVenueCard
                  key={venue.id}
                  index={index}
                  total={route.venues.length}
                  venue={venue}
                  hasCoords={Boolean(lookupDayRouteCoords(venue, coordsById))}
                  segmentToNext={segmentMeters[index] ?? null}
                  onMoveUp={() => setRoute(moveDayRouteVenue(venue.id, -1))}
                  onMoveDown={() => setRoute(moveDayRouteVenue(venue.id, 1))}
                  onRemove={() => setRoute(removeFromDayRoute(venue.id))}
                />
              ))}
            </ul>
          </section>

          <section className="mt-8 sm:mt-10">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Подходящие экскурсии</h2>
            {loading ? <p className="mt-3 text-sm text-slate-500">Ищем покрытие…</p> : null}
            {!loading && payload && payload.matches.length === 0 ? (
              <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600 sm:p-6">
                <p className="font-semibold text-slate-800">Пока нет экскурсии, покрывающей набор</p>
                <p className="mt-1.5 leading-relaxed">
                  Посмотрите афишу города или экскурсии «рядом» на карточке точки. Когда появятся STOP-связи,
                  покрытие станет точнее.
                </p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <Link
                    href={afishaHref}
                    className="inline-flex min-h-10 items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-primary-600"
                  >
                    Афиша города
                  </Link>
                  <Link
                    href={locationsHref}
                    className="inline-flex min-h-10 items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Другие точки
                  </Link>
                </div>
              </div>
            ) : null}
            <ul className="mt-3 space-y-3">
              {(payload?.matches || []).map((match) => {
                const fullCovered = dayRouteFullCoveredCount(match.covered);
                const nearCount = match.covered.nearby.length;
                const addable = (match.routeVenues || []).filter(
                  (v) => !isInDayRoute(v.id) && !(v.slug && isInDayRoute(v.slug)),
                );
                const showAddablePlaces = addable.length > 0 && !atMax;
                const bulkAddCount = Math.min(addable.length, DAY_ROUTE_MAX - route.venues.length);
                const showBulkAdd = showAddablePlaces && bulkAddCount >= 2;
                return (
                  <li
                    key={match.eventId}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:p-4"
                  >
                    <div className="flex gap-3">
                      <Link
                        href={eventHref({ slug: match.slug, id: match.eventId })}
                        className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-20 sm:w-20"
                      >
                        <SafeImage
                          src={match.imageUrl}
                          alt=""
                          fill
                          sizes={IMAGE_SIZES.favoritesThumb}
                          className="object-cover"
                        />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={eventHref({ slug: match.slug, id: match.eventId })}
                          className="line-clamp-2 text-sm font-semibold text-slate-900 hover:text-primary-700"
                        >
                          {match.title}
                        </Link>
                        <p className="mt-1 text-xs text-slate-500">
                          {fullCovered} из {route.venues.length} точек
                          {nearCount ? ` · ещё ${nearCount} рядом` : ''}
                          {match.priceFromRub != null ? ` · ${formatPriceFrom(match.priceFromRub)}` : ''}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {match.covered.stop.map((id) => (
                            <span
                              key={`stop-${id}`}
                              className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800"
                              title={titleById.get(id) || id}
                            >
                              в маршруте · {titleById.get(id) || 'точка'}
                            </span>
                          ))}
                          {match.covered.start.map((id) => (
                            <span
                              key={`start-${id}`}
                              className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-800"
                              title={titleById.get(id) || id}
                            >
                              старт · {titleById.get(id) || 'точка'}
                            </span>
                          ))}
                          {match.covered.nearby.map((id) => (
                            <span
                              key={`near-${id}`}
                              className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800"
                              title={titleById.get(id) || id}
                            >
                              рядом · {titleById.get(id) || 'точка'}
                            </span>
                          ))}
                          {match.missing.map((id) => (
                            <span
                              key={`miss-${id}`}
                              className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500"
                              title={titleById.get(id) || id}
                            >
                              нет · {titleById.get(id) || 'точка'}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    {showAddablePlaces ? (
                      <div className="border-t border-slate-100 pt-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Места экскурсии не в маршруте
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {addable.slice(0, 6).map((venue) => (
                            <div
                              key={venue.id}
                              className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 py-0.5 pl-2.5 pr-1"
                            >
                              <span className="truncate text-[11px] font-medium text-slate-700">
                                {venue.title}
                              </span>
                              <AddToDayRouteButton
                                compact
                                className="!min-h-8 !px-2 !py-1 !text-[10px]"
                                venue={matchVenueToDayRouteItem(venue)}
                              />
                            </div>
                          ))}
                        </div>
                        {showBulkAdd ? (
                          <button
                            type="button"
                            className="mt-2 inline-flex min-h-10 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-100"
                            onClick={() => {
                              let next = readDayRoute();
                              for (const venue of addable) {
                                if (next.venues.length >= DAY_ROUTE_MAX) break;
                                next = addToDayRoute(matchVenueToDayRouteItem(venue));
                              }
                              setRoute(next);
                            }}
                          >
                            Добавить места экскурсии ({bulkAddCount})
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

function DayRouteVenueCard({
  venue,
  index,
  total,
  hasCoords,
  segmentToNext,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  venue: DayRouteVenueItem;
  index: number;
  total: number;
  hasCoords: boolean;
  segmentToNext: number | null;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  const href =
    venue.href ||
    (venue.slug ? venueHref({ id: venue.id, slug: venue.slug, name: venue.title, type: 'park' }) : '#');
  return (
    <li className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3">
      <div className="flex items-start gap-3">
        <div className="flex h-14 w-8 shrink-0 flex-col items-center justify-center gap-1">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
            {index + 1}
          </span>
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              aria-label="Выше"
              disabled={index === 0}
              onClick={onMoveUp}
              className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label="Ниже"
              disabled={index >= total - 1}
              onClick={onMoveDown}
              className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100">
          {venue.imageUrl ? (
            <SafeImage src={venue.imageUrl} alt="" fill sizes="3.5rem" className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-400">
              <MapPin className="h-5 w-5" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <Link href={href} className="line-clamp-2 text-sm font-semibold text-slate-900 hover:text-primary-700">
            {venue.title}
          </Link>
          {venue.city ? <p className="mt-0.5 truncate text-xs text-slate-500">{venue.city}</p> : null}
          {venue.sessionLabel ? (
            <p className="mt-1 inline-flex items-center rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-800">
              {venue.sessionLabel}
            </p>
          ) : null}
          {!hasCoords ? <p className="mt-0.5 text-[11px] font-medium text-amber-700">Нет координат</p> : null}
        </div>
        <button
          type="button"
          aria-label="Удалить точку"
          onClick={onRemove}
          className="min-h-9 min-w-9 shrink-0 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {segmentToNext != null ? (
        <p className="pl-11 text-[11px] text-slate-500">далее ~ {formatDayRouteDistance(segmentToNext)}</p>
      ) : null}
    </li>
  );
}
