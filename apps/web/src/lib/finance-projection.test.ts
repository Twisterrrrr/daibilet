import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatAdmissionPriceFrom,
  isOpenDateValidity,
  mapAdmissionListPayload,
  mapAdmissionProduct,
  resolveAdmissionCheckoutUrl,
  shouldShowAdmissionCta,
  shouldShowCityAdmissionBlock,
} from './finance-projection.ts';

const sampleProduct = {
  id: 'adp_phase_g_test_museum_entry',
  slug: 'phase-g-test-museum-entry',
  title: 'Входной билет в тестовый музей',
  shortTitle: 'Входной билет',
  type: 'MUSEUM_ENTRY',
  purchaseFlow: 'PLATFORM',
  managementMode: 'DAIBILET_MANAGED',
  validityMode: 'OPEN_DATE',
  priceFromRub: 350,
  ticketsVacant: 97,
  canSell: true,
  checkoutPath: '/checkout/admissions/phase-g-test-museum-entry',
  paymentMode: 'SHOULD_NOT_LEAK',
  city: { id: 'c1', slug: 'moskva', title: 'Москва' },
  venue: {
    id: 'ven_phase_g_test_museum',
    slug: 'phase-g-test-museum',
    title: 'Тестовый музей Дайбилет',
    kind: 'MUSEUM_ART_SPACE',
    citySlug: 'moskva',
    cityTitle: 'Москва',
  },
  supplier: {
    id: 'sup_phase_g_test_museum',
    slug: 'phase-g-test-museum',
    title: 'Тестовый музей Дайбилет',
    status: 'ACTIVE',
    integrationMode: 'INTERNAL_SALES',
    defaultCatalogMode: 'INTERNAL_CHECKOUT',
  },
  offers: [
    { id: 'ado_child', title: 'Детский', priceRub: 350, groupSize: 1, capacityTotal: 100 },
    { id: 'ado_adult', title: 'Взрослый', priceRub: 700, groupSize: 1, capacityTotal: 100 },
  ],
};

test('mapAdmissionProduct: maps public fields and keeps canSell', () => {
  const mapped = mapAdmissionProduct(sampleProduct);
  assert.ok(mapped);
  assert.equal(mapped.slug, 'phase-g-test-museum-entry');
  assert.equal(mapped.canSell, true);
  assert.equal(mapped.checkoutPath, '/checkout/admissions/phase-g-test-museum-entry');
  assert.equal(mapped.venue?.slug, 'phase-g-test-museum');
  assert.equal(mapped.offers.length, 2);
  assert.equal('paymentMode' in mapped, false);
});

test('mapAdmissionProduct: readiness.canSell fallback', () => {
  const mapped = mapAdmissionProduct({
    ...sampleProduct,
    canSell: false,
    readiness: { canSell: true },
  });
  assert.ok(mapped);
  assert.equal(mapped.canSell, true);
});

test('mapAdmissionProduct: rejects incomplete rows', () => {
  assert.equal(mapAdmissionProduct({ slug: 'x' }), null);
  assert.equal(mapAdmissionProduct(null), null);
});

test('shouldShowAdmissionCta: only when canSell true', () => {
  assert.equal(shouldShowAdmissionCta({ canSell: true }), true);
  assert.equal(shouldShowAdmissionCta({ canSell: false }), false);
});

test('resolveAdmissionCheckoutUrl: absolute and relative', () => {
  assert.equal(
    resolveAdmissionCheckoutUrl('https://checkout.example/path', {}),
    'https://checkout.example/path',
  );
  assert.equal(
    resolveAdmissionCheckoutUrl('/checkout/admissions/x', {
      FINANCE_CHECKOUT_BASE_URL: 'http://85.193.80.159',
    }),
    'http://85.193.80.159/checkout/admissions/x',
  );
  assert.equal(
    resolveAdmissionCheckoutUrl('/checkout/admissions/x', {}),
    'https://checkout.daibilet.ru/checkout/admissions/x',
  );
  assert.equal(resolveAdmissionCheckoutUrl(null, {}), null);
  assert.equal(resolveAdmissionCheckoutUrl('', {}), null);
});

test('shouldShowCityAdmissionBlock: gated by published count', () => {
  assert.equal(shouldShowCityAdmissionBlock({ published: 0 }), false);
  assert.equal(shouldShowCityAdmissionBlock({ published: 1 }), true);
  assert.equal(shouldShowCityAdmissionBlock({ published: 2 }, 3), false);
  assert.equal(shouldShowCityAdmissionBlock({ published: 3 }, 3), true);
});

test('mapAdmissionListPayload: summary + items', () => {
  const list = mapAdmissionListPayload({
    total: 1,
    summary: { published: 1, canSell: 1, priceFromRub: 350, venues: 1, suppliers: 1 },
    items: [sampleProduct],
  });
  assert.equal(list.total, 1);
  assert.equal(list.summary.published, 1);
  assert.equal(list.items[0]?.canSell, true);
});

test('formatAdmissionPriceFrom + open date badge helpers', () => {
  assert.equal(formatAdmissionPriceFrom(350), 'от 350 ₽');
  assert.equal(formatAdmissionPriceFrom(50), null);
  assert.equal(isOpenDateValidity('OPEN_DATE'), true);
  assert.equal(isOpenDateValidity('FIXED_WINDOW'), false);
});
