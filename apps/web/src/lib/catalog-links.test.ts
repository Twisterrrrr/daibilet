import assert from 'node:assert/strict';
import test from 'node:test';

import { buildCatalogTagHref, resolveCatalogTagHref } from '@/lib/catalog-links';

test('popular tags map to CHPU landings', () => {
  assert.equal(resolveCatalogTagHref('Stand up').kind, 'chpu');
  assert.match(buildCatalogTagHref('Stand up', 'saint-petersburg'), /\/stendap-i-yumor\/saint-petersburg\/?$/);

  assert.equal(resolveCatalogTagHref('Речные прогулки', 'moscow').kind, 'chpu');
  assert.match(buildCatalogTagHref('Речные прогулки', 'moscow'), /\/rechnye-progulki\/moscow\/?$/);

  assert.equal(resolveCatalogTagHref('Рок', 'moscow').kind, 'chpu');
  assert.equal(buildCatalogTagHref('Рок', 'moscow'), '/kontserty/moscow?genre=%D0%A0%D0%BE%D0%BA');

  assert.equal(resolveCatalogTagHref('Юмор').kind, 'chpu');
  assert.match(buildCatalogTagHref('Юмор'), /\/stendap-i-yumor\/?$/);
});

test('intent-like tags map to /podborki CHPU', () => {
  assert.equal(buildCatalogTagHref('Бесплатно', 'moscow'), '/podborki/besplatno/moscow');
  assert.equal(buildCatalogTagHref('на выходные'), '/podborki/na-vyhodnye');
});

test('theatre-like tags map to unusual-theatres CHPU', () => {
  assert.equal(resolveCatalogTagHref('Драма').kind, 'chpu');
  assert.match(buildCatalogTagHref('Драма', 'moscow'), /\/neobychnye-teatry\/moscow\/?$/);
});

test('unknown tags fall back to /events?q=', () => {
  const result = resolveCatalogTagHref('Шоу - программа', 'kazan');
  assert.equal(result.kind, 'fallback');
  assert.equal(result.href, '/events?q=%D0%A8%D0%BE%D1%83+-+%D0%BF%D1%80%D0%BE%D0%B3%D1%80%D0%B0%D0%BC%D0%BC%D0%B0&city=kazan');
});

/**
 * 29.09. This test asserted that a `moscow` tag for the rooftops landing drops the
 * city segment. That was true while `rooftops` was in LANDING_ALLOWED_CITY_SLUGS,
 * but it has since been removed on purpose - the comment in landing-routes.ts says
 * `rooftops - national (СПб крыши + Мск смотровые)`, i.e. the landing is national
 * and Moscow now has a real city page under it. The code is right; the expectation
 * described an older city policy.
 *
 * The behaviour being tested - "a landing restricted to certain cities drops the
 * city segment for a city it does not serve" - is real and still lives in
 * `landingHrefForTag`, so it is now pinned against `country-tours`, which is the
 * landing that is still restricted (SPb only). Deleting the test instead would
 * have left that rule uncovered.
 */
test('rooftops is a national landing, so every city keeps its own segment', () => {
  assert.match(buildCatalogTagHref('крыши', 'moscow'), /\/progulki-po-krysham\/moscow\/?$/);
  assert.match(
    buildCatalogTagHref('крыши', 'saint-petersburg'),
    /\/progulki-po-krysham\/saint-petersburg\/?$/,
  );
});

test('city-restricted landing without allowed city drops city segment', () => {
  // country-tours is allowed in saint-petersburg only.
  assert.match(
    buildCatalogTagHref('загородные экскурсии', 'saint-petersburg'),
    /\/zagorodnye-ekskursii\/saint-petersburg\/?$/,
  );
  // Moscow is not served by that landing, so the city segment must be dropped
  // rather than linking to a page that does not exist.
  assert.match(buildCatalogTagHref('загородные экскурсии', 'moscow'), /\/zagorodnye-ekskursii\/?$/);
});
