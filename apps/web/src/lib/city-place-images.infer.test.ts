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
    '/images/venues/ufa/park-pobedy.jpg',
  );
  assert.equal(
    resolveVenueHeroImage('ufa-aibat-hallyar', '/images/cities/ufa.png'),
    '/images/venues/ufa/aibat-hallyar.jpg',
  );
});

test('Novosibirsk hub slugs resolve unique stills and identity fallbacks', () => {
  assert.equal(
    lookupEditorialPlaceImage('novosibirsk-novosibirskiy-teatr-opery-i-baleta-novat'),
    '/images/venues/novosibirsk/novosibirskiy-teatr-opery-i-baleta-novat.jpg',
  );
  assert.equal(
    lookupEditorialPlaceImage('novosibirsk-pamyatnik-leninu'),
    '/images/venues/novosibirsk/pamyatnik-leninu.jpg',
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

test('resolveVenueHeroImage prefers conventional still over stale shared editorial fallback', () => {
  assert.equal(
    resolveVenueHeroImage('ryazan-pevcheskiy-korpus', null),
    '/images/venues/ryazan/pevcheskiy-korpus.jpg',
  );
  assert.equal(
    resolveVenueHeroImage('ryazan-konsistorskiy-korpus', null),
    '/images/venues/ryazan/konsistorskiy-korpus.jpg',
  );
  assert.equal(
    resolveVenueHeroImage('ryazan-ryazanskiy-kreml', null),
    '/images/venues/ryazan/ryazanskiy-kreml.jpg',
  );
  assert.equal(
    resolveVenueHeroImage('ryazan-dvorets-olega', null),
    '/images/venues/ryazan/dvorets-olega.jpg',
  );
});

test('resolveVenueHeroImage drops city placeholders and generated stubs', () => {
  assert.equal(resolveVenueHeroImage('some-unmapped-park', '/images/cities/moscow.png'), null);
  assert.equal(
    resolveVenueHeroImage('some-unmapped-park', '/images/venues/generated/venue-auto-abc.jpg'),
    null,
  );
});

test('resolveVenueHeroImage keeps curated non-stem editorial filenames (NN must-see)', () => {
  assert.equal(
    resolveVenueHeroImage('nizhny-novgorod-gosudarstvennyy-bank', null),
    '/images/venues/nizhny-novgorod/gosbank-nnov.jpg',
  );
  assert.equal(
    resolveVenueHeroImage('nizhny-novgorod-ploschad-minina-i-pozharskogo', null),
    '/images/venues/nizhny-novgorod/ploshchad-minina.jpg',
  );
});

test('resolveVenueHeroImage uses conventional on-disk still for kaliningrad hub slugs', () => {
  assert.equal(
    resolveVenueHeroImage('kaliningrad-kafedral-nyy-sobor', null),
    '/images/venues/kaliningrad/kafedral-nyy-sobor.jpg',
  );
  assert.equal(
    resolveVenueHeroImage('kaliningrad-korolevskie-vorota', null),
    '/images/venues/kaliningrad/korolevskie-vorota.jpg',
  );
});
