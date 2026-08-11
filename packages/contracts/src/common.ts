export type SourceCode = 'TICKETSCLOUD' | 'TEPLOHOD' | string;

export type Severity = 'low' | 'medium' | 'high';

export type Readiness = 'ready' | 'review' | 'blocked';

export type DestinationType = 'city' | 'region';

/** Live region hub tier by active child-city event count (без адмцентра). */
export type RegionLiveTier = 'A' | 'B' | 'C';

/** Tier B / index floor: ≥3 региональных события. */
export const REGION_TIER_B_MIN_EVENTS = 3;
/** Tier A: ≥10 - полный regionInfo / AI topPlaces. */
export const REGION_TIER_A_MIN_EVENTS = 10;

/**
 * Динамический тир региона. Не зависит от ручного `tier` в region-hubs.json.
 * C: <3 · B: 3-9 · A: ≥10
 */
export function resolveRegionLiveTier(eventCount: number): RegionLiveTier {
  const total = Number(eventCount) || 0;
  if (total >= REGION_TIER_A_MIN_EVENTS) return 'A';
  if (total >= REGION_TIER_B_MIN_EVENTS) return 'B';
  return 'C';
}

export function isRegionIndexableByEvents(eventCount: number): boolean {
  return resolveRegionLiveTier(eventCount) !== 'C';
}

export type TimeBucket = 'morning' | 'day' | 'evening' | 'night';

export type PurchaseMode = 'widget' | 'redirect';

export type PurchaseProvider = 'TICKETSCLOUD' | 'TEPLOHOD';

export type PurchaseUrlSource = 'offer' | 'fallback';

export type JsonRecord = Record<string, unknown>;

export interface ApiEnvelope {
  generatedAt?: string;
}

export interface FacetCount {
  name: string;
  events: number;
}

export interface DateTimeSlot {
  id?: string;
  eventId?: string | null;
  startsAt: string;
  endsAt?: string | null;
  dateLabel: string;
  timeLabel: string;
  timeBucket?: TimeBucket;
  timeZone?: string | null;
}

export interface ReadinessIssue {
  code: string;
  label: string;
  severity: Severity | string;
}

export interface SeoFields {
  seoH1?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  canonicalPath?: string | null;
  isIndexable?: boolean | null;
}

export interface PurchaseFields {
  purchaseUrl?: string | null;
  widgetUrl?: string | null;
  deeplinkUrl?: string | null;
  purchaseReady?: boolean;
  purchaseMode?: PurchaseMode | string | null;
  purchaseProvider?: PurchaseProvider | string | null;
  purchaseUrlSource?: PurchaseUrlSource | string | null;
}

