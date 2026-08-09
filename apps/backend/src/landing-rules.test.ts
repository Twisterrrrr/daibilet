import assert from 'node:assert/strict';
import test from 'node:test';
import {
  findLandingRule,
  matchesLandingRule,
  matchingLandingSlugs,
} from './landing-rules.js';

test('matches a focused river landing and rejects unrelated transport', () => {
  const river = findLandingRule('river-cruises');
  assert.ok(river);
  assert.equal(matchesLandingRule({
    title: 'Прогулка на теплоходе по Неве',
    category: 'Экскурсии',
    tags: ['Водные экскурсии'],
    city: 'Санкт-Петербург',
  }, river), true);
  assert.equal(matchesLandingRule({
    title: 'Автобусная экскурсия по центру',
    category: 'Экскурсии',
    tags: [],
    city: 'Санкт-Петербург',
  }, river), false);
});

test('rejects Ben Hall concert false-positive via Екатеринбург→катер substring', () => {
  const river = findLandingRule('river-cruises');
  assert.ok(river);

  assert.equal(matchesLandingRule({
    title: '/ Екатеринбург/ Костя Кулясов гр. АнимациЯ/ Все хиты/animaciya.online',
    venue: 'Ben Hall',
    category: 'Мероприятия',
    tags: ['Рок'],
    subcategories: ['Рок'],
    city: 'Екатеринбург',
  }, river), false);

  assert.equal(matchesLandingRule({
    title: 'Концерт рок-группы в Екатеринбурге',
    venue: 'Ben Hall',
    category: 'Музыка',
    tags: ['Рок'],
    city: 'Екатеринбург',
  }, river), false);

  // Real boat stem still matches without subcategory.
  assert.equal(matchesLandingRule({
    title: 'Обзорная прогулка на катере по каналам',
    category: 'Экскурсии',
    tags: [],
    city: 'Санкт-Петербург',
  }, river), true);

  // Moscow/SPb subcategory path stays intact.
  assert.equal(matchesLandingRule({
    title: 'Речная прогулка по Москве-реке',
    category: 'Экскурсии',
    tags: ['Речные прогулки'],
    subcategories: ['Речные прогулки'],
    city: 'Москва',
  }, river), true);
});

test('river-cruises excludes yacht and boat charter rentals', () => {
  const river = findLandingRule('river-cruises');
  assert.ok(river);

  assert.equal(matchesLandingRule({
    title: 'Индивидуальная аренда яхты до 12 персон',
    category: 'Экскурсии',
    tags: ['Водные экскурсии'],
    subcategories: ['Водные экскурсии'],
    city: 'Санкт-Петербург',
  }, river), false);

  assert.equal(matchesLandingRule({
    title: 'Индивидуальная аренда большой яхты Sunseeker Pallada 70',
    category: 'Экскурсии',
    tags: ['Водные экскурсии'],
    city: 'Санкт-Петербург',
  }, river), false);

  assert.equal(matchesLandingRule({
    title: 'Индивидуальная аренда катера до 11 персон',
    category: 'Экскурсии',
    tags: ['Речные прогулки'],
    city: 'Санкт-Петербург',
  }, river), false);

  // Shared river cruise (not charter) still matches.
  assert.equal(matchesLandingRule({
    title: 'Круиз на парусной яхте по Финскому заливу',
    category: 'Экскурсии',
    tags: ['Водные экскурсии'],
    city: 'Санкт-Петербург',
  }, river), true);
});

test('keeps city and venue landing constraints strict', () => {
  assert.deepEqual(
    matchingLandingSlugs({
      title: 'Ночная прогулка к разводным мостам',
      city: 'Москва',
      tags: ['Разводные мосты'],
    }).includes('bridges-night'),
    false,
  );
  assert.equal(
    matchingLandingSlugs({ title: 'Музыка под звездами', venue: 'Планетарий 1' })
      .includes('planetarium'),
    true,
  );
});

