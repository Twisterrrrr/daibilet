/**
 * Review capability for Daibilet aggregator.
 *
 * Unlike SPBBOATS (TC/TEP banned), we ALLOW reviews for TC when purchase can be
 * verified via ExternalOrder. Own/manual events are always OK.
 * TEP without orders/email: form OK, but verification ("Покупка подтверждена") skipped.
 */

export type ReviewCapability = 'ENABLED' | 'DISABLED';

export type ReviewCapabilityEvent = {
  id: string;
  managementMode?: string | null;
  purchaseFlow?: string | null;
  supplierId?: string | null;
  sourceCode?: string | null;
};

/** Public form is always enabled for published catalog events. */
export function resolveReviewCapability(_event?: ReviewCapabilityEvent | null): ReviewCapability {
  return 'ENABLED';
}

export function canAcceptReviews(event?: ReviewCapabilityEvent | null): boolean {
  return resolveReviewCapability(event) === 'ENABLED';
}
