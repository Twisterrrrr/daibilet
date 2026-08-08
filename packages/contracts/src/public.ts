import type {
  ApiEnvelope,
  DateTimeSlot,
  DestinationType,
  FacetCount,
  PurchaseFields,
  PurchaseProvider,
  Readiness,
  SeoFields,
  TimeBucket,
} from './common.js';
import type { LandingContentBlockDto } from './landing.js';

export interface PublicStatsCounts {
  events: number;
  destinations: number;
  cities?: number;
  venues: number;
  landings: number;
}

export interface PublicStatsDto extends ApiEnvelope {
  stats: PublicStatsCounts;
}

/** Mini-tags on `/cities` cards (CHPU landings or top event categories). */
export interface PublicDestinationHubTag {
  slug?: string | null;
  label: string;
  events: number;
  kind: 'landing' | 'category';
}

export interface PublicDestinationDto {
  id?: string;
  slug?: string;
  sourceSlug?: string;
  name: string;
  type: DestinationType;
  events: number;
  venues: number;
  categories: FacetCount[];
  /** 2-3 popular directions for city micro-hub cards. */
  hubTags?: PublicDestinationHubTag[];
}

export interface PublicLandingDto extends SeoFields {
  slug: string;
  type?: 'CITY' | 'MULTI_CITY' | string;
  title: string;
  subtitle: string;
  chips: string[];
  events: number;
  venues: number;
  priceFrom?: number | null;
  imageUrl?: string | null;
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  heroBadge?: string | null;
  heroImageUrl?: string | null;
  strength: 'ready' | 'seed' | 'empty';
}

export interface PublicSessionDto extends PurchaseFields {
  id: string;
  slug?: string | null;
  sourceSlug?: string | null;
  groupKey?: string | null;
  groupEventIds?: string[];
  groupedEventsCount?: number;
  sessionCount?: number;
  upcomingSlots?: Array<DateTimeSlot & Pick<PurchaseFields, 'purchaseUrl'> & { vacant?: number | null }>;
  landingSlugs?: string[];
  title: string;
  cityId?: string | null;
  citySlug?: string | null;
  sourceCitySlug?: string | null;
  city: string;
  destination: string;
  destinationType: DestinationType;
  venueId?: string | null;
  venueSlug?: string | null;
  venue: string;
  venueKind: string;
  offerTitle?: string | null;
  offerSourceCode?: string | null;
  category: string;
  subcategories?: string[];
  tags: string[];
  kind?: string | null;
  sourceStatus?: string | null;
  ageLimit?: string | null;
  description?: string | null;
  startsAt: string;
  dateLabel: string;
  timeLabel: string;
  timeBucket: TimeBucket;
  timeZone?: string | null;
  priceFrom?: number | null;
  priceTo?: number | null;
  vacant?: number | null;
  imageUrl?: string | null;
  manualLandingStatus?: string | null;
}

/** Lean list card for catalog API responses (no widget URLs / full slot hydrate). */
export interface PublicCatalogListItemDto extends PurchaseFields {
  id: string;
  slug?: string | null;
  groupKey?: string | null;
  groupedEventsCount?: number;
  sessionCount?: number;
  upcomingSlots?: Array<
    Pick<DateTimeSlot, 'id' | 'eventId' | 'startsAt' | 'dateLabel' | 'timeLabel'> &
      Partial<Pick<PurchaseFields, 'purchaseUrl'>> & { vacant?: number | null }
  >;
  title: string;
  citySlug?: string | null;
  city: string;
  destination: string;
  destinationType: DestinationType;
  venueSlug?: string | null;
  venue: string;
  venueKind: string;
  category: string;
  subcategories?: string[];
  tags: string[];
  kind?: string | null;
  sourceStatus?: string | null;
  ageLimit?: string | null;
  /** Plain-text excerpt for list cards (not full HTML body). */
  description?: string | null;
  startsAt: string;
  dateLabel: string;
  timeLabel: string;
  timeBucket: TimeBucket;
  priceFrom?: number | null;
  priceTo?: number | null;
  vacant?: number | null;
  imageUrl?: string | null;
}

