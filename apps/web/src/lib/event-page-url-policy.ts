type StableEventPageRoute = {
  slug: string;
  published: boolean;
  isIndexable: boolean;
  historicalAlias?: boolean;
} | null | undefined;

type PublishedEventPage = {
  slug: string;
} | null | undefined;

export function resolveEventPageUrlPolicy(input: {
  requestedSlug: string;
  eventCanonicalPath?: string | null;
  fallbackPath: string;
  eventPageRoute?: StableEventPageRoute;
  publishedEventPage?: PublishedEventPage;
  availability?: string | null;
}) {
  const routeSlug = input.eventPageRoute?.published
    ? String(input.eventPageRoute.slug || '').trim()
    : '';
  // `publishedEventPage` is returned only by the backend query that requires READY + publishedAt.
  const linkedSlug = String(input.publishedEventPage?.slug || '').trim();
  const stableSlug = routeSlug || linkedSlug;
  const stablePath = stableSlug ? `/events/${encodeURIComponent(stableSlug)}` : '';
  const isLegacyAlias = Boolean(stableSlug && stableSlug !== input.requestedSlug);
  const isLegacySlotAlias = isLegacyAlias && input.eventPageRoute?.historicalAlias !== true;
  const hasUnpublishedCandidate = Boolean(
    input.eventPageRoute && !input.eventPageRoute.published && input.eventPageRoute.slug === input.requestedSlug,
  );
  const ended = input.availability === 'ENDED' || input.availability === 'NO_UPCOMING';

  return {
    canonicalPath: isLegacySlotAlias
      ? input.eventCanonicalPath || input.fallbackPath
      : stablePath || input.eventCanonicalPath || input.fallbackPath,
    hasPublishedStablePage: Boolean(stableSlug),
    isLegacyAlias,
    // Legacy event slots stay available to visitors but leave the index with a
    // self-canonical. A historical EventPage path is a different case: it
    // serves the stable page at the old path and canonicalizes to that page.
    noindex:
      isLegacySlotAlias ||
      Boolean(input.eventPageRoute?.published && !input.eventPageRoute.isIndexable) ||
      hasUnpublishedCandidate ||
      (!stableSlug && ended),
  };
}
