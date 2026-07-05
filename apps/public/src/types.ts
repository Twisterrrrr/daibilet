export type PublicDestination = {
  id?: string;
  slug?: string;
  sourceSlug?: string;
  name: string;
  type: 'city' | 'region';
  events: number;
  venues: number;
  categories: Array<{ name: string; events: number }>;
};

export type PublicLanding = {
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
  heroMobileImageUrl?: string | null;
  templateType?: string | null;
  layoutVariant?: string | null;
  surfaceVariant?: string | null;
  strength: 'ready' | 'seed' | 'empty';
  seoTitle?: string | null;
  seoDescription?: string | null;
};

export type PublicLandingContentBlock = {
  id?: string;
  type: string;
  variant?: string | null;
  title?: string | null;
  subtitle?: string | null;
  eyebrow?: string | null;
  body?: string | null;
  richTextJson?: unknown;
  payload?: {
    items?: Array<Record<string, unknown>>;
    [key: string]: unknown;
  } | null;
  assetUrl?: string | null;
  mobileAssetUrl?: string | null;
  sortOrder?: number | null;
};

export type PublicSession = {
  id: string;
  slug?: string | null;
  sourceSlug?: string | null;
  groupKey?: string | null;
  groupEventIds?: string[];
  groupedEventsCount?: number;
  sessionCount?: number;
    upcomingSlots?: Array<{
      eventId?: string | null;
      startsAt: string;
      dateLabel: string;
      timeLabel: string;
      purchaseUrl?: string | null;
      sourceStatus?: string | null;
      purchaseReady?: boolean;
      vacant?: number | null;
    }>;
  landingSlugs: string[];
  title: string;
  cityId?: string | null;
  citySlug?: string | null;
  sourceCitySlug?: string | null;
  city: string;
  destination: string;
  destinationType: 'city' | 'region';
  venueId?: string | null;
  venueSlug?: string | null;
  venue: string;
  venueAddress?: string | null;
  venueKind: string;
  offerTitle?: string | null;
  offerSourceCode?: string | null;
  purchaseUrl?: string | null;
  widgetUrl?: string | null;
  deeplinkUrl?: string | null;
  purchaseReady?: boolean;
  purchaseMode?: 'widget' | 'redirect' | string | null;
  purchaseProvider?: 'TICKETSCLOUD' | 'TEPLOHOD' | string | null;
  purchaseUrlSource?: 'offer' | 'fallback' | string | null;
  category: string;
  kind?: string | null;
  sourceStatus?: string | null;
  subcategories?: string[];
  tags: string[];
  startsAt: string;
  dateLabel: string;
  timeLabel: string;
  timeBucket: 'morning' | 'day' | 'evening' | 'night';
  priceFrom?: number | null;
  vacant?: number | null;
  ageLimit?: string | null;
  imageUrl?: string | null;
  description?: string | null;
  manualLandingStatus?: string | null;
};

export type PublicVenue = {
  id: string;
  slug?: string | null;
  name: string;
  title?: string;
  city: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  type: string;
  template?: 'institution' | 'location';
  pageStatus?: string | null;
  description?: string | null;
  shortDescription?: string | null;
  heroImageUrl?: string | null;
  seoH1?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  canonicalPath?: string | null;
  isIndexable?: boolean | null;
  events: number;
  categories: Record<string, number>;
};

export type PublicVenuePage = {
  generatedAt: string;
  venue: PublicVenue;
  sessions: PublicSession[];
  relatedVenues: PublicVenue[];
  stats: {
    events: number;
    categories: number;
    priceFrom?: number | null;
  };
};

export type PublicCity = {
  id: string;
  slug: string;
  sourceSlug?: string | null;
  name: string;
  title: string;
  type: 'city' | 'region';
  isDestination?: boolean;
  events: number;
  venues: number;
  categories: Record<string, number>;
  seoTitle?: string | null;
  seoDescription?: string | null;
};

export type PublicCityPage = {
  generatedAt: string;
  city: PublicCity;
  sessions: PublicSession[];
  venues: PublicVenue[];
  landings: PublicLanding[];
  stats: {
    events: number;
    venues: number;
    categories: number;
    priceFrom?: number | null;
  };
};

