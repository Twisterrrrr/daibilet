import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CitySuburbsServer } from '../components/CitySuburbsServer';
import { resolveCityInfo } from './cityInfo';

test('all suburbs and nested places render in static HTML', () => {
  const suburbs = resolveCityInfo('moskva')?.significantSuburbs || [];
  assert.ok(suburbs.length > 1);
  const html = renderToStaticMarkup(createElement(CitySuburbsServer, { cityName: 'Москва', suburbs }));
  assert.equal((html.match(/<details\b/g) || []).length, suburbs.length);
  assert.ok(html.includes('data-city-suburbs-server'));
  for (const suburb of suburbs) {
    assert.ok(html.includes(suburb.name));
    assert.ok(html.includes(suburb.desc));
    for (const place of suburb.places || []) {
      assert.ok(html.includes(place.name));
      if (place.desc) assert.ok(html.includes(place.desc));
    }
  }
});