test('requires an excursion signal for country tours', () => {
  const countryTours = findLandingRule('country-tours');
  assert.ok(countryTours);

  assert.equal(matchesLandingRule({
    title: 'Автобусная экскурсия в Петергоф',
    category: 'Экскурсии',
    subcategories: ['Автобусные экскурсии'],
    city: 'Санкт-Петербург',
  }, countryTours), true);
  assert.equal(matchesLandingRule({
    title: 'Тур в Выборг - шведское сердце России',
    category: 'Экскурсии',
    subcategories: ['Автобусный тур'],
    city: 'Санкт-Петербург',
  }, countryTours), true);
  assert.equal(matchesLandingRule({
    title: 'Выезд в Гатчину: дворцы и парк',
    category: 'Экскурсии',
    city: 'Санкт-Петербург',
  }, countryTours), true);
  assert.equal(matchesLandingRule({
    title: 'Царское Село и Екатерининский дворец',
    category: 'Экскурсии',
    city: 'Санкт-Петербург',
  }, countryTours), true);

  for (const candidate of [
    { title: 'Концерт в Большом Петергофском дворце', category: 'Музыка' },
    { title: 'Пиковая дама. Салонные чтения повести Пушкина', category: 'Театр' },
    { title: 'Мастер-класс в Павловске', category: 'Мастер-классы' },
    { title: 'Экскурсия в Кронштадт', category: 'Экскурсии', city: 'Москва' },
  ]) {
    assert.equal(matchesLandingRule({
      ...candidate,
      city: candidate.city || 'Санкт-Петербург',
    }, countryTours), false, candidate.title);
  }
});

test('widens bus tours via tags without hop-on venue', () => {
  const bus = findLandingRule('bus-tours');
  assert.ok(bus);

  assert.equal(matchesLandingRule({
    title: 'Ночной Петербург на автобусе',
    category: 'Экскурсии',
    tags: ['Автобусные экскурсии'],
    city: 'Санкт-Петербург',
  }, bus), true);

  assert.equal(matchesLandingRule({
    title: 'Панорамная программа по центру',
    category: 'Экскурсии',
    subcategories: ['Автобусные экскурсии'],
    city: 'Москва',
  }, bus), true);

  assert.equal(matchesLandingRule({
    title: 'Трансфер в аэропорт на автобусе',
    category: 'Транспорт',
    city: 'Москва',
  }, bus), false);
});

test('excludes bus tours from concerts even when title has music keywords', () => {
  const concerts = findLandingRule('concerts-genre');
  assert.ok(concerts);

  assert.equal(matchesLandingRule({
    title: 'Вечерняя симфония Петербурга - на автобусе',
    category: 'Экскурсии',
    tags: ['Автобусные туры'],
    subcategories: ['Автобусные туры'],
    venue: 'Точка сбора',
    city: 'Санкт-Петербург',
  }, concerts), false);

  assert.equal(matchesLandingRule({
    title: 'Панорамная экскурсия по центру на автобусе',
    category: 'Экскурсии',
    tags: ['Автобусные экскурсии'],
    city: 'Москва',
  }, concerts), false);

  assert.equal(matchesLandingRule({
    title: 'Симфонический концерт в филармонии',
    category: 'Музыка',
    tags: ['Классика', 'Симфоническая музыка'],
    city: 'Санкт-Петербург',
  }, concerts), true);
});

test('keeps rooftop tours separate from concerts and parties', () => {
  const rooftops = findLandingRule('rooftops');
  assert.ok(rooftops);

  assert.equal(matchesLandingRule({
    title: 'Экскурсия по крышам Петербурга',
    category: 'Экскурсии',
    city: 'Санкт-Петербург',
  }, rooftops), true);
  assert.equal(matchesLandingRule({
    title: 'СМОТРОВАЯ ПЛОЩАДКА «ВЫШЕ ТОЛЬКО ЛЮБОВЬ». 92 ЭТАЖ',
    category: 'Развлечения',
    tags: ['Смотровые площадки'],
    city: 'Москва',
  }, rooftops), true);
  assert.equal(matchesLandingRule({
    title: 'Билеты на смотровую Москва-Сити',
    category: 'Развлечения',
    city: 'Москва',
  }, rooftops), true);
  assert.equal(matchesLandingRule({
    title: 'Летняя экскурсия «Архитектура музея с выходом на крышу»',
    category: 'Музеи и арт',
    city: 'Красноярск',
  }, rooftops), true);
  assert.equal(matchesLandingRule({
    title: 'Концерт на крыше Невского',
    category: 'Музыка',
    city: 'Санкт-Петербург',
  }, rooftops), false);
  assert.equal(matchesLandingRule({
    title: 'Панорамная экскурсия по центру на автобусе',
    category: 'Экскурсии',
    city: 'Москва',
  }, rooftops), false);
});

test('requires a seasonal term in a New Year title', () => {
  const newYear = findLandingRule('new-year');
  assert.ok(newYear);

  assert.equal(matchesLandingRule({
    title: 'Новогодний концерт в декабре',
    tags: ['Новый год'],
  }, newYear), true);
  assert.equal(matchesLandingRule({
    title: 'Концерт на крыше Невского',
    tags: ['Новый год'],
  }, newYear), false);
});

