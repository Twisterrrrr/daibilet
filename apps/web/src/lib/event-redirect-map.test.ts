import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { buildEventRedirectIndex, resolveEventRedirect, validateEventRedirectMap, type EventRedirectMap } from './event-redirect-map';

const VALID: EventRedirectMap = {
  version: 1,
  generatedAt: null,
  entries: [
    {
      sourcePath: '/events/tc-6abc12345678901234567890ab-old-title',
      eventId: 'evt_6abc12345678901234567890ab',
      kind: 'tc_code',
      status: 301,
      targetPath: '/events/regular-show-moscow',
    },
    {
      sourcePath: '/events/past-slot-moscow',
      eventId: 'evt_000000000000000000000001',
      kind: 'past_slot',
      status: 410,
      targetPath: null,
    },
  ],
};

test('valid redirect map has no errors', () => {
  assert.deepEqual(validateEventRedirectMap(VALID), []);
});

test('committed redirect map data file stays valid', () => {
  const file = path.resolve(__dirname, '../../../..', 'data', 'redirects', 'event-pdp-redirects.json');
  const map = JSON.parse(readFileSync(file, 'utf8')) as unknown;
  assert.deepEqual(validateEventRedirectMap(map), []);
});

test('duplicate sourcePath is rejected', () => {
  const map = { ...VALID, entries: [VALID.entries[0], VALID.entries[0]] };
  assert.match(validateEventRedirectMap(map).join('\n'), /duplicate sourcePath/);
});

test('self-link source->source is rejected', () => {
  const map = {
    ...VALID,
    entries: [{ sourcePath: '/events/x', eventId: 'evt_x', kind: 'slot', status: 301, targetPath: '/events/x' }],
  };
  assert.match(validateEventRedirectMap(map).join('\n'), /must differ/);
});

test('301 to an opaque/tc-code canonical is rejected', () => {
  const map = {
    ...VALID,
    entries: [
      { sourcePath: '/events/old', eventId: 'evt_y', kind: 'slot', status: 301, targetPath: '/events/tc-6abc12345678901234567890ab-foo' },
    ],
  };
  assert.match(validateEventRedirectMap(map).join('\n'), /readable \/events\/ slug/);
});

test('301 to a date-bearing canonical is rejected', () => {
  const map = {
    ...VALID,
    entries: [
      { sourcePath: '/events/old', eventId: 'evt_z', kind: 'slot', status: 301, targetPath: '/events/show-20-11-2026-moscow' },
    ],
  };
  assert.match(validateEventRedirectMap(map).join('\n'), /readable \/events\/ slug/);
});

test('410 must not carry a target', () => {
  const map = {
    ...VALID,
    entries: [
      { sourcePath: '/events/gone', eventId: 'evt_g', kind: 'past_slot', status: 410, targetPath: '/events/elsewhere' },
    ],
  };
  assert.match(validateEventRedirectMap(map).join('\n'), /410 must not set targetPath/);
});

test('redirect chain (301 target that is itself a 301 source) is rejected', () => {
  const map = {
    ...VALID,
    entries: [
      { sourcePath: '/events/a', eventId: 'evt_a', kind: 'slot', status: 301, targetPath: '/events/b' },
      { sourcePath: '/events/b', eventId: 'evt_b', kind: 'slot', status: 301, targetPath: '/events/c' },
    ],
  };
  assert.match(validateEventRedirectMap(map).join('\n'), /redirect chain/);
});

test('resolveEventRedirect returns the matching entry', () => {
  assert.equal(
    resolveEventRedirect(VALID.entries, '/events/tc-6abc12345678901234567890ab-old-title')?.targetPath,
    '/events/regular-show-moscow',
  );
  assert.equal(resolveEventRedirect(VALID.entries, '/events/unknown'), null);
});

test('buildEventRedirectIndex keeps the first entry per sourcePath and looks up by path', () => {
  const index = buildEventRedirectIndex([
    { sourcePath: '/events/a', eventId: 'evt_a', kind: 'slot', status: 301, targetPath: '/events/keep' },
    { sourcePath: '/events/a', eventId: 'evt_a', kind: 'slot', status: 301, targetPath: '/events/keep2' },
  ]);
  assert.equal(index.get('/events/a')?.targetPath, '/events/keep');
  assert.equal(index.get('/events/missing'), undefined);
});