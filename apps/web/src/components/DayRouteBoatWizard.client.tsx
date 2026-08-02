'use client';

import { Anchor, ChevronLeft, Ship, Ticket } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import {
  BOAT_PIER_NEAR_M,
  buildBoatRoutesFromSessions,
  dayRouteItemFromBoatSlot,
  dayRouteSuggestsBoat,
  formatBoatDistance,
  inferBoatTimeWindow,
  isBoatPierType,
  isSpbDayRouteCity,
  rankBoatPiers,
  resolveBoatRankingOrigin,
  type BoatPierCandidate,
  type BoatRouteCandidate,
  type BoatSlotCandidate,
} from '@/lib/day-route-boat';
import {
  DAY_ROUTE_MAX,
  addToDayRoute,
  readDayRouteFresh,
  type DayRouteState,
  type DayRouteVenueItem,
} from '@/lib/day-route';
import { flashDayRouteFeedback } from '@/lib/day-route-feedback';
import { formatPriceFrom } from '@/lib/format';
import { toVenueCatalogCard } from '@/lib/venue-catalog-card';
import type { VenueCatalogCard } from '@/lib/venue-map-types';

type WizardStep = 'pier' | 'route' | 'slot';

type VenuePagePayload = {
  venue?: {
    id: string;
    slug?: string | null;
    name: string;
    city?: string;
    cityId?: string | null;
    citySlug?: string | null;
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    heroImageUrl?: string | null;
  };
  sessions?: Array<{
    id: string;
    slug?: string | null;
    title?: string | null;
    imageUrl?: string | null;
    priceFrom?: number | null;
    category?: string | null;
    offerSourceCode?: string | null;
    purchaseProvider?: string | null;
    purchaseUrl?: string | null;
    startsAt?: string | null;
    dateLabel?: string | null;
    timeLabel?: string | null;
    upcomingSlots?: Array<{
      eventId?: string | null;
      startsAt?: string | null;
      dateLabel?: string | null;
      timeLabel?: string | null;
      purchaseUrl?: string | null;
      vacant?: number | null;
    }> | null;
  }>;
};

type Props = {
  cityName: string | null;
  citySlug: string | null;
  cityId: string | null;
  citySourceSlug?: string | null;
  route: DayRouteState;
  atMax: boolean;
  onRouteChange: (next: DayRouteState) => void;
  /** Optional: already loaded location cards (filter pier client-side). */
  locationsCatalog?: VenueCatalogCard[];
};

function appendPinnedBoat(item: DayRouteVenueItem): DayRouteState {
  const before = readDayRouteFresh();
  if (before.venues.length >= DAY_ROUTE_MAX) {
    const existingIdx = before.venues.findIndex(
      (v) => v.id === item.id || (item.slug && v.slug === item.slug),
    );
    if (existingIdx < 0) {
      flashDayRouteFeedback(`Лимит ${DAY_ROUTE_MAX} точек`);
      return before;
    }
  }
  const next = addToDayRoute(item);
  const pinned = next.venues.find(
    (v) =>
      (item.eventId && v.eventId === item.eventId && v.startsAt === item.startsAt) ||
      (v.id === item.id && v.startsAt === item.startsAt),
  );
  if (pinned?.eventId && pinned.startsAt) {
    flashDayRouteFeedback(
      next.venues.length > before.venues.length
        ? `Теплоход в маршруте · ${next.venues.length}/${DAY_ROUTE_MAX}`
        : 'Слот теплохода закреплён',
    );
  } else if (next.venues.length >= DAY_ROUTE_MAX && next.venues.length === before.venues.length) {
    flashDayRouteFeedback(`Лимит ${DAY_ROUTE_MAX} точек`);
  } else {
    flashDayRouteFeedback('Не удалось добавить теплоход');
  }
  return next;
}

