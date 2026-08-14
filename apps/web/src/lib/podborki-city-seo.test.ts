import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildPodborkiCityCanonicalPath,
  buildPodborkiCitySeoPackage,
  isPodborkiSeoPilotCitySlug,
  resolvePodborkiCatalogSeo,
  resolvePodborkiCityMetaPilot,
} from './podborki-city-seo.ts';

test('pilot resolves destination translit and SEO aliases to path canon', () => {
  assert.deepEqual(resolvePodborkiCityMetaPilot('kaliningrad'), {
    citySlug: 'kaliningrad',
    cityName: 'Калининград',
  });
  assert.deepEqual(resolvePodborkiCityMetaPilot('sankt-peterburg'), {
    citySlug: 'saint-petersburg',
    cityName: 'Санкт-Петербург',
  });
  assert.deepEqual(resolvePodborkiCityMetaPilot('saint-petersburg'), {
    citySlug: 'saint-petersburg',
    cityName: 'Санкт-Петербург',
  });
  assert.deepEqual(resolvePodborkiCityMetaPilot('moskva'), {
    citySlug: 'moscow',
    cityName: 'Москва',
  });
  assert.deepEqual(resolvePodborkiCityMetaPilot('moscow'), {
    citySlug: 'moscow',
    cityName: 'Москва',
  });
});

test('active SEO pilot is KGD+SPB; moscow meta leftover only', () => {
  assert.equal(isPodborkiSeoPilotCitySlug('kaliningrad'), true);
  assert.equal(isPodborkiSeoPilotCitySlug('saint-petersburg'), true);
  assert.equal(isPodborkiSeoPilotCitySlug('sankt-peterburg'), true);
  assert.equal(isPodborkiSeoPilotCitySlug('moscow'), false);
  assert.equal(isPodborkiSeoPilotCitySlug('moskva'), false);
});

test('non-pilot and all stay null', () => {
  assert.equal(resolvePodborkiCityMetaPilot('all'), null);
  assert.equal(resolvePodborkiCityMetaPilot(''), null);
  assert.equal(resolvePodborkiCityMetaPilot('kazan'), null);
});

test('canonical is self query on SEO slug, not bare /podborki', () => {
  assert.equal(
    buildPodborkiCityCanonicalPath('kaliningrad'),
    '/podborki?city=kaliningrad',
  );
  assert.equal(
    buildPodborkiCityCanonicalPath('saint-petersburg'),
    '/podborki?city=saint-petersburg',
  );
});

test('city package differentiates ideation hub from city hub афиша', () => {
  const pack = buildPodborkiCitySeoPackage({
    citySlug: 'saint-petersburg',
    cityName: 'Санкт-Петербург',
  });
  assert.match(pack.title, /Подборки/);
  assert.match(pack.h1, /Подборки/);
  assert.doesNotMatch(pack.title, /^Афиша/);
  assert.match(pack.description, /Дайбилет/);
  assert.match(pack.heroDescription, /Идейный хаб/);
  assert.equal(pack.canonicalPath, '/podborki?city=saint-petersburg');
});

test('resolvePodborkiCatalogSeo hub vs pilot', () => {
  const hub = resolvePodborkiCatalogSeo('all');
  assert.equal(hub.canonicalPath, '/podborki');
  assert.equal(hub.pilot, null);

  const kgd = resolvePodborkiCatalogSeo('kaliningrad');
  assert.ok(kgd.pilot);
  assert.equal(kgd.canonicalPath, '/podborki?city=kaliningrad');
  assert.match(kgd.title, /Калининграде/);
});
