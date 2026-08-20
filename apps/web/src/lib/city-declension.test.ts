import assert from 'node:assert/strict';
import test from 'node:test';

import {
  cityToAccusative,
  cityToDative,
  cityToGenitive,
  cityToNominative,
  cityToPrepositional,
  inCityAccusative,
  inCityPrepositional,
  isSeoExpansionCity,
  poCityDative,
  resolveCityCases,
} from './city-declension.ts';

test('Kazan / Ekaterinburg cases by name', () => {
  assert.deepEqual(resolveCityCases('Казань'), {
    nominative: 'Казань',
    genitive: 'Казани',
    prepositional: 'Казани',
    accusative: 'Казань',
    dative: 'Казани',
  });
  assert.deepEqual(resolveCityCases('Екатеринбург'), {
    nominative: 'Екатеринбург',
    genitive: 'Екатеринбурга',
    prepositional: 'Екатеринбурге',
    accusative: 'Екатеринбург',
    dative: 'Екатеринбургу',
  });
});

test('cases resolve by slug', () => {
  assert.equal(cityToNominative('kazan'), 'Казань');
  assert.equal(cityToPrepositional('ekaterinburg'), 'Екатеринбурге');
  assert.equal(cityToGenitive('kazan'), 'Казани');
});

test('Moscow / SPB still decline', () => {
  assert.equal(cityToPrepositional('Москва'), 'Москве');
  assert.equal(cityToGenitive('Санкт-Петербург'), 'Санкт-Петербурга');
});

test('accusative for ехать в …', () => {
  assert.equal(cityToAccusative('Москва'), 'Москву');
  assert.equal(inCityAccusative('Москва'), 'в Москву');
  assert.equal(inCityAccusative('Казань'), 'в Казань');
  assert.equal(inCityAccusative('Владимир'), 'во Владимир');
  assert.equal(inCityAccusative('Орёл'), 'в Орёл');
  assert.equal(inCityAccusative('moscow'), 'в Москву');
});

test('Karelia region does not become Карелие', () => {
  assert.equal(cityToPrepositional('Республика Карелия'), 'Республике Карелии');
  assert.equal(cityToPrepositional('Карелия'), 'Карелии');
  assert.equal(cityToPrepositional('respublika-kareliya'), 'Республике Карелии');
  assert.equal(cityToGenitive('Республика Карелия'), 'Республики Карелии');
  assert.equal(cityToAccusative('Республика Карелия'), 'Республику Карелию');
  assert.equal(cityToPrepositional('Московская область'), 'Московской области');
});

test('Bashkortostan second word does not take -а', () => {
  assert.equal(cityToNominative('respublika-bashkortostan'), 'Республика Башкортостан');
  assert.equal(cityToGenitive('Республика Башкортостан'), 'Республики Башкортостан');
  assert.equal(cityToPrepositional('Республика Башкортостан'), 'Республике Башкортостан');
  assert.equal(cityToAccusative('Республика Башкортостан'), 'Республику Башкортостан');
});

test('isSeoExpansionCity', () => {
  assert.equal(isSeoExpansionCity('Казань'), true);
  assert.equal(isSeoExpansionCity({ slug: 'ekaterinburg' }), true);
  assert.equal(isSeoExpansionCity({ name: 'Москва', slug: 'moscow' }), false);
});

