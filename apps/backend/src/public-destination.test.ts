import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildPublicDestinationRowsFromSessions,
  countDistinctSessionVenues,
  destinationPrepositional,
  isFoldingRegionalTown,
  isSubjectCapitalCity,
  isVisibleOnCitiesCatalog,
  matchStandaloneCityBySlug,
  publicDestinationFromSession,
} from './public-destination.js';

test('countDistinctSessionVenues prefers venueId over slug/name', () => {
  const count = countDistinctSessionVenues([
    { venueId: 'venue_a', venueSlug: 'mega-kruzhka', venue: 'Мега Кружка', city: 'Мурманск' } as never,
    { venueId: 'venue_a', venueSlug: 'mega-kruzhka', venue: 'Мега Кружка', city: 'Мурманск' } as never,
    { venueSlug: 'other-hall', venue: 'Другой зал', city: 'Мурманск' } as never,
  ]);
  assert.equal(count, 2);
});

test('publicDestinationFromSession maps region type from destinationType', () => {
  const destination = publicDestinationFromSession({
    destination: 'Московская область',
    destinationType: 'region',
    city: 'Подольск',
    cityId: 'city_podolsk',
    sourceCitySlug: 'podolsk',
  } as never);
  assert.equal(destination.type, 'region');
  assert.equal(destination.name, 'Московская область');
});

function citySessions(city: string, count: number) {
  return Array.from({ length: count }, (_, index) => ({
    destination: city,
    destinationType: 'city' as const,
    city,
    cityId: `city_${city}_${index}`,
    sourceCitySlug: city,
    venueId: `venue_${index}`,
    category: 'Концерты',
    landingSlugs: [],
  }));
}

test('standalone admin centers stay city destinations', () => {
  const vladikavkaz = publicDestinationFromSession({
    destination: 'Владикавказ',
    destinationType: 'city',
    city: 'Владикавказ',
    cityId: 'city_vladikavkaz',
    sourceCitySlug: 'vladikavkaz',
  } as never);
  assert.equal(vladikavkaz.type, 'city');
  assert.equal(vladikavkaz.name, 'Владикавказ');

  const khanty = publicDestinationFromSession({
    destination: 'Ханты-Мансийск',
    destinationType: 'region',
    city: 'Ханты-Мансийск',
    cityId: 'city_hanty_mansiysk',
    sourceCitySlug: 'hanty-mansiysk',
  } as never);
  assert.equal(khanty.type, 'city');
  assert.equal(khanty.name, 'Ханты-Мансийск');

  const khantyFolded = publicDestinationFromSession({
    destination: 'Ханты-Мансийский автономный округ',
    destinationType: 'region',
    city: 'Ханты-Мансийск',
    cityId: 'city_hanty_mansiysk',
    sourceCitySlug: 'hanty-mansiysk',
  } as never);
  assert.equal(khantyFolded.type, 'city');
  assert.equal(khantyFolded.name, 'Ханты-Мансийск');
});

test('non-capital standalone is a city destination, not folded to region', () => {
  const sortavala = publicDestinationFromSession({
    destination: 'Сортавала',
    destinationType: 'city',
    city: 'Сортавала',
    cityId: 'city_sortavala',
    sourceCitySlug: 'sortavala',
  } as never);
  assert.equal(sortavala.type, 'city');
  assert.equal(sortavala.name, 'Сортавала');

  const tolyatti = publicDestinationFromSession({
    destination: 'Тольятти',
    destinationType: 'region',
    city: 'Тольятти',
    cityId: 'city_tolyatti',
    sourceCitySlug: 'tolyatti',
  } as never);
  assert.equal(tolyatti.type, 'city');
  assert.equal(tolyatti.name, 'Тольятти');
});

