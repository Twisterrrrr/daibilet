import assert from 'node:assert/strict';
import test from 'node:test';

import { buildCatalogTagHref, resolveCatalogTagHref } from '@/lib/catalog-links';

test('popular tags map to CHPU landings', () => {
  assert.equal(resolveCatalogTagHref('Stand up').kind, 'chpu');
  assert.match(buildCatalogTagHref('Stand up', 'saint-petersburg'), /\/stendap-i-yumor\/saint-petersburg\/?$/);

  assert.equal(resolveCatalogTagHref('Речные прогулки', 'moscow').kind, 'chpu');
  assert.match(buildCatalogTagHref('Речные прогулки', 'moscow'), /\/rechnye-progulki\/moscow\/?$/);

  assert.equal(resolveCatalogTagHref('Рок', 'moscow').kind, 'chpu');
  assert.equal(buildCatalogTagHref('Рок', 'moscow'), '/kontserty/moscow/?genre=%D0%A0%D0%BE%D0%BA');

  assert.equal(resolveCatalogTagHref('Юмор').kind, 'chpu');
  assert.match(buildCatalogTagHref('Юмор'), /\/stendap-i-yumor\/?$/);
});

test('intent-like tags map to /podborki CHPU', () => {
  assert.equal(buildCatalogTagHref('Бесплатно', 'moscow'), '/podborki/besplatno/moscow');
  assert.equal(buildCatalogTagHref('на выходные'), '/podborki/na-vyhodnye');
});

test('unknown tags fall back to /events?q=', () => {
  const result = resolveCatalogTagHref('Шоу - программа', 'kazan');
  assert.equal(result.kind, 'fallback');
  assert.equal(result.href, '/events?q=%D0%A8%D0%BE%D1%83+-+%D0%BF%D1%80%D0%BE%D0%B3%D1%80%D0%B0%D0%BC%D0%BC%D0%B0&city=kazan');
});

test('city-restricted landing without allowed city drops city segment', () => {
  assert.match(buildCatalogTagHref('крыши', 'moscow'), /\/progulki-po-krysham\/?$/);
  assert.match(buildCatalogTagHref('крыши', 'saint-petersburg'), /\/progulki-po-krysham\/saint-petersburg\/?$/);
});