export interface PublicCatalogDto extends ApiEnvelope {
  items: PublicCatalogListItemDto[];
  sessions?: PublicCatalogListItemDto[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  facets: {
    cities: FacetCount[];
    categories: FacetCount[];
    subcategories: FacetCount[];
    tags?: FacetCount[];
    landings: Array<{ slug: string; title: string; events: number }>;
    priceSteps: number[];
  };
}

export interface PublicVenueDto extends SeoFields {
  id: string;
  slug?: string | null;
  name: string;
  title?: string;
  city: string;
  /** CHPU города для крошек / ссылок. */
  citySlug?: string | null;
  /** Область / край / республика из City.region (для мелких городов в крошках). */
  regionSlug?: string | null;
  regionTitle?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  metroStation?: string | null;
  wayToFind?: string | null;
  parkingInfo?: string | null;
  /** Короткий hook-текст для карточек локаций. */
  hookFact?: string | null;
  type: string;
  pageStatus?: string | null;
  description?: string | null;
  shortDescription?: string | null;
  heroImageUrl?: string | null;
  events: number;
  /** Явные STOP-связи EventVenueRouteItem на эту площадку. */
  stopEventCount?: number;
  categories: Record<string, number>;
}

export interface PublicCityDto extends SeoFields {
  id: string;
  slug: string;
  sourceSlug?: string | null;
  name: string;
  title: string;
  type: DestinationType;
  isDestination?: boolean;
  events: number;
  venues: number;
  categories: Record<string, number>;
}

export interface PublicEventDto extends SeoFields, PurchaseFields {
  id: string;
  slug: string;
  sourceSlug?: string | null;
  sourceCode?: string | null;
  externalId?: string | null;
  widgetProvider?: string | null;
  widgetPayload?: Record<string, unknown> | null;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  category: string;
  tags: string[];
  subcategories?: string[];
  city: string;
  cityId?: string | null;
  citySlug?: string | null;
  sourceCitySlug?: string | null;
  venueId?: string | null;
  venueSlug?: string | null;
  destination?: string | null;
  destinationType?: DestinationType | string | null;
  /** IANA TZ of event city/region — display labels match widget local time. */
  timeZone?: string | null;
  venue: string;
  venueAddress?: string | null;
  venueKind: string;
  /** Slim logistics from linked Venue - event modal SSR (CV.9d), no fetch on click. */
  venueLatitude?: number | null;
  venueLongitude?: number | null;
  venueMetroStation?: string | null;
  venueWayToFind?: string | null;
  venueParkingInfo?: string | null;
  ageLimit?: string | null;
  priceFrom?: number | null;
  vacant?: number | null;
  eventType: string;
  landingSlugs: string[];
  groupKey?: string | null;
  groupEventIds?: string[];
  sessionCount?: number;
  /** Остановки маршрута (EventVenueRouteItem STOP); Event.venueId = только старт. */
  venueStops?: PublicEventVenueStopDto[];
}

/** Slim-карточка события на странице локации (STOP / Рядом). */
export interface PublicVenueLinkedEventDto {
  id: string;
  slug: string;
  title: string;
  imageUrl?: string | null;
  priceFrom?: number | null;
  venue?: string | null;
  venueId?: string | null;
  venueSlug?: string | null;
  venueKind?: string | null;
  /** Подпись остановки из EventVenueRouteItem.label. */
  routeLabel?: string | null;
}

export interface PublicEventVenueStopDto {
  venueId: string;
  slug: string;
  title: string;
  kind: string;
  label?: string | null;
  /** Канонический path `/venues/…` или `/locations/…`. */
  href?: string | null;
}

export interface PublicPurchaseOptionDto extends PurchaseFields {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  priceFrom?: number | null;
  externalId?: string | null;
  purchaseProvider?: PurchaseProvider | null;
}

export interface PublicEventPageDto extends ApiEnvelope {
  event: PublicEventDto;
  sessions: Array<Omit<DateTimeSlot, 'startsAt'> & PurchaseFields & {
    id: string;
    eventId: string;
    startsAt: string | null;
    timeZone?: string | null;
    priceFrom?: number | null;
    vacant?: number | null;
    sourceStatus?: string | null;
  }>;
  offers: PublicOfferDto[];
  ticketPrices?: PublicTicketPriceDto[];
  purchaseOptions?: PublicPurchaseOptionDto[];
  related: PublicSessionDto[];
  landings: Array<Pick<PublicLandingDto, 'slug' | 'title' | 'subtitle' | 'chips'>>;
  stats: {
    sessions: number;
    priceFrom?: number | null;
    vacant?: number | null;
  };
}

export interface PublicOfferDto extends PurchaseFields {
  id: string;
  sourceCode: string;
  title?: string | null;
  priceRub?: number | null;
  oldPriceRub?: number | null;
  active: boolean;
}

export interface PublicTicketPriceDto {
  key: string;
  title: string;
  priceRub: number;
  oldPriceRub?: number | null;
  source?: string | null;
  sourceCode?: string | null;
  sourceTicketId?: string | null;
  description?: string | null;
  purchaseUrl?: string | null;
  kind?: 'offer' | 'session' | 'fallback';
  sortOrder?: number | null;
}

export interface PublicCityPageDto extends ApiEnvelope {
  city: PublicCityDto;
  sessions: PublicSessionDto[];
  venues: PublicVenueDto[];
  landings: PublicLandingDto[];
  stats: {
    events: number;
    venues: number;
    categories: number;
    priceFrom?: number | null;
  };
}

export interface PublicVenuePageDto extends ApiEnvelope {
  venue: PublicVenueDto;
  sessions: PublicSessionDto[];
  relatedVenues: PublicVenueDto[];
  /** Экскурсии с явной STOP-связью на эту локацию. */
  stopEvents?: PublicVenueLinkedEventDto[];
  /** Geo-fallback (~300м), только если stopEvents пуст. Подпись UI: «Рядом». */
  nearbyEvents?: PublicVenueLinkedEventDto[];
  stats: {
    events: number;
    categories: number;
    priceFrom?: number | null;
  };
}

export interface PublicVenuesDto extends ApiEnvelope {
  total: number;
  venues: PublicVenueDto[];
  /** Opaque cursor for infinite scroll; null when no more pages. */
  nextCursor?: string | null;
  hasMore?: boolean;
  limit?: number;
  /**
   * Progressive /venues: shell list omitted distinct product counts.
   * Client should call `/api/public/venues/event-counts?ids=` and patch cards.
   */
  countsPending?: boolean;
  /** Lazy map pins (`mode=pins`) - slug/name/lat/lng/kind only. */
  pins?: PublicVenueMapPinDto[];
  stats?: {
    /** Filtered catalog size (includes 0-event content places). */
    venues: number;
    /** Venues in filtered universe with at least one distinct product (event≠slots). */
    venuesWithEvents?: number;
    /** Distinct-product event total for the filtered universe (not page slice). */
    events?: number;
    cities: Record<string, number>;
    types: Record<string, number>;
    scales?: Record<string, number>;
    logistics?: Record<string, number>;
  };
}

/** Lean pin for `/locations` map - fetched only when map is visible. */
export interface PublicVenueMapPinDto {
  id: string;
  slug?: string | null;
  name: string;
  latitude: number;
  longitude: number;
  kind: string;
}

export interface PublicLandingPageDto extends ApiEnvelope {
  landing: PublicLandingDto;
  sessions: PublicSessionDto[];
  relatedLandings: PublicLandingDto[];
  blocks?: LandingContentBlockDto[];
  stats: {
    events: number;
    sessions: number;
    cities: Record<string, number>;
    categories: Record<string, number>;
    venues: Record<string, number>;
    priceFrom?: number | null;
    priceTo?: number | null;
  };
}

export interface PublicHomeDto extends ApiEnvelope {
  stats: PublicStatsCounts;
  destinations: PublicDestinationDto[];
  sessions: PublicSessionDto[];
  venues: PublicVenueDto[];
  landings: PublicLandingDto[];
}

export interface PublicHomePreviewDto extends ApiEnvelope {
  sessions: PublicSessionDto[];
  landings: PublicLandingDto[];
}