test('salute-9-may rejects City Day fireworks and keeps Victory Day', () => {
  const salute = findLandingRule('salute-9-may');
  assert.ok(salute);

  // Live false-positive (MSK 2026-08): City Day boat + festive fireworks in September.
  assert.equal(matchesLandingRule({
    title: 'Речная Прогулка на День Города с праздничным фейерверком, с ужином, DJ дискотека',
    category: 'Мероприятия',
    tags: ['Водные экскурсии', 'Речные прогулки'],
    subcategories: ['Развлекательные центры', 'Водные экскурсии', 'Речные прогулки', 'Дискотека'],
    city: 'Москва',
    startsAt: '2026-09-05T13:00:00.000Z',
  }, salute), false);

  assert.equal(matchesLandingRule({
    title: 'Салют на День города с теплохода',
    category: 'Экскурсии',
    city: 'Москва',
  }, salute), false);

  assert.equal(matchesLandingRule({
    title: 'Прогулка к салюту 9 мая с ужином',
    category: 'Экскурсии',
    tags: ['Водные экскурсии'],
    city: 'Москва',
  }, salute), true);

  assert.equal(matchesLandingRule({
    title: 'Фейерверк в честь Дня Победы с борта теплохода',
    category: 'Экскурсии',
    city: 'Санкт-Петербург',
  }, salute), true);

  // Fireworks without Victory Day signal must not land on salute-9-may.
  assert.equal(matchesLandingRule({
    title: 'Вечерний фейерверк с теплохода',
    category: 'Экскурсии',
    city: 'Москва',
  }, salute), false);
});

test('moscow-city-day matches Moscow City Day and rejects Victory Day / other cities', () => {
  const cityDay = findLandingRule('moscow-city-day');
  assert.ok(cityDay);

  assert.equal(matchesLandingRule({
    title: 'Речная Прогулка на День Города с праздничным фейерверком, с ужином, DJ дискотека',
    category: 'Мероприятия',
    tags: ['Водные экскурсии', 'Речные прогулки'],
    city: 'Москва',
  }, cityDay), true);

  assert.equal(matchesLandingRule({
    title: 'ДЕНЬ ГОРОДА НА ФЛАГМАНЕ С ИГРИСТЫМ И ДИ-ДЖЕЕМ!!!',
    category: 'Мероприятия',
    city: 'Москва',
  }, cityDay), true);

  assert.equal(matchesLandingRule({
    title: 'Прогулка к салюту 9 мая с ужином',
    category: 'Экскурсии',
    city: 'Москва',
  }, cityDay), false);

  assert.equal(matchesLandingRule({
    title: 'День города "Татарская эстрада Live"',
    category: 'Мероприятия',
    city: 'Казань',
  }, cityDay), false);

  assert.equal(matchesLandingRule({
    title: 'Вечерний круиз по Москве-реке',
    category: 'Экскурсии',
    city: 'Москва',
  }, cityDay), false);

  assert.equal(
    matchingLandingSlugs({
      title: 'Салют на День города с теплохода',
      category: 'Экскурсии',
      city: 'Москва',
    }).includes('moscow-city-day'),
    true,
  );
  assert.equal(
    matchingLandingSlugs({
      title: 'Салют на День города с теплохода',
      category: 'Экскурсии',
      city: 'Москва',
    }).includes('salute-9-may'),
    false,
  );
});

test('applies canonical subcategory rules and Moscow-time schedule', () => {
  assert.equal(matchingLandingSlugs({
    title: 'Обзорная экскурсия по городу',
    subcategories: ['Автобусные экскурсии'],
    city: 'Москва',
    venue: 'Туристический автобус',
  }).includes('bus-tours'), true);

  const nightCandidate = {
    title: 'Прогулка к разводным мостам',
    city: 'Санкт-Петербург',
    tags: ['Разводные мосты'],
  };
  assert.equal(matchingLandingSlugs({
    ...nightCandidate,
    startsAt: '2026-07-10T19:30:00.000Z',
  }).includes('bridges-night'), true);
  assert.equal(matchingLandingSlugs({
    ...nightCandidate,
    startsAt: '2026-07-10T12:00:00.000Z',
  }).includes('bridges-night'), false);

  const busByVenue = matchingLandingSlugs({
    title: 'Жизнь и чудеса Матроны Московской',
    category: 'Экскурсии',
    venue: 'YUTONG 6122',
    tags: ['Теплоход: YUTONG 6122'],
  });
  assert.equal(busByVenue.includes('bus-tours'), true);
  assert.equal(busByVenue.includes('river-cruises'), false);

  assert.equal(matchingLandingSlugs({
    title: 'Экскурсия на двухэтажном автобусе Hop on - hop off',
    category: 'Экскурсии',
    city: 'Москва',
  }).includes('bus-tours'), true);
});

