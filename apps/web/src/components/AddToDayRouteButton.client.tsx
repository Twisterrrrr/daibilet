'use client';

import { useLayoutEffect, useState } from 'react';
import { Check, Route } from 'lucide-react';

import { CityConfirmModal } from '@/components/CityConfirmModal.client';
import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import { useDayRouteState } from '@/hooks/useDayRouteState';
import {
  applyClearDayRouteForCityChange,
  buildAddForeignCityConfirmMessage,
  dayRouteConflictsWithIncomingCity,
  resolveDayRouteCityLabel,
} from '@/lib/day-route-city-change';
import { flashDayRouteFeedback } from '@/lib/day-route-feedback';
import {
  DAY_ROUTE_MAX,
  DAY_ROUTE_SOFT_WARN,
  addToDayRoute,
  dayRouteAddSuccessMessage,
  dayRouteHardLimitMessage,
  isDayRouteAtSoft,
  isInDayRoute,
  normalizeDayRouteVenueId,
  readDayRouteFresh,
  removeFromDayRoute,
  replaceDayRouteFromVenues,
  sameDayRouteVenue,
  toggleDayRoute,
  type DayRouteVenueItem,
} from '@/lib/day-route';
import { useRouter } from 'next/navigation';

type Props = {
  venue: DayRouteVenueItem;
  className?: string;
  /** `overlay` - chip на фото (белый/blur, как избранное). */
  variant?: 'light' | 'dark' | 'overlay';
  /** Компактный вид для карточек каталога (иконка + короткий лейбл). */
  compact?: boolean;
  /** Только иконка; лейбл уходит в aria-label / title. */
  iconOnly?: boolean;
  /**
   * `route` - «В мой маршрут» (must-see / venue).
   * `day` - «В мой день» (с события, с временем сессии).
   */
  intent?: 'route' | 'day';
};

