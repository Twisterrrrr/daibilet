import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCityDayRoutePreset,
  capitalizeSentenceStart,
  cityDayRoutePresetAvailable,
  dayRouteHookLine,
  dayRouteItemFromEvent,
  dayRouteItemFromMustSee,
} from './day-route-from-place.ts';

const city = { id: 'city_spb', name: 'Санкт-Петербург', slug: 'sankt-peterburg' };

const venues = [
  {
    id: 'venue_ermitazh',
    slug: 'ermitazh',
    name: 'Эрмитаж',
    latitude: 59.9398,
    longitude: 30.3146,
    address: 'Дворцовая набережная, 34',
    heroImageUrl: '/h.jpg',
  },
  {
    id: 'venue_krepost',
    slug: 'saint-petersburg-petropavlovskaya-krepost',
    name: 'Петропавловская крепость',
    latitude: 59.95,
    longitude: 30.316,
    address: 'Заячий остров',
  },
  {
    id: 'venue_dvorts',
    slug: 'saint-petersburg-dvortsovaya-ploschad',
    name: 'Дворцовая площадь',
    latitude: 59.938,
    longitude: 30.315,
  },
  {
    id: 'venue_isaak',
    slug: 'saint-petersburg-isaakievskiy-sobor',
    name: 'Исаакиевский собор',
    latitude: 59.934,
    longitude: 30.306,
    address: 'Исаакиевская площадь, 4',
  },
  {
    id: 'venue_spas',
    slug: 'saint-petersburg-spas-na-krovi',
    name: 'Спас на Крови',
    latitude: 59.9401,
    longitude: 30.3289,
    address: 'наб. канала Грибоедова, 2Б',
  },
  {
    id: 'venue_kazan',
    slug: 'saint-petersburg-kazanskiy-sobor',
    name: 'Казанский собор',
    latitude: 59.9343,
    longitude: 30.3245,
    address: 'Казанская площадь, 2',
  },
];

test('dayRouteHookLine prefers hookFact then shortDescription then desc', () => {
  assert.equal(
    dayRouteHookLine({
      hookFact: 'Факт с площадки',
      shortDescription: 'Коротко',
      desc: 'Редакционный',
    }),
    'Факт с площадки',
  );
  assert.equal(
    dayRouteHookLine({
      shortDescription: 'Коротко из DTO',
      desc: 'Редакционный',
    }),
    'Коротко из DTO',
  );
  assert.equal(dayRouteHookLine({ desc: 'Только cityInfo desc' }), 'Только cityInfo desc');
});

test('dayRouteHookLine preferEditorial keeps cityInfo over venue crumbs', () => {
  assert.equal(
    dayRouteHookLine({
      preferEditorial: true,
      hookFact: 'факт площадки',
      shortDescription: 'Ракурс на крепость. Нева',
      desc: 'Ракурс на крепость и ростральные колонны.',
    }),
    'Ракурс на крепость и ростральные колонны.',
  );
});

test('dayRouteHookLine strips trailing location crumbs from venue blurbs', () => {
  assert.equal(
    dayRouteHookLine({
      shortDescription: 'Идеальная перспектива к Александринке. пл. Островского',
    }),
    'Идеальная перспектива к Александринке.',
  );
  assert.equal(
    dayRouteHookLine({
      shortDescription: 'Вечерняя жизнь и старый доходный фонд. Владимирская',
    }),
    'Вечерняя жизнь и старый доходный фонд.',
  );
  // Catalog /locations card (Троицкий мост) - Venue.shortDescription crumb tail
  assert.equal(
    dayRouteHookLine({
      shortDescription: 'Ракурс на крепость и ростральные колонны. Нева',
    }),
    'Ракурс на крепость и ростральные колонны.',
  );
  assert.equal(
    dayRouteHookLine({
      shortDescription: 'Панорамный вид на стрелку и ростральные. Васильевский',
    }),
    'Панорамный вид на стрелку и ростральные.',
  );
});

test('capitalizeSentenceStart uppercases first letter only', () => {
  assert.equal(capitalizeSentenceStart('главный готический храм'), 'Главный готический храм');
  assert.equal(capitalizeSentenceStart('Главный уже с большой'), 'Главный уже с большой');
  assert.equal(capitalizeSentenceStart('  ещё пробел'), 'Ещё пробел');
  assert.equal(dayRouteHookLine({ desc: 'масштабный маринистический центр' }), 'Масштабный маринистический центр');
});

test('dayRouteHookLine keeps full text by default (no ellipsis)', () => {
  const long =
    'За всю свою многовековую историю эта каменная крепость ни разу не была взята штурмом, выдержав множество осад и сохранив стены до наших дней.';
  const line = dayRouteHookLine({ desc: long });
  assert.equal(line, long.replace(/[—–]/g, '-'));
  assert.equal((line as string).endsWith('...'), false);
});