test('city alone is never a sufficient landing match', () => {
  const museums = findLandingRule('moscow-museums');
  const yards = findLandingRule('spb-yards');
  const dinner = findLandingRule('moscow-dinner-boat');
  const country = findLandingRule('country-tours');
  const bridges = findLandingRule('bridges-night');
  assert.ok(museums && yards && dinner && country && bridges);

  const moscowGeneric = {
    title: 'Вечер в городе',
    category: 'Развлечения',
    tags: [] as string[],
    city: 'Москва',
  };
  const spbGeneric = {
    title: 'Вечер в городе',
    category: 'Развлечения',
    tags: [] as string[],
    city: 'Санкт-Петербург',
  };

  assert.equal(matchesLandingRule(moscowGeneric, museums), false);
  assert.equal(matchesLandingRule(moscowGeneric, dinner), false);
  assert.equal(matchesLandingRule(spbGeneric, yards), false);
  assert.equal(matchesLandingRule(spbGeneric, country), false);
  assert.equal(matchesLandingRule({
    ...spbGeneric,
    title: 'Ночная прогулка',
    startsAt: '2026-07-10T19:30:00.000Z',
  }, bridges), false);
});

test('moscow-museums requires museum signal and excludes standup', () => {
  const museums = findLandingRule('moscow-museums');
  assert.ok(museums);

  assert.equal(matchesLandingRule({
    title: 'Мастер-класс по росписи в технике горячая эмаль',
    category: 'Мастер-классы',
    tags: ['Мастер-классы'],
    subcategories: ['Мастер-классы'],
    city: 'Москва',
  }, museums), true);

  assert.equal(matchesLandingRule({
    title: 'Династии и шедевры в Третьяковской галерее',
    category: 'Экскурсии',
    tags: ['Музеи'],
    subcategories: ['Музеи'],
    city: 'Москва',
  }, museums), true);

  // City alone must not match (was the standup leak root cause).
  assert.equal(matchesLandingRule({
    title: 'Стендап по-Женски',
    category: 'Развлечения',
    tags: ['Юмор'],
    subcategories: ['Юмор'],
    venue: 'Руки Вверх Бар',
    city: 'Москва',
  }, museums), false);

  assert.equal(matchesLandingRule({
    title: 'Вечерний Stand Up',
    category: 'Мероприятия',
    tags: ['Stand up'],
    subcategories: ['Stand up'],
    venue: 'Comedy Hub Club',
    city: 'Москва',
  }, museums), false);

  assert.equal(matchesLandingRule({
    title: 'Самвел Гиновян. Сольный Стендап-концерт',
    category: 'Мероприятия',
    tags: ['Stand up'],
    city: 'Москва',
  }, museums), false);
});

test('family-kids excludes band АнимациЯ but keeps kids animation', () => {
  const family = findLandingRule('family-kids');
  assert.ok(family);

  assert.equal(matchesLandingRule({
    title: '/ Самара / Костя Кулясов гр. АнимациЯ / Все хиты /',
    category: 'Концерты',
    tags: ['Рок'],
    subcategories: ['Рок'],
    city: 'Самара',
  }, family), false);

  assert.equal(matchesLandingRule({
    title: '/ Екатеринбург/ Костя Кулясов гр. АнимациЯ/ Все хиты/animaciya.online',
    category: 'Мероприятия',
    tags: ['Рок'],
    city: 'Екатеринбург',
  }, family), false);

  assert.equal(matchesLandingRule({
    title: 'АнимациЯ',
    category: 'Мероприятия',
    tags: ['Рок'],
    subcategories: ['Рок'],
    venue: 'Клуб "Космонавт"',
    city: 'Санкт-Петербург',
  }, family), false);

  assert.equal(matchesLandingRule({
    title: 'Детская анимация и шоу для малышей',
    category: 'Шоу',
    tags: ['Детская анимация'],
    subcategories: ['Детская анимация'],
    city: 'Самара',
  }, family), true);
});