export function DayRouteBoatWizard({
  cityName,
  citySlug,
  cityId,
  citySourceSlug,
  route,
  atMax,
  onRouteChange,
  locationsCatalog = [],
}: Props) {
  const cityIsSpb = isSpbDayRouteCity({
    slug: citySlug,
    name: cityName,
    sourceSlug: citySourceSlug,
    city: cityName,
  });

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<WizardStep>('pier');
  const [loadingPiers, setLoadingPiers] = useState(false);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [piers, setPiers] = useState<BoatPierCandidate[]>([]);
  const [routes, setRoutes] = useState<BoatRouteCandidate[]>([]);
  const [selectedPier, setSelectedPier] = useState<BoatPierCandidate | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<BoatRouteCandidate | null>(null);
  const [error, setError] = useState<string | null>(null);

  const origin = useMemo(
    () => resolveBoatRankingOrigin(route.venues, { cityIsSpb }),
    [route.venues, cityIsSpb],
  );

  const timeWindow = useMemo(() => inferBoatTimeWindow(route.venues), [route.venues]);

  const suggestWaterfront = useMemo(
    () => dayRouteSuggestsBoat(route.venues, piers),
    [route.venues, piers],
  );

  // Prefetch pier list for SPB (for suggest + wizard).
  useEffect(() => {
    if (!cityIsSpb || !cityName) {
      setPiers([]);
      return;
    }
    const fromCatalog = locationsCatalog.filter((v) => isBoatPierType(v.type) && v.city === cityName);
    if (fromCatalog.length) {
      setPiers(
        rankBoatPiers(
          fromCatalog.map((v) => ({
            id: v.id,
            slug: v.slug,
            name: v.name,
            city: v.city,
            cityId: v.cityId,
            citySlug: v.citySlug,
            address: v.address,
            latitude: v.latitude,
            longitude: v.longitude,
            heroImageUrl: v.heroImageUrl,
            events: v.events,
          })),
          origin.source === 'none' ? null : origin,
        ),
      );
    }

    const controller = new AbortController();
    setLoadingPiers(true);
    fetch(`/api/public/venues?type=pier&limit=80`, { signal: controller.signal })
      .then(async (response) =>
        response.ok ? ((await response.json()) as { venues?: VenueCatalogCard[] }) : null,
      )
      .then((payload) => {
        const list = (payload?.venues || [])
          .map((item) => toVenueCatalogCard(item as VenueCatalogCard))
          .filter((item) => isBoatPierType(item.type) && item.city === cityName);
        setPiers(
          rankBoatPiers(
            list.map((v) => ({
              id: v.id,
              slug: v.slug,
              name: v.name,
              city: v.city,
              cityId: v.cityId,
              citySlug: v.citySlug || citySlug,
              address: v.address,
              latitude: v.latitude,
              longitude: v.longitude,
              heroImageUrl: v.heroImageUrl,
              events: v.events,
            })),
            origin.source === 'none' ? null : origin,
          ),
        );
      })
      .catch(() => undefined)
      .finally(() => {
        if (!controller.signal.aborted) setLoadingPiers(false);
      });
    return () => controller.abort();
  }, [cityIsSpb, cityName, citySlug, locationsCatalog, origin.latitude, origin.longitude, origin.source]);

  if (!cityIsSpb) return null;

  function openWizard() {
    setOpen(true);
    setStep('pier');
    setSelectedPier(null);
    setSelectedRoute(null);
    setRoutes([]);
    setError(null);
  }

  function closeWizard() {
    setOpen(false);
    setStep('pier');
    setSelectedPier(null);
    setSelectedRoute(null);
    setRoutes([]);
    setError(null);
  }

  async function pickPier(pier: BoatPierCandidate) {
    setSelectedPier(pier);
    setSelectedRoute(null);
    setRoutes([]);
    setError(null);
    setStep('route');
    setLoadingRoutes(true);
    try {
      const key = encodeURIComponent(String(pier.slug || pier.id));
      const response = await fetch(`/api/public/venues/${key}`);
      if (!response.ok) {
        setError('Не удалось загрузить маршруты с причала');
        setRoutes([]);
        return;
      }
      const payload = (await response.json()) as VenuePagePayload;
      const sessions = payload.sessions || [];
      const nextRoutes = buildBoatRoutesFromSessions(sessions, timeWindow);
      setRoutes(nextRoutes);
      if (!nextRoutes.length) {
        setError('На этом причале пока нет ближайших рейсов - выберите другой.');
      }
    } catch {
      setError('Сеть недоступна. Попробуйте ещё раз.');
      setRoutes([]);
    } finally {
      setLoadingRoutes(false);
    }
  }

  function pickRoute(boatRoute: BoatRouteCandidate) {
    setSelectedRoute(boatRoute);
    setStep('slot');
    setError(null);
  }

  function pinSlot(slot: BoatSlotCandidate) {
    if (!selectedPier || !selectedRoute) return;
    if (atMax) {
      flashDayRouteFeedback(`Лимит ${DAY_ROUTE_MAX} точек`);
      return;
    }
    const item = dayRouteItemFromBoatSlot({
      pier: {
        ...selectedPier,
        cityId: selectedPier.cityId || cityId,
        citySlug: selectedPier.citySlug || citySlug,
      },
      route: selectedRoute,
      slot,
    });
    const next = appendPinnedBoat(item);
    onRouteChange(next);
    closeWizard();
  }

  const nearbyPiers = piers.filter((p) => p.distanceM == null || p.distanceM <= BOAT_PIER_NEAR_M);
  const pierList = nearbyPiers.length ? nearbyPiers : piers.slice(0, 12);

  return (
    <div className="mt-4" data-day-boat-wizard>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">Теплоход по Неве и каналам</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Причал - маршрут - время. В день попадает только закреплённый слот.
          </p>
        </div>
        <button
          type="button"
          disabled={atMax}
          onClick={openWizard}
          data-day-boat-open
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-full bg-sky-700 px-4 py-2 text-xs font-bold text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <Ship className="h-3.5 w-3.5" />
          Добавить теплоход
        </button>
      </div>

      {!open && suggestWaterfront && route.venues.length > 0 ? (
        <button
          type="button"
          disabled={atMax}
          onClick={openWizard}
          data-day-boat-suggest
          className="mt-2 w-full rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-left text-xs font-medium text-sky-900 hover:bg-sky-100 disabled:opacity-50"
        >
          Рядом с маршрутом есть вода - подобрать прогулку на теплоходе?
        </button>
      ) : null}

      {open ? (
        <div
          className="mt-3 rounded-xl border border-sky-200 bg-sky-50/60 p-3 sm:p-4"
          data-day-boat-steps
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">
              {step === 'pier' ? '1. Причал' : step === 'route' ? '2. Маршрут' : '3. Время'}
            </p>
            <button
              type="button"
              onClick={closeWizard}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Закрыть
            </button>
          </div>

          {step !== 'pier' ? (
            <button
              type="button"
              onClick={() => {
                if (step === 'slot') {
                  setStep('route');
                  setSelectedRoute(null);
                } else {
                  setStep('pier');
                  setSelectedPier(null);
                  setRoutes([]);
                }
                setError(null);
              }}
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-sky-800 hover:text-sky-950"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Назад
            </button>
          ) : null}

          {error ? (
            <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-900">
              {error}
            </p>
          ) : null}

          {step === 'pier' ? (
            <div className="mt-3 space-y-2" data-day-boat-piers>
              {loadingPiers && !pierList.length ? (
                <p className="text-xs text-slate-500">Загружаем причалы…</p>
              ) : null}
              {!loadingPiers && !pierList.length ? (
                <p className="text-xs text-slate-600">
                  Причалы для этого города пока не найдены. Можно добавить место текстом или из
                  локаций.
                </p>
              ) : null}
              {pierList.map((pier) => {
                const dist = formatBoatDistance(pier.distanceM);
                return (
                  <button
                    key={pier.id}
                    type="button"
                    onClick={() => void pickPier(pier)}
                    className="flex w-full items-start gap-2 rounded-xl border border-white bg-white px-3 py-2.5 text-left shadow-sm hover:border-sky-300"
                  >
                    <Anchor className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-900">{pier.name}</span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {[pier.address, dist ? `~${dist} от маршрута` : null]
                          .filter(Boolean)
                          .join(' · ') || 'Причал'}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}

          {step === 'route' ? (
            <div className="mt-3 space-y-2" data-day-boat-routes>
              {selectedPier ? (
                <p className="text-xs text-slate-600">
                  С причала: <span className="font-semibold text-slate-800">{selectedPier.name}</span>
                </p>
              ) : null}
              {loadingRoutes ? <p className="text-xs text-slate-500">Ищем маршруты…</p> : null}
              {!loadingRoutes &&
                routes.map((boatRoute) => (
                  <button
                    key={boatRoute.eventId}
                    type="button"
                    onClick={() => pickRoute(boatRoute)}
                    className="flex w-full flex-col gap-0.5 rounded-xl border border-white bg-white px-3 py-2.5 text-left shadow-sm hover:border-sky-300"
                  >
                    <span className="text-sm font-semibold text-slate-900">{boatRoute.title}</span>
                    <span className="text-xs text-slate-500">
                      {[
                        boatRoute.slots.length
                          ? `${boatRoute.slots.length} слот${boatRoute.slots.length === 1 ? '' : boatRoute.slots.length < 5 ? 'а' : 'ов'}`
                          : null,
                        boatRoute.priceFrom != null ? formatPriceFrom(boatRoute.priceFrom) : null,
                        boatRoute.slots.some((s) => s.fitsWindow) ? 'в окно дня' : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </button>
                ))}
            </div>
          ) : null}

          {step === 'slot' && selectedRoute ? (
            <div className="mt-3 space-y-2" data-day-boat-slots>
              <p className="text-xs text-slate-600">
                Маршрут:{' '}
                <span className="font-semibold text-slate-800">{selectedRoute.title}</span>
              </p>
              {selectedRoute.slots.map((slot) => {
                const label = [slot.dateLabel, slot.timeLabel].filter(Boolean).join(', ') || 'Сеанс';
                return (
                  <div
                    key={`${slot.eventId}:${slot.startsAt}`}
                    className="rounded-xl border border-white bg-white px-3 py-2.5 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{label}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {slot.fitsWindow ? 'Подходит по времени соседей' : 'Вне окна соседей'}
                          {slot.vacant != null ? ` · мест ${slot.vacant}` : ''}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => pinSlot(slot)}
                          data-day-boat-pin
                          className="inline-flex min-h-9 items-center justify-center rounded-full bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-primary-600"
                        >
                          В маршрут
                        </button>
                        {slot.purchaseUrl ? (
                          <a
                            href={slot.purchaseUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-day-boat-buy
                            className="inline-flex min-h-9 items-center justify-center gap-1 rounded-full bg-amber-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-600"
                          >
                            <Ticket className="h-3.5 w-3.5" />
                            Купить билет
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
