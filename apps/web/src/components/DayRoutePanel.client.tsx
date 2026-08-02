'use client';

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  GripVertical,
  MapPin,
  Plus,
  Printer,
  Route,
  Sparkles,
  Ticket,
  Trash2,
  X,
} from 'lucide-react';
import {
  DragEvent,
  FormEvent,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { PublicCatalogListItemDto, PublicDestinationDto } from '@daibilet/contracts/public';

import { IMAGE_SIZES, SafeImage } from '@/components/SafeImage.client';
import { AddToDayRouteButton } from '@/components/AddToDayRouteButton.client';
import { CityPicker } from '@/components/CityPicker.client';
import {
  DayRouteSearchSelect,
  type DayRouteSearchOption,
} from '@/components/DayRouteSearchSelect.client';
import { MobileStickyActionBar } from '@/components/MobileStickyActionBar';
import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import { catalogHrefWithSelectedCity, venueCatalogHrefWithSelectedCity } from '@/lib/catalog-url';
import { resolveCityInfo } from '@/lib/cityInfo';
import {
  DAY_ROUTE_CHANGED_EVENT,
  DAY_ROUTE_MAX,
  DAY_ROUTE_MIN,
  addTextStopToDayRoute,
  addToDayRoute,
  applyItemTokensToVenues,
  applyShareMetaToVenues,
  buildDayRouteCoordsMap,
  buildDayRouteShareMessage,
  buildDayRouteSharePath,
  buildMaxShareUrl,
  buildTelegramShareUrl,
  buildWhatsAppShareUrl,
  buildYandexMultiStopRouteUrl,
  catalogDayRouteVenueIds,
  catalogLocatorsFromItemTokens,
  catalogLocatorsFromShareTokens,
  clearDayRoute,
  dayRouteDominantCitySlug,
  dayRouteFullCoveredCount,
  dayRouteHasMixedCities,
  dayRouteSegmentMeters,
  dayRouteTotalDistanceMeters,
  enrichDayRouteFromMatchVenues,
  estimateDayRouteTravelMinutes,
  formatDayRouteDistance,
  formatDayRouteSegmentHint,
  formatDayRouteTravelMinutes,
  hydrateTextStopsFromShareTokens,
  isDayRouteShareTextToken,
  isInDayRoute,
  isTextDayRouteStop,
  lookupDayRouteCoords,
  moveDayRouteVenue,
  optimizeDayRouteNearestNeighbor,
  parseDayRouteItemsParam,
  parseDayRouteQueryParam,
  readDayRoute,
  readDayRouteFresh,
  removeFromDayRoute,
  reorderDayRoute,
  resolveDayRouteTicketUrl,
  hydrateDayRouteFromShare,
  updateDayRouteVenue,
  type DayRouteState,
  type DayRouteTravelMode,
  type DayRouteVenueItem,
} from '@/lib/day-route';
import {
  buildCityDayRoutePreset,
  dayRouteItemFromEvent,
  dayRouteItemFromMustSee,
  type DayRouteVenueMatchSource,
} from '@/lib/day-route-from-place';
import { flashDayRouteFeedback } from '@/lib/day-route-feedback';
import { formatPriceFrom } from '@/lib/format';
import { formatStreetAddress } from '@/lib/address';
import { eventHref, venueHref } from '@/lib/routes';
import { toVenueCatalogCard } from '@/lib/venue-catalog-card';
import type { VenueCatalogCard } from '@/lib/venue-map-types';

type MatchVenueStub = {
  id: string;
  slug: string | null;
  title: string;
  cityId: string | null;
  cityTitle: string | null;
  citySlug?: string | null;
  address?: string | null;
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
    address: venue.address ?? null,
    imageUrl: venue.heroImageUrl,
    latitude: venue.latitude ?? null,
    longitude: venue.longitude ?? null,
    href: venue.slug
      ? venueHref({ id: venue.id, slug: venue.slug, name: venue.title, type: 'park' })
      : null,
  };
}

function venueCardToDayRouteItem(venue: VenueCatalogCard): DayRouteVenueItem {
  return {
    id: venue.id,
    slug: venue.slug ?? null,
    title: venue.name,
    city: venue.city,
    cityId: venue.cityId ?? null,
    citySlug: venue.citySlug ?? null,
    address: venue.address ?? null,
    imageUrl: venue.heroImageUrl ?? null,
    latitude: venue.latitude ?? null,
    longitude: venue.longitude ?? null,
    href: venueHref({
      id: venue.id,
      slug: venue.slug,
      name: venue.name,
      type: venue.type,
    }),
  };
}

function venueCardToMatchSource(venue: VenueCatalogCard): DayRouteVenueMatchSource {
  return {
    id: venue.id,
    slug: venue.slug,
    name: venue.name,
    title: venue.name,
    type: venue.type,
    latitude: venue.latitude,
    longitude: venue.longitude,
    address: venue.address,
    heroImageUrl: venue.heroImageUrl,
    city: venue.city,
    citySlug: venue.citySlug,
    cityId: venue.cityId,
  };
}

