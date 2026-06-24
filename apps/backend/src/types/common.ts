export type SourceCode = 'TICKETSCLOUD' | 'TEPLOHOD' | string;

export type Severity = 'low' | 'medium' | 'high';

export type Readiness = 'ready' | 'review' | 'blocked';

export type DestinationType = 'city' | 'region';

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

