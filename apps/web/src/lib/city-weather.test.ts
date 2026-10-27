import assert from 'node:assert/strict';
import test from 'node:test';

import {
  indoorCtaForCode,
  parseOpenMeteoForecast,
  snapshotFromHubWeatherPayload,
  buildOpenMeteoForecastUrl,
  hubWeatherApiPath,
  weatherLabelRu,
  weatherMoodFromCode,
} from './city-weather.ts';
import { resolveCityLocalFlavor } from './city-hub-local-flavor.ts';
import { CITY_INFO } from './cityInfo.ts';

test('WMO 0-2 is sunny leisure, overcast and rain go indoor', () => {
  assert.equal(weatherMoodFromCode(0), 'sunny');
  assert.equal(weatherMoodFromCode(1), 'sunny');
  assert.equal(weatherMoodFromCode(2), 'sunny');
  assert.equal(weatherMoodFromCode(3), 'indoor');
  assert.equal(weatherMoodFromCode(61), 'indoor');
  assert.equal(weatherMoodFromCode(80), 'indoor');
  assert.equal(weatherMoodFromCode(71), 'indoor');
});

test('indoor CTA copy follows actual condition, not a generic lie', () => {
  const flavor = resolveCityLocalFlavor('perm')?.weather;
  assert.ok(flavor);
  // Case-insensitive on purpose: the CTA opens with the condition name, so it is
  // capitalised as a sentence («Пасмурно:», «Дождь:», «Снег:») - correct Russian.
  // The contract under test is that the copy names the real condition, not that the
  // word is lowercase; asserting case-sensitively only tested a sentence's first
  // letter. 29.09: the Perm overcast copy said «Серое небо:», so it also lost the
  // condition name entirely and is now aligned with the other 10+ cities.
  assert.match(indoorCtaForCode(3, flavor), /пасмурно/i);
  assert.match(indoorCtaForCode(61, flavor), /дождь/i);
  assert.match(indoorCtaForCode(73, flavor), /снег/i);
  assert.equal(indoorCtaForCode(3, flavor).includes('\u2014'), false);
  assert.equal(weatherLabelRu(0), 'Ясно');
  assert.equal(weatherLabelRu(3), 'Пасмурно');
});

/**
 * 29.09. Six cities had drifted to a truncated «Серо: …» label instead of
 * «Пасмурно: …» - three in city-hub-local-flavor.ts (Kaliningrad, Moscow,
 * Yekaterinburg) and three in the Saratov / Volgograd / Yaroslavl fragments. No test
 * covered them, which is why the drift went unnoticed; the weather test only looked
 * at Perm.
 *
 * The guard targets that exact defect and nothing else. An earlier version required
 * the copy to open with one of «Пасмурно/Дождь/Снег» and wrongly flagged deliberate
 * variants that name the condition just as honestly: «Ливень:», «Редкий снег:»,
 * «Сыро и холодно:», «Серо над морем:», «Степной ветер:». What is wrong with
 * «Серо:» is that the label stops at a short-form adjective and never reaches a
 * noun, so the reader is not told what the weather is. That is what this asserts.
 */
test('no city indoor CTA is truncated to a bare "Серо:" label', () => {
  const offenders: string[] = [];
  let checked = 0;
  for (const city of Object.keys(CITY_INFO)) {
    const weather = resolveCityLocalFlavor(city)?.weather;
    if (!weather) continue;
    checked += 1;
    for (const [label, copy] of [
      ['overcast', weather.indoorCtaOvercast],
      ['rain', weather.indoorCtaRain],
      ['snow', weather.indoorCtaSnow],
    ] as const) {
      if (!copy) continue;
      if (/^Серо\s*:/u.test(copy)) offenders.push(`${city} ${label}: ${copy}`);
    }
  }
  assert.ok(checked > 15, `expected a broad sweep of cities, checked ${checked}`);
  assert.deepEqual(offenders, [], offenders.join('\n'));
});

test('parseOpenMeteoForecast prefers current code for today', () => {
  const snapshot = parseOpenMeteoForecast({
    current: { temperature_2m: 18.4, weather_code: 0 },
    daily: {
      time: ['2026-08-14', '2026-08-15', '2026-08-16'],
      weather_code: [3, 61, 0],
      temperature_2m_max: [19.2, 16.1, 20.4],
      temperature_2m_min: [12, 11, 13],
    },
  });
  assert.ok(snapshot);
  assert.equal(snapshot.today.mood, 'sunny');
  assert.equal(snapshot.today.weatherCode, 0);
  assert.equal(snapshot.today.temperatureC, 18);
  assert.equal(snapshot.tomorrow?.mood, 'indoor');
  assert.equal(snapshot.tomorrow?.weatherCode, 61);
  assert.equal(snapshot.dayAfter?.mood, 'sunny');
  assert.equal(snapshot.dayAfter?.weatherCode, 0);
});

test('parseOpenMeteoForecast returns null on empty payload', () => {
  assert.equal(parseOpenMeteoForecast({}), null);
  assert.equal(parseOpenMeteoForecast(null), null);
});

test('hub weather API stays on Next-owned /api/day-route prefix', () => {
  assert.equal(hubWeatherApiPath('perm'), '/api/day-route/weather/perm');
  assert.equal(hubWeatherApiPath('perm').startsWith('/api/public/'), false);
});

test('Open-Meteo URL carries Perm coords and 3-day forecast', () => {
  const flavor = resolveCityLocalFlavor('perm')?.weather;
  assert.ok(flavor);
  const url = buildOpenMeteoForecastUrl(flavor);
  assert.match(url, /api\.open-meteo\.com\/v1\/forecast/);
  assert.match(url, /latitude=58\.01/);
  assert.match(url, /longitude=56\.23/);
  assert.match(url, /forecast_days=3/);
});

test('snapshotFromHubWeatherPayload requires ok + today', () => {
  assert.equal(snapshotFromHubWeatherPayload({ ok: false }), null);
  const snapshot = snapshotFromHubWeatherPayload({
    ok: true,
    today: {
      date: '2026-08-14',
      weatherCode: 80,
      label: 'Небольшой дождь',
      temperatureC: 18,
      tempMaxC: 20,
      tempMinC: 12,
      mood: 'indoor',
    },
    tomorrow: null,
    dayAfter: null,
  });
  assert.ok(snapshot);
  assert.equal(snapshot.today.temperatureC, 18);
});
