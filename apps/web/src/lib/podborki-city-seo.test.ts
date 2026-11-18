import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildPodborkiCityCanonicalPath,
  buildPodborkiCityHref,
  buildPodborkiCitySeoPackage,
  isPodborkiSeoPilotCitySlug,
  parsePodborkiCityHubPath,
  resolvePodborkiCatalogSeo,
  resolvePodborkiCityMetaPilot,
  resolvePodborkiCityQueryRedirect,
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
  assert.deepEqual(resolvePodborkiCityMetaPilot('nizhny-novgorod'), {
    citySlug: 'nizhny-novgorod',
    cityName: 'Нижний Новгород',
  });
  assert.deepEqual(resolvePodborkiCityMetaPilot('perm'), {
    citySlug: 'perm',
    cityName: 'Пермь',
  });
});

test('active SEO pilot is KGD+SPB+NN+Perm; moscow meta leftover only', () => {
  assert.equal(isPodborkiSeoPilotCitySlug('kaliningrad'), true);
  assert.equal(isPodborkiSeoPilotCitySlug('saint-petersburg'), true);
  assert.equal(isPodborkiSeoPilotCitySlug('sankt-peterburg'), true);
  assert.equal(isPodborkiSeoPilotCitySlug('nizhny-novgorod'), true);
  assert.equal(isPodborkiSeoPilotCitySlug('perm'), true);
  assert.equal(isPodborkiSeoPilotCitySlug('moscow'), false);
  assert.equal(isPodborkiSeoPilotCitySlug('moskva'), false);
});

test('non-pilot and all stay null', () => {
  assert.equal(resolvePodborkiCityMetaPilot('all'), null);
  assert.equal(resolvePodborkiCityMetaPilot(''), null);
  assert.equal(resolvePodborkiCityMetaPilot('kazan'), null);
});

test('canonical is marker CHPU on SEO slug, not soft query', () => {
  const previousMode = process.env.NEXT_PUBLIC_CITY_URL_MODE;
  delete process.env.NEXT_PUBLIC_CITY_URL_MODE;
  try {
    assert.equal(buildPodborkiCityCanonicalPath('kaliningrad'), '/podborki/c/kaliningrad');
    assert.equal(
      buildPodborkiCityCanonicalPath('saint-petersburg'),
      '/podborki/c/saint-petersburg',
    );
    assert.equal(buildPodborkiCityCanonicalPath('nizhny-novgorod'), '/podborki/c/nizhny-novgorod');
    assert.equal(buildPodborkiCityCanonicalPath('perm'), '/podborki/c/perm');
    assert.equal(buildPodborkiCityCanonicalPath('moscow'), '/podborki/c/moscow');
  } finally {
    if (previousMode === undefined) delete process.env.NEXT_PUBLIC_CITY_URL_MODE;
    else process.env.NEXT_PUBLIC_CITY_URL_MODE = previousMode;
  }
});

test('city-first mode uses reviewed city route slugs for podborki canonicals', () => {
  const previousMode = process.env.NEXT_PUBLIC_CITY_URL_MODE;
  process.env.NEXT_PUBLIC_CITY_URL_MODE = 'city-first';
  try {
    assert.equal(buildPodborkiCityCanonicalPath('kaliningrad'), '/kaliningrad/podborki');
    assert.equal(buildPodborkiCityCanonicalPath('saint-petersburg'), '/sankt-peterburg/podborki');
    assert.equal(buildPodborkiCityCanonicalPath('nizhny-novgorod'), '/nizhny-novgorod/podborki');
    assert.equal(buildPodborkiCityCanonicalPath('perm'), '/perm/podborki');
    assert.equal(buildPodborkiCityCanonicalPath('moscow'), '/moscow/podborki');
    assert.equal(buildPodborkiCityHref('saint-petersburg'), '/sankt-peterburg/podborki');
    assert.equal(resolvePodborkiCityQueryRedirect('sankt-peterburg'), '/sankt-peterburg/podborki');
  } finally {
    if (previousMode === undefined) delete process.env.NEXT_PUBLIC_CITY_URL_MODE;
    else process.env.NEXT_PUBLIC_CITY_URL_MODE = previousMode;
  }
});

test('href helper: meta-pilot → city hub; other cities soft query; all → hub', () => {
  const previousMode = process.env.NEXT_PUBLIC_CITY_URL_MODE;
  delete process.env.NEXT_PUBLIC_CITY_URL_MODE;
  try {
    assert.equal(buildPodborkiCityHref('kaliningrad'), '/podborki/c/kaliningrad');
    assert.equal(buildPodborkiCityHref('sankt-peterburg'), '/podborki/c/saint-petersburg');
    assert.equal(buildPodborkiCityHref('moscow'), '/podborki/c/moscow');
    assert.equal(buildPodborkiCityHref('nizhny-novgorod'), '/podborki/c/nizhny-novgorod');
    assert.equal(buildPodborkiCityHref('perm'), '/podborki/c/perm');
    assert.equal(buildPodborkiCityHref('kazan'), '/podborki?city=kazan');
    assert.equal(buildPodborkiCityHref('all'), '/podborki');
    assert.equal(buildPodborkiCityHref(null), '/podborki');
  } finally {
    if (previousMode === undefined) delete process.env.NEXT_PUBLIC_CITY_URL_MODE;
    else process.env.NEXT_PUBLIC_CITY_URL_MODE = previousMode;
  }
});

test('soft query redirect consolidates meta-pilot onto CHPU', () => {
  assert.equal(resolvePodborkiCityQueryRedirect('kaliningrad'), '/podborki/c/kaliningrad');
  assert.equal(
    resolvePodborkiCityQueryRedirect('sankt-peterburg'),
    '/podborki/c/saint-petersburg',
  );
  assert.equal(resolvePodborkiCityQueryRedirect('nizhny-novgorod'), '/podborki/c/nizhny-novgorod');
  assert.equal(resolvePodborkiCityQueryRedirect('perm'), '/podborki/c/perm');
  assert.equal(resolvePodborkiCityQueryRedirect('moscow'), '/podborki/c/moscow');
  assert.equal(resolvePodborkiCityQueryRedirect('kazan'), null);
  assert.equal(resolvePodborkiCityQueryRedirect('all'), null);
});

test('parsePodborkiCityHubPath reads marker segment', () => {
  assert.equal(parsePodborkiCityHubPath('/podborki/c/kaliningrad'), 'kaliningrad');
  assert.equal(parsePodborkiCityHubPath('/podborki/c/saint-petersburg/'), 'saint-petersburg');
  assert.equal(parsePodborkiCityHubPath('/podborki/besplatno/moscow'), null);
  assert.equal(parsePodborkiCityHubPath('/podborki'), null);
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
  assert.equal(pack.canonicalPath, '/podborki/c/saint-petersburg');
});

test('resolvePodborkiCatalogSeo hub vs pilot', () => {
  const hub = resolvePodborkiCatalogSeo('all');
  assert.equal(hub.canonicalPath, '/podborki');
  assert.equal(hub.pilot, null);

  const kgd = resolvePodborkiCatalogSeo('kaliningrad');
  assert.ok(kgd.pilot);
  assert.equal(kgd.canonicalPath, '/podborki/c/kaliningrad');
  assert.match(kgd.title, /Калининграде/);
});