test('dative for «по …» on lifehack hubs and typical cities', () => {
  assert.equal(poCityDative('Пермь'), 'по Перми');
  assert.equal(poCityDative('perm'), 'по Перми');
  assert.equal(poCityDative('Москва'), 'по Москве');
  assert.equal(poCityDative('moscow'), 'по Москве');
  assert.equal(poCityDative('Санкт-Петербург'), 'по Санкт-Петербургу');
  assert.equal(poCityDative('saint-petersburg'), 'по Санкт-Петербургу');
  assert.equal(poCityDative('Калининград'), 'по Калининграду');
  assert.equal(poCityDative('kaliningrad'), 'по Калининграду');
  assert.equal(poCityDative('Нижний Новгород'), 'по Нижнему Новгороду');
  assert.equal(poCityDative('nizhny-novgorod'), 'по Нижнему Новгороду');
  assert.equal(cityToDative('Екатеринбург'), 'Екатеринбургу');
  assert.equal(cityToDative('Казань'), 'Казани');
  assert.equal(cityToDative('Ярославль'), 'Ярославлю');
  assert.equal(cityToDative('Чебоксары'), 'Чебоксарам');
  assert.equal(cityToDative('Ростов-на-Дону'), 'Ростову-на-Дону');
  assert.equal(cityToDative('Сочи'), 'Сочи');
  assert.notEqual(cityToDative('Санкт-Петербург'), cityToPrepositional('Санкт-Петербург'));
  assert.notEqual(cityToDative('Нижний Новгород'), cityToPrepositional('Нижний Новгород'));
});

test('region names decline to genitive for near-city strip', () => {
  assert.equal(cityToGenitive('Пермский край'), 'Пермского края');
  assert.equal(cityToGenitive('Свердловская область'), 'Свердловской области');
});

test('satellite and hub locative for child-city question copy', () => {
  assert.equal(cityToPrepositional('Раменское'), 'Раменском');
  assert.equal(cityToGenitive('Раменское'), 'Раменского');
  assert.equal(cityToPrepositional('Выборг'), 'Выборге');
  assert.equal(cityToGenitive('Выборг'), 'Выборга');
  assert.equal(cityToPrepositional('Тула'), 'Туле');
  assert.equal(cityToPrepositional('Ханты-Мансийск'), 'Ханты-Мансийске');
  assert.equal(cityToPrepositional('Московская область'), 'Московской области');
  assert.equal(cityToGenitive('Ленинградская область'), 'Ленинградской области');
  assert.notEqual(cityToPrepositional('Раменское'), 'Раменское');
});

test('catalog disambiguator in parentheses is stripped before decline', () => {
  assert.equal(cityToNominative('Отрадное (Ленинградская область)'), 'Отрадное');
  assert.equal(inCityPrepositional('Отрадное (Ленинградская область)'), 'в Отрадном');
  assert.equal(cityToGenitive('Отрадное (Ленинградская область)'), 'Отрадного');
  assert.notEqual(inCityPrepositional('Отрадное (Ленинградская область)'), 'в Отрадное (Ленинградская область)е');
});

test('adjective + -ино/-ово: decline adjective only', () => {
  assert.equal(inCityPrepositional('Новое Девяткино'), 'в Новом Девяткино');
  assert.equal(cityToGenitive('Новое Девяткино'), 'Нового Девяткино');
  assert.equal(cityToDative('Новое Девяткино'), 'Новому Девяткино');
  assert.equal(cityToAccusative('Новое Девяткино'), 'Новое Девяткино');
  assert.equal(inCityPrepositional('Старое Девяткино'), 'в Старом Девяткино');
  assert.notEqual(inCityPrepositional('Новое Девяткино'), 'в Новое Девяткине');
});

test('SPB satellites and LO towns decline sanely', () => {
  assert.equal(inCityPrepositional('Мурино'), 'в Мурино');
  assert.equal(inCityPrepositional('Кудрово'), 'в Кудрово');
  assert.equal(inCityPrepositional('Парголово'), 'в Парголово');
  assert.equal(inCityPrepositional('Красное Село'), 'в Красном Селе');
  assert.equal(cityToGenitive('Красное Село'), 'Красного Села');
  assert.equal(inCityPrepositional('Выборг'), 'в Выборге');
  assert.equal(inCityPrepositional('Всеволожск'), 'в Всеволожске');
  assert.equal(inCityPrepositional('Отрадное'), 'в Отрадном');
  assert.equal(inCityPrepositional('Иваново'), 'в Иванове'); // dictionary still declines
});
