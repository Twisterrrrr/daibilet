import assert from 'node:assert/strict';
import test from 'node:test';
import { mapAdmissionProductDto } from './admission-products.dto.js';

test('maps admission product with offers, readiness and listing health', () => {
  const dto = mapAdmissionProductDto({
    id: 'adm_1',
    slug: 'museum-entry',
    title: 'Входной билет в музей',
    shortTitle: 'Музей',
    description: 'Билет действует в выбранный период.',
    shortDescription: null,
    type: 'MUSEUM_ENTRY',
    status: 'PUBLISHED',
    purchaseFlow: 'PLATFORM',
    managementMode: 'DAIBILET_MANAGED',
    imageUrl: null,
    priceFromRub: 10,
    ticketsVacant: 20,
    validityMode: 'OPEN_DATE',
    validFrom: null,
    validTo: new Date('2026-12-31T20:00:00.000Z'),
    validDaysAfterPurchase: null,
    salesStartsAt: null,
    salesEndsAt: null,
    cityId: 'city_1',
    venueId: 'venue_1',
    supplierId: 'sup_1',
    city: { id: 'city_1', slug: 'spb', title: 'Санкт-Петербург' },
    venue: { id: 'venue_1', slug: 'museum', title: 'Музей', kind: 'MUSEUM_ART_SPACE' },
    supplier: { id: 'sup_1', slug: 'museum-supplier', title: 'Музей', status: 'ACTIVE' },
    offers: [
      { id: 'off_baby', title: 'Младенец', priceRub: 10, oldPriceRub: null, active: true, capacityTotal: null, groupSize: 1 },
      { id: 'off_adult', title: 'Взрослый', priceRub: 700, oldPriceRub: 900, active: true, capacityTotal: 100, groupSize: 1 },
    ],
  } as never, new Date('2026-07-30T12:00:00.000Z'));

  assert.equal(dto.priceFromRub, 700);
  assert.equal(dto.readiness.canSell, true);
  assert.equal(dto.health.status, 'review');
  assert.deepEqual(dto.health.warnings.map((issue) => issue.code), ['MISSING_IMAGE', 'WEAK_DESCRIPTION']);
});
