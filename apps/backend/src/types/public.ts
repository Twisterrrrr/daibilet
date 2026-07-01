import type {
  ApiEnvelope,
  DateTimeSlot,
  DestinationType,
  FacetCount,
  PurchaseFields,
  Readiness,
  SeoFields,
  TimeBucket,
} from './common.js';

export interface PublicStatsDto extends ApiEnvelope {
  events: number;
  cities: number;
  venues: number;
  landings?: number;
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
  upcomingSlots?: Array<DateTimeSlot & Pick<PurchaseFields, 'purchaseUrl'>>;
  landingSlugs: string[];
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
  description?: string | null;
  startsAt: string;
  dateLabel: string;
  timeLabel: string;
  timeBucket: TimeBucket;
  priceFrom?: number | null;
  vacant?: number | null;
  imageUrl?: string | null;
  manualLandingStatus?: string | null;
}

export interface PublicCatalogDto extends ApiEnvelope {
  items: PublicSessionDto[];
  sessions?: PublicSessionDto[];
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
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  type: string;
  pageStatus?: string | null;
  events: number;
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
  city: string;
  cityId?: string | null;
  citySlug?: string | null;
  sourceCitySlug?: string | null;
  venueId?: string | null;
  venueSlug?: string | null;
  destination?: string | null;
  destinationType?: DestinationType | string | null;
  venue: string;
  venueAddress?: string | null;
  venueKind: string;
  ageLimit?: string | null;
  priceFrom?: number | null;
  vacant?: number | null;
  eventType: string;
  landingSlugs: string[];
  groupKey?: string | null;
  groupEventIds?: string[];
  sessionCount?: number;
}

export interface PublicEventPageDto extends ApiEnvelope {
  event: PublicEventDto;
  sessions: Array<DateTimeSlot & PurchaseFields & {
    id: string;
    eventId: string;
    priceFrom?: number | null;
    vacant?: number | null;
    sourceStatus?: string | null;
  }>;
  offers: PublicOfferDto[];
  ticketPrices?: PublicTicketPriceDto[];
  relatedEvents?: PublicSessionDto[];
}

export interface PublicOfferDto extends PurchaseFields {
  id: string;
  sourceCode: string;
  title?: string | null;
  priceRub?: number | null;
  active: boolean;
}

export interface PublicTicketPriceDto {
  id?: string;
  title: string;
  priceRub: number;
  oldPriceRub?: number | null;
  sourceCode?: string | null;
  sourceTicketId?: string | null;
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
  stats: {
    events: number;
    categories: number;
    priceFrom?: number | null;
  };
}

export interface PublicLandingPageDto extends ApiEnvelope {
  landing: PublicLandingDto;
  sessions: PublicSessionDto[];
  relatedLandings: PublicLandingDto[];
  blocks?: unknown[];
  stats: {
    events: number;
    sessions: number;
    cities: Record<string, number>;
    categories: Record<string, number>;
    venues: Record<string, number>;
    priceFrom?: number | null;
  };
}

export interface PublicHomeDto extends ApiEnvelope {
  stats: PublicStatsDto;
  destinations: PublicDestinationDto[];
  sessions: PublicSessionDto[];
  venues: PublicVenueDto[];
  landings: PublicLandingDto[];
}