test('adm centers show a /cities card from 1 event; regional towns need events > 5', () => {
  assert.equal(isSubjectCapitalCity('Ханты-Мансийск'), true);
  assert.equal(isSubjectCapitalCity('Владикавказ'), true);
  assert.equal(isSubjectCapitalCity('Самара'), true);
  assert.equal(isFoldingRegionalTown('Сортавала'), true);
  assert.equal(isFoldingRegionalTown('Тольятти'), true);
  assert.equal(isFoldingRegionalTown('Ханты-Мансийск'), false);
  assert.equal(isFoldingRegionalTown('Раменское'), false);

  assert.equal(isVisibleOnCitiesCatalog({ name: 'Ханты-Мансийск', type: 'city', events: 1 }), true);
  assert.equal(isVisibleOnCitiesCatalog({ name: 'Ханты-Мансийск', type: 'city', events: 3 }), true);
  assert.equal(isVisibleOnCitiesCatalog({ name: 'Владикавказ', type: 'city', events: 1 }), true);
  assert.equal(isVisibleOnCitiesCatalog({ name: 'Самара', type: 'city', events: 1 }), true);
  assert.equal(isVisibleOnCitiesCatalog({ name: 'Сортавала', type: 'city', events: 0 }), false);
  assert.equal(isVisibleOnCitiesCatalog({ name: 'Сортавала', type: 'city', events: 5 }), false);
  assert.equal(isVisibleOnCitiesCatalog({ name: 'Сортавала', type: 'city', events: 6 }), true);
  assert.equal(isVisibleOnCitiesCatalog({ name: 'Тольятти', type: 'city', events: 5 }), false);

  const khanty = buildPublicDestinationRowsFromSessions(citySessions('Ханты-Мансийск', 3) as never);
  assert.equal(khanty.some((row) => row.name === 'Ханты-Мансийск' && row.type === 'city'), true);

  const khantyFolded = buildPublicDestinationRowsFromSessions(
    citySessions('Ханты-Мансийск', 3).map((session) => ({
      ...session,
      destination: 'Ханты-Мансийский автономный округ',
      destinationType: 'region' as const,
    })) as never,
  );
  assert.equal(
    khantyFolded.some((row) => row.name === 'Ханты-Мансийск' && row.type === 'city' && row.events === 3),
    true,
  );
  assert.equal(khantyFolded.some((row) => row.name === 'Ханты-Мансийский автономный округ'), false);

  const khantyWithSurgut = buildPublicDestinationRowsFromSessions([
    ...citySessions('Ханты-Мансийск', 3).map((session) => ({
      ...session,
      destination: 'Ханты-Мансийский автономный округ',
      destinationType: 'region' as const,
    })),
    ...citySessions('Сургут', 3).map((session) => ({
      ...session,
      destination: 'Ханты-Мансийский автономный округ',
      destinationType: 'region' as const,
    })),
  ] as never);
  assert.equal(
    khantyWithSurgut.some((row) => row.name === 'Ханты-Мансийск' && row.type === 'city' && row.events === 3),
    true,
  );
  assert.equal(khantyWithSurgut.some((row) => row.name === 'Сургут'), false);
  assert.equal(
    khantyWithSurgut.some((row) => row.name === 'Ханты-Мансийский автономный округ' && row.type === 'region' && row.events === 3),
    true,
  );

  const sortavala = buildPublicDestinationRowsFromSessions(citySessions('Сортавала', 3) as never);
  assert.equal(sortavala.some((row) => row.name === 'Сортавала'), false);

  const folded = buildPublicDestinationRowsFromSessions(
    citySessions('Сортавала', 3).map((session) => ({
      ...session,
      destination: 'Республика Карелия',
      destinationType: 'region' as const,
    })) as never,
  );
  assert.equal(folded.some((row) => row.name === 'Сортавала'), false);
  assert.equal(folded.some((row) => row.name === 'Республика Карелия' && row.type === 'region'), true);

  const tolyatti = buildPublicDestinationRowsFromSessions(citySessions('Тольятти', 6) as never);
  assert.equal(tolyatti.some((row) => row.name === 'Тольятти' && row.type === 'city'), true);

  const surgut = buildPublicDestinationRowsFromSessions(citySessions('Сургут', 6) as never);
  assert.equal(surgut.some((row) => row.name === 'Сургут'), true);

  const novokuznetsk = buildPublicDestinationRowsFromSessions(citySessions('Новокузнецк', 6) as never);
  assert.equal(novokuznetsk.some((row) => row.name === 'Новокузнецк'), true);

  const vologda = buildPublicDestinationRowsFromSessions(citySessions('Вологда', 3) as never);
  assert.equal(vologda.some((row) => row.name === 'Вологда'), true);
});

test('tolyatti and surgut become city cards once they clear the live threshold', () => {
  const rows = buildPublicDestinationRowsFromSessions([
    ...citySessions('Тольятти', 11).map((session) => ({
      ...session,
      destination: 'Самарская область',
      destinationType: 'region' as const,
    })),
    ...citySessions('Сургут', 13).map((session) => ({
      ...session,
      destination: 'Ханты-Мансийский автономный округ',
      destinationType: 'region' as const,
    })),
  ] as never);

  assert.equal(rows.some((row) => row.name === 'Тольятти' && row.type === 'city' && row.events === 11), true);
  assert.equal(rows.some((row) => row.name === 'Сургут' && row.type === 'city' && row.events === 13), true);
  assert.equal(rows.some((row) => row.name === 'Самарская область' && row.events > 0), false);
  assert.equal(rows.some((row) => row.name === 'Ханты-Мансийский автономный округ' && row.events > 0), false);
});

test('standalone slug matches even with zero catalog events', () => {
  assert.equal(matchStandaloneCityBySlug('sortavala'), 'Сортавала');
  assert.equal(matchStandaloneCityBySlug('Сортавала'), 'Сортавала');
  assert.equal(matchStandaloneCityBySlug('tolyatti'), 'Тольятти');
  assert.equal(matchStandaloneCityBySlug('ramenskoe'), null);
});

test('destinationPrepositional returns known city forms', () => {
  assert.equal(
    destinationPrepositional({ slug: 'moskva', name: 'Москва', type: 'city' }),
    'в Москве',
  );
  assert.equal(
    destinationPrepositional({
      slug: 'respublika-kareliya',
      name: 'Республика Карелия',
      type: 'region',
    }),
    'в Республике Карелии',
  );
});
