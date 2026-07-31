'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Copy, MapPin, Route, Trash2, X } from 'lucide-react';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';

import { IMAGE_SIZES, SafeImage } from '@/components/SafeImage.client';
import {
  DAY_ROUTE_CHANGED_EVENT,
  DAY_ROUTE_MAX,
  DAY_ROUTE_MIN,
  buildDayRouteSharePath,
  clearDayRoute,
  parseDayRouteQueryParam,
  readDayRoute,
  removeFromDayRoute,
  replaceDayRouteFromVenues,
  type DayRouteState,
  type DayRouteVenueItem,
} from '@/lib/day-route';
import { formatPriceFrom } from '@/lib/format';
import { eventHref, venueHref } from '@/lib/routes';

type MatchPayload = {
  cityId: string | null;
  multiCityWarning: boolean;
  venues: Array<{
    id: string;
    slug: string | null;
    title: string;
    cityId: string | null;
    cityTitle: string | null;
    heroImageUrl: string | null;
  }>;
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
  }>;
};

export function DayRoutePanel() {
  return (
    <Suspense fallback={<DayRoutePanelFallback />}>
      <DayRoutePanelInner />
    </Suspense>
  );
}

function DayRoutePanelFallback() {
  return (
    <div className="container-page py-8 sm:py-10">
      <p className="text-sm text-slate-500">Загружаем маршрут…</p>
    </div>
  );
}

function DayRoutePanelInner() {
  const searchParams = useSearchParams();
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

  // Share hydrate: /my-day?day=id1,slug2 → resolve → localStorage.
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
          imageUrl: venue.heroImageUrl,
          href: venue.slug
            ? venueHref({ id: venue.id, slug: venue.slug, name: venue.title, type: 'park' })
            : null,
        }));
        hydratedDayRef.current = key;
        setRoute(replaceDayRouteFromVenues(items, data.cityId));
        setPayload(data);
        setReady(true);
      })
      .catch(() => {
        setReady(true);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [dayParam]);

  const venueIds = useMemo(() => route.venues.map((v) => v.id).join(','), [route.venues]);
  const titleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const v of route.venues) map.set(v.id, v.title);
    return map;
  }, [route.venues]);

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
        if (data) setPayload(data);
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
    window.setTimeout(() => setCopyStatus('idle'), 2000);
  }

  return (
    <div className="container-page py-8 sm:py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Собери свой день</p>
          <h1 className="mt-1 font-display text-2xl font-extrabold text-slate-900 sm:text-3xl">Мой день</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Наберите {DAY_ROUTE_MIN}-{DAY_ROUTE_MAX} точек одного города - покажем экскурсии с лучшим покрытием
            маршрута.
          </p>
        </div>
        {route.venues.length ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                void copyShareLink();
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
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
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              <Trash2 className="h-3.5 w-3.5" /> Очистить
            </button>
          </div>
        ) : null}
      </div>

      {!route.venues.length ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <Route className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-3 text-sm font-semibold text-slate-800">Пока пусто</p>
          <p className="mt-1 text-sm text-slate-500">Добавьте места из гида города кнопкой «В мой маршрут».</p>
          <Link
            href="/locations"
            className="mt-4 inline-flex rounded-full bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-600"
          >
            К локациям
          </Link>
        </div>
      ) : (
        <>
          {payload?.multiCityWarning ? (
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Точки из разных городов. Матч считается по доминирующему городу.
            </p>
          ) : null}

          <section className="mt-6">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
              Точки · {route.venues.length}/{DAY_ROUTE_MAX}
            </h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {route.venues.map((venue) => (
                <DayRouteVenueCard
                  key={venue.id}
                  venue={venue}
                  onRemove={() => setRoute(removeFromDayRoute(venue.id))}
                />
              ))}
            </ul>
          </section>

          <section className="mt-10">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Подходящие экскурсии</h2>
            {loading ? <p className="mt-3 text-sm text-slate-500">Ищем покрытие…</p> : null}
            {!loading && payload && payload.matches.length === 0 ? (
              <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
                Пока нет экскурсии, покрывающей набор. Посмотрите афишу города или экскурсии «рядом» на карточке
                точки.
              </div>
            ) : null}
            <ul className="mt-3 space-y-3">
              {(payload?.matches || []).map((match) => {
                const coveredCount =
                  match.covered.stop.length + match.covered.start.length + match.covered.nearby.length;
                return (
                  <li
                    key={match.eventId}
                    className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:p-4"
                  >
                    <Link
                      href={eventHref({ slug: match.slug, id: match.eventId })}
                      className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100"
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
                        {coveredCount} из {route.venues.length} точек · score {match.score}
                        {match.priceFromRub != null ? ` · ${formatPriceFrom(match.priceFromRub)}` : ''}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {match.covered.stop.map((id) => (
                          <span
                            key={`stop-${id}`}
                            className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800"
                          >
                            в маршруте: {titleById.get(id) || id}
                          </span>
                        ))}
                        {match.covered.start.map((id) => (
                          <span
                            key={`start-${id}`}
                            className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-800"
                          >
                            старт: {titleById.get(id) || id}
                          </span>
                        ))}
                        {match.covered.nearby.map((id) => (
                          <span
                            key={`near-${id}`}
                            className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800"
                          >
                            рядом: {titleById.get(id) || id}
                          </span>
                        ))}
                        {match.missing.map((id) => (
                          <span
                            key={`miss-${id}`}
                            className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500"
                          >
                            нет: {titleById.get(id) || id}
                          </span>
                        ))}
                      </div>
                    </div>
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
  onRemove,
}: {
  venue: DayRouteVenueItem;
  onRemove: () => void;
}) {
  const href =
    venue.href ||
    (venue.slug ? venueHref({ id: venue.id, slug: venue.slug, name: venue.title, type: 'park' }) : '#');
  return (
    <li className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3">
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
      </div>
      <button
        type="button"
        aria-label="Удалить точку"
        onClick={onRemove}
        className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
      >
        <X className="h-4 w-4" />
      </button>
    </li>
  );
}
