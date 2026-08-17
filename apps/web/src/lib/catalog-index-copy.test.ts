import assert from 'node:assert/strict';
import test from 'node:test';

import {
  catalogIndexEyebrow,
  eventsCatalogH1,
  eventsCatalogLead,
  placesCatalogH1,
  placesCatalogLead,
} from './catalog-index-copy.ts';

test('events H1 puts афиша + city first, then types', () => {
  assert.equal(
    eventsCatalogH1({ cityName: 'Уфа' }),
    'Афиша событий в Уфе: экскурсии, концерты, театр и музеи',
  );
  assert.equal(
    eventsCatalogH1({ cityName: 'Москва' }),
    'Афиша событий в Москве: экскурсии, концерты, театр и музеи',
  );
  assert.equal(
    eventsCatalogH1({ cityName: 'Санкт-Петербург' }),
    'Афиша событий в Санкт-Петербурге: экскурсии, концерты, театр и музеи',
  );
  assert.equal(
    eventsCatalogH1({ cityName: 'Московская область' }),
    'Афиша событий в Московской области: экскурсии, концерты, театр и музеи',
  );
  assert.equal(eventsCatalogH1({}), 'Афиша событий: экскурсии, концерты, театр и музеи');
});

test('events lead uses hyphen, not em/en dash', () => {
  const lead = eventsCatalogLead({ cityName: 'Уфа' });
  assert.match(lead, /Выберите дату - покажем/);
  assert.ok(!lead.includes('\u2014') && !lead.includes('\u2013'));
});

test('places H1 is umbrella + genitive, not «в Уфе»', () => {
  assert.equal(placesCatalogH1('Уфа'), 'Места и достопримечательности Уфы');
  assert.equal(placesCatalogH1('Москва'), 'Места и достопримечательности Москвы');
  assert.equal(
    placesCatalogH1('Санкт-Петербург'),
    'Места и достопримечательности Санкт-Петербурга',
  );
  assert.equal(placesCatalogH1(null), 'Места и достопримечательности');
  assert.ok(!placesCatalogH1('Уфа').includes('в Уфе'));
});

test('places lead is human copy without dash punctuation', () => {
  const lead = placesCatalogLead('Уфа');
  assert.match(lead, /маршрут по городу/);
  assert.ok(!lead.includes('\u2014') && !lead.includes('\u2013'));
});

test('eyebrow drops national city-count once a city is scoped', () => {
  assert.equal(catalogIndexEyebrow('247 мест', 'Уфа'), '247 мест · Уфа');
  assert.equal(catalogIndexEyebrow('247 мест · 65 городов'), '247 мест · 65 городов');
});