test('dayRouteHookLine truncates only when maxLen is set', () => {
  const long =
    'Очень длинное описание места с подробностями — зачем ехать сюда и что смотреть в первую очередь сегодня днём';
  const line = dayRouteHookLine({ desc: long }, 80);
  assert.ok(line);
  assert.ok((line as string).length <= 83);
  assert.equal((line as string).includes('—'), false);
  assert.equal((line as string).includes('–'), false);
  assert.ok((line as string).endsWith('...'));
});

test('dayRouteItemFromMustSee does not glue Admiralty building to a pier', () => {
  const pier = {
    id: 'venue_pier',
    slug: 'prichal-admiralteystvo',
    name: 'Причал Адмиралтейство',
    title: 'Причал Адмиралтейство',
    type: 'pier',
    latitude: 59.938,
    longitude: 30.308,
    address: 'Адмиралтейская наб., 2',
  };
  const building = {
    id: 'loc_adm',
    slug: 'saint-petersburg-admiralteystvo',
    name: 'Адмиралтейство',
    title: 'Адмиралтейство',
    type: 'attraction',
    latitude: 59.9374,
    longitude: 30.3085,
    address: 'Адмиралтейский проезд, 1',
  };
  const fuzzy = dayRouteItemFromMustSee({ name: 'Адмиралтейство', desc: 'Шпиль' }, [pier, building], city);
  assert.ok(fuzzy);
  assert.equal(fuzzy!.slug, 'saint-petersburg-admiralteystvo');
  const pinned = dayRouteItemFromMustSee(
    { name: 'Адмиралтейство', desc: 'Шпиль', locationSlug: 'saint-petersburg-admiralteystvo' },
    [pier],
    city,
  );
  assert.ok(pinned);
  assert.equal(pinned!.slug, 'saint-petersburg-admiralteystvo');
  assert.notEqual(pinned!.id, pier.id);
});

test('dayRouteItemFromMustSee resolves venueSlug + coords + address', () => {
  const item = dayRouteItemFromMustSee(
    { name: 'Эрмитаж', desc: 'Музей', venueSlug: 'ermitazh' },
    venues,
    city,
  );
  assert.ok(item);
  assert.equal(item!.id, 'venue_ermitazh');
  assert.equal(item!.slug, 'ermitazh');
  assert.equal(item!.latitude, 59.9398);
  assert.equal(item!.address, 'Дворцовая набережная, 34');
  assert.equal(item!.cityId, 'city_spb');
});

test('dayRouteItemFromMustSee preserves significant-suburb context', () => {
  const item = dayRouteItemFromMustSee(
    { name: 'Эрмитаж', desc: 'Музей', venueSlug: 'ermitazh' },
    venues,
    city,
    { isSuburb: true },
  );
  assert.ok(item);
  assert.equal(item!.isSuburb, true);
});

test('dayRouteItemFromMustSee resolves locationSlug with hub venue match', () => {
  const item = dayRouteItemFromMustSee(
    {
      name: 'Спас на Крови',
      desc: 'Храм',
      locationSlug: 'saint-petersburg-spas-na-krovi',
    },
    venues,
    city,
  );
  assert.ok(item);
  assert.equal(item!.id, 'venue_spas');
  assert.equal(item!.slug, 'saint-petersburg-spas-na-krovi');
  assert.equal(item!.latitude, 59.9401);
  assert.equal(item!.address, 'наб. канала Грибоедова, 2Б');
});

test('dayRouteItemFromMustSee resolves locationSlug without hub venue match', () => {
  const item = dayRouteItemFromMustSee(
    {
      name: 'Неизвестный храм',
      desc: 'Храм',
      locationSlug: 'saint-petersburg-unknown-church',
    },
    venues,
    city,
  );
  assert.ok(item);
  assert.equal(item!.id, 'saint-petersburg-unknown-church');
  assert.equal(item!.slug, 'saint-petersburg-unknown-church');
  assert.equal(item!.latitude ?? null, null);
  assert.equal(item!.address ?? null, null);
});

test('dayRouteItemFromMustSee uses editorial coords when hub omits NN place', () => {
  const item = dayRouteItemFromMustSee(
    {
      name: 'Нижегородская ярмарка',
      desc: 'Ярмарка',
      locationSlug: 'nizhny-novgorod-nizhegorodskaya-yarmarka',
    },
    [],
    { id: 'city_nn', name: 'Нижний Новгород', slug: 'nizhny-novgorod' },
  );
  assert.ok(item);
  assert.equal(item!.latitude, 56.3275);
  assert.equal(item!.longitude, 43.962222);
  assert.equal(
    item!.imageUrl,
    '/images/venues/nizhny-novgorod/nizhegorodskaya-yarmarka.jpg',
  );
});

