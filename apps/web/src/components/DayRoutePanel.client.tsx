'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Bookmark,
  Car,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  ExternalLink,
  GripVertical,
  Landmark,
  MapPin,
  Navigation,
  PenLine,
  PersonStanding,
  Plus,
  Printer,
  QrCode,
  Route,
  Share2,
  Ship,
  Sparkles,
  StickyNote,
  Ticket,
  Trash2,
  X,
} from 'lucide-react';
import {
  MyDayCityPickStarter,
  MyDayPickerLaunch,
  MyDayPickerSheet,
  MyDayItinerary,
  MyDayMapAside,
  MyDayMapFullScreen,
  MyDayMobileMapSheet,
  MyDayScheduleBanner,
  MyDayShell,
  MyDayToolbar,
  useMyDayController,
} from '@/components/my-day';
import {
  DragEvent,
  FormEvent,
  Fragment,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import type { PublicCatalogListItemDto, PublicDestinationDto } from '@daibilet/contracts/public';

import { IMAGE_SIZES, SafeImage } from '@/components/SafeImage.client';
import { CityDayPresetBlock } from '@/components/CityDayPresetBlock.client';
import { CityPicker } from '@/components/CityPicker.client';
import { DayRouteBoatWizard } from '@/components/DayRouteBoatWizard.client';
import { DayRouteOsmMap } from '@/components/DayRouteOsmMap.client';
import { DayRouteStopsTimeline } from '@/components/DayRouteStopsTimeline.client';
import {
  DayRoutePurchaseCta,
  isDayRouteVendorCheckoutUrl,
} from '@/components/DayRoutePurchaseCta.client';
import { CheckoutModal } from '@/components/CheckoutModal.client';
import {
  DayRouteSearchSelect,
  type DayRouteSearchOption,
} from '@/components/DayRouteSearchSelect.client';
import { MobileStickyActionBar } from '@/components/MobileStickyActionBar';
import { SuburbsCarousel } from '@/components/SuburbsCarousel.client';
import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import { catalogHrefWithSelectedCity, placesHubHrefWithSelectedCity, venueCatalogHrefWithSelectedCity } from '@/lib/catalog-url';
import { resolveCityInfo } from '@/lib/cityInfo';
import { isSpbDayRouteCity } from '@/lib/day-route-boat';
import {
  DAY_ROUTE_CHANGED_EVENT,
  DAY_ROUTE_MAX,
  DAY_ROUTE_MIN,
  DAY_ROUTE_SOFT,
  DAY_ROUTE_SOFT_WARN,
  addNoteStopToDayRoute,
  addTextStopToDayRoute,
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
  DAY_ROUTE_PLACE_STUB_TITLE,
  enrichDayRouteFromMatchVenues,
  estimateDayRouteTravelMinutes,
  formatDayRouteStopsHeading,
  formatDayRouteDistance,
  formatDayRouteSegmentHint,
  formatDayRouteSessionDisplay,
  formatDayRouteTransitTipLine,
  formatDayRouteTravelMinutes,
  hydrateTextStopsFromShareTokens,
  insertIntoDayRoute,
  isDayRouteAtSoft,
  isDayRoutePlaceholderTitle,
  isDayRouteShareTextToken,
  isInDayRoute,
  isNoteDayRouteStop,
  isTextDayRouteStop,
  countDayRoutePlacesMissingCoords,
  lookupDayRouteCoords,
  moveDayRouteVenue,
  moveDayRoutePlanVenue,
  optimizeDayRouteNearestNeighbor,
  parseDayRouteItemsParam,
  parseDayRouteQueryParam,
  readDayRoute,
  readDayRouteFresh,
  removeFromDayRoute,
  reorderDayRoute,
  repairDayRouteKronstadtNikolskyStops,
  resolveDayRouteTicketUrl,
  hydrateDayRouteFromShare,
  updateDayRouteVenue,
  writeDayRoute,
  replaceDayRouteFromVenues,
  type DayRouteState,
  type DayRouteTravelMode,
  type DayRouteVenueItem,
} from '@/lib/day-route';
import { lookupEditorialPlaceCoords } from '@/lib/city-place-coords';
import {
  isGeneratedVenueStub,
  resolveDayRouteStopImage,
  resolveVenueHeroImage,
} from '@/lib/city-place-images';
import {
  buildCityDayRoutePreset,
  cityDayRoutePresetAvailable,
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
  buildMyDayCityScopeLine,
  dayRouteOfferIsVenueBound,
  dayRouteStopHasTicket,
  dayRouteStopIsCommerce,
  dayRouteStopReorderLocked,
  dayRouteStopTicketQrData,
  dayRouteVenueBoundPriceLabel,
  buildDayRouteFreeWindowCityScope,
  dayRouteCandidateMatchesCityScope,
  findDayRouteFreeWindowGaps,
  formatDayRouteBuyCtaLabel,
  formatDayRouteOfferChip,
  type DayRouteMatchOfferStub,
} from '@/lib/day-route-commercial';
import { dedupeDayRouteMatches } from '@/lib/day-route-score';
import {
  anchorMinutes,
  computeDayRouteHourPlan,
  dayRouteStopIsPurchased,
  DAY_ROUTE_SOFT_END_OPTIONS,
  DAY_ROUTE_SOFT_START_OPTIONS,
  type DayRouteHourPlanResult,
} from '@/lib/day-route-soft-timing';
import {
  applyHotPickOfferToItem,
  buildHotPickCards,
  HOT_PICK_TABS,
  HOT_PICKS_MAX,
  visibleHotPickTabs,
  type HotPickCard,
  type HotPickTabId,
} from '@/lib/day-route-hot-picks';
import { cityToGenitive, inCityPrepositional } from '@/lib/city-declension';
import { formatPriceFrom } from '@/lib/format';
import {
  buildMustSeeFilterTabs,
  classifyMustSeePlace,
  mustSeeFilterLabel,
  type MustSeeFilterId,
} from '@/lib/must-see-filters';
import { MustSeeFilterTabs } from '@/components/MustSeeFilterTabs.client';
import {
  buildDayRouteTypeCounts,
  dayRouteStopDwellChipLabel,
  dayRouteStopPriceChipLabel,
  dayRouteStopTypeTag,
  editorialTagFromTitle,
  estimateDayRouteDwellMinutes,
} from '@/lib/day-route-stop-types';
import { venueTypeLabel } from '@/lib/venue-meta';
import { resolveCityCardImage } from '@/lib/city-images';
import { MyDayHourGantt } from '@/components/my-day/MyDayHourGantt';
import { MyDaySaveScenarioDialog } from '@/components/my-day/MyDaySaveScenarioDialog';
import { exportDayRoutePdfWithMap } from '@/lib/day-route-pdf';
import {
  applyDayRouteScenario,
  readDayRouteScenarios,
  removeDayRouteScenario,
  saveDayRouteScenario,
  type DayRouteSavedScenario,
} from '@/lib/day-route-scenarios';
import { formatStreetAddress } from '@/lib/address';
import {
  softGeocodeAddress,
  softGeocodeFailureMessage,
  type SoftGeocodeHit,
} from '@/lib/soft-geocode';
import { lookupCityMapCoords } from '@/lib/city-map-coords';
import { eventHref, venueHref } from '@/lib/routes';
import { toVenueCatalogCard } from '@/lib/venue-catalog-card';
import type { VenueCatalogCard } from '@/lib/venue-map-types';

type DayRouteAccordionId = 'mustSee' | 'text' | 'matches';
/** Wave 1.5: list-only itinerary (Lovable). Grid card markup kept as dead path. */
type DayRouteStopViewMode = 'grid' | 'list';
type DayRouteMobileShelf = 'route' | 'add';
type MyDayPickerSection = 'scenarios' | 'places' | 'suburbs' | 'picks' | 'boat' | 'own';

/** Owner 2026-08-06: post-buy modal «Оформили билет?» off until UX revisit. Buy links still open. */
const SHOW_DAY_TICKET_HANDOFF_MODAL = false;

/** @deprecated Wave 1.5 list-only; kept for dead grid branch types. */
const DAY_ROUTE_STOPS_GRID_RAIL =
  'horizontal-snap-row flex w-full snap-x snap-mandatory flex-nowrap items-stretch gap-2.5 overflow-x-auto overscroll-x-contain touch-pan-x pb-0.5 [scrollbar-width:thin]';
/** @deprecated Wave 1.5 list-only. */
const DAY_ROUTE_STOPS_GRID_CARD =
  'w-[min(82vw,20rem)] shrink-0 snap-start sm:w-[20.5rem] lg:w-[21.5rem]';

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
    purchaseReady?: boolean;
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
    imageUrl: resolveVenueHeroImage(venue.slug, venue.heroImageUrl),
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
    imageUrl: resolveVenueHeroImage(venue.slug, venue.heroImageUrl),
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

function appendDayRouteItem(
  item: DayRouteVenueItem | null,
  afterVenueId?: string | null,
): DayRouteState {
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
  const next = insertIntoDayRoute(item, afterVenueId);
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
  const [geocodeBusy, setGeocodeBusy] = useState(false);
  const [geocodeHint, setGeocodeHint] = useState<string | null>(null);
  const [geocodePreview, setGeocodePreview] = useState<SoftGeocodeHit | null>(null);
  /** Lovable «Типы точек»: hidden tags filter itinerary visibility. */
  const [hiddenStopTags, setHiddenStopTags] = useState<string[]>([]);
  /** Exclusive accordion for route-building tools only (must-see / custom / matches). */
  /** Guidebook (scenarios + suburbs DayTripCanonCard) stays always open as day-plan cards. */
  const [openPanel, setOpenPanel] = useState<DayRouteAccordionId | null>(null);
  const [locationsCatalog, setLocationsCatalog] = useState<VenueCatalogCard[]>([]);
  const [venuesCatalog, setVenuesCatalog] = useState<VenueCatalogCard[]>([]);
  const [eventsCatalog, setEventsCatalog] = useState<PublicCatalogListItemDto[]>([]);
  const [eventsSearchExtra, setEventsSearchExtra] = useState<PublicCatalogListItemDto[]>([]);
  const [unifiedSearchQuery, setUnifiedSearchQuery] = useState('');
  /** Per-family progressive load - search unlocks as soon as any family arrives. */
  const [catalogLoadingParts, setCatalogLoadingParts] = useState({
    locations: false,
    venues: false,
    events: false,
  });
  /**
   * Locations+venues settled for current city (events may still load).
   * Named presets that need catalog name-match wait on this gate.
   */
  const [venueMatchCatalogReady, setVenueMatchCatalogReady] = useState(false);
  const catalogLoading =
    catalogLoadingParts.locations || catalogLoadingParts.venues || catalogLoadingParts.events;
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [destinationsFallback, setDestinationsFallback] = useState<PublicDestinationDto[]>([]);
  const [mustSeeFilter, setMustSeeFilter] = useState<MustSeeFilterId>('main');
  /** Hot Picks tab: Советы / Культура / Еда и бары. */
  const [hotPickTab, setHotPickTab] = useState<HotPickTabId>('tips');
  /** Stop focused from map pin click. */
  const [focusedStopId, setFocusedStopId] = useState<string | null>(null);
  /** Hover/focus highlight for the map marker (separate from focusedStopId). */
  const [hoverStopId, setHoverStopId] = useState<string | null>(null);
  /** Mobile (&lt;lg): list-first; map is a separate fullscreen mode (Wanderlog-style). */
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');
  /** Mobile shelf: route steps/map vs catalog add tools. */
  const [mobileShelf, setMobileShelf] = useState<DayRouteMobileShelf>('route');
  /** Lovable-style map chrome: collapse / fullscreen / mobile sheet. */
  const myDay = useMyDayController();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSection, setPickerSection] = useState<MyDayPickerSection>('scenarios');
  /** Session dismiss for «Свободное окно» upsell (resets on reload). */
  const [freeWindowDismissed, setFreeWindowDismissed] = useState(false);
  /** HTML5 DnD: venue id currently dragged (plan stops). */
  const [dragVenueId, setDragVenueId] = useState<string | null>(null);
  const [grabbedKey, setGrabbedKey] = useState<string | null>(null);
  const [dndAnnounce, setDndAnnounce] = useState('');
  const [pdfBusy, setPdfBusy] = useState(false);
  const [savedScenarios, setSavedScenarios] = useState<DayRouteSavedScenario[]>([]);
  const [scenarioBusy, setScenarioBusy] = useState(false);
  const [scenarioSheetOpen, setScenarioSheetOpen] = useState(false);

  useEffect(() => {
    setSavedScenarios(readDayRouteScenarios());
  }, []);

  /** Next catalog/text add inserts after this stop (from between-card «+»). */
  const [insertAfterVenueId, setInsertAfterVenueId] = useState<string | null>(null);
  /** Open between-card «+» popover for this afterVenueId. */
  const [betweenMenuAfterId, setBetweenMenuAfterId] = useState<string | null>(null);
  const listRootRef = useRef<HTMLDivElement | null>(null);
  /** After external «Купить билет» - ask guest to mark bought (gated by SHOW_DAY_TICKET_HANDOFF_MODAL). */
  const [ticketHandoff, setTicketHandoffState] = useState<{
    venueId: string;
    ticketUrl: string;
    title: string;
  } | null>(null);
  const setTicketHandoff = (
    next: {
      venueId: string;
      ticketUrl: string;
      title: string;
    } | null,
  ) => {
    if (!SHOW_DAY_TICKET_HANDOFF_MODAL && next !== null) return;
    setTicketHandoffState(next);
  };
  /** Show-ticket modal: real QR only when ticketQrData exists; else stub. */
  const [ticketView, setTicketView] = useState<{
    venueId: string;
    title: string;
    ticketUrl: string | null;
    qrData: string | null;
    qrKind: 'qr' | 'barcode' | 'image' | null;
  } | null>(null);
  /** Vendor checkout overlay for sticky/hot-pick «Купить» (iframe; CTA buttons use native TC). */
  const [guestCheckoutUrl, setGuestCheckoutUrl] = useState<string | null>(null);
  /** Soft hour-plan mode: text hints only (no timeline UI). */
  const [hourPlanOn, setHourPlanOn] = useState(false);
  const [hourSheetOpen, setHourSheetOpen] = useState(false);
  const [hourStart, setHourStart] = useState('10:00');
  const [hourEnd, setHourEnd] = useState('22:00');
  const [hourLunch, setHourLunch] = useState(false);
  /** Compact header (≥1 stop): reveal CityPicker under «или сменить город». */
  const [headerCityChangeOpen, setHeaderCityChangeOpen] = useState(false);
  const [headerCityChangeKey, setHeaderCityChangeKey] = useState(0);
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);
  const hydratedDayRef = useRef<string | null>(null);
  const skipUrlSyncRef = useRef(false);
  const titleFieldRef = useRef<HTMLInputElement | null>(null);
  const shareMenuRef = useRef<HTMLElement | null>(null);
  const unifiedSearchRef = useRef<HTMLElement | null>(null);
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
      setRoute(repairDayRouteKronstadtNikolskyStops(readDayRoute()));
    };
    setRoute(repairDayRouteKronstadtNikolskyStops(readDayRoute()));
    window.addEventListener(DAY_ROUTE_CHANGED_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(DAY_ROUTE_CHANGED_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  useEffect(() => {
    if (route.venues.length === 0) setMobileShelf('route');
  }, [route.venues.length]);

  /** Wave 1.5: always list itinerary (Lovable parity). */
  const effectiveStopViewMode: DayRouteStopViewMode = 'list';
  const timelineStops = useMemo(
    () =>
      route.venues.map((venue) => ({
        id: venue.id,
        title: venue.title,
        // LS may drop imageUrl under quota slim - rebuild from editorial slug maps.
        imageUrl: resolveDayRouteStopImage(venue),
      })),
    [route.venues],
  );
  const timelineActiveId =
    focusedStopId && route.venues.some((v) => v.id === focusedStopId)
      ? focusedStopId
      : route.venues[0]?.id || null;

  function focusStopFromTimeline(stopId: string) {
    focusStopFromMap(stopId);
  }

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
              const resolvedImage =
                resolveVenueHeroImage(token.id, local?.imageUrl) ||
                (local?.imageUrl && !isGeneratedVenueStub(local.imageUrl) ? local.imageUrl : null);
              resolved.push({
                id: token.id,
                slug: token.id,
                title: priorTitle || DAY_ROUTE_PLACE_STUB_TITLE,
                href: `/venues/${encodeURIComponent(token.id)}`,
                latitude: editorial?.latitude ?? local?.latitude ?? null,
                longitude: editorial?.longitude ?? local?.longitude ?? null,
                imageUrl: resolvedImage,
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
            if (dest?.name) selectedCity.setCity(dest.name, { skipRouteConfirm: true });
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
  /** Lovable «Шаг 2 из 2»: 1–2 stops - nudge to add places / enable hour plan. */
  const showStep2Card = route.venues.length > 0 && route.venues.length < 3;
  // Hard = DAY_ROUTE_MAX safety. Soft = DAY_ROUTE_SOFT warn-only. MIN = day-ready hint.
  const atMax = route.venues.length >= DAY_ROUTE_MAX;
  const atSoft = isDayRouteAtSoft(route.venues.length);
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
  const catalogCityDest = useMemo(() => {
    const slug = citySlug || pageCitySlug;
    const name = cityTitle || pageCityName;
    const list = destinations || [];
    if (slug) {
      const bySlug = list.find(
        (row) =>
          row?.type === 'city' &&
          (row.slug === slug || row.sourceSlug === slug),
      );
      if (bySlug) return bySlug;
    }
    if (name) {
      const byName = list.find((row) => row?.type === 'city' && row.name === name);
      if (byName) return byName;
    }
    return selectedCity?.selectedDestination?.type === 'city'
      ? selectedCity.selectedDestination
      : null;
  }, [
    citySlug,
    cityTitle,
    destinations,
    pageCityName,
    pageCitySlug,
    selectedCity?.selectedDestination,
  ]);
  const catalogCityName = catalogCityDest?.name || cityTitle || pageCityName;
  const catalogCitySlug = catalogCityDest?.slug || citySlug || pageCitySlug;
  const catalogCitySourceSlug =
    catalogCityDest?.sourceSlug || (citySlug ? null : pageCitySourceSlug);
  const catalogCityId = catalogCityDest?.id || (cityTitle ? null : pageCityId);
  const hasCatalogCity = Boolean(catalogCityName);

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
  const placesHref = placesHubHrefWithSelectedCity(scopeCityParam);
  const cityHubHref = scopeCitySlug ? `/cities/${encodeURIComponent(scopeCitySlug)}` : '/cities';

  // Progressive city catalog: locations / venues / events settle independently.
  // Search stays usable as soon as the first family arrives (no Promise.all gate).
  // Named day-route presets still wait for locations+venues (see venueMatchCatalogReady).
  useEffect(() => {
    if (!catalogCityName) {
      setLocationsCatalog([]);
      setVenuesCatalog([]);
      setEventsCatalog([]);
      setEventsSearchExtra([]);
      setCatalogLoadingParts({ locations: false, venues: false, events: false });
      setVenueMatchCatalogReady(false);
      setCatalogError(null);
      return;
    }
    const controller = new AbortController();
    setLocationsCatalog([]);
    setVenuesCatalog([]);
    setEventsCatalog([]);
    setEventsSearchExtra([]);
    setCatalogLoadingParts({ locations: true, venues: true, events: true });
    setVenueMatchCatalogReady(false);
    setCatalogError(null);

    const venuesCityFilter = catalogCitySlug || catalogCitySourceSlug || catalogCityName;
    const eventsCityFilter = catalogCityName || catalogCitySlug || catalogCitySourceSlug;
    const venuesCityQ = encodeURIComponent(venuesCityFilter);
    const eventsCityQ = encodeURIComponent(eventsCityFilter);
    const venuesQs = (family: 'location' | 'institution') =>
      `/api/public/venues?family=${family}&city=${venuesCityQ}&limit=500`;

    const settledOk = { locations: false, venues: false, events: false };

    function markDone(part: 'locations' | 'venues' | 'events', ok: boolean) {
      if (controller.signal.aborted) return;
      settledOk[part] = ok;
      setCatalogLoadingParts((prev) => {
        const next = { ...prev, [part]: false };
        if (!next.locations && !next.venues) {
          setVenueMatchCatalogReady(true);
        }
        if (!next.locations && !next.venues && !next.events) {
          if (!settledOk.locations && !settledOk.venues && !settledOk.events) {
            setCatalogError(
              'Не удалось загрузить каталог. Откройте блок ещё раз или обновите страницу.',
            );
          } else {
            setCatalogError(null);
          }
        }
        return next;
      });
    }

    async function loadFamily(
      part: 'locations' | 'venues' | 'events',
      run: () => Promise<boolean>,
      attempt = 0,
    ): Promise<void> {
      try {
        const ok = await run();
        if (controller.signal.aborted) return;
        if (!ok && attempt < 1) {
          await new Promise((resolve) => window.setTimeout(resolve, 400));
          if (controller.signal.aborted) return;
          return loadFamily(part, run, attempt + 1);
        }
        markDone(part, ok);
      } catch {
        if (controller.signal.aborted) return;
        if (attempt < 1) {
          await new Promise((resolve) => window.setTimeout(resolve, 400));
          if (controller.signal.aborted) return;
          return loadFamily(part, run, attempt + 1);
        }
        markDone(part, false);
      }
    }

    void loadFamily('locations', async () => {
      const response = await fetch(venuesQs('location'), { signal: controller.signal });
      if (!response.ok) {
        setLocationsCatalog([]);
        return false;
      }
      const payload = (await response.json()) as { venues?: VenueCatalogCard[] };
      if (controller.signal.aborted) return false;
      setLocationsCatalog((payload.venues || []).map((item) => toVenueCatalogCard(item)));
      return true;
    });

    void loadFamily('venues', async () => {
      const response = await fetch(venuesQs('institution'), { signal: controller.signal });
      if (!response.ok) {
        setVenuesCatalog([]);
        return false;
      }
      const payload = (await response.json()) as { venues?: VenueCatalogCard[] };
      if (controller.signal.aborted) return false;
      setVenuesCatalog((payload.venues || []).map((item) => toVenueCatalogCard(item)));
      return true;
    });

    void loadFamily('events', async () => {
      const response = await fetch(
        `/api/public/events?city=${eventsCityQ}&limit=48&sort=popular`,
        { signal: controller.signal },
      );
      if (!response.ok) {
        setEventsCatalog([]);
        return false;
      }
      const payload = (await response.json()) as {
        items?: PublicCatalogListItemDto[];
        sessions?: PublicCatalogListItemDto[];
      };
      if (controller.signal.aborted) return false;
      setEventsCatalog(payload.items || payload.sessions || []);
      return true;
    });

    return () => controller.abort();
  }, [catalogCityName, catalogCitySlug, catalogCitySourceSlug]);

  /** Remote event hits for typed query - base popular list alone misses long-tail titles. */
  useEffect(() => {
    const needle = unifiedSearchQuery.trim();
    if (!catalogCityName || needle.length < 2) {
      setEventsSearchExtra([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const eventsCityFilter = catalogCityName || catalogCitySlug || catalogCitySourceSlug;
      const eventsCityQ = encodeURIComponent(eventsCityFilter);
      const q = encodeURIComponent(needle);
      void fetch(`/api/public/events?city=${eventsCityQ}&q=${q}&limit=40&sort=popular`, {
        signal: controller.signal,
      })
        .then(async (response) =>
          response.ok
            ? ((await response.json()) as {
                items?: PublicCatalogListItemDto[];
                sessions?: PublicCatalogListItemDto[];
              })
            : null,
        )
        .then((payload) => {
          if (controller.signal.aborted) return;
          setEventsSearchExtra(payload?.items || payload?.sessions || []);
        })
        .catch(() => {
          if (!controller.signal.aborted) setEventsSearchExtra([]);
        });
    }, 220);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [unifiedSearchQuery, catalogCityName, catalogCitySlug, catalogCitySourceSlug]);

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
    const info = resolveCityInfo(catalogCitySlug, catalogCitySourceSlug);
    return info?.mustSee || [];
  }, [catalogCitySlug, catalogCitySourceSlug]);

  const significantSuburbs = useMemo(() => {
    const info = resolveCityInfo(catalogCitySlug, catalogCitySourceSlug);
    return info?.significantSuburbs?.length ? info.significantSuburbs : [];
  }, [catalogCitySlug, catalogCitySourceSlug]);

  const dayRoutePresets = useMemo(() => {
    const info = resolveCityInfo(catalogCitySlug, catalogCitySourceSlug);
    return info?.dayRoutePresets || [];
  }, [catalogCitySlug, catalogCitySourceSlug]);
  const hasNamedPresets = dayRoutePresets.length > 0;
  /** Gate chips until match sources settle - avoids SPB 4→6 preset pop-in. */
  const presetsCatalogPending = Boolean(
    hasNamedPresets && hasCatalogCity && !venueMatchCatalogReady,
  );

  const dayPresetCityCtx = useMemo(
    () => ({
      id: catalogCityId,
      name: catalogCityName,
      slug: catalogCitySlug,
      sourceSlug: catalogCitySourceSlug,
    }),
    [catalogCityId, catalogCityName, catalogCitySlug, catalogCitySourceSlug],
  );

  const mustSeeResolved = useMemo(() => {
    if (!catalogCityName || !mustSeePlaces.length) return [];
    const cityCtx = {
      id: catalogCityId,
      name: catalogCityName,
      slug: catalogCitySlug,
      sourceSlug: catalogCitySourceSlug,
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
            preferEditorial: true,
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
  }, [mustSeePlaces, matchSources, catalogCityId, catalogCityName, catalogCitySlug, catalogCitySourceSlug]);

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

  const betweenInsertSuggestions = useMemo(() => {
    const out: Array<{
      id: string;
      title: string;
      tag: string;
      imageUrl: string | null;
      item: DayRouteVenueItem;
    }> = [];
    for (const row of mustSeeResolved) {
      if (out.length >= 4) break;
      const inRoute =
        isInDayRoute(row.item.id, route) ||
        Boolean(row.item.slug && isInDayRoute(row.item.slug, route));
      if (inRoute) continue;
      if (!lookupDayRouteCoords(row.item, buildDayRouteCoordsMap([row.item]))) continue;
      const kind = classifyMustSeePlace(row.place);
      out.push({
        id: row.item.id,
        title: row.place.name || row.item.title,
        tag: mustSeeFilterLabel(kind),
        imageUrl: resolveDayRouteStopImage(row.item) || row.item.imageUrl || null,
        item: row.item,
      });
    }
    return out;
  }, [mustSeeResolved, route]);

  const unifiedSearchOptions = useMemo<DayRouteSearchOption[]>(() => {
    const venue = locationsCatalog.find((item) => item.id === id);
    if (!venue) return;
    setRoute(appendDayRouteItem(venueCardToDayRouteItem(venue), consumeInsertAfterVenueId()));
  }

  function pickVenueById(id: string) {
    const venue = venuesCatalog.find((item) => item.id === id);
    if (!venue) return;
    setRoute(appendDayRouteItem(venueCardToDayRouteItem(venue), consumeInsertAfterVenueId()));
  }

  function pickEventById(optionId: string) {
    const eventId = optionId.replace(/^event:/, '');
    const event =
      eventsCatalog.find((item) => item.id === eventId) ||
      eventsSearchExtra.find((item) => item.id === eventId);
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
    setRoute(appendDayRouteItem(item, consumeInsertAfterVenueId()));
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

  function consumeInsertAfterVenueId(): string | null {
    const id = insertAfterVenueId;
    if (id) setInsertAfterVenueId(null);
    return id;
  }

  function addMustSeeItem(item: DayRouteVenueItem) {
    if (!lookupDayRouteCoords(item, buildDayRouteCoordsMap([item]))) {
      flashDayRouteFeedback('У места нет координат - выберите другое');
      return;
    }
    setRoute(appendDayRouteItem(item, consumeInsertAfterVenueId()));
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
    const next = appendDayRouteItem(nextItem, consumeInsertAfterVenueId());
    setRoute(next);
    const url = card.offer.ticketUrl;
    if (url && (card.offer.kind === 'affiche' || card.offer.kind === 'open_date')) {
      if (typeof window !== 'undefined') {
        if (isDayRouteVendorCheckoutUrl(url)) setGuestCheckoutUrl(url);
        else window.open(url, '_blank', 'noopener,noreferrer');
      }
      setTicketHandoff({
        venueId: nextItem.id,
        ticketUrl: url,
        title: nextItem.title,
      });
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
  /** Notes excluded - never scare users with «Без координат» after adding a Заметка. */
  const missingCoordsCount = useMemo(
    () =>
      countDayRoutePlacesMissingCoords(route.venues, (venue) =>
        Boolean(lookupDayRouteCoords(venue, coordsById)),
      ),
    [route.venues, coordsById],
  );
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
  const totalWithStopsMinutes = useMemo(
    () => travelMinutes + estimateDayRouteDwellMinutes(route.venues),
    [travelMinutes, route.venues],
  );
  const totalWithStopsLabel = useMemo(() => {
    if (route.venues.length === 0) return null;
    const label = formatDayRouteTravelMinutes(totalWithStopsMinutes);
    return label || null;
  }, [route.venues.length, totalWithStopsMinutes]);
  const mustSeeTagByKey = useMemo(() => {
    const SHORT: Record<string, string> = {
      main: 'Главное',
      gastro: 'Еда',
      museum: 'Музей',
      science: 'Семейное',
      literature: 'Литература',
      views: 'Смотровая',
      street: 'Прогулка',
      park: 'Парк',
      temple: 'Храм',
      creative: 'Арт-объект',
      secret: 'Необычное',
      houses: 'Архитектура',
      mansions: 'Особняк',
    };
    const map = new Map<string, string>();
    for (const row of mustSeeResolved) {
      const id = classifyMustSeePlace(row.place);
      const label = SHORT[id] || mustSeeFilterLabel(id);
      if (row.item.id) map.set(row.item.id, label);
      if (row.item.slug) map.set(String(row.item.slug), label);
    }
    return map;
  }, [mustSeeResolved]);
  const catalogTypeByKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const venue of [...locationsCatalog, ...venuesCatalog]) {
      const label = venueTypeLabel(venue.type, venue.name);
      if (!label || label === 'Другое') continue;
      if (venue.id) map.set(venue.id, label);
      if (venue.slug) map.set(String(venue.slug), label);
    }
    return map;
  }, [locationsCatalog, venuesCatalog]);
  const cityFallbackImage = useMemo(
    () =>
      resolveCityCardImage({
        slug: pageCitySlug || pageCitySourceSlug || undefined,
        name: pageCityName || undefined,
      }),
    [pageCitySlug, pageCitySourceSlug, pageCityName],
  );
  const resolveStopTag = useCallback(
    (venue: DayRouteVenueItem) =>
      mustSeeTagByKey.get(venue.id) ||
      (venue.slug ? mustSeeTagByKey.get(String(venue.slug)) : null) ||
      catalogTypeByKey.get(venue.id) ||
      (venue.slug ? catalogTypeByKey.get(String(venue.slug)) : null) ||
      editorialTagFromTitle(venue.title) ||
      null,
    [mustSeeTagByKey, catalogTypeByKey],
  );
  const stopTypeCounts = useMemo(
    () => buildDayRouteTypeCounts(route.venues, resolveStopTag),
    [route.venues, resolveStopTag],
  );
  const isStopTagHidden = useCallback(
    (venue: DayRouteVenueItem) => {
      if (isNoteDayRouteStop(venue)) return false;
      const tag = dayRouteStopTypeTag(venue, resolveStopTag(venue));
      return hiddenStopTags.includes(tag);
    },
    [hiddenStopTags, resolveStopTag],
  );
  const visibleRouteVenues = useMemo(
    () => route.venues.filter((v) => !isStopTagHidden(v)),
    [route.venues, isStopTagHidden],
  );
  const stopsCountLabel = useMemo(() => {
    const n = route.venues.length;
    const abs = Math.abs(n) % 100;
    const last = abs % 10;
    const word =
      abs > 10 && abs < 20 ? 'точек' : last === 1 ? 'точка' : last >= 2 && last <= 4 ? 'точки' : 'точек';
    return `${n} ${word}`;
  }, [route.venues.length]);
  const cityScopeLine = useMemo(() => {
    if (!hasPageCity) return null;
    const availablePoints =
      mustSeePlaces.length > 0 ? mustSeePlaces.length : locationsCatalog.length;
    return buildMyDayCityScopeLine({
      availablePoints,
      suburbCount: significantSuburbs.length,
    });
  }, [hasPageCity, mustSeePlaces.length, locationsCatalog.length, significantSuburbs.length]);
  const freeWindowGaps = useMemo(() => findDayRouteFreeWindowGaps(segmentMeters), [segmentMeters]);
  /** One card per product - TC sessions often share title with unique slugs/ids. */
  const uniqueMatches = useMemo(
    () => dedupeDayRouteMatches(payload?.matches || []),
    [payload?.matches],
  );
  const matchOfferStubs = useMemo((): DayRouteMatchOfferStub[] => {
    return uniqueMatches.map((m) => ({
      eventId: m.eventId,
      slug: m.slug,
      title: m.title,
      priceFromRub: m.priceFromRub,
      purchaseReady: m.purchaseReady !== false,
      covered: m.covered,
      routeVenues: (m.routeVenues || []).map((v) => ({ id: v.id })),
    }));
  }, [uniqueMatches]);
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

  const hourPlan = useMemo<DayRouteHourPlanResult | null>(() => {
    // Lovable: hour plan allowed with 1–2 stops (Step 2 CTA), not only DAY_ROUTE_MIN.
    if (!hourPlanOn || route.venues.length < 1) return null;
    return computeDayRouteHourPlan(route.venues, {
      startHHMM: hourStart,
      endHHMM: hourEnd,
      lunch: hourLunch,
    });
  }, [hourPlanOn, route.venues, hourStart, hourEnd, hourLunch]);

  const purchasedStops = useMemo(() => {
    const overflow = new Set(hourPlan?.overflowIds || []);
    const list = route.venues.filter(
      (v) => dayRouteStopIsPurchased(v) && !overflow.has(v.id),
    );
    return [...list].sort((a, b) => {
      const am = anchorMinutes(a);
      const bm = anchorMinutes(b);
      if (am == null && bm == null) return 0;
      if (am == null) return 1;
      if (bm == null) return -1;
      return am - bm;
    });
  }, [route.venues, hourPlan]);

  const planStops = useMemo(() => {
    const overflow = new Set(hourPlan?.overflowIds || []);
    return route.venues.filter((v) => !dayRouteStopIsPurchased(v) && !overflow.has(v.id));
  }, [route.venues, hourPlan]);

  const displayPlanStops = useMemo(
    () => planStops.filter((v) => !isStopTagHidden(v)),
    [planStops, isStopTagHidden],
  );
  const displayPurchasedStops = useMemo(
    () => purchasedStops.filter((v) => !isStopTagHidden(v)),
    [purchasedStops, isStopTagHidden],
  );
  const displayMapStops = useMemo(
    () =>
      mapStops.filter((stop) => {
        const venue = route.venues.find((v) => v.id === stop.id);
        return venue ? !isStopTagHidden(venue) : true;
      }),
    [mapStops, route.venues, isStopTagHidden],
  );

  const overflowStops = useMemo(() => {
    if (!hourPlan?.overflowIds.length) return [] as DayRouteVenueItem[];
    const byId = new Map(route.venues.map((v) => [v.id, v]));
    return hourPlan.overflowIds.map((id) => byId.get(id)).filter(Boolean) as DayRouteVenueItem[];
  }, [route.venues, hourPlan]);


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
  const freeWindowCityScope = useMemo(
    () =>
      buildDayRouteFreeWindowCityScope({
        pageCityId,
        pageCityName,
        pageCitySlug,
        pageCitySourceSlug,
        routeVenues: route.venues,
      }),
    [pageCityId, pageCityName, pageCitySlug, pageCitySourceSlug, route.venues],
  );

  const freeWindowUpsells = useMemo(() => {
    type FreePick = { key: string; badge: string; item: DayRouteVenueItem; hook: string | null };
    if (!freeWindowGaps.length) return [] as FreePick[];
    if (!freeWindowCityScope.tokens.size) return [] as FreePick[];
    const inDayCity = (candidate: {
      city?: string | null;
      cityId?: string | null;
      citySlug?: string | null;
      sourceCitySlug?: string | null;
    }) => dayRouteCandidateMatchesCityScope(candidate, freeWindowCityScope);
    const notInRoute = (item: DayRouteVenueItem) =>
      !isInDayRoute(item.id, route) && !(item.slug && isInDayRoute(item.slug, route));
    const picks: FreePick[] = [];
    const freeRow = mustSeeResolved.find(
      (row) =>
        (classifyMustSeePlace(row.place) === 'park' || classifyMustSeePlace(row.place) === 'temple') &&
        inDayCity(row.item) &&
        notInRoute(row.item),
    );
    if (freeRow) picks.push({ key: 'free', badge: 'Вход свободный', item: freeRow.item, hook: freeRow.hook });
    const museumRow = mustSeeResolved.find(
      (row) =>
        classifyMustSeePlace(row.place) === 'museum' && inDayCity(row.item) && notInRoute(row.item),
    );
    if (museumRow) picks.push({ key: 'museum', badge: 'Музей', item: museumRow.item, hook: museumRow.hook });
    const event = eventsCatalog.find((ev) => {
      if (!inDayCity(ev)) return false;
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
        venuesCatalog.find((v) => v.slug && v.slug === event.venueSlug && inDayCity(v)) ||
        locationsCatalog.find((v) => v.slug && v.slug === event.venueSlug && inDayCity(v)) ||
        null;
      const item = dayRouteItemFromEvent({
        id: event.id,
        slug: event.slug,
        title: event.title,
        city: event.city || pageCityName,
        cityId: event.cityId || pageCityId,
        citySlug: event.citySlug || pageCitySlug,
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
      if (item && inDayCity(item) && notInRoute(item)) {
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
        if (!inDayCity(row.item) || !notInRoute(row.item)) continue;
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
    freeWindowGaps.length,
    freeWindowCityScope,
    mustSeeResolved,
    eventsCatalog,
    venuesCatalog,
    locationsCatalog,
    route,
    pageCityId,
    pageCityName,
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
        hint: hook || venue.address || venue.city || null,
        family: 'Локация',
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
        hint: hook || venue.address || venue.city || null,
        family: 'Площадка',
        imageUrl: venue.heroImageUrl ?? null,
        disabled: inRoute || atMax,
        disabledReason: inRoute ? 'Уже в маршруте' : atMax ? dayRouteHardLimitMessage() : null,
      });
    }
    const eventsById = new Map<string, PublicCatalogListItemDto>();
    for (const event of [...eventsCatalog, ...eventsSearchExtra]) {
      if (event?.id) eventsById.set(event.id, event);
    }
    for (const event of eventsById.values()) {
      const sessionHint = [event.dateLabel, event.timeLabel].filter(Boolean).join(', ');
      const venueHint = [event.venue, sessionHint].filter(Boolean).join(' · ');
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
        family: 'Событие',
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
  }, [locationsCatalog, venuesCatalog, eventsCatalog, eventsSearchExtra, route, atMax]);

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

  function scrollToDayPresets() {
    openPicker('scenarios');
  }

  function createCustomFromSearch(title: string) {
    const trimmed = String(title || '').trim();
    if (!trimmed) return;
    armScrollPreserve();
    const before = readDayRouteFresh().venues.length;
    if (before >= DAY_ROUTE_MAX) {
      flashDayRouteFeedback(dayRouteHardLimitMessage());
      setRoute(readDayRouteFresh());
      return;
    }
    const next = addTextStopToDayRoute({
      title: trimmed,
      city: pageCityName || cityInput || null,
      cityId: pageCityId || null,
      citySlug: pageCitySlug || null,
      afterVenueId: consumeInsertAfterVenueId(),
    });
    setRoute(next);
    if (next.venues.length <= before) {
      flashDayRouteFeedback(
        next.venues.length >= DAY_ROUTE_MAX
          ? dayRouteHardLimitMessage()
          : 'Не удалось добавить точку',
      );
      return;
    }
    flashDayRouteFeedback(dayRouteAddSuccessMessage(next.venues.length));
    if (isDayRouteAtSoft(next.venues.length)) {
      flashDayRouteFeedback(DAY_ROUTE_SOFT_WARN);
    }
  }

  function openTicketView(venue: DayRouteVenueItem) {
    setTicketView({
      venueId: venue.id,
      title: venue.title,
      ticketUrl: resolveDayRouteTicketUrl(venue),
      qrData: dayRouteStopTicketQrData(venue),
      qrKind: venue.ticketQrKind || null,
    });
    void (async () => {
      try {
        const nav = navigator as Navigator & {
          wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> };
        };
        if (nav.wakeLock?.request) {
          wakeLockRef.current = await nav.wakeLock.request('screen');
        }
      } catch {
        // soft-fail
      }
      try {
        const scr = screen as Screen & { brightness?: number };
        if (typeof scr.brightness === 'number') scr.brightness = 1;
      } catch {
        // soft-fail experimental brightness
      }
    })();
  }

  function closeTicketView() {
    setTicketView(null);
    const lock = wakeLockRef.current;
    wakeLockRef.current = null;
    if (lock?.release) {
      void lock.release().catch(() => undefined);
    }
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

  async function findOwnPlaceOnMap() {
    const address = noteInput.trim();
    if (address.length < 3) {
      setGeocodeHint('Укажите адрес - минимум несколько символов');
      setGeocodePreview(null);
      return;
    }
    setGeocodeBusy(true);
    setGeocodeHint(null);
    const result = await softGeocodeAddress({
      address,
      cityName: pageCityName || cityInput || null,
      citySlug: pageCitySlug || null,
    });
    setGeocodeBusy(false);
    if (!result.ok) {
      setGeocodePreview(null);
      setGeocodeHint(softGeocodeFailureMessage(result.reason));
      return;
    }
    setGeocodePreview(result.hit);
    setCoordsInput(`${result.hit.latitude.toFixed(5)}, ${result.hit.longitude.toFixed(5)}`);
    setGeocodeHint(`Нашли: ${result.hit.displayName}. Координаты подставлены - можно добавить.`);
  }

  async function submitTextStop(event: FormEvent) {
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

    let coordsText = coordsInput.trim();
    const address = noteInput.trim();
    // Soft geocode from address when coords empty - never blocks list-only add.
    if (!coordsText && address.length >= 3) {
      setGeocodeBusy(true);
      const result = await softGeocodeAddress({
        address,
        cityName: pageCityName || cityInput || null,
        citySlug: pageCitySlug || null,
      });
      setGeocodeBusy(false);
      if (result.ok) {
        coordsText = `${result.hit.latitude.toFixed(5)}, ${result.hit.longitude.toFixed(5)}`;
        setCoordsInput(coordsText);
        setGeocodePreview(result.hit);
        setGeocodeHint(`На карте: ${result.hit.displayName}`);
      } else {
        setGeocodePreview(null);
        setGeocodeHint(softGeocodeFailureMessage(result.reason));
      }
    }

    const next = addTextStopToDayRoute({
      title,
      note: noteInput,
      city: pageCityName || cityInput || null,
      cityId: pageCityId || null,
      citySlug: pageCitySlug || null,
      coordsText,
      afterVenueId: consumeInsertAfterVenueId(),
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
    } else {
      const added = next.venues[next.venues.length - 1];
      const hasCoords = Boolean(
        added && lookupDayRouteCoords(added, buildDayRouteCoordsMap([added])),
      );
      flashDayRouteFeedback(
        hasCoords
          ? dayRouteAddSuccessMessage(next.venues.length)
          : 'В списке есть. На карте появится после адреса или lat, lng',
      );
    }
    setTitleInput('');
    setNoteInput('');
    setCoordsInput('');
    setGeocodePreview(null);
    setGeocodeHint(null);
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

  function onPlanStopDragStart(venueId: string) {
    setDragVenueId(venueId);
  }

  function onPlanStopDragOver(event: DragEvent) {
    event.preventDefault();
  }

  function onPlanStopDrop(targetVenueId: string) {
    if (!dragVenueId || dragVenueId === targetVenueId) {
      setDragVenueId(null);
      return;
    }
    const planIds = planStops.map((v) => v.id);
    const from = planIds.indexOf(dragVenueId);
    const to = planIds.indexOf(targetVenueId);
    if (from < 0 || to < 0) {
      setDragVenueId(null);
      return;
    }
    const nextPlanIds = [...planIds];
    const [moved] = nextPlanIds.splice(from, 1);
    if (!moved) {
      setDragVenueId(null);
      return;
    }
    nextPlanIds.splice(to, 0, moved);
    const planIdSet = new Set(planIds);
    let cursor = 0;
    const nextIds = route.venues.map((v) => {
      if (!planIdSet.has(v.id)) return v.id;
      return nextPlanIds[cursor++] || v.id;
    });
    setRoute(reorderDayRoute(nextIds));
    setDragVenueId(null);
  }

  function onPlanStopDragEnd() {
    setDragVenueId(null);
  }

  function onPlanGripKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    venueId: string,
  ) {
    const planIds = displayPlanStops.map((v) => v.id);
    const index = planIds.indexOf(venueId);
    if (index < 0) return;
    const title = displayPlanStops[index]?.title || 'Точка';
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      setRoute(moveDayRoutePlanVenue(venueId, event.key === 'ArrowUp' ? -1 : 1));
      return;
    }
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (grabbedKey === venueId) {
        setGrabbedKey(null);
        setDndAnnounce(`${title} отпущен на позиции ${index + 1}.`);
      } else {
        setGrabbedKey(venueId);
        setDndAnnounce(
          `${title} захвачен, позиция ${index + 1} из ${planIds.length}. Стрелки вверх и вниз меняют порядок, Escape - отпустить.`,
        );
      }
      return;
    }
    if (event.key === 'Escape' && grabbedKey === venueId) {
      event.preventDefault();
      setGrabbedKey(null);
      setDndAnnounce('Перемещение отменено.');
    }
  }

  async function exportPdfWithMap() {
    if (pdfBusy || !route.venues.length) return;
    setPdfBusy(true);
    try {
      const stops = route.venues
        .filter((v) => !isNoteDayRouteStop(v))
        .map((venue) => {
          const coords = lookupDayRouteCoords(venue, coordsById);
          const tag = dayRouteStopTypeTag(venue, resolveStopTag(venue));
          return {
            id: venue.id,
            title: venue.title,
            latitude: coords?.latitude ?? 0,
            longitude: coords?.longitude ?? 0,
            address: venue.address || venue.city || null,
            tag,
            timeLabel: hourPlan?.byId[venue.id]?.label || null,
            dwellLabel: dayRouteStopDwellChipLabel(venue, tag),
          };
        })
        .filter((s) => s.latitude && s.longitude);
      const rows = route.venues.flatMap((venue, index) => {
        if (isNoteDayRouteStop(venue)) {
          return [{ kind: 'note' as const, text: String(venue.note || venue.title || 'Заметка') }];
        }
        const stop = {
          id: venue.id,
          title: venue.title,
          latitude: lookupDayRouteCoords(venue, coordsById)?.latitude ?? 0,
          longitude: lookupDayRouteCoords(venue, coordsById)?.longitude ?? 0,
          address: venue.address || venue.city || null,
          tag: dayRouteStopTypeTag(venue, resolveStopTag(venue)),
          timeLabel: hourPlan?.byId[venue.id]?.label || null,
        };
        const out: Array<
          | { kind: 'stop'; index: number; stop: typeof stop }
          | { kind: 'leg'; text: string }
        > = [{ kind: 'stop', index: index + 1, stop }];
        const meters = segmentMeters[index];
        if (meters != null && meters > 0) {
          out.push({
            kind: 'leg',
            text: formatDayRouteSegmentHint(meters, travelMode) || '',
          });
        }
        return out;
      });
      await exportDayRoutePdfWithMap({
        title: `Маршрут - ${scopeCityName || 'город'}`,
        subtitle: stopsCountLabel,
        summary: [
          totalDistanceMeters > 0
            ? `Дистанция ${formatDayRouteDistance(totalDistanceMeters)}`
            : '',
          travelMinutes > 0
            ? `В пути ~${formatDayRouteTravelMinutes(travelMinutes)}`
            : '',
        ].filter(Boolean),
        stops,
        rows,
      });
      flashDayRouteFeedback('Откройте «Сохранить как PDF» в диалоге печати');
    } finally {
      setPdfBusy(false);
    }
  }

  function refreshScenarios() {
    setSavedScenarios(readDayRouteScenarios());
  }

  function saveCurrentAsScenario() {
    if (scenarioBusy || !route.venues.length) return;
    setScenarioSheetOpen(true);
  }

  function commitScenarioSave(name: string) {
    if (scenarioBusy || !route.venues.length) return;
    setScenarioBusy(true);
    try {
      const saved = saveDayRouteScenario({
        name,
        citySlug: scopeCitySlug || null,
        cityName: scopeCityName || null,
        venues: route.venues,
        travelMode,
        hourStart,
        hourEnd,
        hourPlanOn,
      });
      if (saved) {
        refreshScenarios();
        setScenarioSheetOpen(false);
        flashDayRouteFeedback(`Сценарий «${saved.name}» сохранён`);
        setDndAnnounce(`Сценарий «${saved.name}» сохранён.`);
      }
    } finally {
      setScenarioBusy(false);
    }
  }

  function loadScenario(scenario: DayRouteSavedScenario) {
    const n = applyDayRouteScenario(scenario);
    if (!n) return;
    setRoute(readDayRouteFresh());
    setTravelMode(scenario.travelMode);
    setHourStart(scenario.hourStart);
    setHourEnd(scenario.hourEnd);
    setHourPlanOn(scenario.hourPlanOn);
    setDndAnnounce(`Сценарий «${scenario.name}» загружен.`);
  }

  function openInsertPlaceAfter(afterVenueId: string) {
    setBetweenMenuAfterId(null);
    if (atMax) {
      setInsertAfterVenueId(null);
      flashDayRouteFeedback(dayRouteHardLimitMessage());
      return;
    }
    setInsertAfterVenueId(afterVenueId);
    openPicker('places');
  }

  function openInsertNoteAfter(afterVenueId: string, body = 'Заметка') {
    setBetweenMenuAfterId(null);
    if (atMax) {
      flashDayRouteFeedback(dayRouteHardLimitMessage());
      return;
    }
    const text = String(body || '').trim() || 'Заметка';
    setRoute(addNoteStopToDayRoute({ body: text, afterVenueId }));
    flashDayRouteFeedback('Заметка добавлена');
  }

  function insertSuggestionAfter(afterVenueId: string, item: DayRouteVenueItem) {
    setBetweenMenuAfterId(null);
    if (atMax) {
      flashDayRouteFeedback(dayRouteHardLimitMessage());
      return;
    }
    if (!lookupDayRouteCoords(item, buildDayRouteCoordsMap([item]))) {
      flashDayRouteFeedback('У места нет координат - выберите другое');
      return;
    }
    setRoute(appendDayRouteItem(item, afterVenueId));
  }

  function openTextForm() {
    openPicker('own');
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

  const mustSeeOpen = openPanel === 'mustSee';
  const matchesOpen = openPanel === 'matches';
  const showMustSeeAccordion = Boolean(hasCatalogCity && (mustSeeResolved.length > 0 || (!catalogLoading && catalogCitySlug)));
  const showScenariosGuide = Boolean(
    hasCatalogCity && (hasNamedPresets || mustSeePlaces.length >= 3),
  );
  const showSuburbsGuide = Boolean(hasCatalogCity && significantSuburbs.length > 0);
  const showHotPicks = Boolean(hasCatalogCity && (hotPickCards.length > 0 || hotPickTabIds.length > 0));
  const showBoatPicker = Boolean(
    hasCatalogCity &&
      isSpbDayRouteCity({
        slug: catalogCitySlug,
        name: catalogCityName,
        sourceSlug: catalogCitySourceSlug,
        city: catalogCityName,
      }),
  );

  const pickerTabs = [
    ...(showScenariosGuide
      ? [{ value: 'scenarios' as const, label: 'Готовые сценарии', hint: 'Соберите день в один клик', icon: Route }]
      : []),
    ...(showMustSeeAccordion
      ? [{ value: 'places' as const, label: 'Главные места', hint: 'Топ мест города', icon: MapPin }]
      : []),
    ...(showSuburbsGuide
      ? [{ value: 'suburbs' as const, label: 'Значимые пригороды', hint: 'Поездки за город на полдня', icon: Landmark }]
      : []),
    ...(showHotPicks || showMatches
      ? [{ value: 'picks' as const, label: 'Выбор Дайбилет', hint: 'Рекомендации сервиса', icon: Sparkles }]
      : []),
    ...(showBoatPicker
      ? [{ value: 'boat' as const, label: 'Теплоход', hint: 'Прогулка по Неве и каналам', icon: Ship }]
      : []),
    { value: 'own' as const, label: 'Своё место', hint: 'Если места нет в каталоге', icon: PenLine },
  ];

  function openPicker(section: MyDayPickerSection = 'scenarios') {
    const allowed = pickerTabs.some((t) => t.value === section)
      ? section
      : pickerTabs[0]?.value || 'own';
    setPickerSection(allowed);
    setPickerOpen(true);
    if (allowed === 'own') {
      setOpenPanel('text');
      window.setTimeout(() => titleFieldRef.current?.focus(), 120);
    } else if (allowed === 'places') {
      setOpenPanel('mustSee');
    }
  }

  function closePicker() {
    setPickerOpen(false);
  }

  const isEmptyRoute = route.venues.length === 0;
  const hasMapStops = mapStops.length > 0;
  const mapSelectedStopId = hoverStopId ?? focusedStopId;
  const focusedVenue = focusedStopId
    ? route.venues.find((v) => v.id === focusedStopId) ?? null
    : null;
  const focusedCoords = focusedVenue
    ? lookupDayRouteCoords(focusedVenue, coordsById)
    : null;

  useEffect(() => {
    if (!hasMapStops && mobileView === 'map') setMobileView('list');
  }, [hasMapStops, mobileView]);

  // Desktop map: open at 2+ mappable stops; collapse when route is empty or nothing to plot.
  const prevVenueCountRef = useRef(0);
  const prevHasMapStopsRef = useRef(false);
  useEffect(() => {
    const count = route.venues.length;
    const prevCount = prevVenueCountRef.current;
    const prevHas = prevHasMapStopsRef.current;

    if (count === 0 || !hasMapStops) {
      myDay.setMapOpen(false);
      myDay.closeMobileMap();
      myDay.closeMapFull();
    } else if (
      count >= DAY_ROUTE_MIN &&
      (prevCount < DAY_ROUTE_MIN || (!prevHas && hasMapStops))
    ) {
      myDay.setMapOpen(true);
    }

    prevVenueCountRef.current = count;
    prevHasMapStopsRef.current = hasMapStops;
  }, [
    route.venues.length,
    hasMapStops,
    myDay.setMapOpen,
    myDay.closeMobileMap,
    myDay.closeMapFull,
  ]);

  // When switching to full-screen map, remove transient hover highlight.
  useEffect(() => {
    if (mobileView === 'map') setHoverStopId(null);
  }, [mobileView]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (mobileView !== 'map') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileView]);

  function focusStopFromMap(stopId: string, opts?: { scrollList?: boolean }) {
    // Explicit selection should win over hover highlight.
    setHoverStopId(null);
    setFocusedStopId(stopId);
    if (mobileView === 'map') return;
    if (opts?.scrollList === false) return;
    const root = listRootRef.current || document;
    const el = root.querySelector(`[data-day-plan-stop="${String(stopId).replace(/["\\]/g, '')}"]`);
    if (el instanceof HTMLElement) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function stopExternalMapsUrl(lat: number, lng: number) {
    return `https://yandex.ru/maps/?pt=${lng},${lat}&z=17&l=map`;
  }

  function renderMapFocusCard(placement: 'desktop' | 'mobile' = 'mobile') {
    if (!focusedVenue) return null;
    // Same hint chain as must-see / catalog cards: hookFact → shortDescription → editorial desc.
    const matchedSource =
      matchSources.find((v) => v.id && v.id === focusedVenue.id) ||
      matchSources.find(
        (v) =>
          Boolean(v.slug) &&
          Boolean(focusedVenue.slug) &&
          String(v.slug) === String(focusedVenue.slug),
      ) ||
      null;
    const mustSeeRow =
      mustSeeResolved.find(
        (row) =>
          row.item.id === focusedVenue.id ||
          (Boolean(row.item.slug) &&
            Boolean(focusedVenue.slug) &&
            String(row.item.slug) === String(focusedVenue.slug)),
      ) || null;
    const hook = dayRouteHookLine(
      {
        hookFact: matchedSource?.hookFact,
        shortDescription: matchedSource?.shortDescription,
        desc: mustSeeRow?.place.desc,
        preferEditorial: true,
      },
      260,
    );
    const addressLine =
      formatStreetAddress(focusedVenue.address, { city: focusedVenue.city }) ||
      String(focusedVenue.address || '').trim() ||
      '';
    const focusSubtitle = hook || addressLine || 'Точка на карте';
    return (
      <div
        className={
          placement === 'desktop'
            ? 'pointer-events-auto absolute bottom-3 left-3 right-3 z-[1100] rounded-2xl border border-slate-200 bg-white/95 p-2.5 shadow-md backdrop-blur sm:left-auto sm:right-3 sm:w-[min(22rem,calc(100%-1.5rem))]'
            : 'pointer-events-auto absolute bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] left-3 right-3 z-[1100] rounded-2xl border border-slate-200 bg-white/95 p-2.5 shadow-md backdrop-blur'
        }
        data-day-map-focus-card
        data-day-map-focus-placement={placement}
      >
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">{focusedVenue.title}</p>
            <p
              className="mt-0.5 line-clamp-4 text-[11px] leading-snug text-slate-500"
              title={focusSubtitle}
              data-day-map-focus-subtitle
            >
              {focusSubtitle}
            </p>
          </div>
          <div
            className="flex shrink-0 flex-col items-center gap-1"
            data-day-map-focus-actions
          >
            {focusedCoords ? (
              <a
                href={stopExternalMapsUrl(focusedCoords.latitude, focusedCoords.longitude)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Показать маршрут"
                title="Показать маршрут"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-50 text-sky-700 hover:bg-sky-100"
              >
                <Navigation className="h-3.5 w-3.5" />
              </a>
            ) : null}
            <button
              type="button"
              aria-label="Удалить"
              title="Удалить"
              onClick={() => {
                setRoute(removeFromDayRoute(focusedVenue.id));
                setFocusedStopId(null);
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
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
    );
  }

  /** One mixed search: locations + venues + events, with family tags. */
  function renderUnifiedSearchSelect() {
    return (
      <DayRouteSearchSelect
        label="Поиск"
        hideLabel
        placeholder={
          insertAfterVenueId
            ? 'Вставить между точками…'
            : 'Добавить место или событие'
        }
        emptyText={
          !hasPageCity
            ? 'Сначала выберите город'
            : catalogLoading && unifiedSearchOptions.length === 0
              ? 'Загружаем…'
              : catalogError || 'Ничего не найдено'
        }
        loading={hasPageCity && catalogLoading && unifiedSearchOptions.length === 0}
        disabled={!hasPageCity || atMax}
        options={hasPageCity ? unifiedSearchOptions : []}
        onPick={pickUnifiedSearch}
        onQueryChange={setUnifiedSearchQuery}
        onCreateCustom={hasPageCity ? createCustomFromSearch : undefined}
        createCustomDisabled={atMax}
      />
    );
  }

  function renderUnifiedCatalogSearch() {
    if (!hasPageCity) {
      return (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Сначала выберите город - появятся места и события.
        </p>
      );
    }
    return (
      <div data-day-catalog-search="unified">
        {renderUnifiedSearchSelect()}
        <p className="mt-2 mb-0 text-xs text-slate-500">
          Каталог:{' '}
          <Link href={placesHref} className="font-semibold text-slate-700 underline-offset-2 hover:underline">
            места
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

  /** Empty: pre-city «Собери свой день»; post-city Lovable «Шаг 1 из 2» + map (leave as-is). */
  function renderEmptyStarter() {
    const cityLabel = scopeCityName || pageCityName || '';
    const cityInCase = cityLabel ? inCityPrepositional(cityLabel) : '';
    const firstPreset = dayRoutePresets[0] || null;
    const firstPresetItems = firstPreset
      ? buildCityDayRoutePreset(firstPreset.stops, matchSources, dayPresetCityCtx)
      : [];
    const firstPresetReady =
      Boolean(firstPreset) &&
      cityDayRoutePresetAvailable(firstPreset!.stops, matchSources, dayPresetCityCtx);

    let mapCenter: { latitude: number; longitude: number } | null = null;
    for (const place of mustSeePlaces) {
      const lat = Number(place.latitude);
      const lng = Number(place.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        mapCenter = { latitude: lat, longitude: lng };
        break;
      }
    }
    if (!mapCenter) {
      for (const row of mustSeeResolved) {
        const lat = Number(row.item.latitude);
        const lng = Number(row.item.longitude);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          mapCenter = { latitude: lat, longitude: lng };
          break;
        }
      }
    }
    if (!mapCenter) {
      mapCenter =
        lookupCityMapCoords(pageCitySlug) ||
        lookupCityMapCoords(pageCitySourceSlug) ||
        lookupCityMapCoords(pageCityName) ||
        null;
    }

    if (!hasPageCity) {
      return (
        <MyDayCityPickStarter
          ref={(node) => {
            unifiedSearchRef.current = node;
          }}
          cities={destinations}
          value={selectedCity?.cityValue || 'all'}
          onChange={async (name) => {
            if ((await selectedCity?.setCity(name)) === false) return;
            if (name !== 'all') setCityInput(name);
          }}
        />
      );
    }

    return (
      <section
        className="mt-4 grid gap-4 rounded-2xl border border-dashed border-primary-300/70 bg-primary-50/40 p-5 sm:mt-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,300px)]"
        ref={unifiedSearchRef}
        data-day-unified-search
        data-day-starter="1"
        data-day-starter-variant="lovable-step"
      >
        <div className="min-w-0">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-primary-600">
            Шаг 1 из 2
          </p>
          <h2 className="mt-1 font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
            Начните день с готового сценария
          </h2>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-600">
            Сценарий сразу добавит 5-7 точек с логистикой и таймингом. Или соберите маршрут вручную
            из главных мест {cityInCase || 'города'} - порядок потом можно менять перетаскиванием.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              data-day-empty-pick-scenario
              onClick={() => openPicker('scenarios')}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-700"
            >
              <Route className="h-4 w-4" aria-hidden />
              Выбрать готовый сценарий
            </button>
            <button
              type="button"
              data-day-empty-add-places
              onClick={() => openPicker('places')}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-primary-300 bg-white px-5 py-3 text-sm font-semibold text-primary-700 transition hover:bg-primary-50"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Добавить места самому
            </button>
          </div>
          {firstPresetReady && firstPreset ? (
            <button
              type="button"
              data-day-empty-quick-preset={firstPreset.id}
              onClick={() => {
                replaceDayRouteFromVenues(firstPresetItems, pageCityId || null);
                setRoute(readDayRouteFresh());
                flashDayRouteFeedback(
                  dayRouteAddSuccessMessage(firstPresetItems.length) ||
                    `Сценарий «${firstPreset.title}» в маршруте`,
                );
              }}
              className="mt-4 text-left text-sm font-semibold text-primary-700 underline-offset-2 hover:underline"
            >
              Или соберите за меня: «{firstPreset.title}» ({firstPresetItems.length} точек)
            </button>
          ) : null}
        </div>

        <div className="relative z-0 min-w-0" data-day-empty-map-preview>
          <div className="relative z-0 h-[220px] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 isolation-isolate lg:h-[260px]">
            {mapCenter ? (
              <DayRouteOsmMap
                stops={[]}
                fallbackCenter={mapCenter}
                className="h-full min-h-[220px] w-full"
                layoutKey="empty-preview"
              />
            ) : (
              <div className="flex h-full items-center justify-center px-4 text-center text-sm text-slate-500">
                Карта появится после выбора точек
              </div>
            )}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Превью карты {cityInCase || 'города'}: выбирайте точки - они появятся здесь сразу
          </p>
        </div>
      </section>
    );
  }

  /**
   * Non-empty plan: search under H1 (no city picker row; quiet «или сменить город»).
   * Sticky «+ Добавить» / catalog trio still add more stops.
   */
  function renderHeaderCompactSearch() {
    return (
      <div
        ref={unifiedSearchRef}
        className="mt-3 hidden w-full flex-col gap-1.5 sm:mt-4 lg:flex"
        data-day-unified-search
        data-day-header-search="1"
      >
        <div className="flex min-w-0 w-full items-start gap-2">
          <div className="min-w-0 flex-1">
            <DayRouteSearchSelect
              label="Поиск"
              hideLabel
              placeholder={
                insertAfterVenueId
                  ? 'Вставить между точками…'
                  : 'Добавить место или событие'
              }
              emptyText={
                !hasCatalogCity
                  ? 'Сначала выберите город'
                  : catalogLoading && unifiedSearchOptions.length === 0
                    ? 'Загружаем…'
                    : catalogError || 'Ничего не найдено'
              }
              loading={hasCatalogCity && catalogLoading && unifiedSearchOptions.length === 0}
              disabled={!hasCatalogCity || atMax}
              options={hasCatalogCity ? unifiedSearchOptions : []}
              onPick={pickUnifiedSearch}
              onQueryChange={setUnifiedSearchQuery}
              onCreateCustom={hasCatalogCity ? createCustomFromSearch : undefined}
              createCustomDisabled={atMax}
            />
          </div>
          {insertAfterVenueId ? (
            <button
              type="button"
              data-day-insert-after-cancel
              className="mt-0.5 inline-flex min-h-10 shrink-0 items-center rounded-xl px-2.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              onClick={() => setInsertAfterVenueId(null)}
            >
              Отмена
            </button>
          ) : null}
        </div>
        {hasCatalogCity && catalogError ? (
          <p className="mt-1 mb-0 text-xs font-medium text-rose-700" role="status">
            {catalogError}
          </p>
        ) : null}
      </div>
    );
  }

  function renderCityChangeControl() {
    return (
      <>
        <button
          type="button"
          data-day-header-city-change
          aria-expanded={headerCityChangeOpen}
          onClick={() => {
            setHeaderCityChangeOpen((open) => {
              if (open) return false;
              setHeaderCityChangeKey((key) => key + 1);
              return true;
            });
          }}
          className="m-0 inline p-0 font-medium text-slate-500 underline-offset-2 transition hover:text-slate-700 hover:underline"
        >
          Сменить город
        </button>
        {headerCityChangeOpen ? (
          <div
            className="mt-2 w-full max-w-md basis-full"
            data-day-city-picker
            data-day-header-city-picker="1"
          >
            <CityPicker
              key={headerCityChangeKey}
              defaultOpen
              cities={destinations}
              value={selectedCity?.cityValue || 'all'}
              onChange={async (name) => {
                if ((await selectedCity?.setCity(name)) === false) return;
                if (name !== 'all') setCityInput(name);
                setHeaderCityChangeOpen(false);
              }}
              allLabel="Город"
              variant="hero"
              className="w-full"
            />
          </div>
        ) : null}
      </>
    );
  }

  function renderTravelModeToggle() {
    return (
      <div
        className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-slate-200/80 bg-white p-0.5"
        role="group"
        aria-label="Способ перемещения"
        data-day-travel-mode
      >
        <button
          type="button"
          onClick={() => setTravelMode('walk')}
          aria-pressed={travelMode === 'walk'}
          aria-label="Пешком"
          title="Пешком"
          className={`inline-flex h-7 w-7 items-center justify-center rounded-full transition ${
            travelMode === 'walk'
              ? 'bg-teal-50 text-teal-800'
              : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
          }`}
        >
          <PersonStanding className="h-3.5 w-3.5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => setTravelMode('auto')}
          aria-pressed={travelMode === 'auto'}
          aria-label="На авто"
          title="На авто"
          className={`inline-flex h-7 w-7 items-center justify-center rounded-full transition ${
            travelMode === 'auto'
              ? 'bg-teal-50 text-teal-800'
              : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
          }`}
        >
          <Car className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    );
  }

  function renderOptimizeGhost() {
    if (!canOptimize) return null;
    return (
      <button
        type="button"
        onClick={optimizeOrder}
        data-day-map-optimize
        className="inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 lg:w-auto lg:min-h-8"
      >
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        Оптимизировать маршрут
      </button>
    );
  }

  /**
   * Mobile: demote Plan/Optimize to compact icon buttons so they do not stack
   * against sticky primary «Посмотреть готовый день».
   */
  function renderMobileRouteActions() {
    const canHourPlan = route.venues.length >= 1;
    if (!canHourPlan && !canOptimize) return null;
    return (
      <div
        className="flex w-full items-center justify-end gap-1.5 lg:hidden"
        data-day-route-toolbar-inner
        data-day-mobile-route-actions
        role="group"
        aria-label="Действия с маршрутом"
      >
        {canHourPlan ? (
          hourPlanOn ? (
            <button
              type="button"
              data-day-hour-reset
              aria-label="Сбросить время"
              title="Сбросить время"
              onClick={() => {
                setHourPlanOn(false);
                setHourSheetOpen(false);
              }}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            >
              <Clock className="h-4 w-4 shrink-0" aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              data-day-hour-plan
              aria-label="Распланировать"
              title="Распланировать"
              onClick={() => setHourSheetOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"
            >
              <Clock className="h-4 w-4 shrink-0" aria-hidden />
            </button>
          )
        ) : null}
        {canOptimize ? (
          <button
            type="button"
            onClick={optimizeOrder}
            data-day-map-optimize
            aria-label="Оптимизировать маршрут"
            title="Оптимизировать маршрут"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          >
            <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
          </button>
        ) : null}
      </div>
    );
  }

  /** Desktop distance/stats row: Hour plan + Optimize flush right (title row stays airy). */
  function renderDesktopDistanceActions() {
    const canHourPlan = route.venues.length >= 1;
    if (!canHourPlan && !canOptimize) return null;
    return (
      <div
        className="hidden shrink-0 items-center justify-end gap-1.5 lg:flex"
        data-day-desktop-distance-actions
      >
        {canHourPlan ? (
          hourPlanOn ? (
            <button
              type="button"
              data-day-hour-reset
              onClick={() => {
                setHourPlanOn(false);
                setHourSheetOpen(false);
              }}
              className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Clock className="h-3.5 w-3.5 shrink-0" />
              Сбросить время
            </button>
          ) : (
            <button
              type="button"
              data-day-hour-plan
              onClick={() => setHourSheetOpen(true)}
              className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-full border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-800 transition hover:bg-primary-100"
            >
              <Clock className="h-3.5 w-3.5 shrink-0" />
              Распланировать день по часам
            </button>
          )
        ) : null}
        {renderOptimizeGhost()}
      </div>
    );
  }

  return (
    <>
    <div
      className={`container-page px-4 py-5 sm:px-6 sm:py-10 print:hidden lg:pb-10 ${
        isEmptyRoute
          ? 'pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))]'
          : hasMapStops
            ? 'pb-[calc(8rem+env(safe-area-inset-bottom,0px))]'
            : 'pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]'
      }`}
      data-day-mobile-list-first="1"
      data-day-section-width="full"
      data-day-mobile-view={mobileView}
    >
      <div ref={listRootRef} className="min-w-0" data-day-list-root>
      {!isEmptyRoute ? (
        <>
        {/* Lovable: full-width top bar OUTSIDE map grid (map must not eat Open/Save/Share). */}
        <header
          className="mb-4 flex flex-col gap-3 sm:mb-5 lg:flex-row lg:items-center lg:justify-between lg:gap-4"
          data-my-day-topbar
          ref={shareMenuRef}
        >
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3 lg:flex lg:flex-1 lg:items-center">
            <div className="min-w-0">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Дайбилет · план дня
              </p>
              <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <h1 className="font-display text-[1.65rem] font-extrabold tracking-tight leading-tight text-slate-900 sm:text-3xl">
                  {scopeCityName ? `Мой день ${inCityPrepositional(scopeCityName)}` : 'Мой день'}
                </h1>
                {cityScopeLine ? (
                  <span className="hidden text-[13px] font-medium text-slate-500 lg:inline" data-day-city-scope>
                    {cityScopeLine}
                  </span>
                ) : null}
              </div>
              <p
                className="mt-1 flex flex-wrap items-baseline gap-x-1 text-[13px] font-medium text-slate-500 lg:mt-0.5"
                data-day-route-count-label
              >
                <span className="lg:hidden">{cityScopeLine}</span>
                {cityScopeLine && scopeCityName ? (
                  <span className="lg:hidden" aria-hidden>
                    ·
                  </span>
                ) : null}
                {scopeCityName ? (
                  <Link
                    href={cityHubHref}
                    className="text-primary-600 transition-colors hover:text-primary-700 hover:underline"
                    data-day-city-hub-link
                  >
                    Страница {cityToGenitive(scopeCityName)}
                  </Link>
                ) : null}
                {scopeCityName ? (
                  <span aria-hidden>·</span>
                ) : null}
                {renderCityChangeControl()}
              </p>
            </div>

            <div className="relative flex shrink-0 items-center gap-2 lg:hidden">
              <button
                type="button"
                onClick={() => setShareMenuOpen(true)}
                aria-label="Поделиться"
                title="Поделиться"
                data-day-share
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 text-white transition hover:bg-primary-700"
              >
                <Share2 className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>

          <div
            className="relative hidden shrink-0 flex-wrap items-center gap-2 lg:flex"
            data-day-desktop-actions
          >
            {yandexUrl ? (
              <a
                href={yandexUrl}
                target="_blank"
                rel="noreferrer"
                data-day-open-route
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                <Navigation className="h-4 w-4" aria-hidden />
                Открыть маршрут
              </a>
            ) : (
              <button
                type="button"
                disabled
                title="Нужны точки с координатами"
                className="inline-flex cursor-not-allowed items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-400"
              >
                <Navigation className="h-4 w-4" aria-hidden />
                Открыть маршрут
              </button>
            )}
            <button
              type="button"
              onClick={saveCurrentAsScenario}
              data-day-save
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              <Bookmark className="h-4 w-4" aria-hidden />
              Сохранить
            </button>
            <button
              type="button"
              onClick={() => setShareMenuOpen(true)}
              data-day-share
              className="inline-flex items-center gap-2 rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700"
            >
              <Share2 className="h-4 w-4" aria-hidden />
              {copyStatus === 'ok' ? 'Скопировано!' : 'Поделиться'}
            </button>
          </div>
        </header>

        <MyDayShell
          mapOpen={myDay.mapOpen}
          showMapColumn={hasMapStops}
          list={
            <div data-my-day-list-inner data-my-day-page-col="1">
      {/* ≥1 stop: compact city+search under topbar (no mid-page bordered starter card) */}
      {!isEmptyRoute ? renderHeaderCompactSearch() : null}

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

      {/* Alerts + Lovable Step 2 (1–2 stops supersedes plain belowMin sky alert) */}
      {route.venues.length ? (
        <>
          {mixedCities ? (
            <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Точки из разных городов. Для подбора экскурсий лучше оставить один город.
            </p>
          ) : null}
          {showStep2Card ? (
            <section
              className="mt-4 rounded-2xl border border-dashed border-primary-300/70 bg-primary-50/40 p-5 sm:p-6"
              data-day-step2-card
              aria-labelledby="day-step2-title"
            >
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-primary-600">
                Шаг 2 из 2
              </p>
              <h2
                id="day-step2-title"
                className="mt-1 font-display text-lg font-extrabold text-slate-900 sm:text-xl"
              >
                Дополните день - сейчас {route.venues.length}{' '}
                {route.venues.length === 1 ? 'точка' : 'точки'} из {DAY_ROUTE_SOFT}
              </h2>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-600">
                Добавьте ещё 2-4 места рядом или включите план по часам - мы разложим маршрут по
                времени и покажем, что не помещается в день.
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  data-day-step2-add-places
                  onClick={() => openPicker('places')}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-primary-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-700"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Добавить ещё места
                </button>
                <button
                  type="button"
                  data-day-step2-hour-plan
                  onClick={() => setHourPlanOn(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-primary-300 bg-white px-5 py-3 text-sm font-semibold text-primary-700 transition hover:bg-primary-50"
                >
                  <Clock className="h-4 w-4" aria-hidden />
                  Спланировать по часам
                </button>
              </div>
            </section>
          ) : belowMin ? (
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

      {hasCatalogCity && pickerTabs.length ? (
        <div className="mt-4 lg:mt-5" data-my-day-picker-host>
          <MyDayPickerLaunch tabs={pickerTabs} onOpen={openPicker} />
        </div>
      ) : null}

      {/* Mobile shelf tabs - only empty day (Lovable: no dual tabs when route exists) */}
      {!route.venues.length && hasCatalogCity && pickerTabs.length ? (
        <div
          className="sticky top-[var(--site-header-height)] z-20 -mx-4 mt-4 border-b border-slate-200/80 bg-white/95 px-4 py-2 backdrop-blur lg:hidden"
          data-day-mobile-shelf-tabs
          role="tablist"
          aria-label="Разделы моего дня"
        >
        <div className="flex gap-1 rounded-xl bg-[#F5F5F7] p-1">
          <button
            type="button"
            role="tab"
            aria-selected={mobileShelf === 'route'}
            onClick={() => {
              setMobileShelf('route');
              setMobileView('list');
            }}
            className={`inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold transition ${
              mobileShelf === 'route'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500'
            }`}
          >
            <Route className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Карта и шаги{route.venues.length ? ` (${route.venues.length})` : ''}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobileShelf === 'add'}
            onClick={() => openPicker(pickerTabs[0]?.value || 'own')}
            className={`inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold transition ${
              pickerOpen
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500'
            }`}
          >
            <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Добавить места
          </button>
        </div>
        </div>
      ) : null}

      <div
        className={
          route.venues.length > 0 || mobileShelf === 'route'
            ? 'contents'
            : 'hidden lg:contents'
        }
        data-day-mobile-shelf-panel="route"
      >
      {/* 1. Route list */}
      {!route.venues.length ? null : (
        <section
          className="mt-4 w-full max-lg:rounded-2xl max-lg:bg-[#F5F5F7] max-lg:p-3 sm:mt-6"
          data-day-route-list-section
        >
          <MyDayToolbar
            stopsCount={route.venues.length}
            stopsCountLabel={stopsCountLabel}
            distanceLabel={
              totalDistanceMeters > 0 ? formatDayRouteDistance(totalDistanceMeters) : null
            }
            travelMinutesLabel={
              travelMinutes > 0 ? formatDayRouteTravelMinutes(travelMinutes) : null
            }
            totalWithStopsLabel={totalWithStopsLabel}
            travelMode={travelMode}
            onTravelModeChange={setTravelMode}
            canOptimize={canOptimize}
            onOptimize={optimizeOrder}
            hourPlanOn={hourPlanOn}
            canHourPlan={route.venues.length >= 1}
            onToggleHourPlan={() => {
              setHourPlanOn(false);
              setHourSheetOpen(false);
            }}
            onOpenHourSheet={() => setHourSheetOpen(true)}
            hourStart={hourStart}
            hourEnd={hourEnd}
            onHourStartChange={setHourStart}
            onHourEndChange={setHourEnd}
            onClear={() => {
              clearDayRoute();
              setRoute(readDayRoute());
              replaceMyDayUrl('/my-day');
            }}
            onPrintPdf={() => {
              void exportPdfWithMap();
            }}
            printPdfBusy={pdfBusy}
            printPdfLabel="PDF с картой"
            onSaveScenario={saveCurrentAsScenario}
            saveScenarioBusy={scenarioBusy}
            typeCounts={stopTypeCounts}
            hiddenTags={hiddenStopTags}
            visibleStopsCount={visibleRouteVenues.filter((v) => !isNoteDayRouteStop(v)).length}
            onToggleTag={(tag) => {
              setHiddenStopTags((prev) =>
                prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
              );
            }}
            onShowAllTags={() => setHiddenStopTags([])}
            scheduleSlot={
              <>
                <div className="sr-only" aria-live="polite">
                  {dndAnnounce}
                </div>
                {hourPlanOn && hourPlan ? (
                  <MyDayHourGantt
                    venues={route.venues}
                    plan={hourPlan}
                    dayStartHHMM={hourStart}
                    dayEndHHMM={hourEnd}
                    onFocusStop={(id) => setFocusedStopId(id)}
                    className="mb-3"
                  />
                ) : null}
                <MyDayScheduleBanner
                overflowCount={overflowStops.length}
                totalLabel={hourPlan?.totalLabel || null}
                lunchLabel={hourPlan?.lunchHint?.label || null}
                onTrimOverflow={
                  overflowStops.length
                    ? () => {
                        for (const v of overflowStops) setRoute(removeFromDayRoute(v.id));
                      }
                    : undefined
                }
                onExtendEnd={
                  hourPlanOn
                    ? () => {
                        setHourEnd('23:30');
                      }
                    : undefined
                }
              />
              </>
            }
          />

          <MyDayItinerary>
          {missingCoordsCount > 0 ? (
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {coordsCount < 2
                ? `У ${missingCoordsCount} ${missingCoordsCount === 1 ? 'точки' : 'точек'} нет координат - Яндекс.Карты пока недоступны. Добавьте места из каталога или укажите lat, lng в «своём месте».`
                : `Без координат: ${missingCoordsCount}. В Яндекс уйдут только ${coordsCount} точки с координатами (в текущем порядке).`}
            </p>
          ) : null}

          {/* Сетка pairs with «Шаги»; Список keeps Wanderlog itinerary only. */}
          {effectiveStopViewMode === 'grid' && timelineStops.length > 0 ? (
            <div className="mt-3" data-day-route-timeline-wrap>
              <DayRouteStopsTimeline
                stops={timelineStops}
                activeId={timelineActiveId}
                onSelect={focusStopFromTimeline}
              />
            </div>
          ) : null}

          {displayPurchasedStops.length ? (
            <div className="mt-3" data-day-group="purchased">
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-primary-700">
                Купленные билеты
              </p>
              <ul
                className={
                  effectiveStopViewMode === 'grid'
                    ? DAY_ROUTE_STOPS_GRID_RAIL
                    : 'grid w-full grid-cols-1 items-start gap-0'
                }
                data-day-plan-list="purchased"
                data-day-stop-view={effectiveStopViewMode}
              >
                {displayPurchasedStops.map((venue, index) => (
                  <DayRouteVenueCard
                    key={venue.id}
                    index={index}
                    total={purchasedStops.length}
                    venue={venue}
                    variant={effectiveStopViewMode}
                    group="purchased"
                    softTimeLabel={hourPlan?.byId[venue.id]?.label || null}
                    hasCoords={Boolean(lookupDayRouteCoords(venue, coordsById))}
                    mapsUrl={(() => {
                      const c = lookupDayRouteCoords(venue, coordsById);
                      return c ? stopExternalMapsUrl(c.latitude, c.longitude) : null;
                    })()}
                    segmentToNext={null}
                    travelMode={travelMode}
                    focused={focusedStopId === venue.id}
                    onMoveUp={() => undefined}
                    onMoveDown={() => undefined}
                    onRemove={() => setRoute(removeFromDayRoute(venue.id))}
                    onToggleBought={() =>
                      setRoute(
                        updateDayRouteVenue(venue.id, { ticketBought: !venue.ticketBought }),
                      )
                    }
                    onBuyClick={(ticketUrl) =>
                      setTicketHandoff({ venueId: venue.id, ticketUrl, title: venue.title })
                    }
                    onShowTicket={() => openTicketView(venue)}
                    onSetNote={(note) =>
                      setRoute(updateDayRouteVenue(venue.id, { note: note || null }))
                    }
                    onHoverStop={(id) => setHoverStopId(id)}
                    onHoverClear={() => setHoverStopId(null)}
                  />
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-3" data-day-group="plans">
            {purchasedStops.length || overflowStops.length ? (
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Мои планы
              </p>
            ) : null}
            <ul
                className={
                  effectiveStopViewMode === 'grid'
                    ? DAY_ROUTE_STOPS_GRID_RAIL
                    : 'flex w-full flex-col items-stretch gap-1'
                }
                data-day-plan-list="plans"
              data-day-stop-view={effectiveStopViewMode}
            >
              {effectiveStopViewMode === 'list' && planStops.length > 0 ? (
                <DayRouteBetweenInsert
                  afterVenueId="__start__"
                  menuOpen={betweenMenuAfterId === '__start__'}
                  onMenuOpenChange={(open) =>
                    setBetweenMenuAfterId(open ? '__start__' : null)
                  }
                  segmentMeters={null}
                  travelMode={travelMode}
                  disabled={atMax}
                  suggestions={betweenInsertSuggestions}
                  onAddNote={(text) => openInsertNoteAfter('__start__', text)}
                  onAddSuggestion={(item) => insertSuggestionAfter('__start__', item)}
                  onOpenFullPicker={() => openInsertPlaceAfter('__start__')}
                />
              ) : null}
              {displayPlanStops.map((venue, index) => {
                const globalIndex = route.venues.findIndex((v) => v.id === venue.id);
                const nextTipRaw =
                  globalIndex >= 0
                    ? route.venues[globalIndex + 1]?.transitTip
                    : displayPlanStops[index + 1]?.transitTip;
                const betweenTip =
                  index < displayPlanStops.length - 1
                    ? formatDayRouteTransitTipLine(nextTipRaw)
                    : '';
                const segmentToNext =
                  globalIndex >= 0 ? segmentMeters[globalIndex] ?? null : null;
                const listMode = effectiveStopViewMode === 'list';
                return (
                  <Fragment key={venue.id}>
                    <DayRouteVenueCard
                      index={index}
                      total={displayPlanStops.length}
                      displayNumber={globalIndex >= 0 ? globalIndex + 1 : index + 1}
                      venue={venue}
                      variant={effectiveStopViewMode}
                      group="plans"
                      softTimeLabel={hourPlan?.byId[venue.id]?.label || null}
                      typeTag={dayRouteStopTypeTag(venue, resolveStopTag(venue))}
                      fallbackImageUrl={cityFallbackImage}
                      hasCoords={Boolean(lookupDayRouteCoords(venue, coordsById))}
                      mapsUrl={(() => {
                        const c = lookupDayRouteCoords(venue, coordsById);
                        return c ? stopExternalMapsUrl(c.latitude, c.longitude) : null;
                      })()}
                      segmentToNext={segmentToNext}
                      hideGeoSegment={listMode}
                      travelMode={travelMode}
                      focused={focusedStopId === venue.id}
                      dragging={dragVenueId === venue.id}
                      grabbed={grabbedKey === venue.id}
                      onDragStart={
                        dayRouteStopReorderLocked(venue)
                          ? undefined
                          : () => onPlanStopDragStart(venue.id)
                      }
                      onDragOver={
                        dayRouteStopReorderLocked(venue)
                          ? undefined
                          : (event) => onPlanStopDragOver(event)
                      }
                      onDrop={
                        dayRouteStopReorderLocked(venue)
                          ? undefined
                          : () => onPlanStopDrop(venue.id)
                      }
                      onDragEnd={onPlanStopDragEnd}
                      onGripKeyDown={(event) => onPlanGripKeyDown(event, venue.id)}
                      onGripBlur={() => {
                        if (grabbedKey === venue.id) setGrabbedKey(null);
                      }}
                      onMoveUp={() => setRoute(moveDayRoutePlanVenue(venue.id, -1))}
                      onMoveDown={() => setRoute(moveDayRoutePlanVenue(venue.id, 1))}
                      onRemove={() => setRoute(removeFromDayRoute(venue.id))}
                      onToggleBought={() =>
                        setRoute(
                          updateDayRouteVenue(venue.id, { ticketBought: !venue.ticketBought }),
                        )
                      }
                      onBuyClick={(ticketUrl) =>
                        setTicketHandoff({ venueId: venue.id, ticketUrl, title: venue.title })
                      }
                      onShowTicket={() => openTicketView(venue)}
                      onSetNote={(note) => {
                        const body = String(note || '').trim();
                        setRoute(
                          updateDayRouteVenue(
                            venue.id,
                            isNoteDayRouteStop(venue)
                              ? { note: body || 'Заметка', title: body || 'Заметка' }
                              : { note: body || null },
                          ),
                        );
                      }}
                      onHoverStop={(id) => setHoverStopId(id)}
                      onHoverClear={() => setHoverStopId(null)}
                    />
                    {listMode ? (
                      <DayRouteBetweenInsert
                        afterVenueId={venue.id}
                        menuOpen={betweenMenuAfterId === venue.id}
                        onMenuOpenChange={(open) =>
                          setBetweenMenuAfterId(open ? venue.id : null)
                        }
                        segmentMeters={index < planStops.length - 1 ? segmentToNext : null}
                        travelMode={travelMode}
                        transitTip={index < planStops.length - 1 ? betweenTip : ''}
                        disabled={atMax}
                        suggestions={betweenInsertSuggestions}
                        onAddNote={(text) => openInsertNoteAfter(venue.id, text)}
                        onAddSuggestion={(item) => insertSuggestionAfter(venue.id, item)}
                        onOpenFullPicker={() => openInsertPlaceAfter(venue.id)}
                      />
                    ) : null}
                    {(() => {
                      const gapAtIndex =
                        globalIndex >= 0
                          ? freeWindowGaps.find((g) => g.afterIndex === globalIndex)
                          : null;
                      if (
                        !gapAtIndex ||
                        !freeWindowUpsells.length ||
                        atMax ||
                        freeWindowDismissed
                      ) {
                        return null;
                      }
                      return (
                        <li
                          className="relative ml-7 list-none sm:ml-8"
                          data-day-free-window-upsell
                          data-day-free-window
                          data-day-free-window-after={globalIndex}
                        >
                          <div className="mb-2 rounded-2xl border border-dashed border-primary-300/60 bg-[#F5F5F7] p-4">
                            <button
                              type="button"
                              onClick={() => setFreeWindowDismissed(true)}
                              className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full text-slate-500 transition hover:bg-white hover:text-slate-800"
                              aria-label="Скрыть свободное окно"
                              data-day-free-window-dismiss
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                            <p className="pr-8 text-sm font-semibold text-slate-900">
                              Свободное окно
                            </p>
                            <p className="mt-1 text-sm text-slate-600">
                              Между точками около {formatDayRouteDistance(gapAtIndex.meters)} -
                              можно добавить ещё одну остановку.
                            </p>
                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                              {freeWindowUpsells.slice(0, 2).map((pick) => (
                                <button
                                  key={`${globalIndex}-${pick.key}`}
                                  type="button"
                                  onClick={() => addMustSeeItem(pick.item)}
                                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2 text-left transition hover:border-primary-200 hover:bg-primary-50/40"
                                >
                                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
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
                                  <span className="min-w-0 flex-1">
                                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-primary-700">
                                      {pick.badge}
                                    </span>
                                    <span className="mt-0.5 block text-xs font-semibold leading-snug text-slate-900">
                                      {pick.item.title}
                                    </span>
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </li>
                      );
                    })()}
                  </Fragment>
                );
              })}
            </ul>
          </div>

          {overflowStops.length ? (
            <div className="mt-4" data-day-group="overflow">
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-amber-700">
                Не поместилось в график (запасные планы)
              </p>
              <ul
                className={
                  effectiveStopViewMode === 'grid'
                    ? DAY_ROUTE_STOPS_GRID_RAIL
                    : 'grid w-full grid-cols-1 items-start gap-0'
                }
                data-day-plan-list="overflow"
                data-day-stop-view={effectiveStopViewMode}
              >
                {overflowStops.map((venue, index) => (
                  <DayRouteVenueCard
                    key={venue.id}
                    index={index}
                    total={overflowStops.length}
                    venue={venue}
                    variant={effectiveStopViewMode}
                    group="overflow"
                    softTimeLabel={null}
                    hasCoords={Boolean(lookupDayRouteCoords(venue, coordsById))}
                    mapsUrl={(() => {
                      const c = lookupDayRouteCoords(venue, coordsById);
                      return c ? stopExternalMapsUrl(c.latitude, c.longitude) : null;
                    })()}
                    segmentToNext={null}
                    travelMode={travelMode}
                    focused={focusedStopId === venue.id}
                    onMoveUp={() => setRoute(moveDayRoutePlanVenue(venue.id, -1))}
                    onMoveDown={() => setRoute(moveDayRoutePlanVenue(venue.id, 1))}
                    onRemove={() => setRoute(removeFromDayRoute(venue.id))}
                    onToggleBought={() =>
                      setRoute(
                        updateDayRouteVenue(venue.id, { ticketBought: !venue.ticketBought }),
                      )
                    }
                    onBuyClick={(ticketUrl) =>
                      setTicketHandoff({ venueId: venue.id, ticketUrl, title: venue.title })
                    }
                    onShowTicket={() => openTicketView(venue)}
                    onSetNote={(note) =>
                      setRoute(updateDayRouteVenue(venue.id, { note: note || null }))
                    }
                    onHoverStop={(id) => setHoverStopId(id)}
                    onHoverClear={() => setHoverStopId(null)}
                  />
                ))}
              </ul>
            </div>
          ) : null}

          </MyDayItinerary>
        </section>
      )}

      </div>
            </div>
          }
          map={
            mapStops.length > 0 ? (
              <MyDayMapAside
                mapOpen={myDay.mapOpen}
                onToggleOpen={myDay.toggleMapOpen}
                onOpenFull={myDay.openMapFull}
              >
                <div className="relative isolate h-full min-h-[20rem] w-full">
                  <DayRouteOsmMap
                    stops={displayMapStops}
                    selectedStopId={mapSelectedStopId}
                    onStopClick={(stopId) => focusStopFromMap(stopId, { scrollList: false })}
                    className="h-full min-h-[20rem] w-full bg-slate-100"
                  />
                  {renderMapFocusCard('desktop')}
                </div>
              </MyDayMapAside>
            ) : (
              <div className="hidden" />
            )
          }
        />
        </>
      ) : (
        <>
          {hasPageCity ? (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h1 className="font-display text-[1.65rem] font-extrabold tracking-tight leading-tight text-slate-900 sm:text-3xl">
                  {scopeCityName ? `Мой день ${inCityPrepositional(scopeCityName)}` : 'Мой день'}
                </h1>
                <p
                  className="mt-1.5 flex flex-wrap items-baseline gap-x-1 text-[13px] font-medium text-slate-500"
                  data-day-route-count-label
                  data-day-city-scope
                >
                  {cityScopeLine ? <span>{cityScopeLine}</span> : null}
                  {cityScopeLine && scopeCityName ? <span aria-hidden>·</span> : null}
                  {scopeCityName ? (
                    <Link
                      href={cityHubHref}
                      className="text-primary-600 transition-colors hover:text-primary-700 hover:underline"
                      data-day-city-hub-link
                    >
                      Страница {cityToGenitive(scopeCityName)}
                    </Link>
                  ) : null}
                  {scopeCityName ? <span aria-hidden>·</span> : null}
                  {renderCityChangeControl()}
                </p>
              </div>
            </div>
          ) : null}
          {hasCatalogCity && pickerTabs.length ? (
            <div className="mt-4 lg:mt-5" data-my-day-picker-host>
              <MyDayPickerLaunch tabs={pickerTabs} onOpen={openPicker} />
            </div>
          ) : null}
          {isEmptyRoute ? renderEmptyStarter() : null}
        </>
      )}

      <MyDayPickerSheet
        open={pickerOpen}
        section={pickerSection}
        tabs={pickerTabs}
        onSectionChange={(next) => {
          setPickerSection(next);
          if (next === 'own') {
            setOpenPanel('text');
            window.setTimeout(() => titleFieldRef.current?.focus(), 80);
          } else if (next === 'places') setOpenPanel('mustSee');
        }}
        onClose={closePicker}
      >
      {/* Picker panels - only active tab visible */}
      {showScenariosGuide && pickerSection === 'scenarios' ? (
        <section
          className="rounded-2xl border border-slate-200 bg-white px-4 py-4 sm:px-5 sm:py-5"
          data-day-guide="scenarios"
        >
          <p className="text-sm font-semibold text-slate-900">Готовые сценарии</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {hasNamedPresets
              ? 'Готовые маршруты на день - план с логистикой и точками'
              : 'Собрать день из главных мест'}
          </p>
          <div className="mt-3">
            <CityDayPresetBlock
              places={mustSeePlaces}
              venues={matchSources}
              city={dayPresetCityCtx}
              namedPresets={dayRoutePresets}
              catalogPending={presetsCatalogPending}
              navigateToMyDay={false}
              inMyDay
              embedded
            />
          </div>
          {savedScenarios.length ? (
            <div className="mt-4 border-t border-slate-100 pt-3" data-day-saved-scenarios>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Мои сценарии
              </p>
              <ul className="mt-2 space-y-1.5">
                {savedScenarios.slice(0, 8).map((scenario) => (
                  <li
                    key={scenario.id}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2"
                  >
                    <button
                      type="button"
                      onClick={() => loadScenario(scenario)}
                      className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-slate-800 hover:text-primary-700"
                    >
                      {scenario.name}
                    </button>
                    <button
                      type="button"
                      aria-label={`Удалить сценарий ${scenario.name}`}
                      onClick={() => {
                        removeDayRouteScenario(scenario.id);
                        refreshScenarios();
                      }}
                      className="grid h-7 w-7 place-items-center rounded-full text-slate-400 hover:bg-white hover:text-slate-700"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {showSuburbsGuide && pickerSection === 'suburbs' ? (
        <section
          className="rounded-2xl border border-slate-200 bg-white px-4 py-4 sm:px-5 sm:py-5"
          data-day-guide="suburbs"
        >
          <p className="text-sm font-semibold text-slate-900">Значимые пригороды</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Поездка на день рядом с городом - логистика, гастро и точки
          </p>
          <div className="mt-3">
            <SuburbsCarousel
              places={significantSuburbs}
              venues={matchSources}
              city={dayPresetCityCtx}
              cityGenitive={cityToGenitive(catalogCityName || pageCityName || '')}
              compact
              hideHeader
              className="mt-0"
            />
          </div>
        </section>
      ) : null}

      {/* Accordion stack: must-see → custom → boat → matches → hot picks → catalog. */}
      {/* Accordion: must-see chips (route builder) */}
      {showMustSeeAccordion && pickerSection === 'places' ? (
        <div data-day-accordion="mustSee" data-day-must-see>
          <MustSeeFilterTabs
            tabs={mustSeeFilterMeta.tabs}
            hideCount
            activeId={
              mustSeeFilterMeta.tabs.length < 2
                ? mustSeeFilterMeta.defaultId
                : mustSeeFilter
            }
            onChange={setMustSeeFilter}
          />
          {mustSeeResolved.length > 0 ? (
            <div
              id="day-must-see-list"
              className="mt-3 flex flex-col gap-2.5"
              data-day-must-see-list
              data-day-must-see-expanded="1"
              data-day-must-see-layout="horizontal-row"
            >
              {mustSeeFiltered.map(({ place, item, hook }) => {
                const inRoute =
                  isInDayRoute(item.id, route) || Boolean(item.slug && isInDayRoute(item.slug, route));
                const hasItemCoords = Boolean(
                  lookupDayRouteCoords(item, buildDayRouteCoordsMap([item])),
                );
                const thumb = resolveDayRouteStopImage(item) || item.imageUrl || null;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={inRoute || atMax || !hasItemCoords}
                    data-day-must-see-card={item.id}
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
                    className={`flex w-full min-w-0 flex-row items-stretch gap-3 rounded-xl border p-2.5 text-left transition disabled:cursor-not-allowed sm:gap-3.5 sm:p-3 ${
                      inRoute
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-900'
                        : 'border-slate-200 bg-white text-slate-800 hover:border-primary-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="relative h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-lg bg-slate-100 sm:h-24 sm:w-28">
                      {thumb ? (
                        <SafeImage
                          src={thumb}
                          alt=""
                          fill
                          sizes="7rem"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-200 via-slate-100 to-primary-100 text-slate-400">
                          <MapPin className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <span className="flex min-w-0 flex-1 flex-col justify-center py-0.5">
                      <span className="block line-clamp-2 text-sm font-semibold leading-snug sm:text-[0.95rem]">
                        {place.name}
                      </span>
                      {hook ? (
                        <span className="mt-1 block line-clamp-2 text-xs leading-snug text-slate-500 sm:line-clamp-3">
                          {hook}
                        </span>
                      ) : null}
                    </span>
                    <span
                      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center self-center rounded-full ${
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
          ) : (
            <p className="mt-3 text-xs text-slate-500">
              Для этого города пока нет списка главных мест - добавьте точки через поиск или своё место.
            </p>
          )}
        </div>
      ) : null}

      {pickerSection === 'own' ? (
        <div
          className="rounded-2xl border border-slate-200 bg-white px-4 py-4 sm:px-5 sm:py-5"
          id="day-plan-form-wrap"
          data-day-accordion="text"
        >
          <p className="text-sm font-semibold text-slate-900">Своё место</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Адрес поможет поставить точку на карте. Без адреса или если не найдём - место останется
            только в списке.
          </p>
          <form
            onSubmit={submitTextStop}
            className="mt-3"
            data-day-plan-form="1"
            id="day-plan-form"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <label className="min-w-0 flex-1">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Название
                </span>
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
                  disabled={atMax || geocodeBusy}
                  data-day-plan-title
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-emerald-500/30 placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 disabled:bg-slate-50"
                />
              </label>
              <button
                type="submit"
                disabled={atMax || geocodeBusy}
                data-day-plan-add
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 self-end rounded-full bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-600 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <Plus className="h-4 w-4" />
                Добавить
              </button>
            </div>

            <div className="mt-3">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Адрес
                </span>
                <input
                  type="text"
                  name="note"
                  value={noteInput}
                  onChange={(e) => {
                    setNoteInput(e.target.value);
                    setGeocodeHint(null);
                    setGeocodePreview(null);
                  }}
                  placeholder="Улица, дом - или заметка"
                  autoComplete="street-address"
                  disabled={atMax || geocodeBusy}
                  data-day-plan-note
                  className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-emerald-500/30 placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 disabled:bg-slate-50"
                />
              </label>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  data-day-plan-geocode
                  disabled={atMax || geocodeBusy || noteInput.trim().length < 3}
                  onClick={() => {
                    void findOwnPlaceOnMap();
                  }}
                  className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full border border-primary-200 bg-primary-50 px-3.5 py-1.5 text-xs font-semibold text-primary-800 transition hover:bg-primary-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <MapPin className="h-3.5 w-3.5" />
                  {geocodeBusy ? 'Ищем…' : 'Найти на карте'}
                </button>
                {geocodePreview ? (
                  <span className="text-[11px] font-medium text-emerald-700" data-day-plan-geocode-ok>
                    Координаты готовы
                  </span>
                ) : null}
              </div>
              {geocodeHint ? (
                <p
                  className={`mt-1.5 mb-0 text-[11px] leading-snug ${
                    geocodePreview ? 'text-emerald-700' : 'text-slate-500'
                  }`}
                  role="status"
                  data-day-plan-geocode-hint
                >
                  {geocodeHint}
                </p>
              ) : null}
            </div>

            <label className="mt-3 block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Координаты для карты
              </span>
              <input
                type="text"
                name="coords"
                value={coordsInput}
                onChange={(e) => {
                  setCoordsInput(e.target.value);
                  setGeocodePreview(null);
                }}
                placeholder="59.93, 30.31 - или найдите по адресу выше"
                autoComplete="off"
                disabled={atMax || geocodeBusy}
                data-day-plan-coords
                className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30 disabled:bg-slate-50"
              />
              <span className="mt-1 block text-[11px] leading-snug text-slate-500">
                Необязательно: можно вставить lat, lng вручную из Яндекс.Карт.
              </span>
            </label>

            <label className="mt-3 block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Город
              </span>
              <input
                type="text"
                name="city"
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                placeholder="Город"
                autoComplete="off"
                disabled={atMax || geocodeBusy}
                data-day-plan-city
                className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30 disabled:bg-slate-50"
              />
            </label>

            {formError ? (
              <p role="alert" className="mt-2 text-sm font-medium text-rose-700">
                {formError}
              </p>
            ) : null}
          </form>
        </div>
      ) : null}

      {pickerSection === 'boat' && showBoatPicker ? (
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
      ) : null}

      {/* Accordion: nearby events / matches */}
      {pickerSection === 'picks' && showMatches ? (
        <div
          id="day-route-matches"
          className="rounded-2xl border border-slate-200 bg-white"
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
              <span className="block text-sm font-semibold text-slate-900">События поблизости</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                {loading
                  ? 'Ищем покрытие…'
                  : payload
                    ? `Найдено: ${uniqueMatches.length}`
                    : 'По покрытию точек'}
              </span>
            </span>
            <ChevronDown
              className={`h-5 w-5 shrink-0 text-slate-400 transition ${matchesOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {(matchesOpen || pickerOpen) ? (
            <div id="day-route-matches-body" className="border-t border-slate-100 px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
              {loading ? <p className="text-sm text-slate-500">Ищем покрытие…</p> : null}
              {!loading && payload && uniqueMatches.length === 0 ? (
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
              <ul className="mt-3 grid grid-cols-1 items-start gap-3 md:grid-cols-2" data-day-matches-deduped>
                {uniqueMatches.map((match) => {
                  const fullCovered = dayRouteFullCoveredCount(match.covered);
                  const nearCount = match.covered.nearby.length;
                  return (
                    <li
                      key={match.eventId}
                      className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4"
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
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Hot Picks - always expanded (no accordion chrome) */}
      {pickerSection === 'picks' && showHotPicks ? (
        <section
          className="mt-1"
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

      {pickerSection === 'picks' ? (
      <section
        className="mt-4"
        id="day-catalog-add"
        data-day-catalog-add="1"
        data-day-catalog-open="1"
      >
        <div className="mb-3">
          <p className="text-base font-semibold text-slate-900">Ещё из каталога</p>
          <p className="mt-0.5 text-xs text-slate-500">Отдельный поиск по типам</p>
        </div>
        {!hasPageCity ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Сначала выберите город выше.
          </p>
        ) : (
          renderCatalogTrio()
        )}
      </section>
      ) : null}

      </MyDayPickerSheet>

      {hasMapStops ? (
        <MyDayMobileMapSheet
          open={myDay.mobileMapSheetOpen || mobileView === 'map'}
          onOpen={() => {
            myDay.openMobileMap();
            setMobileView('map');
          }}
          onClose={() => {
            myDay.closeMobileMap();
            setMobileView('list');
          }}
          stopCount={mapStops.length}
          yandexUrl={yandexUrl}
          footer={
            <>
              {renderMapFocusCard('mobile')}
              {route.venues.length > 0 ? (
                <div
                  className="absolute inset-x-0 bottom-0 z-[1000] border-t border-slate-200/80 bg-white/95 backdrop-blur"
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
            </>
          }
        >
          <DayRouteOsmMap
            stops={displayMapStops}
            selectedStopId={focusedStopId}
            onStopClick={focusStopFromMap}
            layoutKey="mobile-map-sheet"
            className="h-full w-full"
          />
        </MyDayMobileMapSheet>
      ) : null}

      <MyDayMapFullScreen open={myDay.mapFull && hasMapStops} onClose={myDay.closeMapFull}>
        <DayRouteOsmMap
          stops={displayMapStops}
          selectedStopId={mapSelectedStopId}
          onStopClick={(stopId) => focusStopFromMap(stopId, { scrollList: false })}
          layoutKey="desktop-map-full"
          className="h-full w-full"
        />
      </MyDayMapFullScreen>

      {!route.venues.length ? (
      <MobileStickyActionBar>
        <button
          type="button"
          onClick={() => {
            openPicker(pickerTabs[0]?.value || 'own');
          }}
          data-day-add-sticky
          className="inline-flex h-12 flex-1 items-center justify-center gap-1.5 rounded-full bg-primary-600 px-4 text-sm font-bold text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          Добавить места
        </button>
      </MobileStickyActionBar>
      ) : null}
      </div>
    </div>

      {shareMenuOpen && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed inset-0 z-[60] print:hidden"
            data-day-share-sheet
            role="presentation"
            onClick={() => setShareMenuOpen(false)}
          >
            <div className="absolute inset-0 bg-slate-900/40" aria-hidden />
            <div
              role="menu"
              data-day-share-menu
              aria-label="Поделиться маршрутом"
              className="absolute inset-x-0 bottom-0 rounded-t-2xl border border-slate-200 bg-white py-2 shadow-xl pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-80 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:pb-2"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-slate-200 sm:hidden" aria-hidden />
              <p className="px-4 pb-1 text-sm font-semibold text-slate-900">Поделиться</p>
              {shareMenuItems}
            </div>
          </div>,
          document.body,
        )
      : null}
    {guestCheckoutUrl ? (
      <CheckoutModal
        open
        onClose={() => setGuestCheckoutUrl(null)}
        checkoutUrl={guestCheckoutUrl}
        title="Покупка билета"
      />
    ) : null}
    {SHOW_DAY_TICKET_HANDOFF_MODAL && ticketHandoff ? (
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
    {ticketView ? (
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center print:hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="day-ticket-view-title"
        data-day-ticket-view
        onClick={() => closeTicketView()}
      >
        <div
          className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-xl sm:p-5"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p id="day-ticket-view-title" className="text-base font-semibold text-slate-900">
                Билет
              </p>
              <p className="mt-0.5 truncate text-sm text-slate-600">{ticketView.title}</p>
            </div>
            <button
              type="button"
              aria-label="Закрыть"
              onClick={() => closeTicketView()}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {ticketView.qrData ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-center" data-day-ticket-qr>
              {/^https?:\/\//i.test(ticketView.qrData) || ticketView.qrKind === 'image' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={ticketView.qrData}
                  alt="Код билета"
                  className="mx-auto max-h-56 w-auto"
                />
              ) : (
                <p className="break-all font-mono text-sm text-slate-900">{ticketView.qrData}</p>
              )}
              <p className="mt-2 text-[11px] text-slate-500">Покажите код при входе</p>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4" data-day-ticket-qr-stub>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-white text-primary-600">
                <QrCode className="h-7 w-7" />
              </div>
              <p className="mt-3 text-sm font-medium text-slate-800">
                Билет будет здесь после покупки на Дайбилет
              </p>
              <p className="mt-1 text-xs text-slate-500">
                QR из заказа появится, когда покупка будет доступна в приложении. Фейковый код не показываем.
              </p>
            </div>
          )}
          <div className="mt-4 flex flex-col gap-2">
            {ticketView.ticketUrl ? (
              <a
                href={ticketView.ticketUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-day-ticket-view-link
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary-600 px-4 text-sm font-bold text-white hover:bg-primary-700"
              >
                Открыть страницу билета
              </a>
            ) : null}
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              onClick={() => closeTicketView()}
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    ) : null}
    {hourSheetOpen ? (
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4 print:hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="day-hour-sheet-title"
        data-day-hour-sheet
        onClick={() => setHourSheetOpen(false)}
      >
        <div
          className="w-full max-w-md rounded-t-2xl border border-slate-200 bg-white p-4 shadow-xl sm:rounded-2xl sm:p-5"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-slate-200 sm:hidden" aria-hidden />
          <p id="day-hour-sheet-title" className="text-base font-semibold text-slate-900">
            Распланировать день по часам
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Подскажем мягкие интервалы на карточках. Список останется прежним - без шкалы времени.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Начало
              </span>
              <select
                value={hourStart}
                onChange={(e) => setHourStart(e.target.value)}
                data-day-hour-start
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
              >
                {DAY_ROUTE_SOFT_START_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Конец
              </span>
              <select
                value={hourEnd}
                onChange={(e) => setHourEnd(e.target.value)}
                data-day-hour-end
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
              >
                {DAY_ROUTE_SOFT_END_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={hourLunch}
              onChange={(e) => setHourLunch(e.target.checked)}
              data-day-hour-lunch
              className="h-4 w-4 rounded border-slate-300 text-primary-600"
            />
            Заложить время на обед (~14:00-15:00)
          </label>
          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              data-day-hour-generate
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary-600 px-4 text-sm font-bold text-white hover:bg-primary-700"
              onClick={() => {
                setHourPlanOn(true);
                setHourSheetOpen(false);
                flashDayRouteFeedback('Мягкое расписание готово');
              }}
            >
              Сгенерировать
            </button>
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              onClick={() => setHourSheetOpen(false)}
            >
              Отмена
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
    <MyDaySaveScenarioDialog
      open={scenarioSheetOpen}
      defaultName={scopeCityName ? `${scopeCityName} - ${route.venues.length} точек` : 'Мой день'}
      busy={scenarioBusy}
      onClose={() => setScenarioSheetOpen(false)}
      onSave={commitScenarioSave}
    />
    </>
  );
}

/** Stop index badge (Lovable circle, not map-pin). */
function DayRouteListPin({ n }: { n: number }) {
  const label = String(Math.max(1, Math.floor(n)));
  return (
    <span
      className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-600 text-sm font-bold leading-none tabular-nums text-white"
      aria-label={`Точка ${label}`}
      data-day-stop-pin
      data-day-stop-number
    >
      {label}
    </span>
  );
}

/**
 * Between list stops: travel leg + Lovable «+ Добавить» panel (note / suggested places).
 */
function DayRouteBetweenInsert({
  afterVenueId,
  menuOpen,
  onMenuOpenChange,
  segmentMeters,
  travelMode,
  transitTip,
  disabled = false,
  suggestions = [],
  onAddNote,
  onAddSuggestion,
  onOpenFullPicker,
}: {
  afterVenueId: string;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  segmentMeters: number | null;
  travelMode: DayRouteTravelMode;
  transitTip?: string;
  disabled?: boolean;
  suggestions?: Array<{
    id: string;
    title: string;
    tag: string;
    imageUrl: string | null;
    item: DayRouteVenueItem;
  }>;
  onAddNote: (text: string) => void;
  onAddSuggestion: (item: DayRouteVenueItem) => void;
  onOpenFullPicker?: () => void;
}) {
  const rootRef = useRef<HTMLLIElement | null>(null);
  const [noteText, setNoteText] = useState('');
  const segmentMinutes =
    segmentMeters != null && segmentMeters > 0
      ? estimateDayRouteTravelMinutes(segmentMeters, travelMode)
      : 0;
  const distanceLabel =
    segmentMeters != null && segmentMeters > 0 ? formatDayRouteDistance(segmentMeters) : '';
  const timeLabel = segmentMinutes > 0 ? formatDayRouteTravelMinutes(segmentMinutes) : '';
  const statsLabel =
    timeLabel && distanceLabel
      ? `${distanceLabel} · ~${timeLabel}`
      : timeLabel || distanceLabel || '';
  const showLeg = Boolean(statsLabel || transitTip);

  useEffect(() => {
    if (!menuOpen) setNoteText('');
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    function onDocPointer(event: MouseEvent) {
      const el = rootRef.current;
      if (!el) return;
      if (event.target instanceof Node && !el.contains(event.target)) {
        onMenuOpenChange(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onMenuOpenChange(false);
    }
    document.addEventListener('mousedown', onDocPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen, onMenuOpenChange]);

  return (
    <li
      ref={rootRef}
      className="relative list-none"
      data-day-between-insert
      data-day-between-after={afterVenueId}
    >
      {showLeg ? (
        <div className="ml-[1.15rem] flex items-center gap-2.5 border-l border-dashed border-slate-200 py-1.5 pl-7 text-xs text-slate-500 sm:ml-5 sm:pl-8">
          {travelMode === 'auto' ? (
            <Car className="h-3.5 w-3.5 shrink-0" aria-hidden />
          ) : (
            <PersonStanding className="h-3.5 w-3.5 shrink-0" aria-hidden />
          )}
          <div
            className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5"
            data-day-between-meta
          >
            {statsLabel ? (
              <span className="tabular-nums" data-day-between-stats>
                {statsLabel} {travelMode === 'auto' ? 'на авто' : 'пешком'}
              </span>
            ) : null}
            {transitTip ? (
              <span className="line-clamp-1 min-w-0 flex-1 text-[11px] text-slate-400" data-day-transit-between>
                {transitTip}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="ml-[1.15rem] py-0.5 sm:ml-5" data-day-between-add>
        {menuOpen ? (
          <div
            className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
            data-day-between-panel
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">Что добавить сюда?</p>
              <button
                type="button"
                aria-label="Закрыть"
                onClick={() => onMenuOpenChange(false)}
                className="grid h-7 w-7 place-items-center rounded-full border border-slate-200 text-slate-400 hover:bg-slate-50"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-3 flex gap-2">
              <input
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Заметка: например, кофе и передышка"
                disabled={disabled}
                data-day-between-note-input
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-primary-400 disabled:opacity-50"
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  const t = noteText.trim();
                  if (!t || disabled) return;
                  onAddNote(t);
                  setNoteText('');
                  onMenuOpenChange(false);
                }}
              />
              <button
                type="button"
                disabled={disabled || !noteText.trim()}
                data-day-between-add-note
                onClick={() => {
                  const t = noteText.trim();
                  if (!t) return;
                  onAddNote(t);
                  setNoteText('');
                  onMenuOpenChange(false);
                }}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                <StickyNote className="h-4 w-4" aria-hidden />
                Заметка
              </button>
            </div>

            {suggestions.length ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-2" data-day-between-suggestions>
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    disabled={disabled}
                    data-day-between-suggest={s.id}
                    onClick={() => {
                      onAddSuggestion(s.item);
                      onMenuOpenChange(false);
                    }}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 p-2 text-left transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                      {s.imageUrl ? (
                        <SafeImage src={s.imageUrl} alt="" fill sizes="2.5rem" className="object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-400">
                          <MapPin className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <span className="min-w-0">
                      <span className="block text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        {s.tag}
                      </span>
                      <span className="block truncate text-sm font-semibold text-slate-900">{s.title}</span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">
                Подходящих мест рядом нет - откройте полный подбор.
              </p>
            )}

            {onOpenFullPicker ? (
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  onMenuOpenChange(false);
                  onOpenFullPicker();
                }}
                className="mt-3 text-xs font-semibold text-primary-700 hover:underline"
              >
                Открыть полный подбор
              </button>
            ) : null}
          </div>
        ) : (
          <button
            type="button"
            aria-label="Добавить точку или заметку"
            disabled={disabled}
            data-day-between-plus
            onClick={() => onMenuOpenChange(true)}
            className="inline-flex items-center gap-2 rounded-full border border-dashed border-slate-300 px-3 py-1 text-xs font-semibold text-slate-500 transition hover:border-primary-400 hover:text-primary-700 disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Добавить
          </button>
        )}
      </div>
    </li>
  );
}

function DayRouteVenueCard({
  venue,
  index,
  total,
  displayNumber,
  variant = 'list',
  group = 'plans',
  softTimeLabel = null,
  typeTag = null,
  fallbackImageUrl = null,
  hasCoords,
  mapsUrl = null,
  segmentToNext,
  hideGeoSegment = false,
  travelMode,
  focused = false,
  dragging = false,
  grabbed = false,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onGripKeyDown,
  onGripBlur,
  onMoveUp,
  onMoveDown,
  onRemove,
  onToggleBought,
  onBuyClick,
  onShowTicket,
  onSetNote,
  onHoverStop,
  onHoverClear,
}: {
  venue: DayRouteVenueItem;
  index: number;
  total: number;
  /** Pin number (route order). Defaults to index + 1. */
  displayNumber?: number;
  variant?: 'list' | 'grid';
  group?: 'purchased' | 'plans' | 'overflow';
  softTimeLabel?: string | null;
  /** Lovable-style type label (catalog / must-see / contextual). */
  typeTag?: string | null;
  /** City cover when venue has no hero image - avoids empty pin tile. */
  fallbackImageUrl?: string | null;
  hasCoords: boolean;
  mapsUrl?: string | null;
  segmentToNext: number | null;
  /** When editorial between-card tip is shown, skip geo «далее ~» noise. */
  hideGeoSegment?: boolean;
  travelMode: DayRouteTravelMode;
  focused?: boolean;
  dragging?: boolean;
  grabbed?: boolean;
  onDragStart?: () => void;
  onDragOver?: (event: DragEvent) => void;
  onDrop?: () => void;
  onDragEnd?: () => void;
  onGripKeyDown?: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
  onGripBlur?: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onToggleBought: () => void;
  onBuyClick: (ticketUrl: string) => void;
  onShowTicket: () => void;
  onSetNote: (note: string) => void;
  /** Optional marker highlight on hover/focus without changing route order. */
  onHoverStop?: (stopId: string) => void;
  onHoverClear?: () => void;
}) {
  // Ticket QR / «отметить купленным» живут в блоке «Билеты в поездке», не в строке места.
  void onToggleBought;
  void onShowTicket;
  void showStatusChip;
  const textStop = isTextDayRouteStop(venue);
  const noteStop = isNoteDayRouteStop(venue);
  const purchased = group === 'purchased' || Boolean(venue.ticketBought);
  const reorderLocked = purchased || group === 'overflow' || dayRouteStopReorderLocked(venue);
  const isCommerce = purchased || dayRouteStopIsCommerce(venue);
  const [addressOpen, setAddressOpen] = useState(false);
  const [addressDraft, setAddressDraft] = useState(String(venue.note || venue.address || ''));
  const href =
    venue.href ||
    (!textStop && venue.slug
      ? venueHref({ id: venue.id, slug: venue.slug, name: venue.title, type: 'park' })
      : null);
  const ticketUrl = resolveDayRouteTicketUrl(venue);
  const bought = Boolean(venue.ticketBought);
  const thumbUrl = resolveDayRouteStopImage(venue) || fallbackImageUrl || null;
  const chip = classifyDayRouteCommercialChip(venue);
  const showStatusChip = chip.kind !== 'free';
  const priceChipLabel = dayRouteStopPriceChipLabel(venue);
  const buyCtaLabel = formatDayRouteBuyCtaLabel(venue);
  const buyOfferChip = formatDayRouteOfferChip({
    title: venue.title,
    priceFromRub: venue.priceFromRub,
    sessionLabel: venue.sessionLabel,
  });
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
    !hideGeoSegment && segmentToNext != null && index < total - 1
      ? formatDayRouteSegmentHint(segmentToNext, travelMode)
      : '';
  const sessionDisplay = formatDayRouteSessionDisplay(venue);
  const segmentLine = segmentHint ? `далее ~ ${segmentHint}` : '';

  const hoverEnter = () => {
    if (!hasCoords) return;
    onHoverStop?.(venue.id);
  };

  const hoverLeave = () => {
    if (!hasCoords) return;
    onHoverClear?.();
  };

  const onBlurCapture: React.FocusEventHandler<HTMLElement> = (e) => {
    if (!hasCoords) return;
    const related = e.relatedTarget as Node | null;
    const current = e.currentTarget as HTMLElement;
    if (related && current.contains(related)) return;
    onHoverClear?.();
  };

  const titleClass = 'font-display font-extrabold leading-snug tracking-tight text-slate-900';
  const titleNode = href ? (
    <Link href={href} className={`${titleClass} hover:text-primary-700`}>
      {venue.title}
    </Link>
  ) : (
    <span className={titleClass}>{venue.title}</span>
  );
  const resolvedTypeTag = String(typeTag || '').trim() || null;
  const softTimeNode = softTimeLabel ? (
    <p className="m-0 text-[12px] font-semibold text-primary-700" data-day-soft-time>
      {softTimeLabel}
    </p>
  ) : null;
  const dwellSoftLabel = dayRouteStopDwellChipLabel(venue, resolvedTypeTag);

  /**
   * Offer chips: always after the place/actions cluster (no ml-auto / justify-end gap).
   * List lg+: same row, immediately after maps/X. Grid + list mobile: below card shell.
   * Venue-bound: «Билеты от N ₽» → venue page. Nearby under-stop upsells removed (map + free window).
   */
  const venueBound = dayRouteOfferIsVenueBound(venue);
  const venueBoundPrice = dayRouteVenueBoundPriceLabel(venue);
  const showVenueBoundCta = venueBound && Boolean(href);
  const showTicketBuy = Boolean(ticketUrl) && !showVenueBoundCta;
  const venueTicketsLabel = venueBoundPrice ? `Билеты ${venueBoundPrice}` : 'Билеты';
  const commerceRail =
    showTicketBuy || showVenueBoundCta ? (
      <div
        className="flex w-full min-w-0 flex-wrap items-center gap-1.5"
        data-day-stop-commerce
        data-day-stop-venue-bound={showVenueBoundCta ? '1' : undefined}
      >
        {showVenueBoundCta ? (
          <Link
            href={href!}
            data-day-stop-venue-affiche
            aria-label={
              venueBoundPrice
                ? `Билеты на площадке ${venue.title}, ${venueBoundPrice}`
                : `Билеты на площадке ${venue.title}`
            }
            title={venueTicketsLabel}
            className="inline-flex w-auto max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-800 hover:bg-slate-100"
          >
            <Ticket className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="min-w-0 truncate leading-snug">{venueTicketsLabel}</span>
          </Link>
        ) : null}
        {showTicketBuy && ticketUrl ? (
          isDayRouteVendorCheckoutUrl(ticketUrl) ? (
            <DayRoutePurchaseCta
              purchaseUrl={ticketUrl}
              eventId={venue.eventId}
              label={buyOfferChip.title}
              onOpen={onBuyClick}
              aria-label={`${buyCtaLabel}: ${buyOfferChip.title}`}
              title={buyOfferChip.label}
              data-day-buy-ticket
              className="inline-flex w-auto max-w-full items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100"
            >
              <Ticket className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="min-w-0 truncate leading-snug">{buyOfferChip.title}</span>
              {buyOfferChip.price ? (
                <span className="shrink-0 whitespace-nowrap tabular-nums text-amber-800">
                  · {buyOfferChip.price}
                </span>
              ) : null}
            </DayRoutePurchaseCta>
          ) : (
            <a
              href={ticketUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-day-buy-ticket
              aria-label={`${buyCtaLabel}: ${buyOfferChip.title}`}
              title={buyOfferChip.label}
              onClick={() => onBuyClick(ticketUrl)}
              className="inline-flex w-auto max-w-full items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100"
            >
              <Ticket className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="min-w-0 truncate leading-snug">{buyOfferChip.title}</span>
              {buyOfferChip.price ? (
                <span className="shrink-0 whitespace-nowrap tabular-nums text-amber-800">
                  · {buyOfferChip.price}
                </span>
              ) : null}
            </a>
          )
        ) : null}
      </div>
    ) : null;

  if (noteStop) {
    const noteBody = String(venue.note || venue.title || '').trim();
    return (
      <li
        className={`relative w-full scroll-mt-4 list-none ${
          variant === 'grid' ? DAY_ROUTE_STOPS_GRID_CARD : ''
        } ${dragging ? 'opacity-60' : ''}`}
        data-day-plan-stop={venue.id}
        data-day-stop-variant={variant}
        data-day-stop-kind="note"
        data-day-stop-focused={focused ? '1' : undefined}
        onMouseEnter={hoverEnter}
        onMouseLeave={hoverLeave}
        onFocusCapture={hoverEnter}
        onBlurCapture={onBlurCapture}
      >
        <div
          className={`flex items-start gap-2 rounded-xl border border-amber-200/80 bg-amber-50/70 px-2.5 py-2 transition-[box-shadow] ${
            focused ? 'shadow-[inset_0_0_0_1px_rgba(251,191,36,0.7)]' : ''
          }`}
          data-day-stop-shell="note"
        >
          <StickyNote className="mt-1 h-4 w-4 shrink-0 text-amber-700" aria-hidden />
          <label className="min-w-0 flex-1">
            <span className="sr-only">Заметка</span>
            <textarea
              value={noteBody}
              rows={2}
              data-day-stop-note-input
              onChange={(e) => {
                const next = e.target.value;
                onSetNote(next);
                // Keep title in sync for share/list headings.
                if (next.trim() !== String(venue.title || '').trim()) {
                  // title updated via dedicated patch below in parent if needed
                }
              }}
              onBlur={(e) => {
                const next = e.target.value.trim() || 'Заметка';
                onSetNote(next);
              }}
              className="min-h-[2.5rem] w-full resize-y rounded-md border border-amber-100 bg-white/80 px-2 py-1.5 text-sm leading-snug text-slate-800 outline-none focus:border-amber-300 focus:ring-1 focus:ring-amber-200"
              placeholder="Текст заметки"
            />
          </label>
          <button
            type="button"
            aria-label="Удалить заметку"
            onClick={onRemove}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-white/80 hover:text-slate-700"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </li>
    );
  }

  if (variant === 'list') {
    const pinNumber = displayNumber ?? index + 1;
    const canDrag = Boolean(onDragStart) && !reorderLocked;
    /** Lovable: type tag above title (uppercase tracking), no stacked chevrons, no empty pin tile. */
    const typeLabel =
      resolvedTypeTag ||
      (purchased ? 'Оплачено' : null) ||
      (textStop ? 'Своё место' : null);
    return (
      <li
        className={`relative w-full scroll-mt-4 list-none ${dragging ? 'opacity-40' : ''}`}
        data-day-plan-stop={venue.id}
        data-day-stop-variant="list"
        data-day-stop-list="lovable"
        data-day-stop-layout="number-grip-content-thumb"
        data-ticket-bought={bought ? '1' : '0'}
        data-commercial-chip={chip.kind}
        data-day-session={sessionDisplay || undefined}
        data-day-stop-focused={focused ? '1' : undefined}
        data-day-stop-grabbed={grabbed ? '1' : undefined}
        onMouseEnter={hoverEnter}
        onMouseLeave={hoverLeave}
        onFocusCapture={hoverEnter}
        onBlurCapture={onBlurCapture}
        onDragOver={canDrag ? onDragOver : undefined}
        onDrop={canDrag ? onDrop : undefined}
        onDragEnd={canDrag ? onDragEnd : undefined}
      >
        <article
          className={`group grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-2xl border p-3 transition-colors sm:gap-4 sm:p-4 max-lg:border-slate-200/90 max-lg:bg-white max-lg:shadow-sm ${
            focused
              ? 'border-primary-300 bg-primary-50/40 shadow-sm max-lg:bg-white'
              : grabbed
                ? 'border-primary-400 bg-primary-50/30 max-lg:bg-white'
                : 'border-transparent bg-transparent hover:bg-slate-50/90 max-lg:hover:bg-white'
          } ${purchased ? 'border-l-[3px] border-l-primary-600' : ''}`}
          data-day-stop-shell
        >
          <div
            className="flex shrink-0 flex-col items-center gap-2"
            data-day-stop-index-cluster
          >
            <DayRouteListPin n={pinNumber} />
            {reorderLocked ? (
              <span
                className="inline-flex text-slate-300"
                data-day-stop-sort="locked"
                title="Сеанс с фиксированным временем - порядок нельзя менять"
                aria-hidden
              >
                <Ticket className="h-3.5 w-3.5" />
              </span>
            ) : (
              <button
                type="button"
                draggable={canDrag}
                aria-label={`Переместить «${venue.title}», позиция ${index + 1} из ${total}`}
                aria-describedby="dnd-hint"
                aria-pressed={grabbed}
                title="Перетащите или используйте стрелки вверх / вниз"
                data-day-stop-grip
                onKeyDown={onGripKeyDown}
                onBlur={onGripBlur}
                onDragStart={
                  canDrag
                    ? (event) => {
                        event.stopPropagation();
                        onDragStart?.();
                      }
                    : undefined
                }
                onDragEnd={canDrag ? onDragEnd : undefined}
                className={`grid h-9 w-9 cursor-grab place-items-center rounded-md border transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 active:cursor-grabbing ${
                  grabbed
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-slate-200 text-slate-400'
                } ${canDrag ? '' : 'opacity-40'}`}
              >
                <GripVertical className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>

          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:gap-4">
            <div className="min-w-0" data-day-stop-content>
              <div className="flex flex-wrap items-center gap-2">
                {typeLabel ? (
                  <span
                    className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-primary-700"
                    data-day-stop-type-tag
                  >
                    {typeLabel}
                  </span>
                ) : null}
                {softTimeLabel ? (
                  <span
                    className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-bold text-sky-800"
                    data-day-soft-time
                  >
                    {softTimeLabel}
                  </span>
                ) : null}
                {purchased && typeLabel !== 'Оплачено' ? (
                  <span className="text-[11px] font-bold uppercase tracking-wide text-primary-700">
                    Оплачено
                  </span>
                ) : null}
              </div>
              <h2 className="mt-1 line-clamp-2 font-display text-base font-bold leading-snug tracking-tight text-slate-900 sm:text-lg">
                {titleNode}
              </h2>
              {placeLine || !hasCoords ? (
                <p
                  className={`mt-1 truncate text-sm ${
                    !hasCoords ? 'text-amber-700' : 'text-slate-500'
                  }`}
                >
                  {placeLine || 'Нет координат'}
                  {placeLine && !hasCoords ? ' · Нет координат' : ''}
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {sessionDisplay ? (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                    {sessionDisplay}
                  </span>
                ) : null}
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                  {priceChipLabel}
                </span>
                <span className="text-xs text-slate-500">{dwellSoftLabel}</span>
                {venue.note && !textStop ? (
                  <span className="line-clamp-1 text-xs text-slate-500">{venue.note}</span>
                ) : null}
              </div>
              {textStop ? (
                <div className="mt-2" data-day-custom-address>
                  {addressOpen ? (
                    <form
                      className="flex gap-1"
                      onSubmit={(e) => {
                        e.preventDefault();
                        onSetNote(addressDraft.trim());
                        setAddressOpen(false);
                      }}
                    >
                      <input
                        type="text"
                        value={addressDraft}
                        onChange={(e) => setAddressDraft(e.target.value)}
                        placeholder="Адрес или заметка"
                        className="min-h-7 w-full rounded-md border border-slate-200 bg-white px-2 text-[11px] outline-none focus:border-primary-400"
                        autoFocus
                      />
                      <button type="submit" className="text-[11px] font-semibold text-primary-700">
                        Ок
                      </button>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setAddressDraft(String(venue.note || venue.address || ''));
                        setAddressOpen(true);
                      }}
                      className="text-[11px] font-medium text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline"
                    >
                      {venue.note || venue.address ? 'Изменить адрес' : 'Указать адрес'}
                    </button>
                  )}
                </div>
              ) : null}
            </div>

            <div
              className="flex shrink-0 flex-col items-end gap-2"
              data-day-stop-media
            >
              <div
                className="relative h-20 w-20 overflow-hidden rounded-xl bg-slate-100 sm:h-24 sm:w-28"
                data-day-stop-thumb
              >
                {thumbUrl ? (
                  <SafeImage src={thumbUrl} alt="" fill sizes="7rem" className="object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-200 via-slate-100 to-sky-100 text-slate-400">
                    <MapPin className="h-5 w-5" aria-hidden />
                  </div>
                )}
              </div>
              <div
                className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 max-lg:opacity-100"
                data-day-stop-actions
              >
                {mapsUrl ? (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Открыть в Яндекс.Картах"
                    title="Открыть в Яндекс.Картах"
                    data-day-stop-maps
                    className="grid h-7 w-7 place-items-center rounded-full border border-slate-200 bg-white text-sky-600 hover:bg-sky-50"
                  >
                    <Navigation className="h-3.5 w-3.5" />
                  </a>
                ) : null}
                <button
                  type="button"
                  aria-label="Убрать из маршрута"
                  onClick={onRemove}
                  className="grid h-7 w-7 place-items-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </article>

        {commerceRail ? (
          <div className="ml-11 mt-1.5 sm:ml-12" data-day-stop-offers-below>
            {commerceRail}
          </div>
        ) : null}
      </li>
    );
  }

  return (
    <li
      className={`flex flex-col scroll-mt-4 ${DAY_ROUTE_STOPS_GRID_CARD}`}
      data-day-plan-stop={venue.id}
      data-day-stop-variant="grid"
      data-day-stop-layout="place-then-offers"
      data-ticket-bought={bought ? '1' : '0'}
      data-commercial-chip={chip.kind}
      data-day-session={sessionDisplay || undefined}
      data-day-stop-focused={focused ? '1' : undefined}
      data-day-commerce={isCommerce ? '1' : '0'}
      onMouseEnter={hoverEnter}
      onMouseLeave={hoverLeave}
      onFocusCapture={hoverEnter}
      onBlurCapture={onBlurCapture}
    >
      {/*
        Grid: shell = content height only (no flex-1 / stretch empty space).
        Venue/ticket chips hug under the card when present.
      */}
      <div
        className={`flex flex-col gap-1.5 rounded-2xl border bg-white px-2.5 py-2 sm:px-3 sm:py-2 ${
          focused
            ? 'border-emerald-400 ring-1 ring-emerald-200'
            : purchased || isCommerce
              ? 'border-l-4 border-l-primary-600 border-slate-200'
              : 'border-slate-200'
        }`}
        data-day-stop-shell
      >
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {reorderLocked ? (
            <div
              className="flex h-10 w-6 shrink-0 items-center justify-center text-slate-300"
              data-day-stop-sort="locked"
              title="Сеанс с фиксированным временем - порядок нельзя менять"
              aria-hidden
            >
              <Ticket className="h-3.5 w-3.5" />
            </div>
          ) : (
            <div
              className="flex shrink-0 flex-col items-center leading-none"
              data-day-stop-sort
            >
              <button
                type="button"
                aria-label="Выше"
                disabled={index === 0}
                onClick={onMoveUp}
                className="rounded p-0.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label="Ниже"
                disabled={index >= total - 1}
                onClick={onMoveDown}
                className="rounded p-0.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className="relative h-14 w-14 shrink-0 sm:h-16 sm:w-16" data-day-stop-thumb>
            <span
              className="absolute -left-1 -top-1 z-10 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white shadow-sm"
              aria-label={`Точка ${index + 1}`}
              data-day-stop-number
            >
              {index + 1}
            </span>
            <div className="relative h-full w-full overflow-hidden rounded-xl bg-slate-100">
              {thumbUrl ? (
                <SafeImage src={thumbUrl} alt="" fill sizes="4rem" className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-200 via-slate-100 to-primary-100 text-slate-400">
                  <MapPin className="h-5 w-5" />
                </div>
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1" data-day-stop-text-col>
            {softTimeNode || purchased ? (
              <div className="mb-0.5 flex items-center gap-2">
                {softTimeNode}
                {purchased ? (
                  <span className="text-[11px] font-bold uppercase tracking-wide text-primary-700">
                    Оплачено
                  </span>
                ) : null}
              </div>
            ) : null}
            <p className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900">
              {titleNode}
              {resolvedTypeTag === 'Пригород' ? (
                <span
                  className="ml-1.5 inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 align-middle text-[10px] font-medium leading-none text-slate-600"
                  data-day-stop-suburb
                >
                  Пригород
                </span>
              ) : null}
            </p>
            {placeLine || !hasCoords ? (
              <p
                className={`mt-0.5 mb-0 line-clamp-2 text-xs leading-snug ${
                  !hasCoords && !placeLine ? 'font-medium text-amber-700' : 'text-slate-500'
                }`}
              >
                {placeLine || 'Нет координат'}
                {placeLine && !hasCoords ? ' · Нет координат' : ''}
              </p>
            ) : null}
            {/* Segment distance/time lives in between-leg row in list; in grid show once as text line only. */}
            {segmentLine ? (
              <p
                className="mt-0.5 mb-0 line-clamp-2 text-[11px] leading-snug text-slate-500"
                data-day-segment-hint="1"
              >
                {segmentLine}
              </p>
            ) : null}

            {sessionDisplay && !ticketUrl ? (
              <div className="mt-1 flex flex-wrap items-center gap-1.5" data-day-stop-bottom-row>
                <span className="inline-flex items-center rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-800">
                  {sessionDisplay}
                </span>
              </div>
            ) : null}

            {textStop ? (
              <div className="mt-1" data-day-custom-address>
                {addressOpen ? (
                  <form
                    className="flex gap-1"
                    onSubmit={(e) => {
                      e.preventDefault();
                      onSetNote(addressDraft.trim());
                      setAddressOpen(false);
                    }}
                  >
                    <input
                      type="text"
                      value={addressDraft}
                      onChange={(e) => setAddressDraft(e.target.value)}
                      placeholder="Адрес или заметка"
                      className="min-h-8 w-full rounded-md border border-slate-200 px-2 text-xs outline-none focus:border-primary-400"
                      autoFocus
                    />
                    <button type="submit" className="text-xs font-semibold text-primary-700">
                      Ок
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setAddressDraft(String(venue.note || venue.address || ''));
                      setAddressOpen(true);
                    }}
                    className="text-[11px] font-medium text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline"
                  >
                    {venue.note || venue.address ? 'Изменить адрес' : 'Указать адрес'}
                  </button>
                )}
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2.5" data-day-stop-top-right>
            {mapsUrl ? (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Открыть в Яндекс.Картах"
                title="Открыть в Яндекс.Картах"
                data-day-stop-maps
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-sky-600 hover:bg-sky-50"
              >
                <Navigation className="h-4 w-4" />
              </a>
            ) : null}
            <button
              type="button"
              aria-label="Удалить точку"
              onClick={onRemove}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

        {commerceRail ? (
          <div className="mt-1.5 w-full shrink-0" data-day-stop-offers-below>
            {commerceRail}
          </div>
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
