import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isRegionLikeCityTitle,
  resolveVenuePlaceCity,
  settlementLabelFromCitySlug,
} from './venue-place-city.ts';

test('region-like titles', () => {
  assert.equal(isRegionLikeCityTitle('Республика Башкортостан'), true);
  assert.equal(isRegionLikeCityTitle('Московская область'), true);
  assert.equal(isRegionLikeCityTitle('Пермский край'), true);
  assert.equal(isRegionLikeCityTitle('Стерлитамак'), false);
  assert.equal(isRegionLikeCityTitle('Уфа'), false);
});

test('settlement from citySlug under region title', () => {
  assert.equal(
    resolveVenuePlaceCity('Республика Башкортостан', 'стерлитамак'),
    'Стерлитамак',
  );
  assert.equal(
    resolveVenuePlaceCity('Республика Башкортостан', 'нефтекамск'),
    'Нефтекамск',
  );
  assert.equal(
    resolveVenuePlaceCity('Республика Башкортостан', 'октябрьскии-республика-башкортостан'),
    'Октябрьский',
  );
  assert.equal(
    resolveVenuePlaceCity('Республика Башкортостан', 'белебеи'),
    'Белебей',
  );
  assert.equal(resolveVenuePlaceCity('Стерлитамак', 'стерлитамак'), 'Стерлитамак');
});

test('settlementLabelFromCitySlug', () => {
  assert.equal(settlementLabelFromCitySlug('благовещенск-башкортостан'), 'Благовещенск');
  assert.equal(settlementLabelFromCitySlug(null), null);
});
