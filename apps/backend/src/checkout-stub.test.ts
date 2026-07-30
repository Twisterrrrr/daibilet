import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifyStubCheckoutSubject,
  computeStubCheckoutTotals,
  isStubCheckoutEnabled,
  isAdmissionCheckoutPayload,
  validateStubAdmissionCheckoutReadiness,
  validateStubCheckoutReadiness,
} from './checkout-stub.js';

const now = new Date('2026-07-22T12:00:00.000Z');

test('stub checkout is disabled in production unless explicitly enabled', () => {
  assert.equal(isStubCheckoutEnabled({ NODE_ENV: 'production' } as NodeJS.ProcessEnv), false);
  assert.equal(isStubCheckoutEnabled({ NODE_ENV: 'production', DAIBILET_STUB_CHECKOUT: '1' } as NodeJS.ProcessEnv), true);
  assert.equal(isStubCheckoutEnabled({ NODE_ENV: 'development' } as NodeJS.ProcessEnv), false);
  assert.equal(isStubCheckoutEnabled({ NODE_ENV: 'test' } as NodeJS.ProcessEnv), true);
});

test('computes ruble totals and supplier commission in kopecks', () => {
  assert.deepEqual(computeStubCheckoutTotals({ priceRub: 1500, quantity: 2, commissionBps: 1200 }), {
    currency: 'RUB',
    unitPriceKopecks: 150000,
    subtotalKopecks: 300000,
    discountKopecks: 0,
    totalKopecks: 300000,
    commissionKopecks: 36000,
    netKopecks: 264000,
  });
});

test('allows Daibilet-managed open-date venue admission without a session', () => {
  const issues = validateStubCheckoutReadiness({
    enabled: true,
    now,
    event: eventFixture({
      kind: 'OPEN_DATE',
      venue: { id: 'ven_1', slug: 'museum', title: 'Museum', kind: 'MUSEUM_ART_SPACE' },
    }),
    offer: offerFixture({ priceRub: 700 }),
    session: null,
    supplier: supplierFixture(),
    quantity: 1,
  });

  assert.deepEqual(issues, []);
  assert.equal(classifyStubCheckoutSubject({ eventKind: 'OPEN_DATE', venueKind: 'MUSEUM_ART_SPACE' }), 'VENUE_ADMISSION');
});

test('blocks imported/source-managed events and external checkout flow', () => {
  const issues = validateStubCheckoutReadiness({
    enabled: true,
    now,
    event: eventFixture({
      managementMode: 'SOURCE_MANAGED',
      purchaseFlow: 'EXTERNAL',
      kind: 'OPEN_DATE',
    }),
    offer: offerFixture({ priceRub: 700 }),
    session: null,
    supplier: supplierFixture(),
    quantity: 1,
  });

  assert.deepEqual(issues.map((issue) => issue.code), [
    'EVENT_NOT_INTERNAL_CHECKOUT',
    'EVENT_NOT_MANAGED_BY_DAIBILET',
  ]);
});

test('requires a concrete active future session for non-open-date events', () => {
  const issues = validateStubCheckoutReadiness({
    enabled: true,
    now,
    event: eventFixture({ kind: 'RECURRING' }),
    offer: offerFixture({ priceRub: 1200 }),
    session: null,
    supplier: supplierFixture(),
    quantity: 1,
  });

  assert.deepEqual(issues.map((issue) => issue.code), ['SESSION_REQUIRED']);
});

test('blocks too-low manual ticket prices and missing active supplier', () => {
  const issues = validateStubCheckoutReadiness({
    enabled: true,
    now,
    event: eventFixture({ kind: 'OPEN_DATE' }),
    offer: offerFixture({ priceRub: 10 }),
    session: null,
    supplier: supplierFixture({ status: 'DRAFT' }),
    quantity: 1,
  });

  assert.deepEqual(issues.map((issue) => issue.code), ['SUPPLIER_NOT_CONFIGURED', 'PRICE_TOO_LOW']);
});

test('detects admission checkout payloads explicitly', () => {
  assert.equal(isAdmissionCheckoutPayload({ admissionProductSlug: 'museum-entry' } as any), true);
  assert.equal(isAdmissionCheckoutPayload({ subjectType: 'VENUE_ADMISSION' } as any), true);
  assert.equal(isAdmissionCheckoutPayload({ eventSlug: 'manual-event' } as any), false);
});

test('allows Daibilet-managed admission product with manual offer', () => {
  const issues = validateStubAdmissionCheckoutReadiness({
    enabled: true,
    now,
    product: admissionProductFixture(),
    offer: admissionOfferFixture({ priceRub: 700 }),
    supplier: supplierFixture(),
    quantity: 2,
  });

  assert.deepEqual(issues, []);
});

test('blocks admission product with external checkout and imported offer', () => {
  const issues = validateStubAdmissionCheckoutReadiness({
    enabled: true,
    now,
    product: admissionProductFixture({ purchaseFlow: 'EXTERNAL' }),
    offer: admissionOfferFixture({ sourceCode: 'TICKETSCLOUD' }),
    supplier: supplierFixture(),
    quantity: 1,
  });

  assert.deepEqual(issues.map((issue) => issue.code), [
    'ADMISSION_PRODUCT_NOT_INTERNAL_CHECKOUT',
    'ADMISSION_OFFER_NOT_MANUAL',
  ]);
});

function eventFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'evt_1',
    slug: 'manual-event',
    title: 'Manual event',
    kind: 'OPEN_DATE',
    status: 'READY',
    purchaseFlow: 'PLATFORM',
    managementMode: 'DAIBILET_MANAGED',
    salesStartsAt: null,
    salesEndsAt: null,
    openDateValidFrom: null,
    openDateValidTo: null,
    ticketsVacant: 20,
    supplier: null,
    supplierLinks: [],
    venue: null,
    primaryCity: null,
    ...overrides,
  } as never;
}

function admissionProductFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'adm_1',
    slug: 'museum-entry',
    title: 'Museum entry',
    type: 'MUSEUM_ENTRY',
    status: 'READY',
    purchaseFlow: 'PLATFORM',
    managementMode: 'DAIBILET_MANAGED',
    salesStartsAt: null,
    salesEndsAt: null,
    validFrom: null,
    validTo: null,
    ticketsVacant: 20,
    supplier: supplierFixture(),
    venue: { id: 'ven_1', slug: 'museum', title: 'Museum', kind: 'MUSEUM_ART_SPACE', city: null },
    city: null,
    ...overrides,
  } as never;
}

function admissionOfferFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'adm_offer_1',
    admissionProductId: 'adm_1',
    sourceCode: 'MANUAL',
    title: 'Adult',
    priceRub: 1000,
    active: true,
    capacityTotal: null,
    ...overrides,
  } as never;
}

function offerFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'offer_1',
    eventId: 'evt_1',
    sourceCode: 'MANUAL',
    title: 'Adult',
    priceRub: 1000,
    active: true,
    capacityTotal: null,
    ...overrides,
  } as never;
}

function supplierFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sup_1',
    slug: 'supplier',
    title: 'Supplier',
    status: 'ACTIVE',
    defaultCommissionBps: 1000,
    ...overrides,
  } as never;
}