export function AddToDayRouteButton({
  venue,
  className = '',
  variant = 'light',
  compact = false,
  iconOnly = false,
  intent = 'route',
}: Props) {
  // SSR HTML used to paint an enabled <button> before hydration; clicks silently no-op'd
  // (owner: second point never appears after fast nav). Keep disabled until client is live.
  const [live, setLive] = useState(false);
  const [foreignCityPrompt, setForeignCityPrompt] = useState<{
    payload: DayRouteVenueItem;
    routeCity: string;
    incomingCity: string;
  } | null>(null);
  const selectedCity = useSelectedCityOptional();
  useLayoutEffect(() => {
    setLive(true);
  }, []);

  const venueKey = normalizeDayRouteVenueId(venue);
  const route = useDayRouteState();
  const active = Boolean(venueKey) && isInDayRoute(venueKey, route, venue.slug);
  const full = route.venues.length >= DAY_ROUTE_MAX && !active;

  const base =
    variant === 'dark'
      ? active
        ? 'bg-white text-emerald-950'
        : 'bg-white/15 text-white hover:bg-white/25'
      : variant === 'overlay'
        ? active
          ? 'bg-emerald-600/95 text-white shadow-sm backdrop-blur-sm hover:bg-emerald-700'
          : 'bg-white/90 text-slate-800 shadow-sm backdrop-blur-sm hover:bg-white'
        : active
          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
          : 'bg-slate-100 text-slate-800 hover:bg-slate-200';

  const idleLabel = intent === 'day' ? 'В мой день' : compact || iconOnly ? 'В маршрут' : 'В мой маршрут';
  const activeLabel = intent === 'day' ? 'Добавлено' : 'В маршруте';
  const label = active ? activeLabel : idleLabel;
  const idleTitle = intent === 'day' ? 'В мой день' : iconOnly ? 'В маршрут' : 'В мой маршрут';
  const activeTitle = intent === 'day' ? 'Убрать из моего дня' : 'Убрать из маршрута';
  const idleAria =
    intent === 'day' ? 'Добавить место события в мой день' : iconOnly ? 'В маршрут' : 'Добавить в маршрут дня';
  const activeAria =
    intent === 'day' ? 'Убрать место из моего дня' : iconOnly ? 'В маршруте' : 'Убрать из маршрута дня';

  function feedbackAfter(beforeCount: number, payload: DayRouteVenueItem) {
    // Bust cache so toast reflects LS truth (not a stale snapshot after failed write).
    const after = readDayRouteFresh();
    const n = after.venues.length;
    if (n > beforeCount) {
      flashDayRouteFeedback(dayRouteAddSuccessMessage(n));
      return;
    }
    if (n < beforeCount) {
      flashDayRouteFeedback(n ? `Убрано · осталось ${n}` : 'Маршрут очищен');
      return;
    }
    if (full) {
      flashDayRouteFeedback(dayRouteHardLimitMessage());
      return;
    }
    if (!venueKey) {
      flashDayRouteFeedback('Нельзя добавить: нет id точки');
      return;
    }
    // «Уже в маршруте» only when this exact venue is truly present (id↔id / slug↔slug).
    if (after.venues.some((item) => sameDayRouteVenue(item, payload))) {
      flashDayRouteFeedback('Уже в маршруте');
      return;
    }
    // Count stuck + venue absent: writeDayRoute failed (quota/private) or add no-op'd.
    flashDayRouteFeedback('Не удалось добавить точку');
  }

  function addPayload(payload: DayRouteVenueItem) {
    const beforeCount = readDayRouteFresh().venues.length;
    addToDayRoute(payload);
    feedbackAfter(beforeCount, payload);
  }

  function clearAddAndSyncCity(payload: DayRouteVenueItem) {
    applyClearDayRouteForCityChange();
    addPayload(payload);
    const cityName = String(payload.city || '').trim();
    if (cityName && selectedCity) {
      void selectedCity.setCity(cityName, { skipRouteConfirm: true, persistOnly: true });
    }
  }

  /** Returns false when a foreign-city modal was opened (caller must stop). */
  function guardForeignCityOrOpen(payload: DayRouteVenueItem): boolean {
    const before = readDayRouteFresh();
    if (!dayRouteConflictsWithIncomingCity(before.venues, payload)) return true;
    const routeCity = resolveDayRouteCityLabel(before.venues) || 'другого города';
    const incomingCity = String(payload.city || '').trim() || 'новый город';
    setForeignCityPrompt({ payload, routeCity, incomingCity });
    return false;
  }

  function applyToggle() {
    if (!live) {
      flashDayRouteFeedback('Секунду, загружается…');
      return;
    }
    if (!venueKey) {
      flashDayRouteFeedback('Нельзя добавить: нет id точки');
      return;
    }
    const payload = { ...venue, id: venueKey };
    const beforeCount = readDayRouteFresh().venues.length;

    if (intent === 'day') {
      const before = readDayRouteFresh();
      const existing = before.venues.find((item) => sameDayRouteVenue(item, payload));
      if (existing) {
        const sameEventMeta =
          (existing.eventId || null) === (payload.eventId || null) &&
          (existing.sessionLabel || null) === (payload.sessionLabel || null) &&
          (existing.startsAt || null) === (payload.startsAt || null);
        if (sameEventMeta) {
          removeFromDayRoute(existing.id);
          feedbackAfter(beforeCount, payload);
          return;
        }
        if (!guardForeignCityOrOpen(payload)) return;
        addToDayRoute(payload);
        feedbackAfter(beforeCount, payload);
        return;
      }
      if (!guardForeignCityOrOpen(payload)) return;
      addToDayRoute(payload);
      feedbackAfter(beforeCount, payload);
      return;
    }

    // Catalog compact: ADD ONLY. Accidental second tap on a green chip must not
    // remove the only point (owner symptom «не добавляется более 1»).
    if (compact || iconOnly) {
      const before = readDayRouteFresh();
      if (before.venues.some((item) => sameDayRouteVenue(item, payload))) {
        // Merge coords / canonical id when slug-as-id alias already stored.
        addToDayRoute(payload);
        flashDayRouteFeedback('Уже в маршруте');
        return;
      }
      if (before.venues.length >= DAY_ROUTE_MAX) {
        flashDayRouteFeedback(dayRouteHardLimitMessage());
        return;
      }
      if (!guardForeignCityOrOpen(payload)) return;
      addToDayRoute(payload);
      feedbackAfter(beforeCount, payload);
      return;
    }

    if (active) {
      toggleDayRoute(payload);
      feedbackAfter(beforeCount, payload);
      return;
    }
    if (!guardForeignCityOrOpen(payload)) return;
    toggleDayRoute(payload);
    feedbackAfter(beforeCount, payload);
  }

  return (
    <>
      <button
        type="button"
        disabled={!live || !venueKey || (full && !active)}
        title={
          !live
            ? 'Секунду…'
            : !venueKey
              ? 'Нельзя добавить: нет id точки'
              : full && !active
                ? dayRouteHardLimitMessage()
                : active
                  ? compact
                    ? 'Уже в маршруте (убрать можно в Мой день)'
                    : activeTitle
                  : isDayRouteAtSoft(route.venues.length) && !active
                    ? DAY_ROUTE_SOFT_WARN
                    : idleTitle
        }
        aria-pressed={active}
        aria-label={active ? (iconOnly ? activeAria : compact ? 'Уже в маршруте дня' : activeAria) : idleAria}
        data-venue-id={venueKey || undefined}
        data-day-route-intent={intent}
        data-day-route-live={live ? '1' : '0'}
        onPointerDown={(event) => {
          // Stop bubble to parent <Link>; do NOT preventDefault (kills click on some browsers).
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          applyToggle();
        }}
        className={`inline-flex min-h-10 min-w-[2.75rem] items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
          iconOnly ? '!min-w-8 !px-2' : ''
        } ${base} ${className}`}
      >
        {active ? <Check className="h-3.5 w-3.5 shrink-0" /> : <Route className="h-3.5 w-3.5 shrink-0" />}
        {iconOnly ? <span className="sr-only">{label}</span> : <span>{label}</span>}
      </button>
      <CityConfirmModal
        open={Boolean(foreignCityPrompt)}
        title="Другой город"
        message={
          foreignCityPrompt
            ? buildAddForeignCityConfirmMessage(foreignCityPrompt.routeCity, foreignCityPrompt.incomingCity)
            : ''
        }
        confirmLabel="Очистить и добавить"
        cancelLabel="Не добавлять"
        onConfirm={() => {
          const pending = foreignCityPrompt;
          setForeignCityPrompt(null);
          if (pending) clearAddAndSyncCity(pending.payload);
        }}
        onCancel={() => setForeignCityPrompt(null)}
      />
    </>
  );
}

