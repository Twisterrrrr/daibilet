import type { PurchaseFields, Readiness, ReadinessIssue, SeoFields, Severity, SourceCode } from './common.js';

export interface AdminDashboardLaunchMetrics {
  groupedEvents: number;
  readyForSales: number;
  readyForSeo: number;
  needsAttention: number;
  priceBlocked: number;
  purchaseBlocked: number;
  noImage: number;
  landingMatched: number;
}

export interface AdminDashboardMetrics {
  events: number;
  sourceEvents: number;
  readyEvents: number;
  reviewEvents: number;
  blockedEvents: number;
  sources: number;
  venues: number;
  cities: number;
  categories: number;
  tags: number;
  landingRules: number;
  destinations: number;
  orders: number;
  launch: AdminDashboardLaunchMetrics;
}

export interface AdminDashboardDto {
  generatedAt: string;
  metrics: AdminDashboardMetrics;
}

export interface AdminEventRowDto extends SeoFields, PurchaseFields {
  id: string;
  slug?: string | null;
  sourceSlug?: string | null;
  groupKey?: string;
  groupEventIds?: string[];
  groupedEventsCount?: number;
  slotCount?: number;
  source: string;
  sourceCode?: SourceCode | null;
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
  destinationType?: string | null;
  venue: string;
  venueKind: string;
  offerSourceCode?: string | null;
  offerTitle?: string | null;
  offerPriceRub?: number | null;
  eventType: string;
  startsAt?: string | null;
  ageLimit?: string | null;
  priceFrom?: number | null;
  vacant?: number | null;
  hasImage: boolean;
  imageUrl?: string | null;
  override?: AdminEventOverrideDto | null;
  tags: string[];
  landingHits: string[];
  reasons: string[];
  readinessCodes?: string[];
  readinessIssues?: ReadinessIssue[];
  moderationStatus?: 'DRAFT' | 'REVIEW' | 'READY' | 'PUBLISHED' | 'HIDDEN' | string;
  canPublish?: boolean;
  publishBlockers?: string[];
  publishWarnings?: string[];
  severity: Severity;
  readiness: Readiness;
  offerStatus: string;
  status: 'ready' | 'needs_review';
}

export interface AdminEventOverrideDto extends SeoFields {
  title?: string | null;
  description?: string | null;
  shortDescription?: string | null;
  imageUrl?: string | null;
  editorStatus?: string | null;
}

export interface AdminEventDetailDto extends AdminEventRowDto {
  sessions: Array<{
    id: string;
    startsAt?: string | null;
    endsAt?: string | null;
    sourceStatus?: string | null;
    priceFrom?: number | null;
    vacant?: number | null;
  }>;
  offers: Array<{
    id: string;
    sourceCode: SourceCode;
    title?: string | null;
    priceRub?: number | null;
    widgetUrl?: string | null;
    deeplinkUrl?: string | null;
    active: boolean;
  }>;
}

export interface AdminEventsListDto {
  generatedAt: string;
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  items: AdminEventRowDto[];
}

export interface AdminVenueRowDto extends SeoFields {
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
  kind?: string;
  proposedKind: string;
  pageStatus: string;
  reason: string;
  events: number;
}

export interface AdminCityRowDto {
  id: string;
  slug: string;
  title: string;
  type: 'city' | 'region' | string;
  events: number;
  venues: number;
  categories?: Record<string, number>;
}

export interface AdminTaxonomyDto {
  categories: Array<{ id: string; slug: string; title: string }>;
  subcategories: Array<{ id: string; slug: string; title: string; categoryId: string }>;
  tags: Array<{ id: string; slug: string; title: string }>;
}