export type PublicLandingPage = {
  generatedAt: string;
  landing: PublicLanding;
  sessions: PublicSession[];
  relatedLandings: PublicLanding[];
  blocks?: PublicLandingContentBlock[];
  stats: {
    events: number;
    sessions: number;
    cities: Record<string, number>;
    categories: Record<string, number>;
    venues: Record<string, number>;
    priceFrom?: number | null;
  };
};

export type PublicEvent = {
  id: string;
  slug: string;
  sourceSlug?: string | null;
  sourceCode?: string | null;
  externalId?: string | null;
  widgetProvider?: string | null;
  widgetPayload?: {
    provider?: string | null;
    tepEventId?: string | number | null;
    tepWidgetId?: string | number | null;
    tcEventId?: string | number | null;
    [key: string]: unknown;
  } | null;
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
  destinationType?: 'city' | 'region' | string | null;
  venue: string;
  venueAddress?: string | null;
  venueKind: string;
  ageLimit?: string | null;
  priceFrom?: number | null;
  vacant?: number | null;
  eventType: string;
  landingSlugs: string[];
  purchaseUrl?: string | null;
  widgetUrl?: string | null;
  deeplinkUrl?: string | null;
  purchaseReady?: boolean;
  purchaseMode?: 'widget' | 'redirect' | string | null;
  purchaseProvider?: 'TICKETSCLOUD' | 'TEPLOHOD' | string | null;
  purchaseUrlSource?: 'offer' | 'fallback' | string | null;
  seoH1?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  canonicalPath?: string | null;
  isIndexable?: boolean | null;
  groupKey?: string | null;
  groupEventIds?: string[];
  sessionCount?: number;
};

export type PublicEventPage = {
  generatedAt: string;
  event: PublicEvent;
  sessions: Array<{
    id: string;
    eventId: string;
    startsAt?: string | null;
    endsAt?: string | null;
    dateLabel: string;
    timeLabel: string;
    timeBucket: 'morning' | 'day' | 'evening' | 'night';
    sourceStatus?: string | null;
    priceFrom?: number | null;
    vacant?: number | null;
    purchaseUrl?: string | null;
    purchaseReady?: boolean;
    purchaseUrlSource?: 'offer' | 'fallback' | string | null;
  }>;
  offers: Array<{
    id: string;
    sourceCode: string;
    title?: string | null;
    priceRub?: number | null;
    widgetUrl?: string | null;
    deeplinkUrl?: string | null;
    active: boolean;
    sortOrder?: number | null;
  }>;
  ticketPrices?: Array<{
    key: string;
    title: string;
    priceRub: number;
    source?: string | null;
    description?: string | null;
    purchaseUrl?: string | null;
    kind?: 'offer' | 'session' | 'fallback';
    sortOrder?: number | null;
  }>;
  related: PublicSession[];
  landings: Array<Pick<PublicLanding, 'slug' | 'title' | 'subtitle' | 'chips'>>;
  stats: {
    sessions: number;
    priceFrom?: number | null;
    vacant?: number | null;
  };
};

export type PublicBuyerOrderTicket = {
  id: string;
  number?: string | null;
  status: string;
  displayStatus: string;
  eventTitle?: string | null;
  eventUrl?: string | null;
  startsAt?: string | null;
};

export type PublicBuyerOrder = {
  id: string;
  number: string;
  sourceOrderId?: string | null;
  status: string;
  displayStatus: string;
  statusTone: 'draft' | 'ready' | 'live' | 'paused' | 'archived' | 'incomplete' | 'error' | string;
  isFinal: boolean;
  providerName?: string | null;
  buyer: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  eventTitle?: string | null;
  eventUrl?: string | null;
  purchasedAt?: string | null;
  updatedAt?: string | null;
  amountRub?: number | null;
  ticketCount: number;
  artifactStatus: 'missing' | 'tickets' | 'not_required' | string;
  message?: string | null;
  tickets: PublicBuyerOrderTicket[];
};

export type PublicBuyerOrdersPayload = {
  generatedAt: string;
  lookupRequired: boolean;
  minLookupLength: number;
  total: number;
  rows: PublicBuyerOrder[];
  metrics: {
    orders: number;
    tickets: number;
    active: number;
  };
};

export type PublicData = {
  generatedAt: string;
  stats: {
    events: number;
    destinations: number;
    venues: number;
    landings: number;
  };
  destinations: PublicDestination[];
  landings: PublicLanding[];
  sessions: PublicSession[];
  venues: PublicVenue[];
};

declare global {
  interface Window {
    PUBLIC_DATA?: PublicData;
  }
}
