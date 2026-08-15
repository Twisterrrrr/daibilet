import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildMustSeeFilterTabs,
  classifyMustSeePlace,
  filterMustSeePlaces,
  mustSeeFilterStopTypeTag,
  mustSeePlacesForDefaultPreset,
} from './must-see-filters.ts';

test('classifyMustSeePlace: Nizhny landmarks vs gastro vs museum vs park vs temple', () => {
  assert.equal(
    classifyMustSeePlace({
      name: 'Нижегородский Кремль',
      desc: 'Крепость',
      locationSlug: 'nizhny-novgorod-nizhegorodskiy-kreml',
    }),
    'main',
  );
  assert.equal(
    classifyMustSeePlace({
      name: 'Селёдка и Кофе',
      desc: 'Культовое кафе-бар на Рождественской',
      venueSlug: 'nizhny-novgorod-seledka-i-kofe',
      type: 'CLUB_BAR_RESTAURANT',
    }),
    'gastro',
  );
  assert.equal(
    classifyMustSeePlace({
      name: 'Yale',
      desc: 'Высокая кухня',
      venueSlug: 'nizhny-novgorod-yale-restaurant',
    }),
    'gastro',
  );
  assert.equal(
    classifyMustSeePlace({
      name: 'Музей истории ГАЗ',
      desc: 'Автомобили',
      venueSlug: 'nizhny-novgorod-muzey-istorii-gaz',
    }),
    'museum',
  );
  assert.equal(
    classifyMustSeePlace({
      name: 'Арсенал ГЦСИ',
      desc: 'Центр современного искусства в Кремле',
      venueSlug: 'nizhny-novgorod-arsenal-gtsisi',
    }),
    'museum',
  );
  assert.equal(
    classifyMustSeePlace({
      name: 'Парк «Швейцария»',
      desc: 'Зеленый парк',
      locationSlug: 'nizhny-novgorod-park-shveytsariya',
    }),
    'park',
  );
  assert.equal(
    classifyMustSeePlace({
      name: 'Нижне-Волжская набережная',
      desc: 'Променад у воды',
      locationSlug: 'nizhny-novgorod-nizhne-volzhskaya-naberezhnaya',
    }),
    'park',
  );
  assert.equal(
    classifyMustSeePlace({
      name: 'Собор Александра Невского',
      desc: 'Храм у слияния рек',
      locationSlug: 'nizhny-novgorod-sobor-aleksandra-nevskogo',
    }),
    'temple',
  );
  assert.equal(
    classifyMustSeePlace({
      name: 'Памятник Жюлю Верну',
      desc: 'Писатель на воздушном шаре',
      locationSlug: 'nizhny-novgorod-pamyatnik-zhyulyu-vernu',
    }),
    'monument',
  );
  assert.equal(
    classifyMustSeePlace({
      name: 'Большая Покровская улица',
      desc: 'Пешеходный маршрут',
      locationSlug: 'nizhny-novgorod-bol-shaya-pokrovskaya-ulitsa',
    }),
    'street',
  );
  assert.equal(
    classifyMustSeePlace({
      name: 'Чкаловская лестница',
      desc: 'Спуск к Волге',
      locationSlug: 'nizhny-novgorod-chkalovskaya-lestnitsa',
    }),
    'views',
  );
  // Pedestrian streets → «Улицы» (duration still via visitMinutes when curated).
  assert.equal(
    classifyMustSeePlace({
      name: 'Рождественская улица',
      desc: 'Гастрономический и исторический квартал',
      locationSlug: 'nizhny-novgorod-rozhdestvenskaya-ulitsa',
    }),
    'street',
  );
  // Strelka mentions собор in desc - still main by name/slug.
  assert.equal(
    classifyMustSeePlace({
      name: 'Стрелка рек Волги и Оки',
      desc: 'Место слияния, где расположен собор Александра Невского',
      locationSlug: 'nizhny-novgorod-strelka-rek-volgi-i-oki',
    }),
    'main',
  );
});

test('buildMustSeeFilterTabs hides empty categories and defaults to main', () => {
  const places = [
    { name: 'Кремль', desc: 'x', locationSlug: 'kreml' },
    { name: 'Cafe', desc: 'y', venueSlug: 'city-cafe', type: 'CLUB_BAR_RESTAURANT' },
    { name: 'Музей', desc: 'z', venueSlug: 'city-muzey-x' },
  ];
  const { tabs, defaultId } = buildMustSeeFilterTabs(places);
  assert.equal(defaultId, 'main');
  assert.deepEqual(
    tabs.map((t) => t.id),
    ['main', 'gastro', 'museum'],
  );
  assert.equal(tabs.find((t) => t.id === 'park'), undefined);
  assert.equal(tabs.find((t) => t.id === 'temple'), undefined);
});

test('buildMustSeeFilterTabs: city with only landmarks has single main tab', () => {
  const places = [
    { name: 'Кремль', desc: 'x', locationSlug: 'kreml' },
    { name: 'Площадь', desc: 'y', locationSlug: 'ploschad' },
  ];
  const { tabs, defaultId } = buildMustSeeFilterTabs(places);
  assert.equal(tabs.length, 1);
  assert.equal(tabs[0]?.id, 'main');
  assert.equal(defaultId, 'main');
});

test('filterMustSeePlaces + default preset drop gastro', () => {
  const places = [
    { name: 'Кремль', desc: 'x', locationSlug: 'kreml' },
    { name: 'Площадь', desc: 'x', locationSlug: 'ploschad' },
    { name: 'Ярмарка', desc: 'x', locationSlug: 'yarmarka' },
    { name: 'Yale', desc: 'y', venueSlug: 'yale-restaurant' },
    { name: 'Парк', desc: 'z', locationSlug: 'park-a' },
  ];
  assert.equal(filterMustSeePlaces(places, 'gastro').length, 1);
  assert.equal(filterMustSeePlaces(places, 'main').length, 3);
  const preset = mustSeePlacesForDefaultPreset(places);
  assert.ok(preset.every((p) => classifyMustSeePlace(p) === 'main'));
  assert.equal(preset.length, 3);
  assert.ok(!preset.some((p) => /yale/i.test(p.name)));
});

test('mustSeeFilterStopTypeTag maps views/park/temple to stop pills', () => {
  assert.equal(mustSeeFilterStopTypeTag('views'), 'Смотровая');
  assert.equal(mustSeeFilterStopTypeTag('park'), 'Парк');
  assert.equal(mustSeeFilterStopTypeTag('temple'), 'Храм');
  assert.equal(mustSeeFilterStopTypeTag('monument'), 'Памятник');
  assert.equal(mustSeeFilterStopTypeTag('mansions'), 'Особняк');
});
