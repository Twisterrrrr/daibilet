const assert = require('node:assert/strict');
const test = require('node:test');
const { resolveTicketscloudCityId } = require('./tc-city-resolve');

test('a renamed Ticketscloud city keeps its existing id and slug', async () => {
  const calls = [];
  const client = {
    async query(sql, params) {
      calls.push({ sql, params });
      return { rows: [{ id: 'city_463343' }] };
    },
  };
  const id = await resolveTicketscloudCityId(client, {
    cityId: 'city_463343',
    citySlug: 'железногорск-курская-область',
    cityName: 'Железногорск (Курская область)',
  });
  assert.equal(id, 'city_463343');
  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /^select id from "City"/);
});

test('a new provider city still uses the slug upsert', async () => {
  const calls = [];
  const client = {
    async query(sql, params) {
      calls.push({ sql, params });
      return { rows: calls.length === 1 ? [] : [{ id: 'city_existing_slug' }] };
    },
  };
  const id = await resolveTicketscloudCityId(client, {
    cityId: 'city_new', citySlug: 'город', cityName: 'Город',
  });
  assert.equal(id, 'city_existing_slug');
  assert.match(calls[1].sql, /on conflict \(slug\)/);
});
