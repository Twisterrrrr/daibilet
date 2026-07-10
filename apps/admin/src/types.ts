import type { AdminDashboardMetrics } from '@daibilet/contracts/admin';

export type {
  AdminSourceDto as AdminSourceRow,
  AdminSourcesDto as AdminSourcesPayload,
} from '@daibilet/contracts/source';

export type AdminEventRow = {
  id: string;
  slug?: string | null;
  sourceSlug?: string | null;
  groupKey?: string;
  groupEventIds?: string[];
  groupedEventsCount?: number;
  slotCount?: number;
  source: string;
  sourceCode?: string | null;
  externalId?: string | null;
  title: string;
  description?: string | null;
  categoryId?: string | null;
  primarySubcategoryId?: string | null;
  subcategoryIds?: string[];
  tagIds?: string[];
  sourceCategory: string;
  proposedCategory: string;
  city: string;
  destination: string;
  destinationType?: 'city' | 'region' | string | null;
  venue: string;
  venueKind: string;
  offerSourceCode?: string | null;
  offerTitle?: string | null;
  offerPriceRub?: number | null;
  offerWidgetUrl?: string | null;
  offerDeeplinkUrl?: string | null;
  purchaseReady?: boolean;
  purchaseMode?: 'widget' | 'redirect' | string | null;
  purchaseProvider?: 'TICKETSCLOUD' | 'TEPLOHOD' | string | null;
  purchaseUrlSource?: 'offer' | 'fallback' | string | null;
  eventType: string;
  startsAt?: string | null;
  ageLimit?: string | null;
  priceFrom?: number | null;
  vacant?: number | null;
  hasImage: boolean;
  imageUrl?: string | null;
  seoH1?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  canonicalPath?: string | null;
  isIndexable?: boolean | null;
  override?: {
    title?: string | null;
    description?: string | null;
    shortDescription?: string | null;
    imageUrl?: string | null;
    seoH1?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    canonicalPath?: string | null;
    isIndexable?: boolean | null;
    editorStatus?: string | null;
  };
  tags: string[];
  landingHits: string[];
  reasons: string[];
  readinessCodes?: string[];
  readinessIssues?: Array<{
    code: string;
    label: string;
    severity: 'low' | 'medium' | 'high' | string;
  }>;
  moderationStatus?: 'DRAFT' | 'REVIEW' | 'READY' | 'PUBLISHED' | 'HIDDEN' | string;
  canPublish?: boolean;
  publishBlockers?: string[];
  publishWarnings?: string[];
  severity: 'low' | 'medium' | 'high';
  readiness: 'ready' | 'review' | 'blocked';
  offerStatus: string;
  status: 'ready' | 'needs_review';
};

export type AdminVenueRow = {
  id: string;
  name: string;
  title?: string;
  slug?: string;
  city: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  description?: string | null;
  shortDescription?: string | null;
  heroImageUrl?: string | null;
  seoH1?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  canonicalPath?: string | null;
  isIndexable?: boolean | null;
  kind?: string;
  proposedKind: string;
  pageStatus: string;
  reason: string;
  events: number;
};

export type AdminVenueDetail = Omit<AdminVenueRow, 'name' | 'proposedKind' | 'reason' | 'events'> & {
  title: string;
  kind: string;
  pageStatus: string;
  events: Array<{
    id: string;
    title: string;
    status: string;
    priceFrom?: number | null;
    startsAt?: string | null;
  }>;
};

export type AdminLandingRow = {
  id?: string | null;
  slug: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  chips?: string[];
  status: 'ready' | 'seed' | 'empty' | string;
  events: number;
  readyEvents?: number;
  reviewEvents?: number;
  blockedEvents?: number;
  pinnedEvents?: number;
  excludedEvents?: number;
  reviewEventsManual?: number;
  venues: number;
  cities?: number;
  city?: string | null;
  venue?: string | null;
  keywords?: string[];
  keywordScope?: string;
  requiredAnyKeywords?: string[];
  requiredKeywordGroups?: string[][];
  requiredTags?: string[];
  excludedTags?: string[];
  excludedKeywords?: string[];
  priceFrom?: number | null;
  seo?: {
    h1?: string | null;
    title?: string | null;
    description?: string | null;
    canonicalUrl?: string | null;
    isIndexable?: boolean | null;
  };
  sampleEvents?: Array<{
    id: string;
    slug?: string | null;
    title: string;
    city: string;
    venue: string;
    startsAt?: string | null;
    priceFrom?: number | null;
    readiness: 'ready' | 'review' | 'blocked';
  }>;
};

export type AdminLandingDetail = {
  generatedAt: string;
  slug: string;
  rule: {
    slug: string;
    title: string;
    subtitle?: string | null;
    chips: string[];
    city?: string | null;
    venue?: string | null;
    keywords: string[];
    keywordScope?: string;
    requiredAnyKeywords?: string[];
    requiredKeywordGroups?: string[][];
    requiredTags: string[];
    excludedTags: string[];
    excludedKeywords?: string[];
  };
  landing: {
    id?: string | null;
    slug: string;
    title: string;
    subtitle?: string | null;
    description?: string | null;
    status: string;
    heroTitle?: string | null;
    heroSubtitle?: string | null;
    isIndexable?: boolean | null;
    isActive?: boolean | null;
    publishedAt?: string | null;
  };
  blocks?: Array<{
    id?: string;
    type: string;
    variant?: string | null;
    title?: string | null;
    subtitle?: string | null;
    eyebrow?: string | null;
    body?: string | null;
    payload?: unknown;
    isEnabled?: boolean | null;
    sortOrder?: number | null;
  }>;
  seo: {
    h1?: string | null;
    title?: string | null;
    description?: string | null;
    canonicalUrl?: string | null;
    robots?: string | null;
    ogTitle?: string | null;
    ogDescription?: string | null;
    ogImageUrl?: string | null;
  };
  metrics: {
    autoEvents: number;
    effectiveEvents: number;
    pinnedEvents: number;
    excludedEvents: number;
    reviewEvents: number;
    venues: number;
    cities: number;
    priceFrom?: number | null;
  };
  events: AdminLandingEvent[];
  excludedEvents: AdminLandingEvent[];
};

export type AdminLandingEvent = {
  id: string;
  groupEventIds?: string[];
  slug?: string | null;
  title: string;
  city: string;
  venue: string;
  startsAt?: string | null;
  priceFrom?: number | null;
  readiness: 'ready' | 'review' | 'blocked';
  category?: string;
  tags: string[];
  isAutoMatch: boolean;
  manualStatus?: 'PINNED' | 'EXCLUDED' | 'REVIEW' | null;
  manualNote?: string | null;
  matchReasons?: string[];
  matchBlockers?: string[];
};

export type AdminData = {
  generatedAt: string;
  importJob: {
    source: string;
    status: string;
    mode: string;
    events: number;
    categories: number;
    venues: number;
    cities: number;
    tags: number;
    metaEvents: number;
  };
  metrics: AdminDashboardMetrics;
  eventRows: AdminEventRow[];
  mappingRows: Array<{ source: string; target: string; subcategory: string; mode: string; events: number }>;
  venueRows: AdminVenueRow[];
  duplicateCandidates: Array<{
    key: string;
    events: number;
    venues: Array<{ id: string; name: string; city: string; address?: string | null; events: number }>;
  }>;
  destinationRows: Array<{ name: string; type: 'city' | 'region'; events: number; venues: number; cities?: Array<{ name: string; events: number }> }>;
  landingRows: AdminLandingRow[];
};

declare global {
  interface Window {
    ADMIN_DATA?: AdminData;
  }
}
