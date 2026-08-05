#!/usr/bin/env node
/**
 * Smoke tests for scripts/lib/venue-kind-heuristics.js
 * Run: node scripts/venue-kind-heuristics.test.js
 */
const assert = require('assert');
const {
  inferMustSeeKindAndFamily,
  reclassifyOutdoorBuilding,
  reclassifyLocationGastro,
} = require('./lib/venue-kind-heuristics');

function expectInfer(name, kind) {
  const got = inferMustSeeKindAndFamily(name);
  assert.strictEqual(got.kind, kind, `${name}: expected ${kind}, got ${got.kind}`);
}

function expectReclass(title, kind) {
  const got = reclassifyOutdoorBuilding(title);
  assert.strictEqual(got, kind, `${title}: expected ${kind}, got ${got}`);
}

// Buildings → ATTRACTION
expectInfer('Особняк Половцова', 'ATTRACTION');
expectInfer('Адмиралтейство', 'ATTRACTION');
expectInfer('Мраморный дворец', 'ATTRACTION');
expectInfer('Исаакиевский собор', 'ATTRACTION');
expectInfer('Михайловский замок', 'ATTRACTION');
expectInfer('Дом Советов', 'ATTRACTION');
expectInfer('Юдиттен-кирха', 'ATTRACTION');
expectInfer('Петропавловская крепость', 'ATTRACTION');
expectInfer('Казанский Кремль', 'ATTRACTION');
expectInfer('Софийский собор', 'ATTRACTION');

// True outdoors stay outdoor
expectInfer('Дворцовая площадь', 'OUTDOOR_LOCATION');
expectInfer('Дворцовая набережная', 'OUTDOOR_LOCATION');
expectInfer('Дворцовый мост', 'OUTDOOR_LOCATION');
expectInfer('Невский проспект', 'OUTDOOR_LOCATION');
expectInfer('Аничков мост', 'OUTDOOR_LOCATION');
expectInfer('Бранденбургские ворота', 'OUTDOOR_LOCATION');
expectInfer('Новая Голландия', 'OUTDOOR_LOCATION');
expectInfer('Севкабель Порт', 'OUTDOOR_LOCATION');

// Park / monument / museum / gastro
expectInfer('Летний сад', 'PARK');
expectInfer('Медный всадник', 'MONUMENT');
expectInfer('Кунсткамера', 'MUSEUM_ART_SPACE');
expectInfer('Ресторан «Корюшка»', 'GASTRO');
expectInfer('Кафе «Zoom»', 'GASTRO');
expectInfer('Гастробар «Соль»', 'GASTRO');
expectInfer('Пышечная на Большой Конюшенной', 'GASTRO');

// Institution gastro override
assert.strictEqual(
  inferMustSeeKindAndFamily('Бар «Хроники»', { familyHint: 'institution' }).kind,
  'CLUB_BAR_RESTAURANT',
);

// Reclassify outdoor buildings
expectReclass('Особняк Половцова', 'ATTRACTION');
expectReclass('Адмиралтейство', 'ATTRACTION');
expectReclass('Казанский собор', 'ATTRACTION');
expectReclass('Медный всадник', 'MONUMENT');
expectReclass('Дворцовая площадь', null);
expectReclass('Английская набережная', null);
expectReclass('Троицкий мост', null);
expectReclass('Новая Голландия', null);
expectReclass('Спас на Крови', 'ATTRACTION');
expectReclass('Королевские ворота', null);
expectReclass('Покровский собор', 'ATTRACTION');
expectReclass('Астраханский кремль', 'ATTRACTION');
expectReclass('Причал у Эрмитажа', 'PIER');
expectReclass('Ресторан «Корюшка»', 'GASTRO');
expectReclass('Рыбный рынок «Селенские Исады»', 'GASTRO');
// False positives: кафедральный / Чумбарова
expectReclass('Кафедральный собор Благовещения', 'ATTRACTION');
expectReclass('Проспект Чумбарова-Лучинского', null);

expectReclass('Кремлёвская набережная', null);
expectReclass('Казанский Кремль', 'ATTRACTION');
expectReclass('Рудничный сосновый бор', 'PARK');

assert.strictEqual(reclassifyLocationGastro('Арт-кафе «Бродячая собака»', '', 'ATTRACTION'), 'GASTRO');
assert.strictEqual(reclassifyLocationGastro('Бар Escobar', '', 'CLUB_BAR_RESTAURANT'), null);
assert.strictEqual(reclassifyLocationGastro('Кафедральный собор', '', 'ATTRACTION'), null);

console.log('venue-kind-heuristics: ok');
