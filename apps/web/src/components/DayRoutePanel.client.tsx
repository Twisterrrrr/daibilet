'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  MapPin,
  Maximize2,
  Minimize2,
  Navigation,
  Plus,
  Printer,
  Route,
  Share2,
  Sparkles,
  Ticket,
  Trash2,
  X,
} from 'lucide-react';
import {
  FormEvent,
  Fragment,
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import type { PublicCatalogListItemDto, PublicDestinationDto } from '@daibilet/contracts/public';

import { IMAGE_SIZES, SafeImage } from '@/components/SafeImage.client';
import { AddToDayRouteButton } from '@/components/AddToDayRouteButton.client';
import { CityPicker } from '@/components/CityPicker.client';
import { DayRouteBoatWizard } from '@/components/DayRouteBoatWizard.client';
import { DayRouteOsmMap } from '@/components/DayRouteOsmMap.client';
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
  DAY_ROUTE_SOFT,
  DAY_ROUTE_SOFT_WARN,
  addTextStopToDayRoute,
  addToDayRoute,
  applyItemTokensToVenues,
  applyShareMetaToVenues,
  buildDayRouteCoordsMap,
  buildDayRouteShareMessage,
  buildDayRouteSharePath,
  createDayRouteShortShare,
  buildMaxShareUrl,
  buildTelegramShareUrl,
  buildWhatsAppShareUrl,
  buildYandexMultiStopRouteUrl,
  catalogDayRouteVenueIds,
  catalogLocatorsFromItemTokens,
  catalogLocatorsFromShareTokens,
  clearDayRoute,
  dayRouteAddSuccessMessage,
  dayRouteDominantCitySlug,
  dayRouteHardLimitMessage,

  dayRouteFullCoveredCount,
  dayRouteHasMixedCities,
  dayRouteSegmentMeters,
  dayRouteTotalDistanceMeters,
  DAY_ROUTE_EVENT_STUB_TITLE,
  DAY_ROUTE_MAX,
  DAY_ROUTE_PLACE_STUB_TITLE,
  enrichDayRouteFromMatchVenues,
  estimateDayRouteTravelMinutes,
  formatDayRouteStopsHeading,
  formatDayRouteDistance,
  formatDayRouteSegmentHint,
  formatDayRouteSessionDisplay,
  formatDayRouteTravelMinutes,
  hydrateTextStopsFromShareTokens,
  isDayRouteAtSoft,
  isDayRoutePlaceholderTitle,
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
  writeDayRoute,
  type DayRouteState,
  type DayRouteTravelMode,
  type DayRouteVenueItem,
} from '@/lib/day-route';
import { lookupEditorialPlaceCoords } from '@/lib/city-place-coords';
import {
  buildCityDayRoutePreset,
  dayRouteHookLine,
  dayRouteItemFromEvent,
  dayRouteItemFromMustSee,
  type DayRouteVenueMatchSource,
} from '@/lib/day-route-from-place';
import { flashDayRouteFeedback } from '@/lib/day-route-feedback';
import {
  applyMatchCommerceToVenues,
  classifyDayRouteCommercialChip,
  collectDayRouteTripTickets,
  computeDayRouteReadiness,
  dayRouteStopHasTicket,
  findDayRouteFreeWindowGaps,
  formatDayRouteBuyCtaLabel,
  pickNearbyUpsellsForStop,
  type DayRouteMatchOfferStub,
} from '@/lib/day-route-commercial';
import {
  applyHotPickOfferToItem,
  buildHotPickCards,
  HOT_PICK_TABS,
  HOT_PICKS_MAX,
  visibleHotPickTabs,
  type HotPickCard,
  type HotPickTabId,
} from '@/lib/day-route-hot-picks';
import { inCityPrepositional } from '@/lib/city-declension';
import { formatPriceFrom } from '@/lib/format';
import {
  buildMustSeeFilterTabs,
  classifyMustSeePlace,
  mustSeeFilterLabel,
  type MustSeeFilterId,
} from '@/lib/must-see-filters';
import { MustSeeFilterTabs } from '@/components/MustSeeFilterTabs.client';
import { formatStreetAddress } from '@/lib/address';
import { eventHref, venueHref } from '@/lib/routes';
import { toVenueCatalogCard } from '@/lib/venue-catalog-card';
import type { VenueCatalogCard } from '@/lib/venue-map-types';

