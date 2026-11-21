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
    canonicalPath: stablePath || input.eventCanonicalPath || input.fallbackPath,
    hasPublishedStablePage: Boolean(stableSlug),
    isLegacyAlias,
    // A legacy/alias page must NOT emit noindex alongside a cross-canonical:
    // noindex + canonical together confuses Google and produces the GSC
    // "canonical version does not match" bucket. The canonical alone
    // consolidates the alias into the stable page; noindex stays only for pages
    // without a published canonical (draft / ended / explicit non-indexable).
    noindex:
      Boolean(input.eventPageRoute?.published && !input.eventPageRoute.isIndexable) ||
      hasUnpublishedCandidate ||
      (!stableSlug && ended),
  };
}
