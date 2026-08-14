import assert from 'node:assert/strict';
import test from 'node:test';

import { listCityRegionalEvents, listCityRegionalPastEvents, regionalEventStatus } from './city-regional-events.ts';

test('Perm regional events are hidden for empty cities and capped at 5', () => {
  assert.deepEqual(listCityRegionalEvents('moscow'), []);
  assert.deepEqual(listCityRegionalEvents('saint-petersburg'), []);
  const perm = listCityRegionalEvents('perm', new Date('2026-08-14T12:00:00+05:00'), 5);
  assert.ok(perm.length > 0 && perm.length <= 5);
  assert.ok(perm.every((event) => event.sourceUrl.startsWith('https://')));
  assert.ok(perm.every((event) => !event.datesLabel.includes('\u2014') && !event.blurb.includes('\u2014')));
});

test('on 14 Aug 2026 Flahertiana is upcoming and leads the Perm list', () => {
  const now = new Date('2026-08-14T12:00:00+05:00');
  const perm = listCityRegionalEvents('perm', now, 5);
  assert.equal(perm[0]?.id, 'perm-flahertiana-2026');
  assert.equal(perm[0]?.status, 'upcoming');
  assert.equal(
    regionalEventStatus(
      { ...perm[0], startDate: '2026-09-25', endDate: '2026-10-01' },
      now,
    ),
    'upcoming',
  );
});

test('does not invent White Nights or retired Живая Пермь as 2026 cards', () => {
  const now = new Date('2026-08-14T12:00:00+05:00');
  const perm = listCityRegionalEvents('perm', now);
  const past = listCityRegionalPastEvents('perm', now);
  const blob = [...perm, ...past].map((event) => `${event.title} ${event.blurb}`).join(' ');
  assert.equal(/бел(ые|ых) ноч/i.test(blob), false);
  assert.equal(/живая пермь/i.test(blob), false);
  assert.equal(perm.every((event) => event.status !== 'past'), true);
  assert.ok(past.some((event) => /дягилев/i.test(event.title)));
  assert.ok(past.some((event) => /kamwa/i.test(event.title)));
});
