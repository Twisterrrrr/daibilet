import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveEventPageUrlPolicy } from './event-page-url-policy';

test('legacy slot URL stays self-canonical and noindex after EventPage publication', () => {
  assert.deepEqual(resolveEventPageUrlPolicy({
    requestedSlug: 'tc-slot-id-old-title',
    eventCanonicalPath: '/events/tc-slot-id-old-title',
    fallbackPath: '/events/tc-slot-id-old-title',
    publishedEventPage: { slug: 'stable-event-page' },
    availability: 'AVAILABLE',
  }), {
    canonicalPath: '/events/tc-slot-id-old-title',
    hasPublishedStablePage: true,
    isLegacyAlias: true,
    noindex: true,
  });
});

test('the stable indexable EventPage URL keeps its own canonical and indexability', () => {
  assert.deepEqual(resolveEventPageUrlPolicy({
    requestedSlug: 'stable-event-page',
    eventCanonicalPath: '/events/legacy-event-id',
    fallbackPath: '/events/legacy-event-id',
    eventPageRoute: { slug: 'stable-event-page', published: true, isIndexable: true },
    publishedEventPage: { slug: 'stable-event-page' },
    availability: 'AVAILABLE',
  }), {
    canonicalPath: '/events/stable-event-page',
    hasPublishedStablePage: true,
    isLegacyAlias: false,
    noindex: false,
  });
});

test('stable EventPage draft route remains noindex until published', () => {
  assert.deepEqual(resolveEventPageUrlPolicy({
    requestedSlug: 'event-draft',
    fallbackPath: '/events/event-draft',
    eventPageRoute: { slug: 'event-draft', published: false, isIndexable: false },
    availability: 'AVAILABLE',
  }), {
    canonicalPath: '/events/event-draft',
    hasPublishedStablePage: false,
    isLegacyAlias: false,
    noindex: true,
  });
});

test('ended legacy event without a linked EventPage retains its previous noindex fallback', () => {
  assert.deepEqual(resolveEventPageUrlPolicy({
    requestedSlug: 'old-event-slug',
    eventCanonicalPath: '/events/old-event-slug',
    fallbackPath: '/events/old-event-slug',
    availability: 'ENDED',
  }), {
    canonicalPath: '/events/old-event-slug',
    hasPublishedStablePage: false,
    isLegacyAlias: false,
    noindex: true,
  });
});
