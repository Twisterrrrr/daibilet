import assert from 'node:assert/strict';
import test from 'node:test';

import {
  indoorCtaForCode,
  parseOpenMeteoForecast,
  weatherLabelRu,
  weatherMoodFromCode,
} from './city-weather.ts';
import { resolveCityLocalFlavor } from './city-hub-local-flavor.ts';

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
  assert.match(indoorCtaForCode(3, flavor), /пасмурно/);
  assert.match(indoorCtaForCode(61, flavor), /дождь/);
  assert.match(indoorCtaForCode(73, flavor), /снег/);
  assert.equal(indoorCtaForCode(3, flavor).includes('\u2014'), false);
  assert.equal(weatherLabelRu(0), 'Ясно');
  assert.equal(weatherLabelRu(3), 'Пасмурно');
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
