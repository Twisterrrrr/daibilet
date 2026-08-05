#!/usr/bin/env node
/**
 * Smoke tests for scripts/lib/venue-kind-heuristics.js
 * Run: node scripts/venue-kind-heuristics.test.js
 */
const assert = require('assert');
const {
  inferMustSeeKindAndFamily,
  reclassifyOutdoorBuilding,
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

// True outdoors stay outdoor
expectInfer('Дворцовая площадь', 'OUTDOOR_LOCATION');
expectInfer('Дворцовая набережная', 'OUTDOOR_LOCATION');
expectInfer('Дворцовый мост', 'OUTDOOR_LOCATION');
expectInfer('Невский проспект', 'OUTDOOR_LOCATION');
expectInfer('Аничков мост', 'OUTDOOR_LOCATION');
expectInfer('Бранденбургские ворота', 'OUTDOOR_LOCATION');
expectInfer('Новая Голландия', 'OUTDOOR_LOCATION');
expectInfer('Севкабель Порт', 'OUTDOOR_LOCATION');

// Park / monument / museum
expectInfer('Летний сад', 'PARK');
expectInfer('Медный всадник', 'MONUMENT');
expectInfer('Кунсткамера', 'MUSEUM_ART_SPACE');

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

console.log('venue-kind-heuristics: ok');
