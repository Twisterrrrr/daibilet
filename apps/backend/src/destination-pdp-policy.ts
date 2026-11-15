import {
  destinationPdpContentSchema,
  type DestinationPdpStatus,
  type PublishedDestinationPdpDto,
} from '@daibilet/contracts/city-pdp';

const allowedTransitions: Record<DestinationPdpStatus, DestinationPdpStatus[]> = {
  DRAFT: ['REVIEW', 'HIDDEN'],
  REVIEW: ['DRAFT', 'READY', 'HIDDEN'],
  READY: ['REVIEW', 'HIDDEN'],
  PUBLISHED: ['HIDDEN'],
  HIDDEN: ['DRAFT', 'REVIEW'],
};

export function canTransitionDestinationPdpStatus(
  current: DestinationPdpStatus,
  next: DestinationPdpStatus,
): boolean {
  return allowedTransitions[current].includes(next);
}

export function checkDestinationPdpReadiness(value: unknown): { ready: boolean; missing: string[] } {
  const parsed = destinationPdpContentSchema.safeParse(value);
  if (!parsed.success) return { ready: false, missing: ['content_schema'] };
  const content = parsed.data;
  const missing: string[] = [];
  if (!content.introTitle?.trim()) missing.push('introTitle');
  if (!content.introText?.trim()) missing.push('introText');
  if (!(content.sources?.length)) missing.push('sources');
  if (!((content.mustSee?.length || 0) + (content.sights?.length || 0) + (content.regionTopPlaces?.length || 0) + (content.routes?.length || 0))) {
    missing.push('featured_content');
  }
  return { ready: missing.length === 0, missing };
}

export function readPublishedDestinationPdp(document: {
  status: string;
  publishedContent: unknown;
  version: number;
  isIndexable: boolean;
  publishedAt: Date | null;
} | null): PublishedDestinationPdpDto | null {
  if (!document || document.status === 'HIDDEN' || !document.publishedContent || typeof document.publishedContent !== 'object') {
    return null;
  }
  const snapshot = document.publishedContent as Record<string, unknown>;
  const content = destinationPdpContentSchema.safeParse(snapshot.content);
  if (!content.success) return null;
  const nullableString = (value: unknown) => (typeof value === 'string' ? value : null);
  const publishedVersion = typeof snapshot.version === 'number' && Number.isInteger(snapshot.version)
    ? snapshot.version
    : document.version;
  return {
    version: publishedVersion,
    summary: nullableString(snapshot.summary),
    heroImageUrl: nullableString(snapshot.heroImageUrl),
    seoH1: nullableString(snapshot.seoH1),
    seoTitle: nullableString(snapshot.seoTitle),
    seoDescription: nullableString(snapshot.seoDescription),
    canonicalPath: nullableString(snapshot.canonicalPath),
    isIndexable: document.isIndexable,
    publishedAt: document.publishedAt?.toISOString() ?? null,
    content: content.data,
  };
}
