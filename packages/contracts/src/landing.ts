import type { JsonRecord, Readiness } from './common.js';

export type LandingMatchStatus = 'AUTO' | 'PINNED' | 'EXCLUDED' | 'REVIEW';

export type LandingStrength = 'ready' | 'seed' | 'empty';

export interface LandingRuleDto {
  slug: string;
  title: string;
  subtitle?: string | null;
  chips: string[];
  city?: string | null;
  venue?: string | null;
  keywords: string[];
  keywordScope?: 'title' | 'content' | string;
  requiredAnyKeywords?: string[];
  requiredKeywordGroups?: string[][];
  requiredTags: string[];
  excludedTags: string[];
  excludedKeywords?: string[];
}

export interface LandingSeoDto {
  h1?: string | null;
  title?: string | null;
  description?: string | null;
  canonicalUrl?: string | null;
  robots?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImageUrl?: string | null;
}

export interface LandingContentBlockDto {
  id?: string;
  type: string;
  variant?: string | null;
  title?: string | null;
  subtitle?: string | null;
  eyebrow?: string | null;
  body?: string | null;
  richTextJson?: unknown;
  payload?: JsonRecord | null;
  assetUrl?: string | null;
  mobileAssetUrl?: string | null;
  isEnabled?: boolean | null;
  sortOrder?: number | null;
}

export interface LandingEventDto {
  id: string;
  groupEventIds?: string[];
  slug?: string | null;
  title: string;
  city: string;
  venue: string;
  startsAt?: string | null;
  priceFrom?: number | null;
  readiness: Readiness;
  category?: string;
  tags: string[];
  isAutoMatch: boolean;
  manualStatus?: Exclude<LandingMatchStatus, 'AUTO'> | null;
  manualNote?: string | null;
  matchReasons?: string[];
  matchBlockers?: string[];
}

export interface AdminLandingRowDto {
  id?: string | null;
  slug: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  chips?: string[];
  status: LandingStrength | string;
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
  priceFrom?: number | null;
  seo?: LandingSeoDto;
  sampleEvents?: LandingEventDto[];
}

export interface AdminLandingDetailDto {
  generatedAt: string;
  slug: string;
  rule: LandingRuleDto;
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
  blocks?: LandingContentBlockDto[];
  seo: LandingSeoDto;
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
  events: LandingEventDto[];
  excludedEvents: LandingEventDto[];
}

