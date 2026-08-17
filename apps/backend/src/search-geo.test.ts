import assert from 'node:assert/strict';
import test from 'node:test';
import { expandSearchQuery } from './search-synonyms.js';
import { hubHrefSlug, matchSearchGeoHits } from './search-geo.js';

function labels(query: string, limit = 2): string[] {
  return matchSearchGeoHits(expandSearchQuery(query), limit).map((hit) => hit.label);
}

test('geo href uses public hub slugs', () => {
  assert.equal(hubHrefSlug('Москва'), 'moscow');
  assert.equal(hubHrefSlug('Санкт-Петербург'), 'saint-petersburg');
  assert.equal(hubHrefSlug('Нижний Новгород'), 'nizhny-novgorod');
  assert.equal(hubHrefSlug('Ростов-на-Дону'), 'rostov-na-donu');
  assert.equal(hubHrefSlug('Воронеж'), 'voronezh');
});

test('standalone cities already on /cities match as geo hubs', () => {
  assert.deepEqual(labels('воронеж'), ['Воронеж']);
  assert.equal(matchSearchGeoHits(['воронеж'])[0]?.href, '/cities/voronezh');
  assert.deepEqual(labels('ростов'), ['Ростов-на-Дону']);
  assert.deepEqual(labels('уфа'), ['Уфа']);
  assert.deepEqual(labels('челябинск'), ['Челябинск']);
  assert.deepEqual(labels('владивосток'), ['Владивосток']);
  assert.deepEqual(labels('тула'), ['Тула']);
  assert.deepEqual(labels('саратов'), ['Саратов']);
  assert.deepEqual(labels('ярославль'), ['Ярославль']);
  assert.deepEqual(labels('владимир'), ['Владимир']);
  assert.deepEqual(labels('владикавказ'), ['Владикавказ']);
  assert.deepEqual(labels('ханты-мансийск'), ['Ханты-Мансийск']);
  assert.deepEqual(labels('сортавала'), ['Сортавала']);
  assert.equal(matchSearchGeoHits(['сортавала'])[0]?.href, '/cities/sortavala');
  assert.deepEqual(labels('тольятти'), ['Тольятти']);
  assert.deepEqual(labels('сургут'), ['Сургут']);
  assert.deepEqual(labels('новокузнецк'), ['Новокузнецк']);
});

test('питер synonym resolves to saint-petersburg hub', () => {
  const hits = matchSearchGeoHits(expandSearchQuery('питер'));
  assert.equal(hits[0]?.label, 'Санкт-Петербург');
  assert.equal(hits[0]?.href, '/cities/saint-petersburg');
});

test('петергоф is an SPb palace suburb, not a City row', () => {
  const peterhof = matchSearchGeoHits(['петергоф']);
  assert.equal(peterhof[0]?.kind, 'suburb');
  assert.equal(peterhof[0]?.label, 'Петергоф');
  assert.equal(peterhof[0]?.href, '/cities/saint-petersburg/?suburb=petergof#city-suburbs');
});

test('palace suburbs focus the SPb day-trip card', () => {
  const pushkin = matchSearchGeoHits(['пушкин']);
  assert.equal(pushkin[0]?.kind, 'suburb');
  assert.equal(pushkin[0]?.label, 'Царское Село');
  assert.equal(pushkin[0]?.href, '/cities/saint-petersburg/?suburb=carskoe-selo#city-suburbs');

  const kronstadt = matchSearchGeoHits(['кронштадт']);
  assert.equal(kronstadt[0]?.kind, 'suburb');
  assert.equal(kronstadt[0]?.href, '/cities/saint-petersburg/?suburb=kronshtadt#city-suburbs');

  const gatchina = matchSearchGeoHits(['гатчина']);
  assert.equal(gatchina[0]?.kind, 'suburb');
  assert.equal(gatchina[0]?.href, '/cities/saint-petersburg/?suburb=gatchina#city-suburbs');

  const pavlovsk = matchSearchGeoHits(['павловск']);
  assert.equal(pavlovsk[0]?.kind, 'suburb');
  assert.equal(pavlovsk[0]?.href, '/cities/saint-petersburg/?suburb=pavlovsk#city-suburbs');
});

test('выборг is an LO oblast child, not an SPb suburb', () => {
  const vyborg = matchSearchGeoHits(['выборг']);
  assert.equal(vyborg[0]?.kind, 'satellite');
  assert.equal(vyborg[0]?.shortLabel, 'Выборг, Ленинградская область');
  assert.equal(vyborg[0]?.label, 'Выборг, Ленинградская область • Ближайшие события');
  assert.equal(vyborg[0]?.href, '/cities/leningradskaya-oblast?city=vyborg');
  assert.notEqual(vyborg[0]?.href, '/cities/saint-petersburg/#city-suburbs');

  const monrepo = matchSearchGeoHits(['монрепо']);
  assert.equal(monrepo[0]?.kind, 'satellite');
  assert.equal(monrepo[0]?.href, '/cities/leningradskaya-oblast?city=vyborg');
});

test('cityToRegion satellites go to the region hub, not a thin city affiche', () => {
  const ramenskoe = matchSearchGeoHits(['раменское']);
  assert.equal(ramenskoe[0]?.kind, 'satellite');
  assert.equal(ramenskoe[0]?.shortLabel, 'Раменское, Московская область');
  assert.equal(ramenskoe[0]?.label, 'Раменское, Московская область • Ближайшие события');
  assert.equal(ramenskoe[0]?.href, '/cities/moskovskaya-oblast?city=ramenskoe');

  const korolev = matchSearchGeoHits(['королев']);
  assert.equal(korolev[0]?.kind, 'satellite');
  assert.equal(korolev[0]?.href, '/cities/moskovskaya-oblast?city=korolev');

  const anapa = matchSearchGeoHits(['анапа']);
  assert.equal(anapa[0]?.kind, 'satellite');
  assert.equal(anapa[0]?.href, '/cities/krasnodarskiy-kray?city=anapa');
});

test('equal prefix prefers hub city over suburb', () => {
  const hits = matchSearchGeoHits(['петер'], 2);
  assert.equal(hits[0]?.label, 'Санкт-Петербург');
  assert.equal(hits[1]?.label, 'Петергоф');
});
