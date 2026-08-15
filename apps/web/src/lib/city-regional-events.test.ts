import assert from 'node:assert/strict';
import test from 'node:test';

import {
  cityHasRegionalFestivals,
  listCityRegionalEvents,
  listCityRegionalPastEvents,
  regionalEventStatus,
} from './city-regional-events.ts';

const NOW_AUG_15 = new Date('2026-08-15T12:00:00+03:00');

test('tourist hubs expose curated regional events and never show past in upcoming', () => {
  for (const slug of ['moscow', 'saint-petersburg', 'nizhny-novgorod', 'kaliningrad', 'perm'] as const) {
    const upcoming = listCityRegionalEvents(slug, NOW_AUG_15, 3);
    const past = listCityRegionalPastEvents(slug, NOW_AUG_15, 3);
    assert.ok(upcoming.length > 0, `${slug} should have upcoming/now cards`);
    assert.ok(past.length > 0, `${slug} should have past festivals`);
    assert.ok(upcoming.length <= 3, `${slug} upcoming should stay curated (<=3)`);
    assert.ok(past.length <= 3, `${slug} past should stay curated (<=3)`);
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

test('on 15 Aug 2026 Moscow shows Punchline and keeps June-July flagships in past', () => {
  const upcoming = listCityRegionalEvents('moscow', NOW_AUG_15, 3);
  const past = listCityRegionalPastEvents('moscow', NOW_AUG_15, 3);
  assert.ok(upcoming.some((event) => /панчлайн/i.test(event.title)));
  assert.ok(past.some((event) => /времена и эпохи/i.test(event.title)));
  assert.ok(past.some((event) => /vk fest|пикник афиши/i.test(event.title)));
  assert.equal(
    upcoming.some((event) => /времена и эпохи|vk fest|пикник афиши/i.test(event.title)),
    false,
  );
});

test('month-only ranges use end-of-month; after endDate status becomes past', () => {
  const peterhof = listCityRegionalEvents('saint-petersburg', NOW_AUG_15).find((event) =>
    /петергоф/i.test(event.title),
  );
  assert.ok(peterhof);
  assert.equal(peterhof.status, 'upcoming');
  assert.equal(regionalEventStatus(peterhof, new Date('2026-10-01T12:00:00+03:00')), 'past');
});

test('on 15 Aug 2026 Flahertiana stays upcoming for Perm; Diaghilev is past flagship', () => {
  const now = new Date('2026-08-15T12:00:00+05:00');
  const perm = listCityRegionalEvents('perm', now, 3);
  const past = listCityRegionalPastEvents('perm', now, 3);
  assert.ok(perm.some((event) => event.id === 'perm-flahertiana-2026'));
  assert.equal(perm.find((event) => event.id === 'perm-flahertiana-2026')?.status, 'upcoming');
  assert.ok(perm.some((event) => /город встреч/i.test(event.title)));
  assert.ok(past.some((event) => /дягилев/i.test(event.title)));
  assert.equal(/флюгер|летоджаз|небесная ярмарка/i.test([...perm, ...past].map((e) => e.title).join(' ')), false);
  assert.equal(/бел(ые|ых) ноч/i.test([...perm, ...past].map((e) => e.title).join(' ')), false);
  assert.equal(/живая пермь/i.test([...perm, ...past].map((e) => e.title).join(' ')), false);
});

test('Perm keeps EFEST as optional upcoming; RED FEST filler is dropped', () => {
  const perm = listCityRegionalEvents('perm', NOW_AUG_15, 3);
  assert.ok(perm.some((event) => event.id === 'perm-efest-2026'));
  assert.equal(
    perm.some((event) => event.id === 'perm-red-fest-2026'),
    false,
  );
});

test('cityHasRegionalFestivals gates sticky item by editorial catalog', () => {
  assert.equal(cityHasRegionalFestivals('perm', NOW_AUG_15), true);
  assert.equal(cityHasRegionalFestivals('moscow', NOW_AUG_15), true);
  assert.equal(cityHasRegionalFestivals('unknown-city-xyz', NOW_AUG_15), false);
});