test('dayRouteItemFromMustSee rebases Perm hub mid-river coords onto south-bank editorial', () => {
  const item = dayRouteItemFromMustSee(
    {
      name: 'Набережная Камы',
      desc: 'Променад',
      locationSlug: 'naberezhnaya-kamy',
      latitude: 58.021111,
      longitude: 56.243889,
    },
    [
      {
        id: 'loc_nab',
        slug: 'naberezhnaya-kamy',
        name: 'Набережная Камы',
        latitude: 58.0224,
        longitude: 56.252,
      },
    ],
    { id: 'city_perm', name: 'Пермь', slug: 'perm' },
  );
  assert.ok(item);
  assert.equal(item!.latitude, 58.01825);
  assert.equal(item!.longitude, 56.2466);
});

test('dayRouteItemFromMustSee prefers editorial cover over hub hero', () => {
  const item = dayRouteItemFromMustSee(
    {
      name: 'Нижегородская ярмарка',
      desc: 'Ярмарка',
      locationSlug: 'nizhny-novgorod-nizhegorodskaya-yarmarka',
    },
    [
      {
        id: 'venue_yarmarka',
        slug: 'nizhny-novgorod-nizhegorodskaya-yarmarka',
        name: 'Нижегородская ярмарка',
        heroImageUrl: '/images/venues/generated/venue-auto-stub.jpg',
      },
    ],
    { id: 'city_nn', name: 'Нижний Новгород', slug: 'nizhny-novgorod' },
  );
  assert.ok(item);
  assert.equal(
    item!.imageUrl,
    '/images/venues/nizhny-novgorod/nizhegorodskaya-yarmarka.jpg',
  );
});

test('dayRouteItemFromMustSee uses hub hero when no editorial cover', () => {
  const item = dayRouteItemFromMustSee(
    {
      name: 'Кастомная точка',
      desc: 'x',
      locationSlug: 'custom-place-no-editorial',
    },
    [
      {
        id: 'venue_custom',
        slug: 'custom-place-no-editorial',
        name: 'Кастомная точка',
        heroImageUrl: '/images/custom-hub.jpg',
      },
    ],
    city,
  );
  assert.ok(item);
  assert.equal(item!.imageUrl, '/images/custom-hub.jpg');
});

test('dayRouteItemFromMustSee prefers place coords over missing hub', () => {
  const item = dayRouteItemFromMustSee(
    {
      name: 'Точка',
      desc: 'x',
      locationSlug: 'custom-place-no-map',
      latitude: 55.1,
      longitude: 37.2,
    },
    [],
    city,
  );
  assert.ok(item);
  assert.equal(item!.latitude, 55.1);
  assert.equal(item!.longitude, 37.2);
});

test('dayRouteItemFromMustSee returns null without slug or match', () => {
  assert.equal(
    dayRouteItemFromMustSee({ name: 'Неизвестное место', desc: 'x' }, venues, city),
    null,
  );
});

test('dayRouteItemFromMustSee suburb stub without slug still pins to route', () => {
  const item = dayRouteItemFromMustSee(
    { name: 'Якорная площадь', desc: 'Главная площадь Кронштадта.' },
    venues,
    city,
    { isSuburb: true },
  );
  assert.ok(item);
  assert.equal(item!.title, 'Якорная площадь');
  assert.equal(item!.id, 'suburb:yakornaya-ploschad');
  assert.equal(item!.slug, null);
  assert.equal(item!.isSuburb, true);
});

test('dayRouteItemFromMustSee suburb stub carries editorial lat/lng', () => {
  const item = dayRouteItemFromMustSee(
    {
      name: 'Променад и Солнечные часы «Зодиак»',
      desc: 'Набережная Светлогорска.',
      latitude: 54.9405,
      longitude: 20.1485,
    },
    venues,
    city,
    { isSuburb: true },
  );
  assert.ok(item);
  assert.equal(item!.latitude, 54.9405);
  assert.equal(item!.longitude, 20.1485);
  assert.equal(item!.isSuburb, true);
});

