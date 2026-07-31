import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const geo = require(path.join(root, 'scripts/lib/venue-route-geo.js'));

test('haversineMeters: ~111km per degree latitude', () => {
  const meters = geo.haversineMeters(55.0, 37.0, 56.0, 37.0);
  assert.ok(meters > 110_000 && meters < 112_500, `got ${meters}`);
});

test('haversineMeters: short urban distance ~150m', () => {
  // ~0.00135 deg lat ≈ 150 m
  const meters = geo.haversineMeters(55.75, 37.62, 55.75135, 37.62);
  assert.ok(meters > 140 && meters < 160, `got ${meters}`);
});

test('confidence thresholds 150/300/500', () => {
  assert.equal(geo.confidenceForDistance(80), 'high');
  assert.equal(geo.confidenceForDistance(150), 'high');
  assert.equal(geo.confidenceForDistance(220), 'medium');
  assert.equal(geo.confidenceForDistance(300), 'medium');
  assert.equal(geo.confidenceForDistance(400), 'low');
  assert.equal(geo.confidenceForDistance(500), 'low');
  assert.equal(geo.confidenceForDistance(501), null);
});

test('dayRouteMatchScore weights STOP > start > nearby', () => {
  assert.equal(geo.dayRouteMatchScore({ stop: ['a', 'b'], start: [], nearby: [] }), 6);
  assert.equal(geo.dayRouteMatchScore({ stop: ['a'], start: ['b'], nearby: [] }), 5);
  assert.equal(geo.dayRouteMatchScore({ stop: [], start: [], nearby: ['a', 'b'] }), 2);
  assert.ok(
    geo.dayRouteMatchScore({ stop: ['a'], start: [], nearby: [] }) >
      geo.dayRouteMatchScore({ stop: [], start: ['a'], nearby: [] }),
  );
  assert.ok(
    geo.dayRouteMatchScore({ stop: [], start: ['a'], nearby: [] }) >
      geo.dayRouteMatchScore({ stop: [], start: [], nearby: ['a'] }),
  );
});

test('kind allowlist includes MONUMENT/PARK, excludes ONLINE', () => {
  assert.equal(geo.isKindAllowed('MONUMENT'), true);
  assert.equal(geo.isKindAllowed('PARK'), true);
  assert.equal(geo.isKindAllowed('ONLINE'), false);
  assert.equal(geo.isKindAllowed('THEATER'), false);
});

test('isValidCoordinatePair rejects garbage', () => {
  assert.equal(geo.isValidCoordinatePair(55.75, 37.62), true);
  assert.equal(geo.isValidCoordinatePair(NaN, 37), false);
  assert.equal(geo.isValidCoordinatePair(91, 0), false);
});
