import assert from 'node:assert/strict';
import test from 'node:test';

import {
  resolveEventCardPinLines,
  resolveHubAfficheLocationLine,
} from './event-location.ts';

test('hub affiche pin keeps street and appends city', () => {
  const line = resolveHubAfficheLocationLine({
    city: 'Отрадное',
    destination: 'Ленинградская область',
    destinationType: 'region',
    venueAddress: 'ул. Гагарина, д. 1',
    venue: 'ДК Отрадное',
  });
  assert.equal(line, 'ул. Гагарина, д. 1 · Отрадное');
});

test('hub affiche pin does not leave bare house number', () => {
  const line = resolveHubAfficheLocationLine({
    city: 'Горбунки',
    destination: 'Ленинградская область',
    destinationType: 'region',
    venueAddress: 'д. 5/1',
    venue: 'д. 5/1',
  });
  assert.equal(line, 'Горбунки, д. 5/1');
});

test('pin lines keep long street instead of dropping to city-only', () => {
  const pin = resolveEventCardPinLines({
    city: 'Выборг',
    venueAddress: 'Ильинская улица, 7, корпус 2, литера А',
  });
  assert.match(pin.primary, /Ильинская/i);
  assert.match(pin.primary, /Выборг/);
});
