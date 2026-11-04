import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveCityTimeZone } from './city-timezone.ts';

test('Петропавловск-Камчатский resolves to Asia/Kamchatka', () => {
  assert.equal(resolveCityTimeZone('Петропавловск-Камчатский'), 'Asia/Kamchatka');
});

test('known far-east and Ural cities stay on their own zones', () => {
  assert.equal(resolveCityTimeZone('Владивосток'), 'Asia/Vladivostok');
  assert.equal(resolveCityTimeZone('Новосибирск'), 'Asia/Novosibirsk');
  assert.equal(resolveCityTimeZone('Екатеринбург'), 'Asia/Yekaterinburg');
  assert.equal(resolveCityTimeZone('Москва'), 'Europe/Moscow');
});