type ManyProps = {
  venues: DayRouteVenueItem[];
  className?: string;
  variant?: 'light' | 'dark' | 'overlay' | 'primary';
  compact?: boolean;
  /**
   * Hub → planner: replace current day (avoid mixing with old stops).
   * Default append for in-my-day picker.
   */
  mode?: 'append' | 'replace';
  /** After replace, open /my-day (city hub CTA). */
  navigateToMyDay?: boolean;
};

/** Bulk «В маршрут» for a suburb slide: adds every listed point in one tap. */
export function AddManyToDayRouteButton({
  venues,
  className = '',
  variant = 'light',
  compact = false,
  mode = 'append',
  navigateToMyDay = false,
}: ManyProps) {
  const router = useRouter();
  const [live, setLive] = useState(false);
  const [foreignCityPrompt, setForeignCityPrompt] = useState<{
    payloads: DayRouteVenueItem[];
    routeCity: string;
    incomingCity: string;
  } | null>(null);
  const selectedCity = useSelectedCityOptional();
  useLayoutEffect(() => {
    setLive(true);
  }, []);

  const route = useDayRouteState();
  const payloads = venues
    .map((venue) => {
      const id = normalizeDayRouteVenueId(venue);
      return id ? { ...venue, id } : null;
    })
    .filter((item): item is DayRouteVenueItem => Boolean(item));

  const allActive =
    payloads.length > 0 &&
    payloads.every((payload) => isInDayRoute(payload.id, route, payload.slug));
  const full = !allActive && route.venues.length >= DAY_ROUTE_MAX;

  const showActive = mode !== 'replace' && allActive;
  const base =
    variant === 'dark'
      ? showActive
        ? 'bg-white text-emerald-950'
        : 'bg-white/15 text-white hover:bg-white/25'
      : variant === 'overlay'
        ? showActive
          ? 'bg-emerald-600/95 text-white shadow-sm backdrop-blur-sm hover:bg-emerald-700'
          : 'bg-white/90 text-slate-800 shadow-sm backdrop-blur-sm hover:bg-white'
        : variant === 'primary'
          ? showActive
            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
            : 'bg-primary-600 text-white hover:bg-primary-700'
          : showActive
            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
            : 'bg-slate-100 text-slate-800 hover:bg-slate-200';

  const label =
    mode === 'replace'
      ? compact
        ? 'В мой день'
        : 'Открыть в Мой день'
      : allActive
        ? 'В маршруте'
        : compact
          ? 'В маршрут'
          : 'В мой маршрут';

  function runBulkReplace(list: DayRouteVenueItem[]) {
    const capped = list.slice(0, DAY_ROUTE_MAX);
    const cityId = capped[0]?.cityId || null;
    replaceDayRouteFromVenues(capped, cityId);
    const n = readDayRouteFresh().venues.length;
    flashDayRouteFeedback(
      n > 0
        ? `Маршрут заменён: ${n} ${n === 1 ? 'точка' : n < 5 ? 'точки' : 'точек'}`
        : 'Маршрут очищен',
    );
    if (navigateToMyDay) {
      router.push('/my-day');
    }
  }

  function runBulkAdd(list: DayRouteVenueItem[]) {
    if (mode === 'replace') {
      runBulkReplace(list);
      return;
    }
    const before = readDayRouteFresh();
    const beforeCount = before.venues.length;
    let added = 0;
    for (const payload of list) {
      const current = readDayRouteFresh();
      if (current.venues.some((item) => sameDayRouteVenue(item, payload))) continue;
      if (current.venues.length >= DAY_ROUTE_MAX) break;
      addToDayRoute(payload);
      added += 1;
    }

    const after = readDayRouteFresh();
    const n = after.venues.length;
    if (added > 0) {
      flashDayRouteFeedback(
        added > 1 ? `Добавлено ${added} точек · ${n}` : dayRouteAddSuccessMessage(n),
      );
      return;
    }
    if (n >= DAY_ROUTE_MAX && beforeCount >= DAY_ROUTE_MAX) {
      flashDayRouteFeedback(dayRouteHardLimitMessage());
      return;
    }
    flashDayRouteFeedback('Уже в маршруте');
  }

  function applyBulk() {
    if (!live) {
      flashDayRouteFeedback('Секунду, загружается…');
      return;
    }
    if (!payloads.length) {
      flashDayRouteFeedback('Нельзя добавить: нет точек');
      return;
    }
    if (mode !== 'replace' && allActive) {
      flashDayRouteFeedback('Уже в маршруте');
      return;
    }
    const before = readDayRouteFresh();
    if (mode !== 'replace' && before.venues.length >= DAY_ROUTE_MAX) {
      flashDayRouteFeedback(dayRouteHardLimitMessage());
      return;
    }

    const sample = payloads[0]!;
    if (mode !== 'replace' && dayRouteConflictsWithIncomingCity(before.venues, sample)) {
      const routeCity = resolveDayRouteCityLabel(before.venues) || 'другого города';
      const incomingCity = String(sample.city || '').trim() || 'новый город';
      setForeignCityPrompt({ payloads, routeCity, incomingCity });
      return;
    }

    runBulkAdd(payloads);
  }

  return (
    <>
      <button
        type="button"
        disabled={
          !live ||
          !payloads.length ||
          (mode !== 'replace' && full && !allActive)
        }
        title={
          !live
            ? 'Секунду…'
            : !payloads.length
              ? 'Нельзя добавить: нет точек'
              : mode === 'replace'
                ? 'Заменить текущий день этими точками и открыть планировщик'
                : full && !allActive
                  ? dayRouteHardLimitMessage()
                  : allActive
                    ? 'Уже в маршруте (убрать можно в Мой день)'
                    : isDayRouteAtSoft(route.venues.length) && !allActive
                      ? DAY_ROUTE_SOFT_WARN
                      : 'Добавить все точки пригорода в маршрут'
        }
        aria-pressed={mode === 'replace' ? undefined : allActive}
        aria-label={
          mode === 'replace'
            ? `Открыть пригород в Мой день (${payloads.length} точек, заменить маршрут)`
            : allActive
              ? 'Все точки пригорода уже в маршруте дня'
              : `Добавить все точки пригорода в маршрут (${payloads.length})`
        }
        data-day-route-bulk={payloads.length || undefined}
        data-day-route-bulk-mode={mode}
        data-day-route-live={live ? '1' : '0'}
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          applyBulk();
        }}
        className={`inline-flex min-h-10 min-w-[2.75rem] shrink-0 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${base} ${className}`}
      >
        {mode !== 'replace' && allActive ? (
          <Check className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <Route className="h-3.5 w-3.5 shrink-0" />
        )}
        <span>{label}</span>
      </button>
      <CityConfirmModal
        open={Boolean(foreignCityPrompt)}
        title="Другой город"
        message={
          foreignCityPrompt
            ? buildAddForeignCityConfirmMessage(foreignCityPrompt.routeCity, foreignCityPrompt.incomingCity)
            : ''
        }
        confirmLabel="Очистить и добавить"
        cancelLabel="Не добавлять"
        onConfirm={() => {
          const pending = foreignCityPrompt;
          setForeignCityPrompt(null);
          if (!pending) return;
          applyClearDayRouteForCityChange();
          runBulkAdd(pending.payloads);
          const cityName = String(pending.payloads[0]?.city || '').trim();
          if (cityName && selectedCity) {
            void selectedCity.setCity(cityName, { skipRouteConfirm: true, persistOnly: true });
          }
        }}
        onCancel={() => setForeignCityPrompt(null)}
      />
    </>
  );
}
