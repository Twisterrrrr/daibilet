import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveEventCardPrimaryImage } from './event-card-image.ts';

test('event-specific supplier cover takes precedence over the shared venue hero', () => {
  assert.equal(
    resolveEventCardPrimaryImage({
      id: 'evt-unmapped',
      slug: 'supplier-event',
      imageUrl: 'https://cdn.example/event-poster.jpg',
      city: 'Санкт-Петербург',
      destination: 'Санкт-Петербург',
      venueSlug: 'saint-petersburg-ermitazh',
    }),
    'https://cdn.example/event-poster.jpg',
  );
});

test('venue hero is used when the event has no usable event-specific cover', () => {
  const image = resolveEventCardPrimaryImage({
    id: 'evt-unmapped',
    slug: 'supplier-event',
    imageUrl: null,
    city: 'Санкт-Петербург',
    destination: 'Санкт-Петербург',
    venueSlug: 'saint-petersburg-ermitazh',
  });

  assert.ok(image);
  assert.match(image, /ermitazh/i);
});
