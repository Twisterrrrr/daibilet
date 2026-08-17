import assert from 'node:assert/strict';
import test from 'node:test';

import { lookupEditorialPlaceImage, resolveVenueHeroImage } from './city-place-images.ts';

test('Ufa hub slugs resolve to real venue stills, not cities placeholders', () => {
  assert.equal(
    lookupEditorialPlaceImage('ufa-pamyatnik-salavatu-yulaevu'),
    '/images/venues/ufa/pamyatnik-salavatu-yulaevu.jpg',
  );
  assert.equal(
    lookupEditorialPlaceImage('ufa-park-pobedy'),
    '/images/venues/ufa/identity-symbol.jpg',
  );
  assert.equal(
    resolveVenueHeroImage('ufa-aibat-hallyar', '/images/cities/ufa.png'),
    '/images/venues/ufa/identity-gastro.jpg',
  );
});

test('Novosibirsk hub slugs resolve unique stills and identity fallbacks', () => {
  assert.equal(
    lookupEditorialPlaceImage('novosibirsk-novosibirskiy-teatr-opery-i-baleta-novat'),
    '/images/venues/novosibirsk/novosibirskiy-teatr-opery-i-baleta-novat.jpg',
  );
  assert.equal(
    lookupEditorialPlaceImage('novosibirsk-pamyatnik-leninu'),
    '/images/venues/novosibirsk/identity-symbol.jpg',
  );
});

test('resolveVenueHeroImage uses city identity pack when slug is unmapped', () => {
  assert.equal(
    resolveVenueHeroImage('omsk-unknown-new-place', null),
    '/images/venues/omsk/identity-symbol.jpg',
  );
  assert.equal(
    resolveVenueHeroImage('chelyabinsk-brand-new-spot', '/images/venues/generated/venue-auto-stub.jpg'),
    '/images/venues/chelyabinsk/identity-symbol.jpg',
  );
});

test('resolveVenueHeroImage drops city placeholders and generated stubs', () => {
  assert.equal(resolveVenueHeroImage('some-unmapped-park', '/images/cities/moscow.png'), null);
  assert.equal(
    resolveVenueHeroImage('some-unmapped-park', '/images/venues/generated/venue-auto-abc.jpg'),
    null,
  );
});
