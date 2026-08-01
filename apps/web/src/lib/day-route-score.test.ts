import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifyEventCoverage,
  coveragePct,
  dayRouteEventBaseSlug,
  dayRouteMatchDedupeKey,
  dedupeDayRouteMatches,
  haversineMeters,
  normalizeDayRouteTitleKey,
  scoreDayRouteCoverage,
} from './day-route-score.ts';

test('scoreDayRouteCoverage weights STOP > start > nearby', () => {
  assert.equal(scoreDayRouteCoverage({ stop: ['a', 'b'], start: [], nearby: [] }), 6);
  assert.equal(scoreDayRouteCoverage({ stop: ['a'], start: ['b'], nearby: [] }), 5);
  assert.equal(scoreDayRouteCoverage({ stop: [], start: [], nearby: ['a'] }), 1);
  assert.ok(
    scoreDayRouteCoverage({ stop: ['a'], start: [], nearby: [] }) >
      scoreDayRouteCoverage({ stop: [], start: ['a'], nearby: [] }),
  );
});

test('classifyEventCoverage separates stop/start/nearby without double count', () => {
  const covered = classifyEventCoverage({
    selectedVenueIds: ['stop1', 'start1', 'near1', 'miss1'],
    stopVenueIds: ['stop1'],
    startVenueId: 'start1',
    startLat: 55.75,
    startLng: 37.62,
    selectedCoords: new Map([
      ['near1', { latitude: 55.751, longitude: 37.62 }],
      ['miss1', { latitude: 56.0, longitude: 37.62 }],
    ]),
  });
  assert.deepEqual(covered.stop, ['stop1']);
  assert.deepEqual(covered.start, ['start1']);
  assert.deepEqual(covered.nearby, ['near1']);
  assert.equal(scoreDayRouteCoverage(covered), 3 + 2 + 1);
  assert.equal(coveragePct(covered, 4), 0.5);
});

test('haversine short distance sane', () => {
  const m = haversineMeters(55.75, 37.62, 55.75135, 37.62);
  assert.ok(m > 140 && m < 160, `got ${m}`);
});

test('dayRouteEventBaseSlug strips TC/dated id suffixes', () => {
  assert.equal(
    dayRouteEventBaseSlug(
      'обзорная-экскурсия-по-санкт-петербургу-с-посещением-эрмитажа-69ca5d1e49864162764e1241',
      'evt_69ca5d1e49864162764e1241',
    ),
    'обзорная-экскурсия-по-санкт-петербургу-с-посещением-эрмитажа',
  );
  assert.equal(
    dayRouteEventBaseSlug(
      'tc-6a3932f3b6b70fed7424032d-обзорная-экскурсия-по-санкт-петербургу-с-посещением-эрмитажа',
      'evt_6a3932f3b6b70fed7424032d',
    ),
    'обзорная-экскурсия-по-санкт-петербургу-с-посещением-эрмитажа',
  );
});

test('normalizeDayRouteTitleKey collapses hyphen variants', () => {
  assert.equal(
    normalizeDayRouteTitleKey('Обзорная экскурсия по Санкт-Петербургу с посещением Эрмитажа'),
    normalizeDayRouteTitleKey('Обзорная экскурсия по Санкт Петербургу с посещением Эрмитажа'),
  );
});

test('dedupeDayRouteMatches keeps cheapest best-score sibling', () => {
  const keyA = dayRouteMatchDedupeKey({
    eventId: 'evt_69ca5d1e49864162764e1241',
    slug: 'обзорная-экскурсия-по-санкт-петербургу-с-посещением-эрмитажа-69ca5d1e49864162764e1241',
    title: 'Обзорная экскурсия по Санкт Петербургу с посещением Эрмитажа',
  });
  const keyB = dayRouteMatchDedupeKey({
    eventId: 'evt_6a3932f3b6b70fed7424032d',
    slug: 'tc-6a3932f3b6b70fed7424032d-обзорная-экскурсия-по-санкт-петербургу-с-посещением-эрмитажа',
    title: 'Обзорная экскурсия по Санкт-Петербургу с посещением Эрмитажа',
  });
  assert.equal(keyA, keyB);

  const out = dedupeDayRouteMatches([
    {
      eventId: 'evt_6a3932f3b6b70fed7424032d',
      slug: 'tc-6a3932f3b6b70fed7424032d-обзорная-экскурсия-по-санкт-петербургу-с-посещением-эрмитажа',
      title: 'Обзорная экскурсия по Санкт-Петербургу с посещением Эрмитажа',
      score: 1,
      coveragePct: 0,
      priceFromRub: 2000,
    },
    {
      eventId: 'evt_69ca5d1e49864162764e1241',
      slug: 'обзорная-экскурсия-по-санкт-петербургу-с-посещением-эрмитажа-69ca5d1e49864162764e1241',
      title: 'Обзорная экскурсия по Санкт Петербургу с посещением Эрмитажа',
      score: 1,
      coveragePct: 0,
      priceFromRub: 1500,
    },
    {
      eventId: 'evt_other',
      slug: 'rechnaya-progulka-po-neve',
      title: 'Речная прогулка по Неве',
      score: 1,
      coveragePct: 0,
      priceFromRub: 900,
    },
  ]);
  assert.equal(out.length, 2);
  const hermitage = out.find((m) => m.title.includes('Эрмитажа'));
  assert.equal(hermitage?.eventId, 'evt_69ca5d1e49864162764e1241');
  assert.equal(hermitage?.priceFromRub, 1500);
});
