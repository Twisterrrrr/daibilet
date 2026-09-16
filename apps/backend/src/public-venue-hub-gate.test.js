import assert from 'node:assert/strict';
import test from 'node:test';

import {
  hasMinimalVenueProfile,
  isContentPlaceHubEligible,
  isContentPlaceKind,
} from './public-venue-hub-gate.js';

test('hasMinimalVenueProfile accepts shortDescription or hookFact', () => {
  assert.equal(hasMinimalVenueProfile({ title: 'Парк', shortDescription: 'Текст' }), true);
  assert.equal(hasMinimalVenueProfile({ name: 'Памятник', hookFact: 'Факт' }), true);
  assert.equal(hasMinimalVenueProfile({ title: 'Музей' }), false);
  assert.equal(hasMinimalVenueProfile({ title: '', shortDescription: 'x' }), false);
});

test('isContentPlaceKind covers location + museum/theater families', () => {
  assert.equal(isContentPlaceKind('PARK'), true);
  assert.equal(isContentPlaceKind('MONUMENT'), true);
  assert.equal(isContentPlaceKind('OUTDOOR_LOCATION'), true);
  assert.equal(isContentPlaceKind('ATTRACTION'), true);
  assert.equal(isContentPlaceKind('MUSEUM_ART_SPACE'), true);
  assert.equal(isContentPlaceKind('THEATER'), true);
  assert.equal(isContentPlaceKind('CLUB_BAR_RESTAURANT'), true);
  assert.equal(isContentPlaceKind('CONCERT_HALL'), true);
  assert.equal(isContentPlaceKind('OTHER', 'park'), true);
  assert.equal(isContentPlaceKind('OTHER', 'temple'), true);
  assert.equal(isContentPlaceKind('MEETING_POINT'), false);
});

test('isContentPlaceHubEligible requires PUBLISHED|CANDIDATE + profile', () => {
  const base = {
    title: 'Пермская эспланада',
    kind: 'PARK',
    shortDescription: 'Главное общественное пространство',
  };
  assert.equal(isContentPlaceHubEligible({ ...base, pageStatus: 'PUBLISHED' }, 'park'), true);
  assert.equal(isContentPlaceHubEligible({ ...base, pageStatus: 'candidate' }, 'park'), true);
  assert.equal(isContentPlaceHubEligible({ ...base, pageStatus: 'NONE' }, 'park'), false);
  assert.equal(
    isContentPlaceHubEligible({ title: 'Парк', kind: 'PARK', pageStatus: 'PUBLISHED' }, 'park'),
    false,
  );
});
