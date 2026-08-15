import assert from 'node:assert/strict';
import test from 'node:test';

import { listCityRegionalEvents, listCityRegionalPastEvents, regionalEventStatus } from './city-regional-events.ts';

const NOW_AUG_15 = new Date('2026-08-15T12:00:00+03:00');

test('tourist hubs expose regional events and never show past in upcoming', () => {
  for (const slug of ['moscow', 'saint-petersburg', 'nizhny-novgorod', 'kaliningrad', 'perm'] as const) {
    const upcoming = listCityRegionalEvents(slug, NOW_AUG_15, 5);
    const past = listCityRegionalPastEvents(slug, NOW_AUG_15, 8);
    assert.ok(upcoming.length > 0, `${slug} should have upcoming/now cards`);
    assert.ok(past.length > 0, `${slug} should have past festivals`);
    assert.ok(upcoming.every((event) => event.status !== 'past'));
    assert.ok(past.every((event) => event.status === 'past'));
    assert.ok(
      [...upcoming, ...past].every(
        (event) => !event.datesLabel.includes('\u2014') && !event.blurb.includes('\u2014') && !event.title.includes('\u2014'),
      ),
    );
    assert.ok([...upcoming, ...past].every((event) => event.sourceUrl.startsWith('https://')));
  }
});

test('on 15 Aug 2026 Moscow shows current summer cards and keeps June-July in past', () => {
  const upcoming = listCityRegionalEvents('moscow', NOW_AUG_15, 5);
  const past = listCityRegionalPastEvents('moscow', NOW_AUG_15, 8);
  assert.ok(upcoming.some((event) => /вкусы россии/i.test(event.title)));
  assert.ok(upcoming.some((event) => event.status === 'now'));
  assert.ok(past.some((event) => /времена и эпохи/i.test(event.title)));
  assert.ok(past.some((event) => /vk fest/i.test(event.title)));
  assert.equal(
    upcoming.some((event) => /времена и эпохи|vk fest|лето в москве/i.test(event.title)),
    false,
  );
});

test('month-only ranges use end-of-month; after endDate status becomes past', () => {
  const sady = listCityRegionalEvents('moscow', NOW_AUG_15).find((event) => /сады и люди/i.test(event.title));
  assert.ok(sady);
  assert.equal(sady.status, 'now');
  assert.equal(regionalEventStatus(sady, new Date('2026-09-01T12:00:00+03:00')), 'past');
});

test('on 15 Aug 2026 Flahertiana stays upcoming for Perm; Diaghilev and KAMWA are past', () => {
  const now = new Date('2026-08-15T12:00:00+05:00');
  const perm = listCityRegionalEvents('perm', now, 5);
  const past = listCityRegionalPastEvents('perm', now, 8);
  assert.ok(perm.some((event) => event.id === 'perm-flahertiana-2026'));
  assert.equal(perm.find((event) => event.id === 'perm-flahertiana-2026')?.status, 'upcoming');
  assert.ok(past.some((event) => /дягилев/i.test(event.title)));
  assert.ok(past.some((event) => /kamwa/i.test(event.title)));
  assert.equal(/бел(ые|ых) ноч/i.test([...perm, ...past].map((e) => e.title).join(' ')), false);
  assert.equal(/живая пермь/i.test([...perm, ...past].map((e) => e.title).join(' ')), false);
});

test('RED FEST on 22 Aug is still upcoming on 15 Aug (auto by endDate, not owner past bucket)', () => {
  const perm = listCityRegionalEvents('perm', NOW_AUG_15, 5);
  assert.ok(perm.some((event) => event.id === 'perm-red-fest-2026'));
});