type DayRouteAccordionId = 'catalog' | 'mustSee' | 'text' | 'matches';

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
  eventId?: string | null;
  eventSlug?: string | null;
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
  const eventId = String(venue.eventId || '').trim() || null;
  const eventSlug = String(venue.eventSlug || '').trim() || null;
  const item: DayRouteVenueItem = {
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
    eventId,
    eventSlug,
  };
  item.ticketUrl = resolveDayRouteTicketUrl(item);
  return item;
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
    hookFact: venue.hookFact,
    shortDescription: venue.shortDescription,
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
    flashDayRouteFeedback(dayRouteHardLimitMessage());
    return readDayRouteFresh();
  }
  if (isInDayRoute(item.id) || (item.slug && isInDayRoute(item.slug))) {
    flashDayRouteFeedback('Уже в маршруте');
    return readDayRouteFresh();
  }
  const next = addToDayRoute(item);
  if (next.venues.length > before) {
    flashDayRouteFeedback(dayRouteAddSuccessMessage(next.venues.length));
  } else if (next.venues.length >= DAY_ROUTE_MAX) {
    flashDayRouteFeedback(dayRouteHardLimitMessage());
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

/**
 * Share URL for /my-day without Next App Router navigation.
 * `router.replace(?items=…)` soft-navigates and can reset scroll to top
 * even with `{ scroll: false }` (Suspense + useSearchParams remount).
 */
function replaceMyDayUrl(path: string) {
  if (typeof window === 'undefined') return;
  const current = `${window.location.pathname}${window.location.search}`;
  if (current === path) return;
  window.history.replaceState(window.history.state, '', path);
}

function DayRoutePanelInner() {
  const searchParams = useSearchParams();
  const selectedCity = useSelectedCityOptional();
  const itemsParam = searchParams.get('items');
  const cityParam = searchParams.get('city');
  const dayParam = searchParams.get('day');
  const [route, setRoute] = useState<DayRouteState>(() =>
    typeof window === 'undefined' ? { cityId: null, venues: [] } : readDayRoute(),
  );
  const [payload, setPayload] = useState<MatchPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'ok' | 'err'>('idle');
  const [shareBusy, setShareBusy] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const shortShareCacheRef = useRef<Map<string, string>>(new Map());
  const [travelMode, setTravelMode] = useState<DayRouteTravelMode>('walk');
  const [titleInput, setTitleInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [coordsInput, setCoordsInput] = useState('');
  const [cityInput, setCityInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  /** Exclusive accordion: route list stays outside; all other sections collapse. */
  const [openPanel, setOpenPanel] = useState<DayRouteAccordionId | null>(null);
  const [locationsCatalog, setLocationsCatalog] = useState<VenueCatalogCard[]>([]);
  const [venuesCatalog, setVenuesCatalog] = useState<VenueCatalogCard[]>([]);
  const [eventsCatalog, setEventsCatalog] = useState<PublicCatalogListItemDto[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [destinationsFallback, setDestinationsFallback] = useState<PublicDestinationDto[]>([]);
  const [mustSeeFilter, setMustSeeFilter] = useState<MustSeeFilterId>('main');
  /** Hot Picks tab: Советы / Культура / Еда и бары. */
  const [hotPickTab, setHotPickTab] = useState<HotPickTabId>('tips');
  /** Stop focused from map pin click (desktop split highlight). */
  const [focusedStopId, setFocusedStopId] = useState<string | null>(null);
  /** Mobile (&lt;lg): map pane ~38vh ↔ ~85vh. */
  const [mapExpanded, setMapExpanded] = useState(false);
  const splitLeftRef = useRef<HTMLDivElement | null>(null);
  /** After external «Купить билет» - ask guest to mark bought. */
  const [ticketHandoff, setTicketHandoff] = useState<{
    venueId: string;
    ticketUrl: string;
    title: string;
  } | null>(null);
  const hydratedDayRef = useRef<string | null>(null);
  const skipUrlSyncRef = useRef(false);
  const titleFieldRef = useRef<HTMLInputElement | null>(null);
  const shareMenuRef = useRef<HTMLDivElement | null>(null);
  const unifiedSearchRef = useRef<HTMLDivElement | null>(null);
  const eventEnrichAttemptedRef = useRef<Set<string>>(new Set());

  /** Keep viewport on the tapped card when route list grows/shrinks above it. */
  const scrollPreserveRef = useRef<{ y: number; top: number; el: Element | null } | null>(null);

  function armScrollPreserve() {
    if (typeof window === 'undefined') return;
    const active =
      document.activeElement instanceof HTMLElement &&
      document.activeElement !== document.body &&
      document.activeElement !== document.documentElement
        ? document.activeElement
        : null;
    const probeY = Math.floor(Math.min(window.innerHeight * 0.4, window.innerHeight - 24));
    const probed = document.elementFromPoint(Math.floor(window.innerWidth / 2), probeY);
    const el = active || (probed instanceof Element ? probed : null);
    scrollPreserveRef.current = {
      y: window.scrollY,
      top: el ? el.getBoundingClientRect().top : 0,
      el,
    };
  }

  useLayoutEffect(() => {
    const lock = scrollPreserveRef.current;
    if (!lock) return;
    scrollPreserveRef.current = null;
    if (lock.el && document.contains(lock.el)) {
      const delta = lock.el.getBoundingClientRect().top - lock.top;
      if (Math.abs(delta) > 1) {
        window.scrollBy(0, delta);
        return;
      }
    }
    if (window.scrollY < lock.y - 2) {
      window.scrollTo(0, lock.y);
    }
  }, [route.venues]);

  useEffect(() => {
    const sync = () => {
      armScrollPreserve();
      setRoute(readDayRoute());
    };
    setRoute(readDayRoute());
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

    // Inbound share: auto-apply to localStorage (no banner / no «Сохранить себе» gate).
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
          const resolved: DayRouteVenueItem[] = (data?.venues || []).map(matchVenueToDayRouteItem);
          // Unresolved locators: real event ids keep ticket CTA; venue slugs never become /events/{slug}.
          const known = new Set(
            resolved.flatMap((v) =>
              [v.id, v.slug, v.eventId, v.eventSlug].map((x) => String(x || '').trim()).filter(Boolean),
            ),
          );
          for (const token of itemTokens) {
            if (token.isText || known.has(token.id)) continue;
            const isRealEventToken = /^(event_|evt_)/i.test(token.id);
            if (isRealEventToken) {
              resolved.push({
                id: token.id,
                slug: null,
                title: DAY_ROUTE_EVENT_STUB_TITLE,
                eventId: token.id,
                ticketUrl: `/events/${encodeURIComponent(token.id)}`,
              });
            } else {
              const editorial = lookupEditorialPlaceCoords(token.id);
              // Prefer title already in localStorage (URL rehydrate must not wipe names).
              const local = readDayRouteFresh().venues.find(
                (v) => v.id === token.id || v.slug === token.id,
              );
              const priorTitle =
                local && !isDayRoutePlaceholderTitle(local.title) ? local.title : null;
              resolved.push({
                id: token.id,
                slug: token.id,
                title: priorTitle || DAY_ROUTE_PLACE_STUB_TITLE,
                href: `/venues/${encodeURIComponent(token.id)}`,
                latitude: editorial?.latitude ?? local?.latitude ?? null,
                longitude: editorial?.longitude ?? local?.longitude ?? null,
                imageUrl: local?.imageUrl ?? null,
                address: local?.address ?? null,
                city: local?.city ?? null,
                cityId: local?.cityId ?? null,
                citySlug: local?.citySlug ?? null,
              });
            }
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
        const items: DayRouteVenueItem[] = data.venues.map(matchVenueToDayRouteItem);
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
  }, [itemsParam, cityParam, dayParam, destinationsFallback]);

  // Close share menu on outside click (desktop popover + mobile sheet).
  useEffect(() => {
    if (!shareMenuOpen) return;
    const onDoc = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (shareMenuRef.current?.contains(target)) return;
      const el = target instanceof Element ? target : target.parentElement;
      if (el?.closest('[data-day-share-menu], [data-day-share-sheet]')) return;
      setShareMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [shareMenuOpen]);

  useEffect(() => {
    if (!shareMenuOpen) return;
    const prev = document.body.style.overflow;
    // Mobile sheet only - keep scroll on desktop popover.
    const mq = window.matchMedia('(max-width: 639px)');
    if (!mq.matches) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
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
  // Hard = DAY_ROUTE_MAX safety. Soft = DAY_ROUTE_SOFT warn-only. MIN = day-ready hint.
  const atMax = route.venues.length >= DAY_ROUTE_MAX;
  const atSoft = isDayRouteAtSoft(route.venues.length);
  const softSlotsLeft = Math.max(0, DAY_ROUTE_SOFT - route.venues.length);
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
  const pageCitySourceSlug =
    selectedCity?.selectedDestination?.type === 'city'
      ? String(selectedCity.selectedDestination.sourceSlug || '').trim() || null
      : null;
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
    replaceMyDayUrl(nextPath);
  }, [route.venues, ready, pageCitySlug, cityParam, itemsParam, dayParam]);

  const afishaHref = catalogHrefWithSelectedCity(scopeCityParam || 'all');
  const locationsHref = venueCatalogHrefWithSelectedCity('/locations', scopeCityParam);
  const venuesHref = venueCatalogHrefWithSelectedCity('/venues', scopeCityParam);
  const cityHubHref = scopeCitySlug ? `/cities/${encodeURIComponent(scopeCitySlug)}` : '/cities';

  // City-scoped catalog lists for on-page searchable selects.
  // Venues: prefer destination slug (alias-aware warm list). Events catalog historically
  // matched display title only - prefer pageCityName so События is not empty when slug is set.
  // Do NOT fetch global top-500 then exact-match city title - that drops regional rows.
  useEffect(() => {
    if (!pageCityName) {
      setLocationsCatalog([]);
      setVenuesCatalog([]);
      setEventsCatalog([]);
      setCatalogLoading(false);
      setCatalogError(null);
      return;
    }
    const controller = new AbortController();
    setCatalogLoading(true);
    setCatalogError(null);
    const venuesCityFilter = pageCitySlug || pageCitySourceSlug || pageCityName;
    const eventsCityFilter = pageCityName || pageCitySlug || pageCitySourceSlug;
    const venuesCityQ = encodeURIComponent(venuesCityFilter);
    const eventsCityQ = encodeURIComponent(eventsCityFilter);
    const venuesQs = (family: 'location' | 'institution') =>
      `/api/public/venues?family=${family}&city=${venuesCityQ}&limit=500`;

    async function loadCatalog(attempt: number): Promise<void> {
      try {
        const [locationsPayload, venuesPayload, eventsPayload] = await Promise.all([
          fetch(venuesQs('location'), { signal: controller.signal })
            .then(async (response) =>
              response.ok ? ((await response.json()) as { venues?: VenueCatalogCard[] }) : null,
            ),
          fetch(venuesQs('institution'), { signal: controller.signal })
            .then(async (response) =>
              response.ok ? ((await response.json()) as { venues?: VenueCatalogCard[] }) : null,
            ),
          fetch(`/api/public/events?city=${eventsCityQ}&limit=80&sort=popular`, {
            signal: controller.signal,
          }).then(async (response) =>
            response.ok
              ? ((await response.json()) as {
                  items?: PublicCatalogListItemDto[];
                  sessions?: PublicCatalogListItemDto[];
                })
              : null,
          ),
        ]);
        if (controller.signal.aborted) return;
        if (!locationsPayload && !venuesPayload && !eventsPayload) {
          if (attempt < 1) {
            await new Promise((resolve) => window.setTimeout(resolve, 400));
            return loadCatalog(attempt + 1);
          }
          setLocationsCatalog([]);
          setVenuesCatalog([]);
          setEventsCatalog([]);
          setCatalogError('Не удалось загрузить каталог. Откройте блок ещё раз или обновите страницу.');
          return;
        }
        setLocationsCatalog((locationsPayload?.venues || []).map((item) => toVenueCatalogCard(item)));
        setVenuesCatalog((venuesPayload?.venues || []).map((item) => toVenueCatalogCard(item)));
        const events = eventsPayload?.items || eventsPayload?.sessions || [];
        setEventsCatalog(events);
        setCatalogError(null);
      } catch {
        if (controller.signal.aborted) return;
        if (attempt < 1) {
          await new Promise((resolve) => window.setTimeout(resolve, 400));
          return loadCatalog(attempt + 1);
        }
        setLocationsCatalog([]);
        setVenuesCatalog([]);
        setEventsCatalog([]);
        setCatalogError('Не удалось загрузить каталог. Откройте блок ещё раз или обновите страницу.');
      }
    }

    void loadCatalog(0).finally(() => {
      if (!controller.signal.aborted) setCatalogLoading(false);
    });
    return () => controller.abort();
  }, [pageCityName, pageCitySlug, pageCitySourceSlug]);

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
        if (!item) return null;
        const matched =
          matchSources.find((venue) => venue.id && venue.id === item.id) ||
          matchSources.find((venue) => venue.slug && item.slug && venue.slug === item.slug) ||
          null;
        return {
          place: { ...place, type: matched?.type || null },
          item,
          hook: dayRouteHookLine({
            hookFact: matched?.hookFact,
            shortDescription: matched?.shortDescription,
            desc: place.desc,
          }),
        };
      })
      .filter(
        (
          row,
        ): row is {
          place: (typeof mustSeePlaces)[number] & { type?: string | null };
          item: DayRouteVenueItem;
          hook: string | null;
        } => Boolean(row),
      );
  }, [mustSeePlaces, matchSources, pageCityId, pageCityName, pageCitySlug, selectedCity?.selectedDestination?.sourceSlug]);

  const mustSeeFilterMeta = useMemo(() => {
    return buildMustSeeFilterTabs(mustSeeResolved.map((row) => row.place));
  }, [mustSeeResolved]);

  useEffect(() => {
    const ids = new Set(mustSeeFilterMeta.tabs.map((tab) => tab.id));
    if (!ids.has(mustSeeFilter)) {
      setMustSeeFilter(mustSeeFilterMeta.defaultId);
    }
  }, [mustSeeFilterMeta, mustSeeFilter]);

  const mustSeeFiltered = useMemo(() => {
    const active =
      mustSeeFilterMeta.tabs.length < 2 ? mustSeeFilterMeta.defaultId : mustSeeFilter;
    return mustSeeResolved.filter((row) => classifyMustSeePlace(row.place) === active);
  }, [mustSeeResolved, mustSeeFilter, mustSeeFilterMeta]);

  const mustSeeAddable = useMemo(() => {
    return mustSeeFiltered.filter(({ item }) => {
      if (isInDayRoute(item.id, route) || (item.slug && isInDayRoute(item.slug, route))) {
        return false;
      }
      // One-click add only when we can place the stop on the map.
      return Boolean(lookupDayRouteCoords(item, buildDayRouteCoordsMap([item])));
    });
  }, [mustSeeFiltered, route]);

  const locationOptions = useMemo<DayRouteSearchOption[]>(() => {
    return locationsCatalog.map((venue) => {
      const inRoute = isInDayRoute(venue.id, route) || Boolean(venue.slug && isInDayRoute(venue.slug, route));
      return {
        id: venue.id,
        label: venue.name,
        hint: venue.address || venue.city,
        imageUrl: venue.heroImageUrl ?? null,
        disabled: inRoute || atMax,
        disabledReason: inRoute ? 'Уже в маршруте' : atMax ? dayRouteHardLimitMessage() : null,
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
        imageUrl: venue.heroImageUrl ?? null,
        disabled: inRoute || atMax,
        disabledReason: inRoute ? 'Уже в маршруте' : atMax ? dayRouteHardLimitMessage() : null,
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
              ? dayRouteHardLimitMessage()
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
    if (!item) return;
    setRoute(appendDayRouteItem(item));
    // Catalog list often omits venue lat/lng - hydrate from public event page.
    const needsCoords = item.latitude == null || item.longitude == null;
    const needsVenue = !item.slug && !matchedVenue;
    if (!needsCoords && !needsVenue && !isDayRoutePlaceholderTitle(item.title)) return;
    const key = String(event.slug || event.id || '').trim();
    if (!key) return;
    void fetch(`/api/public/events/${encodeURIComponent(key)}`)
      .then(async (response) =>
        response.ok
          ? ((await response.json()) as {
              event?: {
                id?: string;
                slug?: string | null;
                title?: string | null;
                imageUrl?: string | null;
                venueId?: string | null;
                venueSlug?: string | null;
                venue?: string | null;
                venueKind?: string | null;
                venueAddress?: string | null;
                venueLatitude?: number | null;
                venueLongitude?: number | null;
                city?: string | null;
                cityId?: string | null;
                citySlug?: string | null;
              };
            })
          : null,
      )
      .then((data) => {
        const ev = data?.event;
        if (!ev) return;
        const enriched = dayRouteItemFromEvent({
          id: String(ev.id || event.id),
          slug: ev.slug || event.slug,
          title: ev.title || event.title,
          city: ev.city || event.city,
          cityId: ev.cityId || pageCityId,
          citySlug: ev.citySlug || pageCitySlug || event.citySlug,
          venueId: ev.venueId || matchedVenue?.id || null,
          venueSlug: ev.venueSlug || event.venueSlug || matchedVenue?.slug || null,
          venue: ev.venue || event.venue || matchedVenue?.name || null,
          venueKind: ev.venueKind || event.venueKind || matchedVenue?.type || null,
          venueAddress: ev.venueAddress || matchedVenue?.address || null,
          venueLatitude: ev.venueLatitude ?? matchedVenue?.latitude ?? null,
          venueLongitude: ev.venueLongitude ?? matchedVenue?.longitude ?? null,
          startsAt: event.startsAt,
          dateLabel: event.dateLabel,
          timeLabel: event.timeLabel,
          imageUrl: ev.imageUrl || event.imageUrl || matchedVenue?.heroImageUrl || null,
        });
        if (!enriched) return;
        // Replace stub in place (id may upgrade event→venue).
        const current = readDayRouteFresh();
        const venues = current.venues.map((v) =>
          v.id === item.id ||
          (item.eventId && v.eventId === item.eventId) ||
          (item.eventSlug && v.eventSlug === item.eventSlug)
            ? { ...enriched, ticketBought: v.ticketBought }
            : v,
        );
        const next = { ...current, venues };
        if (writeDayRoute(next)) setRoute(readDayRouteFresh());
      })
      .catch(() => undefined);
  }

  function addMustSeeItem(item: DayRouteVenueItem) {
    if (!lookupDayRouteCoords(item, buildDayRouteCoordsMap([item]))) {
      flashDayRouteFeedback('У места нет координат - выберите другое');
      return;
    }
    setRoute(appendDayRouteItem(item));
  }

  function activateHotPick(card: HotPickCard) {
    if (!lookupDayRouteCoords(card.item, buildDayRouteCoordsMap([card.item]))) {
      flashDayRouteFeedback('У места нет координат - выберите другое');
      return;
    }
    const nextItem = applyHotPickOfferToItem(
      { ...card.item, title: card.title || card.item.title },
      card.offer,
    );
    const next = appendDayRouteItem(nextItem);
    setRoute(next);
    const url = card.offer.ticketUrl;
    if (url && (card.offer.kind === 'affiche' || card.offer.kind === 'open_date')) {
      if (typeof window !== 'undefined') {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
      setTicketHandoff({
        venueId: nextItem.id,
        ticketUrl: url,
        title: nextItem.title,
      });
    }
  }

  function addAllMustSee() {
    if (!mustSeeAddable.length || atMax) {
      flashDayRouteFeedback(atMax ? dayRouteHardLimitMessage() : 'Нет мест для добавления');
      return;
    }
    if (atSoft) {
      flashDayRouteFeedback(DAY_ROUTE_SOFT_WARN);
      return;
    }
    const cityCtx = {
      id: pageCityId,
      name: pageCityName,
      slug: pageCitySlug,
      sourceSlug: selectedCity?.selectedDestination?.sourceSlug || null,
    };
    const filteredPlaces = mustSeeFiltered.map((row) => row.place);
    // Bulk fills to soft guideline, then warns - individual adds still allowed until hard.
    const preset = buildCityDayRoutePreset(filteredPlaces, matchSources, cityCtx, DAY_ROUTE_SOFT);
    let next = readDayRouteFresh();
    let added = 0;
    for (const item of preset) {
      if (next.venues.length >= DAY_ROUTE_SOFT) break;
      if (isInDayRoute(item.id, next) || (item.slug && isInDayRoute(item.slug, next))) continue;
      next = addToDayRoute(item);
      added += 1;
    }
    setRoute(next);
    const active =
      mustSeeFilterMeta.tabs.length < 2 ? mustSeeFilterMeta.defaultId : mustSeeFilter;
    if (added) {
      flashDayRouteFeedback(
        isDayRouteAtSoft(next.venues.length)
          ? `Добавлено: ${added} · ${DAY_ROUTE_SOFT_WARN}`
          : `Добавлено: ${added} · ${next.venues.length}`,
      );
    } else {
      flashDayRouteFeedback(`${mustSeeFilterLabel(active)} уже в маршруте`);
    }
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
  const mapStops = useMemo(() => {
    return route.venues
      .map((venue, index) => {
        const coords = lookupDayRouteCoords(venue, coordsById);
        if (!coords) return null;
        return {
          id: venue.id,
          title: venue.title,
          index,
          latitude: coords.latitude,
          longitude: coords.longitude,
        };
      })
      .filter(
        (
          row,
        ): row is {
          id: string;
          title: string;
          index: number;
          latitude: number;
          longitude: number;
        } => Boolean(row),
      );
  }, [route.venues, coordsById]);
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
  const readiness = useMemo(
    () => computeDayRouteReadiness(route.venues, { segmentMeters }),
    [route.venues, segmentMeters],
  );
  const freeWindowGaps = useMemo(() => findDayRouteFreeWindowGaps(segmentMeters), [segmentMeters]);
  const primaryFreeWindow = useMemo(() => {
    if (!freeWindowGaps.length) return null;
    return freeWindowGaps.reduce((best, gap) => (gap.meters > best.meters ? gap : best));
  }, [freeWindowGaps]);
  const unpaidTicketStops = useMemo(
    () => route.venues.filter((v) => dayRouteStopHasTicket(v) && !v.ticketBought),
    [route.venues],
  );
  const matchOfferStubs = useMemo((): DayRouteMatchOfferStub[] => {
    return (payload?.matches || []).map((m) => ({
      eventId: m.eventId,
      slug: m.slug,
      title: m.title,
      priceFromRub: m.priceFromRub,
      covered: m.covered,
      routeVenues: (m.routeVenues || []).map((v) => ({ id: v.id })),
    }));
  }, [payload?.matches]);
  const tripTickets = useMemo(
    () => collectDayRouteTripTickets(route.venues),
    [route.venues],
  );

  useEffect(() => {
    if (!matchOfferStubs.length) return;
    const current = readDayRouteFresh();
    const { venues, changed } = applyMatchCommerceToVenues(current.venues, matchOfferStubs);
    if (!changed) return;
    if (writeDayRoute({ ...current, venues })) setRoute(readDayRouteFresh());
  }, [matchOfferStubs, route.venues]);

  const hotPickTabIds = useMemo(
    () => visibleHotPickTabs(mustSeeResolved.map((row) => ({ place: row.place }))),
    [mustSeeResolved],
  );
  useEffect(() => {
    if (!hotPickTabIds.includes(hotPickTab)) {
      setHotPickTab(hotPickTabIds[0] || 'tips');
    }
  }, [hotPickTabIds, hotPickTab]);
  const hotPickCards = useMemo(() => {
    const notInRoute = mustSeeResolved.filter(
      ({ item }) =>
        !isInDayRoute(item.id, route) && !(item.slug && isInDayRoute(item.slug, route)),
    );
    return buildHotPickCards({
      rows: notInRoute,
      events: eventsCatalog,
      tab: hotPickTab,
      max: HOT_PICKS_MAX,
    });
  }, [mustSeeResolved, route, eventsCatalog, hotPickTab]);
  const freeWindowUpsells = useMemo(() => {
    type FreePick = { key: string; badge: string; item: DayRouteVenueItem; hook: string | null };
    if (!primaryFreeWindow) return [] as FreePick[];
    const notInRoute = (item: DayRouteVenueItem) =>
      !isInDayRoute(item.id, route) && !(item.slug && isInDayRoute(item.slug, route));
    const picks: FreePick[] = [];
    const freeRow = mustSeeResolved.find(
      (row) =>
        (classifyMustSeePlace(row.place) === 'park' || classifyMustSeePlace(row.place) === 'temple') &&
        notInRoute(row.item),
    );
    if (freeRow) picks.push({ key: 'free', badge: 'Вход свободный', item: freeRow.item, hook: freeRow.hook });
    const museumRow = mustSeeResolved.find(
      (row) => classifyMustSeePlace(row.place) === 'museum' && notInRoute(row.item),
    );
    if (museumRow) picks.push({ key: 'museum', badge: 'Музей', item: museumRow.item, hook: museumRow.hook });
    const event = eventsCatalog.find((ev) => {
      const venueKey = String(ev.venueSlug || ev.venue || '').trim().toLowerCase();
      if (!venueKey) return false;
      return !route.venues.some(
        (v) =>
          String(v.slug || '').toLowerCase() === venueKey ||
          String(v.title || '').toLowerCase() === String(ev.venue || '').trim().toLowerCase() ||
          String(v.eventId || '') === String(ev.id),
      );
    });
    if (event) {
      const matchedVenue =
        venuesCatalog.find((v) => v.slug && v.slug === event.venueSlug) ||
        locationsCatalog.find((v) => v.slug && v.slug === event.venueSlug) ||
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
      if (item && notInRoute(item)) {
        picks.push({
          key: 'event',
          badge: 'Можно купить билет',
          item,
          hook: dayRouteHookLine({
            hookFact: matchedVenue?.hookFact,
            shortDescription: matchedVenue?.shortDescription,
            desc: event.venue || event.title,
          }),
        });
      }
    }
    // Fill remaining slots from must-see main if needed.
    if (picks.length < 3) {
      for (const row of mustSeeResolved) {
        if (picks.length >= 3) break;
        if (!notInRoute(row.item)) continue;
        if (picks.some((p) => p.item.id === row.item.id)) continue;
        picks.push({
          key: `extra-${row.item.id}`,
          badge: classifyMustSeePlace(row.place) === 'main' ? 'Рядом' : mustSeeFilterLabel(classifyMustSeePlace(row.place)),
          item: row.item,
          hook: row.hook,
        });
      }
    }
    return picks.slice(0, 3);
  }, [
    primaryFreeWindow,
    mustSeeResolved,
    eventsCatalog,
    venuesCatalog,
    locationsCatalog,
    route,
    pageCityId,
    pageCitySlug,
  ]);

  const unifiedSearchOptions = useMemo<DayRouteSearchOption[]>(() => {
    const opts: DayRouteSearchOption[] = [];
    for (const venue of locationsCatalog) {
      const inRoute = isInDayRoute(venue.id, route) || Boolean(venue.slug && isInDayRoute(venue.slug, route));
      const hook = dayRouteHookLine({
        hookFact: venue.hookFact,
        shortDescription: venue.shortDescription,
      });
      opts.push({
        id: `loc:${venue.id}`,
        label: venue.name,
        hint: hook || [venue.address || venue.city, 'Локация'].filter(Boolean).join(' · '),
        imageUrl: venue.heroImageUrl ?? null,
        disabled: inRoute || atMax,
        disabledReason: inRoute ? 'Уже в маршруте' : atMax ? dayRouteHardLimitMessage() : null,
      });
    }
    for (const venue of venuesCatalog) {
      const inRoute = isInDayRoute(venue.id, route) || Boolean(venue.slug && isInDayRoute(venue.slug, route));
      const hook = dayRouteHookLine({
        hookFact: venue.hookFact,
        shortDescription: venue.shortDescription,
      });
      opts.push({
        id: `ven:${venue.id}`,
        label: venue.name,
        hint: hook || [venue.address || venue.city, 'Площадка'].filter(Boolean).join(' · '),
        imageUrl: venue.heroImageUrl ?? null,
        disabled: inRoute || atMax,
        disabledReason: inRoute ? 'Уже в маршруте' : atMax ? dayRouteHardLimitMessage() : null,
      });
    }
    for (const event of eventsCatalog) {
      const sessionHint = [event.dateLabel, event.timeLabel].filter(Boolean).join(', ');
      const venueHint = [event.venue, sessionHint, 'Событие'].filter(Boolean).join(' · ');
      const venueKey = String(event.venueSlug || event.venue || event.id).trim();
      const inRoute = Boolean(
        (event.venueSlug && isInDayRoute(event.venueSlug, route)) ||
          (event.venue &&
            route.venues.some((v) => v.title.trim().toLowerCase() === String(event.venue).trim().toLowerCase())),
      );
      opts.push({
        id: `event:${event.id}`,
        label: event.title,
        hint: venueHint || null,
        imageUrl: event.imageUrl ?? null,
        disabled: inRoute || atMax || !venueKey,
        disabledReason: !venueKey
          ? 'Нет площадки'
          : inRoute
            ? 'Уже в маршруте'
            : atMax
              ? dayRouteHardLimitMessage()
              : null,
      });
    }
    return opts;
  }, [locationsCatalog, venuesCatalog, eventsCatalog, route, atMax]);

  function pickUnifiedSearch(option: DayRouteSearchOption) {
    if (option.id.startsWith('event:')) {
      pickEventById(option.id);
      return;
    }
    if (option.id.startsWith('loc:')) {
      pickLocationById(option.id.slice(4));
      return;
    }
    if (option.id.startsWith('ven:')) {
      pickVenueById(option.id.slice(4));
    }
  }

  function focusUnifiedSearch() {
    window.setTimeout(() => {
      unifiedSearchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const input = unifiedSearchRef.current?.querySelector('input');
      if (input instanceof HTMLInputElement) input.focus();
    }, 80);
  }

  function openFirstUnpaidTicket() {
    const first = unpaidTicketStops[0];
    if (!first) return;
    const url = resolveDayRouteTicketUrl(first);
    if (!url || typeof window === 'undefined') return;
    window.open(url, '_blank', 'noopener,noreferrer');
    setTicketHandoff({ venueId: first.id, ticketUrl: url, title: first.title });
  }

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

  // Sanitize leftover «Событие из маршрута» / no-coords stubs via public events API.
  useEffect(() => {
    if (!ready) return;
    const stubs = route.venues.filter((v) => {
      if (isTextDayRouteStop(v)) return false;
      const key = String(v.eventSlug || v.eventId || v.slug || v.id || '').trim();
      if (!key || eventEnrichAttemptedRef.current.has(key)) return false;
      return (
        isDayRoutePlaceholderTitle(v.title) ||
        (Boolean(v.eventId || v.eventSlug) && (v.latitude == null || v.longitude == null))
      );
    });
    if (!stubs.length) return;
    const controller = new AbortController();
    let cancelled = false;
    void (async () => {
      const payload: Array<{
        id: string;
        slug?: string | null;
        title?: string | null;
        address?: string | null;
        latitude?: number | null;
        longitude?: number | null;
        cityTitle?: string | null;
        cityId?: string | null;
        citySlug?: string | null;
        eventId?: string | null;
        eventSlug?: string | null;
        heroImageUrl?: string | null;
      }> = [];
      for (const stub of stubs.slice(0, DAY_ROUTE_MAX)) {
        const key = String(stub.eventSlug || stub.eventId || stub.slug || stub.id || '').trim();
        if (!key) continue;
        eventEnrichAttemptedRef.current.add(key);
        try {
          const response = await fetch(`/api/public/events/${encodeURIComponent(key)}`, {
            signal: controller.signal,
          });
          if (!response.ok) continue;
          const data = (await response.json()) as {
            event?: {
              id?: string;
              slug?: string | null;
              title?: string | null;
              imageUrl?: string | null;
              venueId?: string | null;
              venueSlug?: string | null;
              venueAddress?: string | null;
              venueLatitude?: number | null;
              venueLongitude?: number | null;
              city?: string | null;
              cityId?: string | null;
              citySlug?: string | null;
            };
          };
          const ev = data.event;
          if (!ev) continue;
          payload.push({
            id: String(ev.venueId || ev.venueSlug || ev.id || stub.id),
            slug: ev.venueSlug || stub.slug || null,
            title: ev.title || stub.title,
            address: ev.venueAddress || stub.address || null,
            latitude: ev.venueLatitude ?? stub.latitude ?? null,
            longitude: ev.venueLongitude ?? stub.longitude ?? null,
            cityTitle: ev.city || stub.city || null,
            cityId: ev.cityId || stub.cityId || null,
            citySlug: ev.citySlug || stub.citySlug || null,
            eventId: String(ev.id || stub.eventId || '').trim() || null,
            eventSlug: ev.slug || stub.eventSlug || null,
            heroImageUrl: ev.imageUrl || stub.imageUrl || null,
          });
        } catch {
          // abort / network
        }
      }
      if (cancelled || !payload.length) return;
      enrichDayRouteFromMatchVenues(payload);
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [ready, route.venues]);

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
      setFormError(dayRouteHardLimitMessage());
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
          ? dayRouteHardLimitMessage()
          : 'Не удалось добавить точку. Попробуйте ещё раз',
      );
      titleFieldRef.current?.focus();
      return;
    }
    if (isDayRouteAtSoft(next.venues.length)) {
      flashDayRouteFeedback(DAY_ROUTE_SOFT_WARN);
    }
    setTitleInput('');
    setNoteInput('');
    setCoordsInput('');
    titleFieldRef.current?.focus();
  }

  async function resolveShareUrls(): Promise<{ shareUrl: string; path: string; longPath: string }> {
    const longPath = buildDayRouteSharePath(route.venues, {
      citySlug: scopeCitySlug || pageCitySlug || cityParam,
    });
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const longUrl = origin ? `${origin}${longPath}` : longPath;
    if (!route.venues.length) return { shareUrl: longUrl, path: longPath, longPath };

    const cached = shortShareCacheRef.current.get(longPath);
    if (cached) {
      return { shareUrl: origin ? `${origin}${cached}` : cached, path: cached, longPath };
    }

    try {
      const parsed = new URL(longPath, 'https://daibilet.ru');
      const short = await createDayRouteShortShare({
        citySlug: parsed.searchParams.get('city'),
        items: parsed.searchParams.get('items') || '',
        fromName: parsed.searchParams.get('from'),
      });
      if (short?.path) {
        shortShareCacheRef.current.set(longPath, short.path);
        return {
          shareUrl: origin ? `${origin}${short.path}` : short.path,
          path: short.path,
          longPath,
        };
      }
    } catch {
      // fallback to long URL below
    }
    return { shareUrl: longUrl, path: longPath, longPath };
  }

  async function copyShareLink() {
    if (!route.venues.length || typeof window === 'undefined' || shareBusy) return;
    setShareBusy(true);
    try {
      const { shareUrl } = await resolveShareUrls();
      const text = buildDayRouteShareMessage({
        cityTitle: scopeCityName || cityTitle,
        shareUrl,
        venues: route.venues,
      });
      await navigator.clipboard.writeText(text);
      setCopyStatus('ok');
      setShareMenuOpen(false);
    } catch {
      setCopyStatus('err');
    } finally {
      setShareBusy(false);
    }
    window.setTimeout(() => setCopyStatus('idle'), 2200);
  }

  async function openMessengerShare(kind: 'telegram' | 'whatsapp' | 'max') {
    if (!route.venues.length || typeof window === 'undefined' || shareBusy) return;
    setShareBusy(true);
    try {
      const { shareUrl } = await resolveShareUrls();
      const text = buildDayRouteShareMessage({
        cityTitle: scopeCityName || cityTitle,
        shareUrl,
        venues: route.venues,
      });
      let href = '';
      if (kind === 'telegram') href = buildTelegramShareUrl(text, shareUrl);
      else if (kind === 'whatsapp') href = buildWhatsAppShareUrl(text);
      else href = buildMaxShareUrl(text);
      setShareMenuOpen(false);
      window.open(href, '_blank', 'noopener,noreferrer');
    } finally {
      setShareBusy(false);
    }
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

  function optimizeOrder() {
    if (!canOptimize) return;
    const nextVenues = optimizeDayRouteNearestNeighbor(route.venues, coordsById);
    setRoute(reorderDayRoute(nextVenues.map((venue) => venue.id)));
  }

  function openTextForm() {
    setOpenPanel('text');
    window.setTimeout(() => {
      document.getElementById('day-plan-form-wrap')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      titleFieldRef.current?.focus();
    }, 80);
  }

  const shareMenuItems = (
    <>
      <button
        type="button"
        role="menuitem"
        disabled={shareBusy}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-emerald-50 disabled:opacity-60 sm:px-3 sm:py-2.5"
        onClick={() => {
          void copyShareLink();
        }}
      >
        <Copy className="h-4 w-4 shrink-0 text-emerald-700" />
        <span className="min-w-0">
          <span className="block">Скопировать текст</span>
          <span className="block text-xs font-medium text-slate-500">С сообщением и ссылкой</span>
        </span>
      </button>
      <button
        type="button"
        role="menuitem"
        disabled={shareBusy}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-sky-50 disabled:opacity-60 sm:px-3 sm:py-2.5"
        onClick={() => {
          void openMessengerShare('telegram');
        }}
      >
        <ExternalLink className="h-4 w-4 text-sky-600" />
        Telegram
      </button>
      <button
        type="button"
        role="menuitem"
        disabled={shareBusy}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-emerald-50 disabled:opacity-60 sm:px-3 sm:py-2.5"
        onClick={() => {
          void openMessengerShare('whatsapp');
        }}
      >
        <ExternalLink className="h-4 w-4 text-emerald-600" />
        WhatsApp
      </button>
      <button
        type="button"
        role="menuitem"
        data-day-share-max
        disabled={shareBusy}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-violet-50 disabled:opacity-60 sm:px-3 sm:py-2.5"
        onClick={() => {
          void openMessengerShare('max');
        }}
      >
        <ExternalLink className="h-4 w-4 text-violet-600" />
        Макс
      </button>
    </>
  );

  function togglePanel(id: DayRouteAccordionId) {
    setOpenPanel((cur) => (cur === id ? null : id));
  }

  const textFormOpen = openPanel === 'text';
  const catalogOpen = openPanel === 'catalog';
  const mustSeeOpen = openPanel === 'mustSee';
  const matchesOpen = openPanel === 'matches';
  const showMustSeeAccordion = Boolean(hasPageCity && (mustSeeResolved.length > 0 || (!catalogLoading && pageCitySlug)));
  const showHotPicks = Boolean(hasPageCity && (hotPickCards.length > 0 || hotPickTabIds.length > 0));
  const isEmptyRoute = route.venues.length === 0;
  const hasMapStops = mapStops.length > 0;
  const focusedVenue = focusedStopId
    ? route.venues.find((v) => v.id === focusedStopId) ?? null
    : null;
  const focusedCoords = focusedVenue
    ? lookupDayRouteCoords(focusedVenue, coordsById)
    : null;

  useEffect(() => {
    if (!hasMapStops && mapExpanded) setMapExpanded(false);
  }, [hasMapStops, mapExpanded]);

  function focusStopFromMap(stopId: string) {
    setFocusedStopId(stopId);
    if (mapExpanded) return;
    const root = splitLeftRef.current || document;
    const el = root.querySelector(`[data-day-plan-stop="${String(stopId).replace(/["\\]/g, '')}"]`);
    if (el instanceof HTMLElement) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function stopExternalMapsUrl(lat: number, lng: number) {
    return `https://yandex.ru/maps/?pt=${lng},${lat}&z=17&l=map`;
  }

  /** Typed catalog selects - accordion under Hot Picks (not in top starter). */
  function renderCatalogTrio() {
    if (!hasPageCity) {
      return (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Сначала выберите город - появятся места, музеи и события.
        </p>
      );
    }
    return (
      <div data-day-catalog-trio>
        <div className="grid gap-3 sm:grid-cols-3">
          <DayRouteSearchSelect
            label="Локации"
            placeholder="Найти локацию…"
            emptyText={catalogLoading ? 'Загружаем…' : catalogError || 'Нет локаций в этом городе'}
            loading={catalogLoading}
            disabled={atMax}
            options={locationOptions}
            onPick={(option) => pickLocationById(option.id)}
          />
          <DayRouteSearchSelect
            label="Площадки"
            placeholder="Найти площадку…"
            emptyText={catalogLoading ? 'Загружаем…' : catalogError || 'Нет площадок в этом городе'}
            loading={catalogLoading}
            disabled={atMax}
            options={venueOptions}
            onPick={(option) => pickVenueById(option.id)}
          />
          <DayRouteSearchSelect
            label="События"
            placeholder="Найти событие…"
            emptyText={catalogLoading ? 'Загружаем…' : catalogError || 'Нет событий в этом городе'}
            loading={catalogLoading}
            disabled={atMax}
            options={eventOptions}
            onPick={(option) => pickEventById(option.id)}
          />
        </div>
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
      </div>
    );
  }

  /** Empty plan: centered airy starter. Non-empty: compact secondary under Hot Picks. */
  function renderUnifiedSearch(asStarter: boolean) {
    const cityBlock = (
      <div data-day-city-picker className={asStarter ? 'mx-auto w-full max-w-md text-left' : undefined}>
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
    );
    const searchBlock = hasPageCity ? (
      <div className={asStarter ? 'mx-auto w-full max-w-md text-left' : undefined}>
        <DayRouteSearchSelect
          label="Поиск"
          placeholder="Найти место…"
          emptyText={catalogLoading ? 'Загружаем…' : catalogError || 'Ничего не найдено'}
          loading={catalogLoading}
          disabled={atMax}
          options={unifiedSearchOptions}
          onPick={pickUnifiedSearch}
        />
      </div>
    ) : asStarter ? (
      <p className="mx-auto max-w-md rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-center text-sm text-amber-900">
        Сначала выберите город - появятся места, музеи и события.
      </p>
    ) : (
      <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        Сначала выберите город - появятся места, музеи и события.
      </p>
    );
    const customPlace = hasPageCity ? (
      <>
        {catalogError ? (
          <p
            className={`mt-2 text-xs font-medium text-rose-700 ${asStarter ? 'text-center' : ''}`}
            role="status"
          >
            {catalogError}
          </p>
        ) : null}
        <p className={`mt-3 text-[13px] text-slate-500 ${asStarter ? 'text-center' : ''}`}>
          или{' '}
          <button
            type="button"
            onClick={openTextForm}
            className="font-semibold text-slate-700 underline-offset-2 transition duration-200 hover:underline"
          >
            добавь своё место
          </button>
        </p>
      </>
    ) : null;

    if (asStarter) {
      return (
        <section
          className="mt-5 rounded-2xl border border-slate-200 bg-white px-4 py-10 sm:mt-6 sm:px-8 sm:py-12"
          ref={unifiedSearchRef}
          data-day-unified-search
          data-day-starter="1"
        >
          <div className="mx-auto flex max-w-md flex-col items-center text-center" data-day-plan-starter>
            <Route className="h-10 w-10 text-slate-400" aria-hidden />
            <p className="mt-4 text-lg font-bold leading-snug text-slate-900 sm:text-xl">
              Собери свой день
            </p>
            <p className="mt-2 text-sm font-normal leading-relaxed text-slate-500 sm:text-[15px]">
              Выбери город и минимум {DAY_ROUTE_MIN} точки для составления маршрута
            </p>
            <div className="mt-8 flex w-full flex-col gap-4" data-day-city-search-stack>
              {cityBlock}
              {searchBlock}
            </div>
            {customPlace}
          </div>
        </section>
      );
    }

    return (
      <section
        className="mt-3 rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4"
        ref={unifiedSearchRef}
        data-day-unified-search
      >
        <div className="flex flex-col gap-3" data-day-city-search-stack>
          {cityBlock}
          {searchBlock}
        </div>
        {customPlace}
      </section>
    );
  }

  function renderMapToolbar(compact = false) {
    return (
      <div className={`flex flex-wrap gap-2 ${compact ? '' : ''}`}>
        {canOptimize ? (
          <button
            type="button"
            onClick={optimizeOrder}
            data-day-map-optimize
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Оптимизировать
          </button>
        ) : null}
        {yandexUrl ? (
          <a
            href={yandexUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-sky-600 px-3 py-2 text-xs font-bold text-white hover:bg-sky-700"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Яндекс.Карты
          </a>
        ) : (
          <button
            type="button"
            disabled
            title="Нужны координаты минимум у 2 точек"
            className="inline-flex min-h-10 cursor-not-allowed items-center justify-center gap-1.5 rounded-full bg-slate-200 px-3 py-2 text-xs font-bold text-slate-500"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Яндекс.Карты
          </button>
        )}
      </div>
    );
  }

  return (
    <>
    <div
      className={
        hasMapStops
          ? 'container-page flex h-[calc(100dvh-var(--site-header-height))] flex-col overflow-hidden px-0 py-0 print:hidden lg:block lg:h-auto lg:max-w-5xl lg:overflow-visible lg:px-6 lg:py-5 lg:pb-10'
          : 'container-page px-4 py-5 pb-28 sm:px-6 sm:py-10 sm:pb-10 print:hidden lg:max-w-5xl'
      }
      data-day-mobile-map-split={hasMapStops ? '1' : undefined}
    >
      <div
        className={
          hasMapStops
            ? 'flex min-h-0 flex-1 flex-col overflow-hidden lg:block lg:overflow-visible'
            : undefined
        }
        data-day-map-expand={mapExpanded ? '1' : '0'}
      >
        <div
          ref={splitLeftRef}
          className={
            hasMapStops
              ? `min-w-0 order-2 flex-1 overflow-y-auto overscroll-contain px-4 pb-28 pt-3 sm:px-6 lg:order-none lg:overflow-visible lg:px-0 lg:pb-0 lg:pt-0 ${
                  mapExpanded ? 'max-lg:hidden' : ''
                }`
              : 'min-w-0'
          }
          data-day-split-left
          aria-hidden={hasMapStops && mapExpanded ? true : undefined}
        >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-[1.65rem] font-bold leading-tight text-slate-900 sm:text-3xl">
            {scopeCityName ? `Мой день ${inCityPrepositional(scopeCityName)}` : 'Мой день'}
          </h1>
          <p
            className="mt-1.5 text-[13px] font-medium text-slate-500"
            data-day-route-count-label
            data-day-route-readiness
          >
            {readiness.summaryLine}
          </p>
        </div>
        <div className="relative shrink-0" ref={shareMenuRef}>
          <button
            type="button"
            onClick={() => {
              if (!route.venues.length) return;
              setShareMenuOpen((open) => !open);
            }}
            data-day-share
            aria-expanded={shareMenuOpen}
            disabled={!route.venues.length}
            className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-2xl border px-3 py-2 text-xs font-semibold transition duration-200 ${
              route.venues.length
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
            }`}
          >
            <Share2 className="h-3.5 w-3.5" />
            {copyStatus === 'ok' ? 'Скопировано!' : 'Поделиться'}
          </button>
          {shareMenuOpen && route.venues.length ? (
            <div
              role="menu"
              data-day-share-menu
              className="absolute right-0 z-30 mt-2 hidden w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 shadow-lg sm:block"
            >
              {shareMenuItems}
            </div>
          ) : null}
        </div>
      </div>

      {route.venues.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={printItinerary}
            data-day-print
            className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition duration-200 hover:bg-slate-50"
          >
            <Printer className="h-3.5 w-3.5" />
            Сохранить
          </button>
          <button
            type="button"
            onClick={() => {
              clearDayRoute();
              setRoute(readDayRoute());
              replaceMyDayUrl('/my-day');
            }}
            className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition duration-200 hover:bg-slate-50"
          >
            <Trash2 className="h-3.5 w-3.5" /> Очистить
          </button>
        </div>
      ) : null}

      {copyStatus === 'ok' ? (
        <p
          role="status"
          className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900"
          data-day-share-ok
        >
          Текст с ссылкой скопирован!
        </p>
      ) : null}

      {tripTickets.length ? (
        <section
          className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-3 sm:px-4"
          data-day-trip-tickets
        >
          <h2 className="text-sm font-bold text-emerald-950">Ваши билеты в этой поездке</h2>
          <ul className="mt-2 grid gap-2">
            {tripTickets.map((ticket) => (
              <li
                key={ticket.venueId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-100 bg-white px-3 py-2"
                data-day-trip-ticket={ticket.venueId}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{ticket.title}</p>
                  {ticket.sessionLabel ? (
                    <p className="text-[11px] text-slate-600">{ticket.sessionLabel}</p>
                  ) : null}
                  {!ticket.qrAvailable ? (
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      QR появится в покупках после оформления на Дайбилет
                    </p>
                  ) : null}
                </div>
                {ticket.ticketUrl ? (
                  <a
                    href={ticket.ticketUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-8 shrink-0 items-center rounded-full bg-emerald-600 px-3 text-[11px] font-bold text-white hover:bg-emerald-700"
                  >
                    Открыть билет
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Alerts */}
      {route.venues.length ? (
        <>
          {mixedCities ? (
            <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Точки из разных городов. Для подбора экскурсий лучше оставить один город.
            </p>
          ) : null}
          {belowMin ? (
            <p className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
              Добавьте ещё {DAY_ROUTE_MIN - route.venues.length}{' '}
              {DAY_ROUTE_MIN - route.venues.length === 1 ? 'точку' : 'точки'} (минимум {DAY_ROUTE_MIN}), чтобы день
              сложился.
            </p>
          ) : null}
          {atSoft && !atMax ? (
            <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" data-day-route-soft-warn>
              {DAY_ROUTE_SOFT_WARN}
            </p>
          ) : null}
          {atMax ? (
            <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {dayRouteHardLimitMessage()}. Удалите одну, чтобы добавить другую.
            </p>
          ) : null}
        </>
      ) : null}

      {/* Empty plan: city+search starter is the first content block under H1 */}
      {isEmptyRoute ? renderUnifiedSearch(true) : null}

      {/* 1. Route list - always expanded */}
      {!route.venues.length ? null : (
        <section className="mt-5 sm:mt-8" data-day-route-list>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <h2
              className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm"
              data-day-route-count-heading
              aria-label={`Маршрут: ${formatDayRouteStopsHeading(route.venues.length)}`}
            >
              <span className="font-bold uppercase tracking-wide text-slate-500">Маршрут</span>
              <span className="font-semibold text-slate-800">
                {formatDayRouteStopsHeading(route.venues.length)}
              </span>
            </h2>
            <div data-day-route-toolbar>{renderMapToolbar()}</div>
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
          <ul className="mt-3 grid grid-cols-1 items-start gap-1.5" data-day-plan-list>
            {route.venues.map((venue, index) => (
              <Fragment key={venue.id}>
                <DayRouteVenueCard
                  index={index}
                  total={route.venues.length}
                  venue={venue}
                  hasCoords={Boolean(lookupDayRouteCoords(venue, coordsById))}
                  mapsUrl={(() => {
                    const c = lookupDayRouteCoords(venue, coordsById);
                    return c ? stopExternalMapsUrl(c.latitude, c.longitude) : null;
                  })()}
                  segmentToNext={segmentMeters[index] ?? null}
                  travelMode={travelMode}
                  focused={focusedStopId === venue.id}
                  nearbyUpsells={pickNearbyUpsellsForStop(venue, matchOfferStubs, { limit: 1 })}
                  onMoveUp={() => setRoute(moveDayRouteVenue(venue.id, -1))}
                  onMoveDown={() => setRoute(moveDayRouteVenue(venue.id, 1))}
                  onRemove={() => setRoute(removeFromDayRoute(venue.id))}
                  onToggleBought={() =>
                    setRoute(
                      updateDayRouteVenue(venue.id, { ticketBought: !venue.ticketBought }),
                    )
                  }
                  onBuyClick={(ticketUrl) =>
                    setTicketHandoff({ venueId: venue.id, ticketUrl, title: venue.title })
                  }
                />
                {primaryFreeWindow &&
                primaryFreeWindow.afterIndex === index &&
                freeWindowUpsells.length > 0 &&
                !atMax ? (
                  <li
                    className=""
                    data-day-free-window-upsell
                    data-day-free-window
                  >
                    <div className="rounded-2xl border border-dashed border-sky-200 bg-sky-50/60 p-3 sm:p-4">
                      <p className="text-sm font-semibold text-slate-900">Свободное окно</p>
                      <p className="mt-0.5 text-[13px] text-slate-600">
                        Между точками около {formatDayRouteDistance(primaryFreeWindow.meters)} - можно добавить ещё
                        одну остановку.
                      </p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-3">
                        {freeWindowUpsells.map((pick) => (
                          <button
                            key={pick.key}
                            type="button"
                            onClick={() => addMustSeeItem(pick.item)}
                            className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 text-left transition duration-200 hover:border-emerald-300 hover:bg-emerald-50/40"
                          >
                            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                              {pick.item.imageUrl ? (
                                <SafeImage
                                  src={pick.item.imageUrl}
                                  alt=""
                                  fill
                                  sizes="3rem"
                                  className="object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-slate-400">
                                  <MapPin className="h-4 w-4" />
                                </div>
                              )}
                            </div>
                            <span className="min-w-0">
                              <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                {pick.badge}
                              </span>
                              <span className="mt-0.5 line-clamp-1 text-xs font-semibold text-slate-900">
                                {pick.item.title}
                              </span>
                              {pick.hook ? (
                                <span className="mt-0.5 block line-clamp-1 text-[11px] text-slate-500" title={pick.hook}>
                                  {pick.hook}
                                </span>
                              ) : null}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </li>
                ) : null}
              </Fragment>
            ))}
          </ul>

          {mapStops.length > 0 ? (
            <div
              className="mt-4 hidden rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 lg:block"
              data-day-route-map-wrap
              data-day-route-map-desktop
            >
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-900">Карта дня</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Точки с координатами · порядок как в списке
                  </p>
                </div>
                {renderMapToolbar()}
              </div>
              <DayRouteOsmMap
                stops={mapStops}
                selectedStopId={focusedStopId}
                onStopClick={focusStopFromMap}
                className="h-64 w-full overflow-hidden rounded-xl bg-slate-100 sm:h-80"
              />
            </div>
          ) : null}
        </section>
      )}

      {/* Accordion: must-see chips */}
      {showMustSeeAccordion ? (
        <div className="mt-3 rounded-2xl border border-slate-200 bg-white" data-day-accordion="mustSee">
          <button
            type="button"
            aria-expanded={mustSeeOpen}
            aria-controls="day-must-see-body"
            data-day-must-see-accordion
            onClick={() => togglePanel('mustSee')}
            className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left sm:px-5"
          >
            <span>
              <span className="block text-sm font-semibold text-slate-900">Главные места</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                {mustSeeResolved.length
                  ? `Превью и фильтры · ${mustSeeResolved.length}`
                  : 'Список для города пока пуст'}
              </span>
            </span>
            <ChevronDown
              className={`h-5 w-5 shrink-0 text-slate-400 transition ${mustSeeOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {mustSeeOpen ? (
            <div id="day-must-see-body" className="border-t border-slate-100 px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
              {mustSeeResolved.length > 0 ? (
                <div data-day-must-see>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-slate-500">
                      Нажмите на место или добавьте видимые сразу (ориентир {DAY_ROUTE_SOFT}).
                    </p>
                    <button
                      type="button"
                      disabled={atMax || atSoft || mustSeeAddable.length === 0}
                      onClick={addAllMustSee}
                      data-day-must-see-bulk
                      className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-primary-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      {(mustSeeFilterMeta.tabs.length < 2
                        ? mustSeeFilterMeta.defaultId
                        : mustSeeFilter) === 'main'
                        ? 'Добавить главные места'
                        : 'Добавить выбранные'}
                      {mustSeeAddable.length
                        ? ` (${Math.min(mustSeeAddable.length, softSlotsLeft)})`
                        : ''}
                    </button>
                  </div>
                  <MustSeeFilterTabs
                    tabs={mustSeeFilterMeta.tabs}
                    activeId={
                      mustSeeFilterMeta.tabs.length < 2
                        ? mustSeeFilterMeta.defaultId
                        : mustSeeFilter
                    }
                    onChange={setMustSeeFilter}
                  />
                  <div className="mt-3 grid gap-2 sm:grid-cols-2" data-day-must-see-list>
                    {mustSeeFiltered.map(({ place, item, hook }) => {
                      const inRoute =
                        isInDayRoute(item.id, route) || Boolean(item.slug && isInDayRoute(item.slug, route));
                      const hasItemCoords = Boolean(
                        lookupDayRouteCoords(item, buildDayRouteCoordsMap([item])),
                      );
                      return (
                        <button
                          key={item.id}
                          type="button"
                          disabled={inRoute || atMax || !hasItemCoords}
                          title={
                            inRoute
                              ? 'Уже в маршруте'
                              : atMax
                                ? dayRouteHardLimitMessage()
                                : !hasItemCoords
                                  ? 'Нет координат'
                                  : hook || 'Добавить в день'
                          }
                          onClick={() => addMustSeeItem(item)}
                          className={`flex w-full items-center gap-2.5 rounded-xl border p-2 text-left transition disabled:cursor-not-allowed ${
                            inRoute
                              ? 'border-emerald-400 bg-emerald-50 text-emerald-900'
                              : 'border-slate-200 bg-white text-slate-800 hover:border-emerald-300 hover:bg-emerald-50/50'
                          }`}
                        >
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                            {item.imageUrl ? (
                              <SafeImage
                                src={item.imageUrl}
                                alt=""
                                fill
                                sizes="3rem"
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-slate-400">
                                <MapPin className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-semibold">{place.name}</span>
                            {hook ? (
                              <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">
                                {hook}
                              </span>
                            ) : null}
                          </span>
                          <span
                            className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                              inRoute ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-900 text-white'
                            }`}
                            aria-hidden
                          >
                            {inRoute ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  Для этого города пока нет списка главных мест - добавьте точки через поиск в «Из каталога».
                </p>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Accordion: custom text place */}
      <div className="mt-3 rounded-2xl border border-slate-200 bg-white" id="day-plan-form-wrap">
        <button
          type="button"
          aria-expanded={textFormOpen}
          aria-controls="day-plan-form"
          data-day-plan-accordion
          onClick={() => {
            setOpenPanel((cur) => {
              const next = cur === 'text' ? null : 'text';
              if (next === 'text') {
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

      {/* Hot Picks - always expanded (no accordion chrome) */}
      {showHotPicks ? (
        <section
          className="mt-4"
          data-day-hot-picks
          data-day-recommend-carousel
        >
          <h2 className="px-0.5 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Выбор Дайбилет
          </h2>
          <div id="day-hot-picks-body" className="pt-3">
            <div
              className="flex gap-1 overflow-x-auto pb-1"
              role="tablist"
              aria-label="Категории выбора"
              data-day-hot-pick-tabs
            >
              {HOT_PICK_TABS.filter((tab) => hotPickTabIds.includes(tab.id)).map((tab) => {
                const active = hotPickTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setHotPickTab(tab.id)}
                    className={`shrink-0 rounded-2xl px-3.5 py-2 text-sm font-semibold transition duration-200 ${
                      active
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
            {hotPickCards.length ? (
              <div className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1">
                {hotPickCards.map((card) => {
                  const inRoute =
                    isInDayRoute(card.item.id, route) ||
                    Boolean(card.item.slug && isInDayRoute(card.item.slug, route));
                  const pinFallback = (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-200 text-slate-400">
                      <MapPin className="h-7 w-7" />
                    </div>
                  );
                  return (
                    <article
                      key={card.key}
                      className="relative h-56 w-[78vw] max-w-xs shrink-0 snap-start overflow-hidden rounded-2xl border border-slate-200 bg-slate-800 shadow-sm transition duration-200 sm:w-64"
                      data-day-recommend-card={card.item.id}
                      data-day-hot-pick={card.offer.kind}
                    >
                      {card.item.imageUrl ? (
                        <SafeImage
                          src={card.item.imageUrl}
                          alt={card.title}
                          fill
                          sizes="78vw"
                          className="object-cover"
                          fallback={pinFallback}
                        />
                      ) : (
                        pinFallback
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/35 to-slate-950/10" />
                      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 p-3.5">
                        <span className="w-fit rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-800">
                          {card.offer.badge}
                        </span>
                        <p className="line-clamp-2 text-sm font-bold leading-snug text-white drop-shadow">
                          {card.title}
                        </p>
                        {card.hook ? (
                          <p className="line-clamp-2 text-[12px] leading-snug text-white/80" title={card.hook}>
                            {card.hook}
                          </p>
                        ) : null}
                        <button
                          type="button"
                          disabled={inRoute || atMax}
                          onClick={() => activateHotPick(card)}
                          className={`mt-1 inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-semibold backdrop-blur transition duration-200 ${
                            inRoute
                              ? 'bg-emerald-500/90 text-white'
                              : card.offer.kind === 'free'
                                ? 'bg-white/90 text-slate-900 hover:bg-white disabled:bg-white/50'
                                : 'bg-amber-400/95 text-slate-950 hover:bg-amber-300 disabled:bg-white/50'
                          }`}
                        >
                          {inRoute ? (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              В плане
                            </>
                          ) : (
                            <>
                              {card.offer.kind === 'free' ? (
                                <Plus className="h-3.5 w-3.5" />
                              ) : (
                                <Ticket className="h-3.5 w-3.5" />
                              )}
                              {card.offer.ctaLabel}
                            </>
                          )}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-[13px] text-slate-600">
                В этой категории пока пусто - откройте другую вкладку или поиск ниже.
              </p>
            )}
          </div>
        </section>
      ) : null}

      {/* Non-empty plan: city+search stays secondary under Hot Picks */}
      {!isEmptyRoute ? renderUnifiedSearch(false) : null}

      {/* Accordion: advanced catalog + boat */}
      <div
        className="mt-3 rounded-2xl border border-slate-200 bg-white"
        id="day-catalog-add"
        data-day-catalog-add="1"
        data-day-accordion="catalog"
      >
        <button
          type="button"
          aria-expanded={catalogOpen}
          aria-controls="day-catalog-add-body"
          data-day-catalog-accordion
          onClick={() => togglePanel('catalog')}
          className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left sm:px-5"
        >
          <span>
            <span className="block text-sm font-semibold text-slate-900">Ещё из каталога</span>
            <span className="mt-0.5 block text-xs text-slate-500">
              Отдельный поиск по типам
            </span>
          </span>
          <ChevronDown
            className={`h-5 w-5 shrink-0 text-slate-400 transition ${catalogOpen ? 'rotate-180' : ''}`}
          />
        </button>
        {catalogOpen ? (
          <div id="day-catalog-add-body" className="border-t border-slate-100 px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
            {!hasPageCity ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Сначала выберите город в поиске.
              </p>
            ) : (
              <>
                {renderCatalogTrio()}
                <div className="mt-4">
                  <DayRouteBoatWizard
                    cityName={pageCityName}
                    citySlug={pageCitySlug}
                    cityId={pageCityId}
                    citySourceSlug={selectedCity?.selectedDestination?.sourceSlug || null}
                    route={route}
                    atMax={atMax}
                    onRouteChange={setRoute}
                    locationsCatalog={locationsCatalog}
                  />
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>

      {/* Accordion: matching excursions */}
      {showMatches ? (
        <div
          id="day-route-matches"
          className="mt-3 rounded-2xl border border-slate-200 bg-white"
          data-day-accordion="matches"
        >
          <button
            type="button"
            aria-expanded={matchesOpen}
            aria-controls="day-route-matches-body"
            data-day-matches-accordion
            onClick={() => togglePanel('matches')}
            className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left sm:px-5"
          >
            <span>
              <span className="block text-sm font-semibold text-slate-900">Подходящие экскурсии</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                {loading
                  ? 'Ищем покрытие…'
                  : payload
                    ? `Найдено: ${payload.matches.length}`
                    : 'По покрытию точек'}
              </span>
            </span>
            <ChevronDown
              className={`h-5 w-5 shrink-0 text-slate-400 transition ${matchesOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {matchesOpen ? (
            <div id="day-route-matches-body" className="border-t border-slate-100 px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
              {loading ? <p className="text-sm text-slate-500">Ищем покрытие…</p> : null}
              {!loading && payload && payload.matches.length === 0 ? (
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-5 text-sm text-slate-600">
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
                  const showAddablePlaces = addable.length > 0 && !atMax && !atSoft;
                  const bulkAddCount = Math.min(addable.length, softSlotsLeft);
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
                                const before = next.venues.length;
                                for (const venue of addable) {
                                  if (next.venues.length >= DAY_ROUTE_SOFT) break;
                                  next = addToDayRoute(matchVenueToDayRouteItem(venue));
                                }
                                setRoute(next);
                                const added = next.venues.length - before;
                                if (added > 0 && isDayRouteAtSoft(next.venues.length)) {
                                  flashDayRouteFeedback(DAY_ROUTE_SOFT_WARN);
                                } else if (added > 0) {
                                  flashDayRouteFeedback(`Добавлено: ${added} · ${next.venues.length}`);
                                }
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
            </div>
          ) : null}
        </div>
      ) : null}

        </div>

        <aside
          className={
            hasMapStops
              ? `relative order-1 flex shrink-0 flex-col overflow-hidden border-b border-slate-200 bg-white transition-[height] duration-200 ease-out lg:hidden ${
                  mapExpanded
                    ? 'h-[min(85dvh,calc(100dvh-var(--site-header-height)-2.5rem))]'
                    : 'h-[38dvh]'
                }`
              : 'hidden'
          }
          data-day-mobile-map
          data-day-map-expanded={mapExpanded ? '1' : '0'}
        >
          <div className="relative min-h-0 flex-1 bg-slate-100">
            {mapStops.length > 0 ? (
              <DayRouteOsmMap
                stops={mapStops}
                selectedStopId={focusedStopId}
                onStopClick={focusStopFromMap}
                layoutKey={mapExpanded ? 'expanded' : 'collapsed'}
                className="absolute inset-0 h-full w-full"
              />
            ) : null}

            {hasMapStops ? (
              <button
                type="button"
                data-day-map-expand
                aria-pressed={mapExpanded}
                aria-label={mapExpanded ? 'Свернуть карту' : 'Развернуть карту'}
                title={mapExpanded ? 'Свернуть карту' : 'Развернуть карту'}
                onClick={() => setMapExpanded((open) => !open)}
                className="absolute left-3 top-3 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-800 shadow-sm backdrop-blur hover:bg-white"
              >
                {mapExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
            ) : null}

            {focusedVenue && hasMapStops ? (
              <div
                className={`absolute left-3 right-3 z-20 rounded-2xl border border-slate-200 bg-white/95 p-2.5 shadow-md backdrop-blur ${
                  mapExpanded ? 'bottom-20' : 'bottom-3'
                }`}
                data-day-map-focus-card
              >
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{focusedVenue.title}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">Точка на карте</p>
                  </div>
                  {focusedCoords ? (
                    <a
                      href={stopExternalMapsUrl(focusedCoords.latitude, focusedCoords.longitude)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Открыть в Яндекс.Картах"
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-700 hover:bg-sky-100"
                    >
                      <Navigation className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                  <button
                    type="button"
                    aria-label="Удалить точку"
                    onClick={() => {
                      setRoute(removeFromDayRoute(focusedVenue.id));
                      setFocusedStopId(null);
                    }}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Закрыть"
                    onClick={() => setFocusedStopId(null)}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ) : null}

            {mapExpanded && route.venues.length > 0 ? (
              <div
                className="absolute inset-x-0 bottom-0 z-10 border-t border-slate-200/80 bg-white/95 backdrop-blur"
                data-day-map-stops-rail
              >
                <div className="flex gap-2 overflow-x-auto px-3 py-2.5">
                  {route.venues.map((venue, index) => {
                    const active = focusedStopId === venue.id;
                    return (
                      <button
                        key={venue.id}
                        type="button"
                        onClick={() => focusStopFromMap(venue.id)}
                        className={`inline-flex max-w-[10rem] shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-left text-[11px] font-semibold ${
                          active
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
                            : 'border-slate-200 bg-white text-slate-800'
                        }`}
                      >
                        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                          {index + 1}
                        </span>
                        <span className="truncate">{venue.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </aside>
      </div>

      <MobileStickyActionBar>
        {unpaidTicketStops.length > 0 ? (
          <button
            type="button"
            onClick={openFirstUnpaidTicket}
            data-day-buy-sticky
            className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-amber-500 px-3 text-sm font-bold text-white hover:bg-amber-600"
          >
            <Ticket className="h-4 w-4" />
            Купить билеты
          </button>
        ) : null}
        {yandexUrl ? (
          <a
            href={yandexUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-sky-600 px-3 text-sm font-bold text-white hover:bg-sky-700"
          >
            <ExternalLink className="h-4 w-4" />
            Карта
          </a>
        ) : (
          <button
            type="button"
            disabled
            className="inline-flex h-11 flex-1 cursor-not-allowed items-center justify-center gap-1.5 rounded-full bg-slate-200 px-3 text-sm font-bold text-slate-500"
          >
            <ExternalLink className="h-4 w-4" />
            Карта
          </button>
        )}
        {!atMax ? (
          <button
            type="button"
            onClick={focusUnifiedSearch}
            className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-slate-900 px-3 text-sm font-bold text-white hover:bg-primary-600"
          >
            <Plus className="h-4 w-4" />
            Добавить
          </button>
        ) : null}
        {route.venues.length ? (
          <button
            type="button"
            onClick={() => setShareMenuOpen(true)}
            data-day-share-sticky
            className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 text-sm font-bold text-emerald-900"
          >
            <Share2 className="h-4 w-4" />
            Поделиться
          </button>
        ) : null}
      </MobileStickyActionBar>
    </div>
    {shareMenuOpen && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed inset-0 z-[60] sm:hidden print:hidden"
            data-day-share-sheet
            role="presentation"
            onClick={() => setShareMenuOpen(false)}
          >
            <div className="absolute inset-0 bg-slate-900/40" aria-hidden />
            <div
              role="menu"
              data-day-share-menu
              aria-label="Поделиться маршрутом"
              className="absolute inset-x-0 bottom-0 rounded-t-2xl border border-slate-200 bg-white py-2 shadow-xl pb-[max(0.5rem,env(safe-area-inset-bottom))]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-slate-200" aria-hidden />
              <p className="px-4 pb-1 text-sm font-semibold text-slate-900">Поделиться</p>
              {shareMenuItems}
            </div>
          </div>,
          document.body,
        )
      : null}
    {ticketHandoff ? (
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center print:hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="day-ticket-handoff-title"
        data-day-ticket-handoff
        onClick={() => setTicketHandoff(null)}
      >
        <div
          className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-xl sm:p-5"
          onClick={(event) => event.stopPropagation()}
        >
          <p id="day-ticket-handoff-title" className="text-base font-semibold text-slate-900">
            Оформили билет?
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Отметьте, чтобы маршрут стал готовым
            {ticketHandoff.title ? ` - ${ticketHandoff.title}` : ''}.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              data-day-ticket-handoff-bought
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700"
              onClick={() => {
                setRoute(updateDayRouteVenue(ticketHandoff.venueId, { ticketBought: true }));
                setTicketHandoff(null);
                flashDayRouteFeedback('Билет отмечен');
              }}
            >
              Билет куплен
            </button>
            <a
              href={ticketHandoff.ticketUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-day-ticket-handoff-again
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-amber-200 bg-amber-50 px-4 text-sm font-semibold text-amber-950 hover:bg-amber-100"
            >
              Открыть покупку ещё раз
            </a>
            <button
              type="button"
              data-day-ticket-handoff-skip
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              onClick={() => setTicketHandoff(null)}
            >
              Пока пропустить
            </button>
          </div>
        </div>
      </div>
    ) : null}
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
  mapsUrl = null,
  segmentToNext,
  travelMode,
  nearbyUpsells = [],
  focused = false,
  onMoveUp,
  onMoveDown,
  onRemove,
  onToggleBought,
  onBuyClick,
}: {
  venue: DayRouteVenueItem;
  index: number;
  total: number;
  hasCoords: boolean;
  mapsUrl?: string | null;
  segmentToNext: number | null;
  travelMode: DayRouteTravelMode;
  nearbyUpsells?: Array<{
    eventId: string;
    ticketUrl: string;
    line: string;
    priceFromRub: number | null;
  }>;
  focused?: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onToggleBought: () => void;
  onBuyClick: (ticketUrl: string) => void;
}) {
  const textStop = isTextDayRouteStop(venue);
  const href =
    venue.href ||
    (!textStop && venue.slug
      ? venueHref({ id: venue.id, slug: venue.slug, name: venue.title, type: 'park' })
      : null);
  const ticketUrl = resolveDayRouteTicketUrl(venue);
  const bought = Boolean(venue.ticketBought);
  const chip = classifyDayRouteCommercialChip(venue);
  const showStatusChip = chip.kind !== 'free';
  const buyCtaLabel = formatDayRouteBuyCtaLabel(venue);
  const addressLine =
    formatStreetAddress(venue.address, { city: venue.city }) || String(venue.address || '').trim() || '';
  const titleNorm = venue.title.toLowerCase().replace(/\s+/g, ' ');
  const addrNorm = addressLine.toLowerCase().replace(/\s+/g, ' ');
  const addressRedundant =
    Boolean(addressLine) &&
    (titleNorm.includes(addrNorm) ||
      (addrNorm.length >= 8 && titleNorm.includes(addrNorm.replace(/^набережная\s+/i, 'наб. '))));
  const placeLine =
    addressLine && !addressRedundant
      ? addressLine
      : String(venue.city || '').trim() || '';
  const segmentHint =
    segmentToNext != null && index < total - 1
      ? formatDayRouteSegmentHint(segmentToNext, travelMode)
      : '';
  const sessionDisplay = formatDayRouteSessionDisplay(venue);
  return (
    <li
      className="w-full scroll-mt-4"
      data-day-plan-stop={venue.id}
      data-ticket-bought={bought ? '1' : '0'}
      data-commercial-chip={chip.kind}
      data-day-session={sessionDisplay || undefined}
      data-day-stop-focused={focused ? '1' : undefined}
    >
      <div
        className={`flex w-full items-center gap-1.5 rounded-lg border bg-white px-1.5 py-1 ${
          focused ? 'border-emerald-400 ring-1 ring-emerald-200' : 'border-slate-200'
        }`}
      >
        <span
          className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white"
          aria-label={`Точка ${index + 1}`}
        >
          {index + 1}
        </span>
        <div className="flex shrink-0 flex-col leading-none">
          <button
            type="button"
            aria-label="Выше"
            disabled={index === 0}
            onClick={onMoveUp}
            className="rounded p-0 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
          >
            <ChevronUp className="h-3 w-3" />
          </button>
          <button
            type="button"
            aria-label="Ниже"
            disabled={index >= total - 1}
            onClick={onMoveDown}
            className="rounded p-0 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
          >
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
        <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md bg-slate-100">
          {venue.imageUrl ? (
            <SafeImage src={venue.imageUrl} alt="" fill sizes="2rem" className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-400">
              <MapPin className="h-3.5 w-3.5" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          {href ? (
            <Link
              href={href}
              className="block truncate text-[13px] font-semibold leading-tight text-slate-900 hover:text-primary-700"
            >
              {venue.title}
            </Link>
          ) : (
            <p className="truncate text-[13px] font-semibold leading-tight text-slate-900">{venue.title}</p>
          )}
          {(sessionDisplay || showStatusChip || placeLine || !hasCoords || venue.note) ? (
            <p className="mt-0.5 truncate text-[11px] leading-tight text-slate-500">
              {sessionDisplay ? (
                <span className="font-medium text-slate-700" data-day-session-label>
                  {sessionDisplay}
                </span>
              ) : null}
              {sessionDisplay && (showStatusChip || placeLine || !hasCoords || venue.note) ? ' · ' : null}
              {showStatusChip ? (
                <span data-day-status-chip={chip.kind}>{chip.label}</span>
              ) : null}
              {showStatusChip && (placeLine || !hasCoords || venue.note) ? ' · ' : null}
              {venue.note ? <span>{venue.note}</span> : null}
              {venue.note && (placeLine || !hasCoords) ? ' · ' : null}
              {placeLine ? <span>{placeLine}</span> : null}
              {placeLine && !hasCoords ? ' · ' : null}
              {!hasCoords ? <span className="font-medium text-amber-700">Нет координат</span> : null}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center">
          {mapsUrl ? (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Открыть в Яндекс.Картах"
              title="Открыть в Яндекс.Картах"
              data-day-stop-maps
              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-sky-600 hover:bg-sky-50"
            >
              <Navigation className="h-3.5 w-3.5" />
            </a>
          ) : null}
          <button
            type="button"
            aria-label="Удалить точку"
            onClick={onRemove}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {ticketUrl ? (
        <div className="mt-0.5 flex flex-wrap items-center gap-1 pl-8">
          <a
            href={ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-day-buy-ticket
            onClick={() => onBuyClick(ticketUrl)}
            className="inline-flex min-h-6 items-center justify-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-white hover:bg-amber-600"
          >
            <Ticket className="h-3 w-3" />
            {buyCtaLabel}
          </a>
          <button
            type="button"
            onClick={onToggleBought}
            data-day-ticket-bought
            className={`inline-flex min-h-6 items-center justify-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
              bought
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {bought ? <Check className="h-3 w-3" /> : null}
            {bought ? 'Билет отмечен' : 'Отметить купленным'}
          </button>
        </div>
      ) : null}
      {!ticketUrl && nearbyUpsells.length > 0
        ? nearbyUpsells.map((upsell) => (
            <div
              key={upsell.eventId}
              className="mt-0.5 ml-8 rounded-md border border-amber-100 bg-amber-50/60 px-2 py-0.5"
              data-day-nearby-upsell={upsell.eventId}
            >
              <p className="truncate text-[11px] font-medium text-slate-800">{upsell.line}</p>
              <a
                href={upsell.ticketUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-day-nearby-buy
                onClick={() => onBuyClick(upsell.ticketUrl)}
                className="mt-0.5 inline-flex min-h-6 items-center justify-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-white hover:bg-amber-600"
              >
                <Ticket className="h-3 w-3" />
                {upsell.priceFromRub != null && upsell.priceFromRub > 0
                  ? `Купить билет ${formatPriceFrom(upsell.priceFromRub)}`
                  : 'Купить билет'}
              </a>
            </div>
          ))
        : null}
      {segmentHint ? (
        <p className="mt-0.5 px-1 text-[11px] leading-tight text-slate-500" data-day-segment-hint>
          далее ~ {segmentHint}
        </p>
      ) : null}
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
