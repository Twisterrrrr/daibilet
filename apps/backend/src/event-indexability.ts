import {
  hasUpcomingOrOpenSchedule,
  isPublicSalesStatusBlocked,
  isPublicSessionRowOnSale,
  isStartedTicketcloudSlot,
  type CatalogScheduleRow,
} from './catalog-availability.js';

export type SeoStatus = 'AUTO' | 'INDEX' | 'NOINDEX';
export type ConfirmedIndexability = 'INDEX' | 'NOINDEX' | null;
export type ScheduleConfidence = 'ACTIVE' | 'INACTIVE' | 'UNKNOWN';
export type DuplicateConfidence = 'CLEAR' | 'DUPLICATE' | 'UNKNOWN';

export type EventIndexabilityInput = {
  seoStatus?: SeoStatus | null | undefined;
  /** Last persisted decision, used only to preserve the current result on uncertainty. */
  confirmedIndexability?: ConfirmedIndexability | undefined;
  published: boolean | null;
  title?: string | null | undefined;
  city?: string | null | undefined;
  venue?: string | null | undefined;
  canonicalValid: boolean | null;
  technicalError?: boolean | undefined;
  duplicate: DuplicateConfidence;
  syncState: 'SUCCESS' | 'FAILED' | 'UNKNOWN';
  sessions?: Array<CatalogScheduleRow & {
    isActive?: boolean | null | undefined;
    cancelledAt?: string | Date | null | undefined;
    purchaseReady?: boolean | undefined;
  }> | undefined;
  eventKind?: string | null | undefined;
  sourceStatus?: string | null | undefined;
  provider?: string | null | undefined;
  purchaseReady: boolean | null;
  priceFrom?: number | null | undefined;
  isFree?: boolean | null | undefined;
  description?: string | null | undefined;
  /** A separately reviewed permanent/open-date booking case, not inferred from title. */
  evergreenBookingApproved?: boolean | undefined;
  scheduleConfidence?: ScheduleConfidence | undefined;
  now?: Date | undefined;
};

export type EventIndexabilityResult = {
  proposed: 'INDEX' | 'NOINDEX' | 'UNKNOWN';
  effective: ConfirmedIndexability;
  reasons: string[];
  manualStatus: SeoStatus;
  hasActivePurchaseSession: boolean;
};

const NON_PUBLIC_LABELS = new Set(['', '—', '-', 'не указан', 'не указано', 'unknown', 'без города']);

function present(value: string | null | undefined): boolean {
  return !NON_PUBLIC_LABELS.has(String(value || '').trim().toLowerCase());
}

/**
 * Read-only SEO preview. This helper never persists statuses and is deliberately
 * fail-closed when publication, canonical, duplicate or synchronization facts
 * are unknown. Callers may expose `proposed` for audit while keeping current
 * public robots unchanged until a separate rollout is approved.
 */
export function calculateEventIndexability(input: EventIndexabilityInput): EventIndexabilityResult {
  const reasons: string[] = [];
  const manualStatus = input.seoStatus || 'AUTO';
  const now = input.now || new Date();
  const activeSessions = (input.sessions || []).filter((session) =>
    !isPublicSalesStatusBlocked(input.sourceStatus) &&
    isPublicSessionRowOnSale(session) &&
    !isStartedTicketcloudSlot(session, input.provider, now) &&
    hasUpcomingOrOpenSchedule({
      ...session,
      sourceStatus: session.sourceStatus || input.sourceStatus,
      kind: session.kind || input.eventKind,
    }),
  );
  const hasActivePurchaseSession = activeSessions.some((session) => session.purchaseReady !== false);

  const finish = (proposed: EventIndexabilityResult['proposed']): EventIndexabilityResult => ({
    proposed,
    effective: proposed === 'UNKNOWN' ? input.confirmedIndexability ?? null : proposed,
    reasons,
    manualStatus,
    hasActivePurchaseSession,
  });

  if (manualStatus === 'NOINDEX') {
    reasons.push('MANUAL_NOINDEX');
    return finish('NOINDEX');
  }
  if (input.published === false) {
    reasons.push('NOT_PUBLISHED');
    return finish('NOINDEX');
  }
  if (input.published == null) {
    reasons.push('PUBLICATION_UNKNOWN');
    return finish('UNKNOWN');
  }
  if (input.technicalError) {
    reasons.push('TECHNICAL_ERROR');
    return finish('NOINDEX');
  }
  if (input.canonicalValid === false) {
    reasons.push('INVALID_CANONICAL');
    return finish('NOINDEX');
  }
  if (input.duplicate === 'DUPLICATE') {
    reasons.push('CONFIRMED_DUPLICATE');
    return finish('NOINDEX');
  }
  if (input.duplicate === 'UNKNOWN') {
    reasons.push('DUPLICATE_REVIEW_REQUIRED');
    return finish('UNKNOWN');
  }
  if (input.canonicalValid == null) {
    reasons.push('CANONICAL_UNKNOWN');
    return finish('UNKNOWN');
  }
  if (input.syncState !== 'SUCCESS' || input.scheduleConfidence === 'UNKNOWN') {
    reasons.push(input.syncState === 'FAILED' ? 'SYNC_FAILED' : 'SCHEDULE_UNKNOWN');
    return finish('UNKNOWN');
  }

  if (manualStatus === 'INDEX') {
    reasons.push('MANUAL_INDEX');
    return finish('INDEX');
  }

  const checks: Array<[boolean, string]> = [
    [present(input.title), 'MISSING_TITLE'],
    [present(input.city), 'MISSING_CITY'],
    [present(input.venue), 'MISSING_VENUE'],
    [input.purchaseReady === true, 'PURCHASE_NOT_READY'],
    [input.isFree === true || (Number.isFinite(input.priceFrom) && Number(input.priceFrom) > 0), 'MISSING_PRICE_OR_FREE_ENTRY'],
    [String(input.description || '').trim().length > 20, 'DESCRIPTION_TOO_SHORT'],
  ];
  for (const [passed, reason] of checks) {
    if (!passed) reasons.push(reason);
  }

  const hasJustifiedSchedule = hasActivePurchaseSession || input.evergreenBookingApproved === true;
  if (!hasJustifiedSchedule) {
    reasons.push(input.scheduleConfidence === 'INACTIVE' ? 'NO_ACTIVE_OR_APPROVED_SCHEDULE' : 'NO_ACTIVE_PURCHASE_SESSION');
  }
  if (input.scheduleConfidence === 'INACTIVE' && input.evergreenBookingApproved !== true) {
    reasons.push('SCHEDULE_INACTIVE');
  }

  return finish(reasons.length === 0 ? 'INDEX' : 'NOINDEX');
}
