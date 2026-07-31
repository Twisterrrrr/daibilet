import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifyEventCoverage,
  coveragePct,
  haversineMeters,
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
