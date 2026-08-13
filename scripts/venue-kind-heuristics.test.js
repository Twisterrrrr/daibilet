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

function expectInfer(name, kind, family) {
  const got = inferMustSeeKindAndFamily(name);
  assert.strictEqual(got.kind, kind, `${name}: expected ${kind}, got ${got.kind}`);
  if (family) {
    assert.strictEqual(got.family, family, `${name}: expected family ${family}, got ${got.family}`);
  }
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
expectInfer('Петергоф', 'PARK');
expectInfer('Нижний парк Петергофа', 'PARK');
expectInfer('Большой Петергофский дворец', 'ATTRACTION');
expectInfer('Екатерининский дворец', 'ATTRACTION');
expectInfer('Медный всадник', 'MONUMENT');
expectInfer('Кунсткамера', 'MUSEUM_ART_SPACE', 'institution');
expectInfer('Эрмитаж', 'MUSEUM_ART_SPACE', 'institution');
expectInfer('Русский музей', 'MUSEUM_ART_SPACE', 'institution');
expectInfer('Мариинский театр', 'THEATER', 'institution');
expectInfer('Цирк на Фонтанке', 'THEATER', 'institution');
expectInfer('Санкт-Петербургская филармония', 'CONCERT_HALL', 'institution');
expectInfer('Московская консерватория', 'CONCERT_HALL', 'institution');
expectInfer('Большой концертный зал «Октябрьский»', 'CONCERT_HALL', 'institution');
expectInfer('Дворец культуры имени Горького', 'CONCERT_HALL', 'institution');
expectInfer('Дом культуры железнодорожников', 'CONCERT_HALL', 'institution');
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
expectReclass('Кунсткамера', 'MUSEUM_ART_SPACE');
expectReclass('Мариинский театр', 'THEATER');
expectReclass('Филармония', 'CONCERT_HALL');

assert.strictEqual(reclassifyLocationGastro('Zotler Bier', 'kaliningrad-zotler-bier', 'ATTRACTION'), 'GASTRO');
assert.strictEqual(
  reclassifyLocationGastro('Магазин-музей «Кёнигсбергский марципан»', 'kaliningrad-kenigsbergskiy-martsipan', 'ATTRACTION'),
  'GASTRO',
);
assert.strictEqual(
  reclassifyLocationGastro('Жигулёвский пивоваренный завод', 'samara-zhigulevskiy-pivovarennyy-zavod', 'ATTRACTION'),
  null,
);

console.log('venue-kind-heuristics: ok');