test('dayRouteItemFromMustSee does not glue SPB mosque to MTS Live Hall', () => {
  const mts = {
    id: 'venue_mts',
    slug: 'mts-live-holl-sankt-peterburg',
    name: 'МТС Live Холл Санкт-Петербург',
    title: 'МТС Live Холл Санкт-Петербург',
    shortDescription:
      'Высокотехнологичный многоуровневый концертный комплекс в историческом районе Петербурга.',
    heroImageUrl: 'https://example.com/ded-moroz.jpg',
  };
  const item = dayRouteItemFromMustSee(
    {
      name: 'Санкт-Петербургская соборная мечеть',
      desc: 'Монументальное здание с лазурным майоликовым куполом.',
      locationSlug: 'saint-petersburg-sobornaya-mechet',
    },
    [...venues, mts],
    city,
  );
  assert.ok(item);
  assert.equal(item!.id, 'saint-petersburg-sobornaya-mechet');
  assert.equal(item!.slug, 'saint-petersburg-sobornaya-mechet');
  assert.notEqual(item!.imageUrl, mts.heroImageUrl);
  assert.equal(item!.imageUrl, '/images/venues/saint-petersburg/sobornaya-mechet.jpg');
  assert.equal(item!.latitude, 59.9552);
  assert.equal(item!.longitude, 30.3239);
});

test('buildCityDayRoutePreset takes all resolvable must-see up to soft guideline', () => {
  const places = [
    { name: 'Эрмитаж', desc: '', venueSlug: 'ermitazh' },
    { name: 'Крепость', desc: '', locationSlug: 'saint-petersburg-petropavlovskaya-krepost' },
    { name: 'Площадь', desc: '', locationSlug: 'saint-petersburg-dvortsovaya-ploschad' },
    { name: 'Исаакий', desc: '', locationSlug: 'saint-petersburg-isaakievskiy-sobor' },
    { name: 'Спас', desc: '', locationSlug: 'saint-petersburg-spas-na-krovi' },
    { name: 'Казанский', desc: '', locationSlug: 'saint-petersburg-kazanskiy-sobor' },
  ];
  const preset = buildCityDayRoutePreset(places, venues, city);
  assert.equal(preset.length, 6);
  assert.equal(preset[0]!.slug, 'ermitazh');
  assert.equal(preset[5]!.slug, 'saint-petersburg-kazanskiy-sobor');
  assert.ok(preset.every((item) => item.cityId === 'city_spb'));
  assert.ok(preset[0]!.address);
  assert.ok(cityDayRoutePresetAvailable(places, venues, city));
  assert.equal(
    cityDayRoutePresetAvailable(places.slice(0, 2), venues, city),
    false,
  );
});

test('dayRouteItemFromEvent adds venue + session label', () => {
  const item = dayRouteItemFromEvent({
    id: 'evt_1',
    slug: 'obzornaya',
    title: 'Обзорная',
    city: 'Санкт-Петербург',
    cityId: 'city_spb',
    citySlug: 'sankt-peterburg',
    venueId: 'venue_ermitazh',
    venueSlug: 'ermitazh',
    venue: 'Эрмитаж',
    venueKind: 'museum',
    venueLatitude: 59.9398,
    venueLongitude: 30.3146,
    startsAt: '2026-08-02T11:00:00+03:00',
    dateLabel: 'вс, 2 авг',
    timeLabel: '11:00',
  });
  assert.ok(item);
  assert.equal(item!.id, 'venue_ermitazh');
  assert.equal(item!.title, 'Обзорная');
  assert.equal(item!.eventId, 'evt_1');
  assert.equal(item!.sessionLabel, 'вс, 2 авг, 11:00');
  assert.equal(item!.latitude, 59.9398);
});

test('dayRouteItemFromEvent builds sessionLabel from startsAt when labels missing', () => {
  const item = dayRouteItemFromEvent({
    id: 'evt_starts',
    slug: 'evening-show',
    title: 'Вечернее шоу',
    venueId: 'venue_1',
    venueSlug: 'hall-1',
    venue: 'Зал',
    startsAt: '2026-08-15T16:00:00.000Z',
  });
  assert.ok(item);
  assert.ok(item!.sessionLabel);
  assert.match(item!.sessionLabel!, /15/);
  assert.match(item!.sessionLabel!, /19:00/);
});

test('dayRouteItemFromEvent falls back to event id without venue', () => {
  const item = dayRouteItemFromEvent({
    id: 'evt_2',
    slug: 'standup-night',
    title: 'Стендап',
    venue: '',
  });
  assert.ok(item);
  assert.equal(item!.id, 'evt_2');
  assert.equal(item!.title, 'Стендап');
  assert.equal(item!.eventId, 'evt_2');
  assert.equal(item!.eventSlug, 'standup-night');
});

test('dayRouteItemFromEvent returns null without id', () => {
  assert.equal(
    dayRouteItemFromEvent({
      id: '',
      title: 'Без id',
      venue: '',
    }),
    null,
  );
});
