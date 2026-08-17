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

test('on 17 Aug 2026 Voronezh shows Zhatva and Gorod-sad; Platonovfest is past', () => {
  const now = new Date('2026-08-17T12:00:00+03:00');
  const upcoming = listCityRegionalEvents('voronezh', now, 3);
  const past = listCityRegionalPastEvents('voronezh', now, 3);
  assert.ok(upcoming.some((event) => event.id === 'voronezh-zhatva-2026'));
  assert.ok(upcoming.some((event) => event.id === 'voronezh-gorod-sad-2026'));
  assert.ok(past.some((event) => event.id === 'voronezh-platonovfest-2026'));
  assert.equal(
    upcoming.some((event) => event.id === 'voronezh-platonovfest-2026'),
    false,
  );
});

test('on 17 Aug 2026 Chelyabinsk shows PROProm, valenki and Matsuev; Bazhov is past', () => {
  const now = new Date('2026-08-17T12:00:00+05:00');
  const upcoming = listCityRegionalEvents('chelyabinsk', now, 3);
  const past = listCityRegionalPastEvents('chelyabinsk', now, 3);
  assert.ok(upcoming.some((event) => event.id === 'chelyabinsk-proprom-2026'));
  assert.ok(upcoming.some((event) => event.id === 'chelyabinsk-ural-valenki-2026-27'));
  assert.ok(upcoming.some((event) => event.id === 'chelyabinsk-matsuev-2027'));
  assert.ok(past.some((event) => event.id === 'chelyabinsk-bazhov-2026'));
  assert.equal(
    upcoming.some((event) => event.id === 'chelyabinsk-bazhov-2026'),
    false,
  );
  assert.ok(
    [...upcoming, ...past].every(
      (event) =>
        !event.datesLabel.includes('\u2014') &&
        !event.blurb.includes('\u2014') &&
        !event.title.includes('\u2014'),
    ),
  );
});

test('on 17 Aug 2026 Ufa shows TERRA ZIMA, Ayda igrat and Kupecheskaya; Serdce Evrazii is past', () => {
  const now = new Date('2026-08-17T12:00:00+05:00');
  const upcoming = listCityRegionalEvents('ufa', now, 3);
  const past = listCityRegionalPastEvents('ufa', now, 3);
  assert.ok(upcoming.some((event) => event.id === 'ufa-terra-zima-2027'));
  assert.ok(upcoming.some((event) => event.id === 'ufa-ayda-igrat-2027'));
  assert.ok(upcoming.some((event) => event.id === 'ufa-kupecheskaya-2026'));
  assert.ok(past.some((event) => event.id === 'ufa-serdce-evrazii-2026'));
  assert.equal(
    upcoming.some((event) => event.id === 'ufa-serdce-evrazii-2026'),
    false,
  );
});

test('on 17 Aug 2026 Ryazan shows kalinnik and New Year Meshchera; smotriny and Ranovskie leta are past', () => {
  const now = new Date('2026-08-17T12:00:00+03:00');
  const upcoming = listCityRegionalEvents('ryazan', now, 3);
  const past = listCityRegionalPastEvents('ryazan', now, 3);
  assert.ok(upcoming.some((event) => event.id === 'ryazan-kalinnik-2026'));
  assert.ok(upcoming.some((event) => event.id === 'ryazan-novogodnyaya-stolitsa-2026-27'));
  assert.ok(past.some((event) => event.id === 'ryazan-smotriny-2026'));
  assert.ok(past.some((event) => event.id === 'ryazan-ranovskie-leta-2026'));
  assert.equal(
    upcoming.some((event) => event.id === 'ryazan-smotriny-2026'),
    false,
  );
  assert.ok(
    [...upcoming, ...past].every(
      (event) =>
        !event.datesLabel.includes('\u2014') &&
        !event.blurb.includes('\u2014') &&
        !event.title.includes('\u2014'),
    ),
  );
});

test('on 17 Aug 2026 Novosibirsk shows TehnoArt and snow sculpture; Chernika and V Sibiri are past', () => {
  const now = new Date('2026-08-17T12:00:00+07:00');
  const upcoming = listCityRegionalEvents('novosibirsk', now, 3);
  const past = listCityRegionalPastEvents('novosibirsk', now, 3);
  assert.ok(upcoming.some((event) => event.id === 'novosibirsk-tehnoart-2026'));
  assert.ok(upcoming.some((event) => event.id === 'novosibirsk-snezhnaya-skulptura-2027'));
  assert.ok(past.some((event) => event.id === 'novosibirsk-chernika-2026'));
  assert.ok(past.some((event) => event.id === 'novosibirsk-v-sibiri-est-2026'));
  assert.equal(
    upcoming.some((event) => event.id === 'novosibirsk-chernika-2026'),
    false,
  );
  assert.ok(
    [...upcoming, ...past].every(
      (event) =>
        !event.datesLabel.includes('\u2014') &&
        !event.blurb.includes('\u2014') &&
        !event.title.includes('\u2014'),
    ),
  );
});

test('on 17 Aug 2026 Omsk shows winter zabavy upcoming; Flora marathon Academy are past', () => {
  const now = new Date('2026-08-17T12:00:00+06:00');
  const upcoming = listCityRegionalEvents('omsk', now, 3);
  const past = listCityRegionalPastEvents('omsk', now, 3);
  assert.ok(upcoming.some((event) => event.id === 'omsk-zimnie-zabavy-2027'));
  assert.ok(past.some((event) => event.id === 'omsk-flora-2026'));
  assert.ok(past.some((event) => event.id === 'omsk-siberian-marathon-2026'));
  assert.ok(past.some((event) => event.id === 'omsk-akademia-2026'));
  assert.equal(
    upcoming.some((event) => event.id === 'omsk-flora-2026'),
    false,
  );
  assert.ok(
    [...upcoming, ...past].every(
      (event) =>
        !event.datesLabel.includes('\u2014') &&
        !event.blurb.includes('\u2014') &&
        !event.title.includes('\u2014') &&
        !/челябин/i.test(`${event.title} ${event.blurb} ${event.place}`),
    ),
  );
});

test('cityHasRegionalFestivals gates sticky item by editorial catalog', () => {
  assert.equal(cityHasRegionalFestivals('perm', NOW_AUG_15), true);
  assert.equal(cityHasRegionalFestivals('moscow', NOW_AUG_15), true);
  assert.equal(cityHasRegionalFestivals('unknown-city-xyz', NOW_AUG_15), false);
});
