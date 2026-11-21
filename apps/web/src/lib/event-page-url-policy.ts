type StableEventPageRoute = {
  slug: string;
  published: boolean;
  isIndexable: boolean;
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
  const hasUnpublishedCandidate = Boolean(
    input.eventPageRoute && !input.eventPageRoute.published && input.eventPageRoute.slug === input.requestedSlug,
  );
  const ended = input.availability === 'ENDED' || input.availability === 'NO_UPCOMING';

  return {
    // A slot/alias folded into a published EventPage is kept (not lost) but de-indexed:
    // noindex, with a SELF canonical. It must NOT cross-canonical to the EventPage,
    // because noindex + cross-canonical confuses Google ("канонические версии не совпадают").
    canonicalPath: isLegacyAlias
      ? `/events/${encodeURIComponent(input.requestedSlug)}`
      : (stablePath || input.eventCanonicalPath || input.fallbackPath),
    hasPublishedStablePage: Boolean(stableSlug),
    isLegacyAlias,
    noindex:
      isLegacyAlias ||
      Boolean(input.eventPageRoute?.published && !input.eventPageRoute.isIndexable) ||
      hasUnpublishedCandidate ||
      (!stableSlug && ended),
  };
}