function appendDayRouteItem(item: DayRouteVenueItem | null): DayRouteState {
  if (!item) {
    flashDayRouteFeedback('Не удалось добавить точку');
    return readDayRouteFresh();
  }
  const before = readDayRouteFresh().venues.length;
  if (before >= DAY_ROUTE_MAX) {
    flashDayRouteFeedback(`Лимит ${DAY_ROUTE_MAX} точек`);
    return readDayRouteFresh();
  }
  if (isInDayRoute(item.id) || (item.slug && isInDayRoute(item.slug))) {
    flashDayRouteFeedback('Уже в маршруте');
    return readDayRouteFresh();
  }
  const next = addToDayRoute(item);
  if (next.venues.length > before) {
    flashDayRouteFeedback(`Добавлено в маршрут · ${next.venues.length}/${DAY_ROUTE_MAX}`);
  } else if (next.venues.length >= DAY_ROUTE_MAX) {
    flashDayRouteFeedback(`Лимит ${DAY_ROUTE_MAX} точек`);
  } else {
    flashDayRouteFeedback('Не удалось добавить точку');
  }
  return next;
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
  const selectedCity = useSelectedCityOptional();
  const itemsParam = searchParams.get('items');
  const cityParam = searchParams.get('city');
  const fromParam = searchParams.get('from');
  const dayParam = searchParams.get('day');
  const [route, setRoute] = useState<DayRouteState>(() =>
    typeof window === 'undefined' ? { cityId: null, venues: [] } : readDayRoute(),
  );
  const [payload, setPayload] = useState<MatchPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'ok' | 'err'>('idle');
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [shareLanding, setShareLanding] = useState<{
    active: boolean;
    fromName: string | null;
    saved: boolean;
  }>({ active: false, fromName: null, saved: false });
  const [travelMode, setTravelMode] = useState<DayRouteTravelMode>('walk');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [titleInput, setTitleInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [coordsInput, setCoordsInput] = useState('');
  const [cityInput, setCityInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [textFormOpen, setTextFormOpen] = useState(false);
  const [locationsCatalog, setLocationsCatalog] = useState<VenueCatalogCard[]>([]);
  const [venuesCatalog, setVenuesCatalog] = useState<VenueCatalogCard[]>([]);
  const [eventsCatalog, setEventsCatalog] = useState<PublicCatalogListItemDto[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [destinationsFallback, setDestinationsFallback] = useState<PublicDestinationDto[]>([]);
  const hydratedDayRef = useRef<string | null>(null);
  const skipUrlSyncRef = useRef(false);
  const titleFieldRef = useRef<HTMLInputElement | null>(null);
  const shareMenuRef = useRef<HTMLDivElement | null>(null);

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

  // Destinations for on-page city picker (prefer layout context).
  useEffect(() => {
    if (selectedCity?.destinations?.length) {
      setDestinationsFallback(selectedCity.destinations);
      return;
    }
    const controller = new AbortController();
    fetch('/api/public/destinations', { signal: controller.signal })
      .then(async (response) =>
        response.ok ? ((await response.json()) as { destinations?: PublicDestinationDto[] }) : null,
      )
      .then((data) => {
        if (data?.destinations?.length) setDestinationsFallback(data.destinations);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [selectedCity?.destinations]);

  // Prefill optional city from selected city (label only - never blocks add).
  useEffect(() => {
    if (cityInput.trim()) return;
    const label = selectedCity?.cityLabel;
    if (!label || label === 'Все города') return;
    setCityInput(label);
  }, [selectedCity?.cityLabel, cityInput]);

  // Share hydrate: prefer `?city=&items=` (viral); legacy `?day=` fallback.
  useEffect(() => {
    const itemTokens = parseDayRouteItemsParam(itemsParam);
    const legacyTokens = itemTokens.length ? [] : parseDayRouteQueryParam(dayParam);
    if (!itemTokens.length && !legacyTokens.length) {
      setReady(true);
      return;
    }

    const key = itemTokens.length
      ? `items:${cityParam || ''}|${itemsParam || ''}`
      : `day:${legacyTokens.join('|')}`;
    if (hydratedDayRef.current === key) {
      setReady(true);
      return;
    }

    const fromName = String(fromParam || '').trim() || null;
    setShareLanding({ active: true, fromName, saved: false });
    skipUrlSyncRef.current = true;

    if (itemTokens.length) {
      const textTokens = itemTokens.filter((t) => t.isText);
      const catalogLocators = catalogLocatorsFromItemTokens(itemTokens);

      if (textTokens.length && !catalogLocators.length) {
        const titles = textTokens.map((t) =>
          t.id.toLowerCase().startsWith('t:') ? t.id.slice(2) : t.id,
        );
        const next = hydrateTextStopsFromShareTokens(titles.map((t) => `t:${t}`));
        hydratedDayRef.current = key;
        setRoute(next);
        setReady(true);
        return;
      }

      if (!catalogLocators.length) {
        hydratedDayRef.current = key;
        setReady(true);
        return;
      }

      const controller = new AbortController();
      setLoading(true);
      fetch(`/api/day-route/matches?venueIds=${encodeURIComponent(catalogLocators.join(','))}`, {
        signal: controller.signal,
      })
        .then(async (response) => (response.ok ? ((await response.json()) as MatchPayload) : null))
        .then((data) => {
          const resolved: DayRouteVenueItem[] = (data?.venues || []).map((venue) => ({
            id: venue.id,
            slug: venue.slug,
            title: venue.title,
            city: venue.cityTitle,
            cityId: venue.cityId,
            citySlug: venue.citySlug ?? null,
            address: venue.address ?? null,
            imageUrl: venue.heroImageUrl,
            latitude: venue.latitude ?? null,
            longitude: venue.longitude ?? null,
            href: venue.slug
              ? venueHref({ id: venue.id, slug: venue.slug, name: venue.title, type: 'park' })
              : null,
          }));
          // Unresolved locators (event ids) become stub stops with eventId for ticket CTA.
          const known = new Set(
            resolved.flatMap((v) =>
              [v.id, v.slug, v.eventId, v.eventSlug].map((x) => String(x || '').trim()).filter(Boolean),
            ),
          );
          for (const token of itemTokens) {
            if (token.isText || known.has(token.id)) continue;
            resolved.push({
              id: token.id,
              slug: token.id,
              title: 'Событие из маршрута',
              eventId: token.id,
              ticketUrl: `/events/${encodeURIComponent(token.id)}`,
            });
          }
          const withMeta = applyItemTokensToVenues(resolved, itemTokens);
          hydratedDayRef.current = key;
          setRoute(hydrateDayRouteFromShare(withMeta, data?.cityId || null));
          if (data) setPayload(data);
          setReady(true);
          if (cityParam && selectedCity?.setCity) {
            // Best-effort city label from destinations by slug.
            const dest = destinationsFallback.find(
              (d) =>
                String(d.slug || '').trim() === cityParam ||
                String(d.sourceSlug || '').trim() === cityParam,
            );
            if (dest?.name) selectedCity.setCity(dest.name);
          }
        })
        .catch(() => {
          setReady(true);
        })
        .finally(() => setLoading(false));
      return () => controller.abort();
    }

    // Legacy ?day=
    const textTokens = legacyTokens.filter((token) => isDayRouteShareTextToken(token));
    const catalogTokens = legacyTokens.filter((token) => !isDayRouteShareTextToken(token));
    const catalogLocators = catalogLocatorsFromShareTokens(catalogTokens);

    if (textTokens.length) {
      setRoute(hydrateTextStopsFromShareTokens(textTokens));
    }

    if (!catalogLocators.length) {
      hydratedDayRef.current = key;
      setReady(true);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/day-route/matches?venueIds=${encodeURIComponent(catalogLocators.join(','))}`, {
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
          address: venue.address ?? null,
          imageUrl: venue.heroImageUrl,
          latitude: venue.latitude ?? null,
          longitude: venue.longitude ?? null,
          href: venue.slug
            ? venueHref({ id: venue.id, slug: venue.slug, name: venue.title, type: 'park' })
            : null,
        }));
        const withMeta = applyShareMetaToVenues(items, catalogTokens);
        hydratedDayRef.current = key;
        setRoute(hydrateDayRouteFromShare(withMeta, data.cityId));
        setPayload(data);
        setReady(true);
      })
      .catch(() => {
        setReady(true);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [itemsParam, cityParam, fromParam, dayParam, destinationsFallback]);

  // Close share menu on outside click.
  useEffect(() => {
    if (!shareMenuOpen) return;
    const onDoc = (event: MouseEvent) => {
      if (!shareMenuRef.current?.contains(event.target as Node)) setShareMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [shareMenuOpen]);

  const catalogVenueIds = useMemo(() => catalogDayRouteVenueIds(route.venues).join(','), [route.venues]);
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

  const mixedCities = useMemo(() => {
    // Prefer local title-aware check: catalog cityId + text-stop same city must not warn.
    // Fall back to API flag only when local points lack city labels entirely.
    if (dayRouteHasMixedCities(route.venues)) return true;
    const hasAnyCityLabel = route.venues.some(
      (v) => String(v.city || '').trim() || String(v.cityId || '').trim(),
    );
    if (hasAnyCityLabel) return false;
    return Boolean(payload?.multiCityWarning);
  }, [route.venues, payload?.multiCityWarning]);
  const belowMin = route.venues.length > 0 && route.venues.length < DAY_ROUTE_MIN;
  // Cap is always DAY_ROUTE_MAX (10). Never use DAY_ROUTE_MIN (2) as an add ceiling.
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

  const headerCityName =
    selectedCity?.cityValue && selectedCity.cityValue !== 'all' ? selectedCity.cityValue : null;
  const headerCitySlug =
    selectedCity?.selectedDestination?.type === 'city'
      ? String(selectedCity.selectedDestination.slug || '').trim() || null
      : null;
  const destinations = selectedCity?.destinations?.length
    ? selectedCity.destinations
    : destinationsFallback;
  const pageCityName = headerCityName;
  const pageCitySlug = headerCitySlug;
  const pageCityId = selectedCity?.selectedDestination?.id || null;
  const hasPageCity = Boolean(pageCityName);
  const scopeCityName = cityTitle || pageCityName;
  const scopeCitySlug = citySlug || pageCitySlug;
  const scopeCityParam = scopeCityName || scopeCitySlug;

  // Dynamic URL sync: /my-day?city=&items= while editing (skip during inbound hydrate).
  useEffect(() => {
    if (!ready || typeof window === 'undefined') return;
    if (skipUrlSyncRef.current) {
      skipUrlSyncRef.current = false;
      return;
    }
    const syncCity =
      pageCitySlug ||
      dayRouteDominantCitySlug(route.venues) ||
      String(cityParam || '').trim() ||
      null;
    const nextPath = buildDayRouteSharePath(route.venues, { citySlug: syncCity });
    const current = `${window.location.pathname}${window.location.search}`;
    if (current === nextPath) return;
    if (!route.venues.length && (itemsParam || dayParam)) return;
    if (!route.venues.length && !window.location.search) return;
    router.replace(nextPath, { scroll: false });
  }, [route.venues, ready, pageCitySlug, cityParam, itemsParam, dayParam, router]);

  const afishaHref = catalogHrefWithSelectedCity(scopeCityParam || 'all');
  const locationsHref = venueCatalogHrefWithSelectedCity('/locations', scopeCityParam);
  const venuesHref = venueCatalogHrefWithSelectedCity('/venues', scopeCityParam);
  const cityHubHref = scopeCitySlug ? `/cities/${encodeURIComponent(scopeCitySlug)}` : '/cities';

  // City-scoped catalog lists for on-page searchable selects.
  useEffect(() => {
    if (!pageCityName) {
      setLocationsCatalog([]);
      setVenuesCatalog([]);
      setEventsCatalog([]);
      setCatalogLoading(false);
      return;
    }
    const controller = new AbortController();
    setCatalogLoading(true);
    const cityQ = encodeURIComponent(pageCityName);
    Promise.all([
      fetch(`/api/public/venues?family=location&limit=500`, { signal: controller.signal })
        .then(async (response) =>
          response.ok ? ((await response.json()) as { venues?: VenueCatalogCard[] }) : null,
        )
        .catch(() => null),
      fetch(`/api/public/venues?family=institution&limit=500`, { signal: controller.signal })
        .then(async (response) =>
          response.ok ? ((await response.json()) as { venues?: VenueCatalogCard[] }) : null,
        )
        .catch(() => null),
      fetch(`/api/public/events?city=${cityQ}&limit=80&sort=popular`, { signal: controller.signal })
        .then(async (response) =>
          response.ok
            ? ((await response.json()) as { items?: PublicCatalogListItemDto[]; sessions?: PublicCatalogListItemDto[] })
            : null,
        )
        .catch(() => null),
    ])
      .then(([locationsPayload, venuesPayload, eventsPayload]) => {
        const filterCity = (list: VenueCatalogCard[] | undefined) =>
          (list || [])
            .map((item) => toVenueCatalogCard(item))
            .filter((item) => item.city === pageCityName);
        setLocationsCatalog(filterCity(locationsPayload?.venues));
        setVenuesCatalog(filterCity(venuesPayload?.venues));
        const events = eventsPayload?.items || eventsPayload?.sessions || [];
        setEventsCatalog(events.filter((item) => item.city === pageCityName || !pageCityName));
      })
      .finally(() => {
        if (!controller.signal.aborted) setCatalogLoading(false);
      });
    return () => controller.abort();
  }, [pageCityName]);

  const matchSources = useMemo(() => {
    const map = new Map<string, DayRouteVenueMatchSource>();
    for (const venue of [...locationsCatalog, ...venuesCatalog]) {
      const source = venueCardToMatchSource(venue);
      if (venue.id) map.set(venue.id, source);
      if (venue.slug) map.set(String(venue.slug), source);
    }
    return [...map.values()];
  }, [locationsCatalog, venuesCatalog]);

  const mustSeePlaces = useMemo(() => {
    const info = resolveCityInfo(pageCitySlug, selectedCity?.selectedDestination?.sourceSlug);
    return info?.mustSee || [];
  }, [pageCitySlug, selectedCity?.selectedDestination?.sourceSlug]);

  const mustSeeResolved = useMemo(() => {
    if (!pageCityName || !mustSeePlaces.length) return [];
    const cityCtx = {
      id: pageCityId,
      name: pageCityName,
      slug: pageCitySlug,
      sourceSlug: selectedCity?.selectedDestination?.sourceSlug || null,
    };
    return mustSeePlaces
      .map((place) => {
        const item = dayRouteItemFromMustSee(place, matchSources, cityCtx);
        return item ? { place, item } : null;
      })
      .filter((row): row is { place: (typeof mustSeePlaces)[number]; item: DayRouteVenueItem } =>
        Boolean(row),
      );
  }, [mustSeePlaces, matchSources, pageCityId, pageCityName, pageCitySlug, selectedCity?.selectedDestination?.sourceSlug]);

  const mustSeeAddable = useMemo(() => {
    return mustSeeResolved.filter(
      ({ item }) => !isInDayRoute(item.id, route) && !(item.slug && isInDayRoute(item.slug, route)),
    );
  }, [mustSeeResolved, route]);

  const locationOptions = useMemo<DayRouteSearchOption[]>(() => {
    return locationsCatalog.map((venue) => {
      const inRoute = isInDayRoute(venue.id, route) || Boolean(venue.slug && isInDayRoute(venue.slug, route));
      return {
        id: venue.id,
        label: venue.name,
        hint: venue.address || venue.city,
        disabled: inRoute || atMax,
        disabledReason: inRoute ? 'Уже в маршруте' : atMax ? `Лимит ${DAY_ROUTE_MAX}` : null,
      };
    });
  }, [locationsCatalog, route, atMax]);

  const venueOptions = useMemo<DayRouteSearchOption[]>(() => {
    return venuesCatalog.map((venue) => {
      const inRoute = isInDayRoute(venue.id, route) || Boolean(venue.slug && isInDayRoute(venue.slug, route));
      return {
        id: venue.id,
        label: venue.name,
        hint: venue.address || venue.city,
        disabled: inRoute || atMax,
        disabledReason: inRoute ? 'Уже в маршруте' : atMax ? `Лимит ${DAY_ROUTE_MAX}` : null,
      };
    });
  }, [venuesCatalog, route, atMax]);

  const eventOptions = useMemo<DayRouteSearchOption[]>(() => {
    return eventsCatalog.map((event) => {
      const sessionHint = [event.dateLabel, event.timeLabel].filter(Boolean).join(', ');
      const venueHint = [event.venue, sessionHint].filter(Boolean).join(' · ');
      const venueKey = String(event.venueSlug || event.venue || event.id).trim();
      const inRoute = Boolean(
        (event.venueSlug && isInDayRoute(event.venueSlug, route)) ||
          (event.venue &&
            route.venues.some((v) => v.title.trim().toLowerCase() === String(event.venue).trim().toLowerCase())),
      );
      return {
        id: `event:${event.id}`,
        label: event.title,
        hint: venueHint || null,
        disabled: inRoute || atMax || !venueKey,
        disabledReason: !venueKey
          ? 'Нет площадки'
          : inRoute
            ? 'Уже в маршруте'
            : atMax
              ? `Лимит ${DAY_ROUTE_MAX}`
              : null,
      };
    });
  }, [eventsCatalog, route, atMax]);

  function pickLocationById(id: string) {
    const venue = locationsCatalog.find((item) => item.id === id);
    if (!venue) return;
    setRoute(appendDayRouteItem(venueCardToDayRouteItem(venue)));
  }

  function pickVenueById(id: string) {
    const venue = venuesCatalog.find((item) => item.id === id);
    if (!venue) return;
    setRoute(appendDayRouteItem(venueCardToDayRouteItem(venue)));
  }

  function pickEventById(optionId: string) {
    const eventId = optionId.replace(/^event:/, '');
    const event = eventsCatalog.find((item) => item.id === eventId);
    if (!event) return;
    const matchedVenue =
      venuesCatalog.find((v) => v.slug && v.slug === event.venueSlug) ||
      locationsCatalog.find((v) => v.slug && v.slug === event.venueSlug) ||
      venuesCatalog.find((v) => v.name === event.venue) ||
      locationsCatalog.find((v) => v.name === event.venue) ||
      null;
    const item = dayRouteItemFromEvent({
      id: event.id,
      slug: event.slug,
      title: event.title,
      city: event.city,
      cityId: pageCityId,
      citySlug: pageCitySlug || event.citySlug,
      venueId: matchedVenue?.id || null,
      venueSlug: event.venueSlug || matchedVenue?.slug || null,
      venue: event.venue || matchedVenue?.name || null,
      venueKind: event.venueKind || matchedVenue?.type || null,
      venueAddress: matchedVenue?.address || null,
      venueLatitude: matchedVenue?.latitude ?? null,
      venueLongitude: matchedVenue?.longitude ?? null,
      startsAt: event.startsAt,
      dateLabel: event.dateLabel,
      timeLabel: event.timeLabel,
      imageUrl: event.imageUrl || matchedVenue?.heroImageUrl || null,
    });
    setRoute(appendDayRouteItem(item));
  }

  function addMustSeeItem(item: DayRouteVenueItem) {
    setRoute(appendDayRouteItem(item));
  }

  function addAllMustSee() {
    if (!mustSeeAddable.length || atMax) {
      flashDayRouteFeedback(atMax ? `Лимит ${DAY_ROUTE_MAX} точек` : 'Нет главных мест для добавления');
      return;
    }
    const cityCtx = {
      id: pageCityId,
      name: pageCityName,
      slug: pageCitySlug,
      sourceSlug: selectedCity?.selectedDestination?.sourceSlug || null,
    };
    const preset = buildCityDayRoutePreset(
      mustSeePlaces,
      matchSources,
      cityCtx,
      DAY_ROUTE_MAX,
    );
    let next = readDayRouteFresh();
    let added = 0;
    for (const item of preset) {
      if (next.venues.length >= DAY_ROUTE_MAX) break;
      if (isInDayRoute(item.id, next) || (item.slug && isInDayRoute(item.slug, next))) continue;
      next = addToDayRoute(item);
      added += 1;
    }
    setRoute(next);
    flashDayRouteFeedback(
      added
        ? `Добавлено главных мест: ${added} · ${next.venues.length}/${DAY_ROUTE_MAX}`
        : 'Главные места уже в маршруте',
    );
  }

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
  const totalDistanceMeters = useMemo(
    () => dayRouteTotalDistanceMeters(segmentMeters),
    [segmentMeters],
  );
  const travelMinutes = useMemo(
    () => estimateDayRouteTravelMinutes(totalDistanceMeters, travelMode),
    [totalDistanceMeters, travelMode],
  );
  const printDateLabel = useMemo(() => {
    for (const venue of route.venues) {
      const raw = String(venue.startsAt || '').trim();
      if (!raw) continue;
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) continue;
      try {
        return new Intl.DateTimeFormat('ru-RU', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }).format(d);
      } catch {
        return d.toLocaleDateString('ru-RU');
      }
    }
    return null;
  }, [route.venues]);
  const canOptimize = coordsCount >= 2;
  const hasCatalogStops = Boolean(catalogVenueIds);
  const showMatches = hasCatalogStops;

  useEffect(() => {
    if (!ready) return;
    if (!catalogVenueIds) {
      setPayload(null);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/day-route/matches?venueIds=${encodeURIComponent(catalogVenueIds)}`, {
      signal: controller.signal,
    })
      .then(async (response) => (response.ok ? ((await response.json()) as MatchPayload) : null))
      .then((data) => {
        if (!data) return;
        setPayload(data);
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
  }, [catalogVenueIds, ready]);

  function submitTextStop(event: FormEvent) {
    event.preventDefault();
    const title = titleInput.trim();
    if (!title) {
      setFormError('Введите название места');
      titleFieldRef.current?.focus();
      return;
    }
    // Fresh LS length - never gate on DAY_ROUTE_MIN or a stale React snapshot.
    const before = readDayRouteFresh().venues.length;
    if (before >= DAY_ROUTE_MAX) {
      setFormError(`Лимит ${DAY_ROUTE_MAX} точек`);
      setRoute(readDayRouteFresh());
      return;
    }
    setFormError(null);
    const next = addTextStopToDayRoute({
      title,
      note: noteInput,
      city: cityInput,
      coordsText: coordsInput,
    });
    setRoute(next);
    if (next.venues.length <= before) {
      setFormError(
        next.venues.length >= DAY_ROUTE_MAX
          ? `Лимит ${DAY_ROUTE_MAX} точек`
          : 'Не удалось добавить точку. Попробуйте ещё раз',
      );
      titleFieldRef.current?.focus();
      return;
    }
    setTitleInput('');
    setNoteInput('');
    setCoordsInput('');
    titleFieldRef.current?.focus();
  }

  async function copyShareLink() {
    if (!route.venues.length || typeof window === 'undefined') return;
    const path = buildDayRouteSharePath(route.venues, {
      citySlug: scopeCitySlug || pageCitySlug || cityParam,
    });
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopyStatus('ok');
      setShareMenuOpen(false);
    } catch {
      setCopyStatus('err');
    }
    window.setTimeout(() => setCopyStatus('idle'), 2200);
  }

  function getSharePayload() {
    const path = buildDayRouteSharePath(route.venues, {
      citySlug: scopeCitySlug || pageCitySlug || cityParam,
    });
    const shareUrl =
      typeof window !== 'undefined' ? `${window.location.origin}${path}` : path;
    const text = buildDayRouteShareMessage({
      cityTitle: scopeCityName || cityTitle,
      shareUrl,
      venues: route.venues,
    });
    return { shareUrl, text, path };
  }

  function openMessengerShare(kind: 'telegram' | 'whatsapp' | 'max') {
    if (!route.venues.length || typeof window === 'undefined') return;
    const { shareUrl, text } = getSharePayload();
    let href = '';
    if (kind === 'telegram') href = buildTelegramShareUrl(text, shareUrl);
    else if (kind === 'whatsapp') href = buildWhatsAppShareUrl(text);
    else href = buildMaxShareUrl(text);
    setShareMenuOpen(false);
    window.open(href, '_blank', 'noopener,noreferrer');
  }

  function saveSharedRoute() {
    setRoute(readDayRouteFresh());
    setShareLanding((prev) => ({ ...prev, saved: true, active: true }));
    flashDayRouteFeedback('Маршрут сохранён - можете менять под себя');
    const path = buildDayRouteSharePath(route.venues, {
      citySlug: scopeCitySlug || pageCitySlug || cityParam,
    });
    router.replace(path, { scroll: false });
  }

  function printItinerary() {
    if (typeof window === 'undefined') return;
    const prevTitle = document.title;
    const city = scopeCityName || 'маршрут';
    document.title = `Маршрутный лист - ${city}`;
    window.print();
    window.setTimeout(() => {
      document.title = prevTitle;
    }, 500);
  }

  function onStopDragStart(index: number) {
    setDragIndex(index);
  }

  function onStopDragOver(event: DragEvent, index: number) {
    event.preventDefault();
    if (dragIndex == null || dragIndex === index) return;
  }

  function onStopDrop(index: number) {
    if (dragIndex == null || dragIndex === index) {
      setDragIndex(null);
      return;
    }
    const ids = route.venues.map((v) => v.id);
    const [moved] = ids.splice(dragIndex, 1);
    if (!moved) {
      setDragIndex(null);
      return;
    }
    ids.splice(index, 0, moved);
    setRoute(reorderDayRoute(ids));
    setDragIndex(null);
  }

  function onStopDragEnd() {
    setDragIndex(null);
  }

  function optimizeOrder() {
    if (!canOptimize) return;
    const nextVenues = optimizeDayRouteNearestNeighbor(route.venues, coordsById);
    setRoute(reorderDayRoute(nextVenues.map((venue) => venue.id)));
  }

  function openTextForm() {
    setTextFormOpen(true);
    window.setTimeout(() => {
      document.getElementById('day-plan-form-wrap')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      titleFieldRef.current?.focus();
    }, 80);
  }

  return (
    <>
    <div className="container-page px-4 py-5 pb-28 sm:px-6 sm:py-10 sm:pb-10 print:hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Собери свой день</p>
          <h1 className="mt-1 font-display text-2xl font-extrabold text-slate-900 sm:text-3xl">Мой день</h1>
          <p className="mt-2 text-xs font-semibold text-slate-500" data-day-route-count-label>
            Точки · {route.venues.length}/{DAY_ROUTE_MAX}
          </p>
        </div>
        {route.venues.length ? (
          <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
            <div className="relative flex-1 sm:flex-none" ref={shareMenuRef}>
              <button
                type="button"
                onClick={() => setShareMenuOpen((open) => !open)}
                data-day-share
                aria-expanded={shareMenuOpen}
                className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-100"
              >
                <Copy className="h-3.5 w-3.5" />
                {copyStatus === 'ok' ? 'Ссылка скопирована!' : 'Поделиться'}
              </button>
              {shareMenuOpen ? (
                <div
                  role="menu"
                  data-day-share-menu
                  className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 shadow-lg"
                >
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-slate-800 hover:bg-emerald-50"
                    onClick={() => {
                      void copyShareLink();
                    }}
                  >
                    <Copy className="h-4 w-4 text-emerald-700" />
                    Скопировать ссылку
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-slate-800 hover:bg-sky-50"
                    onClick={() => openMessengerShare('telegram')}
                  >
                    <ExternalLink className="h-4 w-4 text-sky-600" />
                    Telegram
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-slate-800 hover:bg-emerald-50"
                    onClick={() => openMessengerShare('whatsapp')}
                  >
                    <ExternalLink className="h-4 w-4 text-emerald-600" />
                    WhatsApp
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    data-day-share-max
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-slate-800 hover:bg-violet-50"
                    onClick={() => openMessengerShare('max')}
                  >
                    <ExternalLink className="h-4 w-4 text-violet-600" />
                    Макс
                  </button>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={printItinerary}
              data-day-print
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:flex-none"
            >
              <Printer className="h-3.5 w-3.5" />
              Сохранить маршрутный лист
            </button>
            <button
              type="button"
              onClick={() => {
                clearDayRoute();
                setRoute(readDayRoute());
                setShareLanding({ active: false, fromName: null, saved: false });
                router.replace('/my-day', { scroll: false });
              }}
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 sm:flex-none"
            >
              <Trash2 className="h-3.5 w-3.5" /> Очистить
            </button>
          </div>
        ) : null}
      </div>

      {shareLanding.active && route.venues.length ? (
        <div
          role="status"
          data-day-share-landing
          className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3"
        >
          <p className="text-sm font-semibold text-violet-950">
            {shareLanding.fromName
              ? `${shareLanding.fromName} поделился планом на день!`
              : 'Вам поделились планом на день!'}
          </p>
          <p className="mt-1 text-sm text-violet-900">
            Можете присоединиться или изменить маршрут под себя.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              data-day-share-save
              onClick={saveSharedRoute}
              className="inline-flex min-h-10 items-center justify-center rounded-full bg-violet-700 px-4 py-2 text-xs font-bold text-white hover:bg-violet-800"
            >
              {shareLanding.saved ? 'Сохранено' : 'Сохранить себе'}
            </button>
            <button
              type="button"
              onClick={() => {
                saveSharedRoute();
                setShareLanding((prev) => ({ ...prev, active: false }));
              }}
              className="inline-flex min-h-10 items-center justify-center rounded-full border border-violet-300 bg-white px-4 py-2 text-xs font-semibold text-violet-900 hover:bg-violet-100"
            >
              Повторить маршрут
            </button>
          </div>
        </div>
      ) : null}

      {copyStatus === 'ok' ? (
        <p
          role="status"
          className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900"
          data-day-share-ok
        >
          Ссылка скопирована!
        </p>
      ) : null}

      {/* Primary: on-page city + searchable catalog picks (owner UX 2026-08-02) */}
      <section
        id="day-catalog-add"
        className="mt-5 rounded-2xl border border-slate-200 bg-white p-3.5 sm:mt-8 sm:p-5"
        data-day-catalog-add="1"
      >
        <p className="text-sm font-semibold text-slate-900">Добавить в день</p>

        <div className="mt-3 max-w-md" data-day-city-picker>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Город
          </label>
          <CityPicker
            cities={destinations}
            value={selectedCity?.cityValue || 'all'}
            onChange={(name) => {
              selectedCity?.setCity(name);
              if (name !== 'all') setCityInput(name);
            }}
            allLabel="Выберите город"
            variant="hero"
            className="w-full"
          />
        </div>

        {!hasPageCity ? (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Сначала выберите город - появятся локации, площадки, события и главные места.
          </p>
        ) : (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <DayRouteSearchSelect
                label="Локации"
                placeholder="Найти локацию…"
                emptyText={catalogLoading ? 'Загружаем…' : 'Нет локаций в этом городе'}
                loading={catalogLoading}
                disabled={atMax}
                options={locationOptions}
                onPick={(option) => pickLocationById(option.id)}
              />
              <DayRouteSearchSelect
                label="Площадки"
                placeholder="Найти площадку…"
                emptyText={catalogLoading ? 'Загружаем…' : 'Нет площадок в этом городе'}
                loading={catalogLoading}
                disabled={atMax}
                options={venueOptions}
                onPick={(option) => pickVenueById(option.id)}
              />
              <DayRouteSearchSelect
                label="События"
                placeholder="Найти событие…"
                emptyText={catalogLoading ? 'Загружаем…' : 'Нет событий в этом городе'}
                loading={catalogLoading}
                disabled={atMax}
                options={eventOptions}
                onPick={(option) => pickEventById(option.id)}
              />
            </div>

            {mustSeeResolved.length > 0 ? (
              <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3 sm:p-4" data-day-must-see>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Главные места города</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Нажмите на место или добавьте все сразу (до {DAY_ROUTE_MAX}).
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={atMax || mustSeeAddable.length === 0}
                    onClick={addAllMustSee}
                    data-day-must-see-bulk
                    className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-primary-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Добавить главные места
                    {mustSeeAddable.length ? ` (${Math.min(mustSeeAddable.length, DAY_ROUTE_MAX - route.venues.length)})` : ''}
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {mustSeeResolved.map(({ place, item }) => {
                    const inRoute =
                      isInDayRoute(item.id, route) || Boolean(item.slug && isInDayRoute(item.slug, route));
                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={inRoute || atMax}
                        title={inRoute ? 'Уже в маршруте' : atMax ? `Лимит ${DAY_ROUTE_MAX}` : 'Добавить в день'}
                        onClick={() => addMustSeeItem(item)}
                        className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed ${
                          inRoute
                            ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                            : 'border-slate-200 bg-white text-slate-800 hover:border-emerald-300 hover:bg-emerald-50'
                        }`}
                      >
                        {inRoute ? (
                          <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
                        ) : (
                          <MapPin className="h-3.5 w-3.5 shrink-0 opacity-70" />
                        )}
                        <span className="truncate">{place.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : pageCitySlug && !catalogLoading ? (
              <p className="mt-3 text-xs text-slate-500">
                Для этого города пока нет списка главных мест - добавьте точки через поиск выше.
              </p>
            ) : null}
          </>
        )}

        <p className="mt-3 text-xs text-slate-500">
          Каталог целиком:{' '}
          <Link href={locationsHref} className="font-semibold text-slate-700 underline-offset-2 hover:underline">
            локации
          </Link>
          {' · '}
          <Link href={venuesHref} className="font-semibold text-slate-700 underline-offset-2 hover:underline">
            площадки
          </Link>
          {' · '}
          <Link href={afishaHref} className="font-semibold text-slate-700 underline-offset-2 hover:underline">
            события
          </Link>
          {scopeCitySlug ? (
            <>
              {' · '}
              <Link href={cityHubHref} className="font-semibold text-slate-700 underline-offset-2 hover:underline">
                хаб города
              </Link>
            </>
          ) : null}
        </p>
      </section>

      {!route.venues.length ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center sm:p-10">
          <Route className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-3 text-base font-semibold text-slate-800">Пока нет точек</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
            Выберите город выше и добавьте локации, площадки или события. Минимум {DAY_ROUTE_MIN} точки,
            чтобы день сложился. Своё место - по желанию внизу страницы.
          </p>
        </div>
      ) : (
        <>
          {mixedCities ? (
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Точки из разных городов. Для подбора экскурсий лучше оставить один город.
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

          <section className="mt-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500" data-day-route-count-heading>
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
                  ? `У ${missingCoordsCount} ${missingCoordsCount === 1 ? 'точки' : 'точек'} нет координат - Яндекс.Карты пока недоступны. Добавьте места из каталога или укажите lat, lng в «своём месте».`
                  : `Без координат: ${missingCoordsCount}. В Яндекс уйдут только ${coordsCount} точки с координатами (в текущем порядке).`}
              </p>
            ) : null}
            {totalDistanceMeters > 0 ? (
              <div
                className="mt-3 flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                data-day-distance-summary
              >
                <p className="text-sm text-slate-700">
                  Сумма сегментов:{' '}
                  <span className="font-semibold text-slate-900">
                    {formatDayRouteDistance(totalDistanceMeters)}
                  </span>
                  {travelMinutes > 0 ? (
                    <>
                      {' '}
                      · около{' '}
                      <span className="font-semibold text-slate-900">
                        {formatDayRouteTravelMinutes(travelMinutes)}
                      </span>
                    </>
                  ) : null}
                </p>
                <div className="flex gap-1" role="group" aria-label="Способ перемещения">
                  <button
                    type="button"
                    onClick={() => setTravelMode('walk')}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                      travelMode === 'walk'
                        ? 'bg-slate-900 text-white'
                        : 'border border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    Пешком
                  </button>
                  <button
                    type="button"
                    onClick={() => setTravelMode('auto')}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                      travelMode === 'auto'
                        ? 'bg-slate-900 text-white'
                        : 'border border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    Авто
                  </button>
                </div>
              </div>
            ) : null}
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-day-plan-list>
              {route.venues.map((venue, index) => (
                <DayRouteVenueCard
                  key={venue.id}
                  index={index}
                  total={route.venues.length}
                  venue={venue}
                  hasCoords={Boolean(lookupDayRouteCoords(venue, coordsById))}
                  segmentToNext={segmentMeters[index] ?? null}
                  travelMode={travelMode}
                  dragging={dragIndex === index}
                  onDragStart={() => onStopDragStart(index)}
                  onDragOver={(event) => onStopDragOver(event, index)}
                  onDrop={() => onStopDrop(index)}
                  onDragEnd={onStopDragEnd}
                  onMoveUp={() => setRoute(moveDayRouteVenue(venue.id, -1))}
                  onMoveDown={() => setRoute(moveDayRouteVenue(venue.id, 1))}
                  onRemove={() => setRoute(removeFromDayRoute(venue.id))}
                  onToggleBought={() =>
                    setRoute(
                      updateDayRouteVenue(venue.id, { ticketBought: !venue.ticketBought }),
                    )
                  }
                />
              ))}
            </ul>
          </section>

          {showMatches ? (
            <section id="day-route-matches" className="mt-8 sm:mt-10">
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
              <ul className="mt-3 grid grid-cols-1 items-start gap-3 md:grid-cols-2">
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
          ) : null}
        </>
      )}

      {/* Secondary: optional text stop - collapsed accordion */}
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white sm:mt-10" id="day-plan-form-wrap">
        <button
          type="button"
          aria-expanded={textFormOpen}
          aria-controls="day-plan-form"
          data-day-plan-accordion
          onClick={() => {
            setTextFormOpen((open) => {
              const next = !open;
              if (next) {
                window.setTimeout(() => titleFieldRef.current?.focus(), 50);
              }
              return next;
            });
          }}
          className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left sm:px-5"
        >
          <span>
            <span className="block text-sm font-semibold text-slate-900">Добавить своё место</span>
            <span className="mt-0.5 block text-xs text-slate-500">
              Необязательно - если места нет в каталоге
            </span>
          </span>
          <ChevronDown
            className={`h-5 w-5 shrink-0 text-slate-400 transition ${textFormOpen ? 'rotate-180' : ''}`}
          />
        </button>
        {textFormOpen ? (
          <form
            onSubmit={submitTextStop}
            className="border-t border-slate-100 px-4 pb-4 pt-3 sm:px-5 sm:pb-5"
            data-day-plan-form="1"
            id="day-plan-form"
          >
            <p className="text-sm leading-relaxed text-slate-600">
              Введите название. Адрес, город и координаты - по желанию.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <label className="min-w-0 flex-1">
                <span className="sr-only">Название места</span>
                <input
                  ref={titleFieldRef}
                  type="text"
                  name="title"
                  value={titleInput}
                  onChange={(e) => {
                    setTitleInput(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  placeholder="Например: Эрмитаж"
                  autoComplete="off"
                  disabled={atMax}
                  data-day-plan-title
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-emerald-500/30 placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 disabled:bg-slate-50"
                />
              </label>
              <button
                type="submit"
                disabled={atMax}
                data-day-plan-add
                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-600 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <Plus className="h-4 w-4" />
                Добавить
              </button>
            </div>
            <label className="mt-2 block">
              <span className="sr-only">Адрес или заметка</span>
              <input
                type="text"
                name="note"
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Адрес или заметка (необязательно)"
                autoComplete="off"
                disabled={atMax}
                data-day-plan-note
                className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-emerald-500/30 placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 disabled:bg-slate-50"
              />
            </label>
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="mt-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              {showAdvanced ? 'Скрыть город и координаты' : 'Город и координаты (необязательно)'}
            </button>
            {showAdvanced ? (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Город
                  </span>
                  <input
                    type="text"
                    name="city"
                    value={cityInput}
                    onChange={(e) => setCityInput(e.target.value)}
                    placeholder="Город (необязательно)"
                    autoComplete="off"
                    disabled={atMax}
                    data-day-plan-city
                    className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30 disabled:bg-slate-50"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Координаты
                  </span>
                  <input
                    type="text"
                    name="coords"
                    value={coordsInput}
                    onChange={(e) => setCoordsInput(e.target.value)}
                    placeholder="59.93, 30.31"
                    autoComplete="off"
                    disabled={atMax}
                    data-day-plan-coords
                    className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30 disabled:bg-slate-50"
                  />
                </label>
              </div>
            ) : null}
            {formError ? (
              <p role="alert" className="mt-2 text-sm font-medium text-rose-700">
                {formError}
              </p>
            ) : null}
          </form>
        ) : null}
      </div>

      <MobileStickyActionBar>
        {route.venues.length ? (
          <button
            type="button"
            onClick={printItinerary}
            data-day-print-sticky
            className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800"
          >
            <Printer className="h-4 w-4" />
            Лист
          </button>
        ) : null}
        {route.venues.length ? (
          <button
            type="button"
            onClick={() => setShareMenuOpen(true)}
            data-day-share-sticky
            className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 text-sm font-bold text-emerald-900"
          >
            <Copy className="h-4 w-4" />
            Поделиться
          </button>
        ) : null}
        {!atMax ? (
          <a
            href="#day-catalog-add"
            className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-slate-900 px-4 text-sm font-bold text-white hover:bg-primary-600"
          >
            <Plus className="h-4 w-4" />
            Добавить
          </a>
        ) : null}
        {!atMax && !route.venues.length ? (
          <button
            type="button"
            onClick={openTextForm}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" />
            Своё
          </button>
        ) : null}
        {yandexUrl ? (
          <a
            href={yandexUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-sky-600 px-4 text-sm font-bold text-white hover:bg-sky-700"
          >
            <ExternalLink className="h-4 w-4" />
            Карты
          </a>
        ) : null}
      </MobileStickyActionBar>
    </div>
    {route.venues.length ? (
      <DayRoutePrintSheet
        cityTitle={scopeCityName}
        dateLabel={printDateLabel}
        venues={route.venues}
        segmentMeters={segmentMeters}
        travelMode={travelMode}
        totalDistanceMeters={totalDistanceMeters}
        travelMinutes={travelMinutes}
      />
    ) : null}
    </>
  );
}

function DayRouteVenueCard({
  venue,
  index,
  total,
  hasCoords,
  segmentToNext,
  travelMode,
  dragging,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onMoveUp,
  onMoveDown,
  onRemove,
  onToggleBought,
}: {
  venue: DayRouteVenueItem;
  index: number;
  total: number;
  hasCoords: boolean;
  segmentToNext: number | null;
  travelMode: DayRouteTravelMode;
  dragging?: boolean;
  onDragStart: () => void;
  onDragOver: (event: DragEvent) => void;
  onDrop: () => void;
  onDragEnd: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onToggleBought: () => void;
}) {
  const textStop = isTextDayRouteStop(venue);
  const href =
    venue.href ||
    (!textStop && venue.slug
      ? venueHref({ id: venue.id, slug: venue.slug, name: venue.title, type: 'park' })
      : null);
  const ticketUrl = resolveDayRouteTicketUrl(venue);
  const bought = Boolean(venue.ticketBought);
  const addressLine =
    formatStreetAddress(venue.address, { city: venue.city }) || String(venue.address || '').trim() || '';
  const titleNorm = venue.title.toLowerCase().replace(/\s+/g, ' ');
  const addrNorm = addressLine.toLowerCase().replace(/\s+/g, ' ');
  const addressRedundant =
    Boolean(addressLine) &&
    (titleNorm.includes(addrNorm) ||
      (addrNorm.length >= 8 && titleNorm.includes(addrNorm.replace(/^набережная\s+/i, 'наб. '))));
  const segmentHint =
    segmentToNext != null ? formatDayRouteSegmentHint(segmentToNext, travelMode) : '';
  return (
    <li
      className={`flex flex-col gap-2 rounded-2xl border p-3 ${
        bought
          ? 'border-emerald-400 bg-emerald-50'
          : 'border-slate-200 bg-white'
      } ${dragging ? 'opacity-60 ring-2 ring-emerald-300' : ''}`}
      data-day-plan-stop={venue.id}
      data-ticket-bought={bought ? '1' : '0'}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-14 w-8 shrink-0 flex-col items-center justify-center gap-1">
          <span
            className="inline-flex cursor-grab items-center justify-center text-slate-400 active:cursor-grabbing"
            title="Перетащите"
            aria-hidden
          >
            <GripVertical className="h-4 w-4" />
          </span>
          <span
            className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ${
              bought ? 'bg-emerald-600' : 'bg-slate-900'
            }`}
          >
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
          {href ? (
            <Link href={href} className="line-clamp-2 text-sm font-semibold text-slate-900 hover:text-primary-700">
              {venue.title}
            </Link>
          ) : (
            <p className="line-clamp-2 text-sm font-semibold text-slate-900">{venue.title}</p>
          )}
          {venue.note ? <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{venue.note}</p> : null}
          {addressLine && !addressRedundant ? (
            <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{addressLine}</p>
          ) : null}
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
      {ticketUrl ? (
        <div className="flex flex-wrap items-center gap-2 pl-11">
          <a
            href={ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-day-buy-ticket
            className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full bg-amber-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-600"
          >
            <Ticket className="h-3.5 w-3.5" />
            {venue.sessionLabel ? 'Купить билет на это же время' : 'Купить билет'}
          </a>
          <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={bought}
              onChange={onToggleBought}
              data-day-ticket-bought
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            Билет куплен
          </label>
        </div>
      ) : null}
      {segmentHint ? <p className="pl-11 text-[11px] text-slate-500">далее ~ {segmentHint}</p> : null}
    </li>
  );
}

function DayRoutePrintSheet({
  cityTitle,
  dateLabel,
  venues,
  segmentMeters,
  travelMode,
  totalDistanceMeters,
  travelMinutes,
}: {
  cityTitle?: string | null;
  dateLabel?: string | null;
  venues: DayRouteVenueItem[];
  segmentMeters: Array<number | null>;
  travelMode: DayRouteTravelMode;
  totalDistanceMeters: number;
  travelMinutes: number;
}) {
  const modeLabel = travelMode === 'auto' ? 'на авто' : 'пешком';
  const city = String(cityTitle || '').trim() || 'Город не указан';
  return (
    <div
      data-day-print-sheet
      className="hidden print:block"
      aria-hidden
    >
      <div className="mx-auto max-w-2xl px-2 text-slate-900">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Дайбилет · план на день</p>
        <h1 className="mt-1 text-2xl font-bold leading-tight">Маршрутный лист - {city}</h1>
        {dateLabel ? <p className="mt-1 text-sm text-slate-600">{dateLabel}</p> : null}
        {totalDistanceMeters > 0 ? (
          <p className="mt-2 text-sm text-slate-700">
            Всего между точками: {formatDayRouteDistance(totalDistanceMeters)}
            {travelMinutes > 0 ? ` · ~${formatDayRouteTravelMinutes(travelMinutes)} ${modeLabel}` : ''}
          </p>
        ) : null}
        <ol className="mt-6 list-none space-y-0 p-0">
          {venues.map((venue, index) => {
            const addressLine =
              formatStreetAddress(venue.address, { city: venue.city }) ||
              String(venue.address || '').trim() ||
              '';
            const note = String(venue.note || '').trim();
            const segment = segmentMeters[index] ?? null;
            const segmentHint =
              segment != null ? formatDayRouteSegmentHint(segment, travelMode) : '';
            const bought = Boolean(venue.ticketBought);
            return (
              <li key={venue.id} className="break-inside-avoid">
                <div className="flex gap-3 border-b border-slate-200 py-3">
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-900 text-sm font-bold">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold leading-snug">{venue.title}</p>
                    {addressLine ? <p className="mt-0.5 text-sm text-slate-600">{addressLine}</p> : null}
                    {note && note !== addressLine ? (
                      <p className="mt-0.5 text-sm text-slate-600">{note}</p>
                    ) : null}
                    {venue.sessionLabel ? (
                      <p className="mt-1 text-sm font-medium text-slate-800">Время: {venue.sessionLabel}</p>
                    ) : null}
                    {bought ? (
                      <p className="mt-1 text-sm font-semibold text-emerald-800">Билет куплен</p>
                    ) : null}
                  </div>
                </div>
                {segmentHint && index < venues.length - 1 ? (
                  <p className="py-2 pl-10 text-sm text-slate-500">↓ {segmentHint}</p>
                ) : null}
              </li>
            );
          })}
        </ol>
        <p className="mt-8 text-xs text-slate-400">daibilet.ru/my-day</p>
      </div>
    </div>
  );
}
