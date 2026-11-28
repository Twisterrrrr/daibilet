import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveVenueHeroImage } from './city-place-images.ts';

test('uses a place photo for the Northern River Station pier', () => {
  assert.equal(
    resolveVenueHeroImage(
      'severnyi-rechnoi-vokzal-prichal-no1-57',
      'https://api.teplohod.info/v1/image?item=Event1424&dirtyAlias=ba96328713-1.jpeg',
    ),
    'https://cdn.teplohod.info/images/cache/Events/Event511/eeb8dfe505-1.jpg',
  );
});
