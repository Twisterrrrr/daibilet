import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import test from 'node:test';
import { prisma } from '@daibilet/db';
import {
  buildPublicAdmissionProductDetailDto,
  buildPublicAdmissionProductsListDto,
  buildPublicSupplierProjectionDto,
  buildPublicVenueAdmissionProductsDto,
} from './public-finance-projection.dto.js';
import { isProjectionRequestAuthorized } from './public-finance-projection-handler.js';

const forbiddenPublicKeys = [
  'paymentMode',
  'provider',
  'providerId',
  'providerPaymentId',
  'checkoutOrderId',
  'orderId',
  'internalOrderId',
  'externalOrderId',
  'sourceId',
];

test('public finance projection exposes only published active admission products', async () => {
  const suffix = `public-projection-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const ids = {
    city: `city_${suffix}`,
    venue: `venue_${suffix}`,
    supplier: `sup_${suffix}`,
    inactiveSupplier: `sup_inactive_${suffix}`,
    product: `admission_${suffix}`,
    draftProduct: `admission_draft_${suffix}`,
    inactiveProduct: `admission_inactive_${suffix}`,
    offer: `admission_offer_${suffix}`,
  };
  const slug = `projection-admission-${suffix}`;

  try {
    await prisma.city.create({
      data: {
        id: ids.city,
        slug: `projection-city-${suffix}`,
        title: 'Projection City',
        isDestination: true,
      },
    });
    await prisma.venue.create({
      data: {
        id: ids.venue,
        slug: `projection-venue-${suffix}`,
        title: 'Projection Venue',
        cityId: ids.city,
        kind: 'MUSEUM_ART_SPACE',
        pageStatus: 'PUBLISHED',
      },
    });
    await prisma.supplier.createMany({
      data: [
        {
          id: ids.supplier,
          slug: `projection-supplier-${suffix}`,
          title: 'Projection Supplier',
          status: 'ACTIVE',
          integrationMode: 'INTERNAL_SALES',
          defaultCatalogMode: 'INTERNAL_CHECKOUT',
        },
        {
          id: ids.inactiveSupplier,
          slug: `projection-inactive-supplier-${suffix}`,
          title: 'Inactive Supplier',
          status: 'PAUSED',
          integrationMode: 'INTERNAL_SALES',
          defaultCatalogMode: 'INTERNAL_CHECKOUT',
        },
      ],
    });
    await prisma.admissionProduct.createMany({
      data: [
        {
          id: ids.product,
          slug,
          title: 'Projection Admission',
          shortTitle: 'Admission',
          shortDescription: 'A concise public card.',
          type: 'MUSEUM_ENTRY',
          status: 'PUBLISHED',
          purchaseFlow: 'PLATFORM',
          managementMode: 'DAIBILET_MANAGED',
          sourceCode: 'MANUAL',
          priceFromRub: 800,
          ticketsVacant: 20,
          cityId: ids.city,
          venueId: ids.venue,
          supplierId: ids.supplier,
        },
        {
          id: ids.draftProduct,
          slug: `projection-draft-${suffix}`,
          title: 'Draft Admission',
          type: 'MUSEUM_ENTRY',
          status: 'REVIEW',
          purchaseFlow: 'PLATFORM',
          managementMode: 'DAIBILET_MANAGED',
          sourceCode: 'MANUAL',
          priceFromRub: 900,
          venueId: ids.venue,
          supplierId: ids.supplier,
        },
        {
          id: ids.inactiveProduct,
          slug: `projection-inactive-${suffix}`,
          title: 'Inactive Supplier Admission',
          type: 'MUSEUM_ENTRY',
          status: 'PUBLISHED',
          purchaseFlow: 'PLATFORM',
          managementMode: 'DAIBILET_MANAGED',
          sourceCode: 'MANUAL',
          priceFromRub: 900,
          venueId: ids.venue,
          supplierId: ids.inactiveSupplier,
        },
      ],
    });
    await prisma.admissionOffer.create({
      data: {
        id: ids.offer,
        admissionProductId: ids.product,
        sourceCode: 'MANUAL',
        title: 'Adult',
        priceRub: 800,
        active: true,
      },
    });

    const list = await buildPublicAdmissionProductsListDto(new URLSearchParams({ venueSlug: `projection-venue-${suffix}` }));
    assert.equal(list.total, 1);
    assert.equal(list.summary.published, 1);
    assert.equal(list.summary.canSell, 1);
    assert.equal(list.summary.priceFromRub, 800);
    assert.equal(list.items[0]?.slug, slug);
    assert.equal(list.items[0]?.canSell, true);
    assert.equal(list.items[0]?.checkoutPath, `/checkout/admissions/${slug}`);
    assert.equal(list.items[0]?.purchaseFlow, 'PLATFORM');
    assert.equal('paymentMode' in (list.items[0]?.supplier || {}), false);
    assertNoForbiddenPublicKeys(list.items[0]);

    const detail = await buildPublicAdmissionProductDetailDto(slug);
    assert.equal(detail?.slug, slug);
    assert.equal(detail?.venue.citySlug, `projection-city-${suffix}`);
    assert.equal(detail?.purchaseFlow, 'PLATFORM');
    assertNoForbiddenPublicKeys(detail);

    const hiddenDetail = await buildPublicAdmissionProductDetailDto(`projection-draft-${suffix}`);
    assert.equal(hiddenDetail, null);

    const venue = await buildPublicVenueAdmissionProductsDto(`projection-venue-${suffix}`);
    assert.equal(venue?.total, 1);
    assert.equal(venue?.summary.canSell, 1);
    assertNoForbiddenPublicKeys(venue);

    const supplier = await buildPublicSupplierProjectionDto(`projection-supplier-${suffix}`);
    assert.equal(supplier?.admissionSummary.published, 1);
    assert.equal(supplier?.admissionProducts[0]?.slug, slug);
    assertNoForbiddenPublicKeys(supplier);
  } finally {
    await prisma.admissionOffer.deleteMany({ where: { id: ids.offer } });
    await prisma.admissionProduct.deleteMany({ where: { id: { in: [ids.product, ids.draftProduct, ids.inactiveProduct] } } });
    await prisma.supplier.deleteMany({ where: { id: { in: [ids.supplier, ids.inactiveSupplier] } } });
    await prisma.venue.deleteMany({ where: { id: ids.venue } });
    await prisma.city.deleteMany({ where: { id: ids.city } });
  }
});

test('public projection with blockers keeps product visible but disables checkoutPath', async () => {
  const suffix = `public-blocked-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const ids = {
    venue: `venue_${suffix}`,
    supplier: `sup_${suffix}`,
    product: `admission_${suffix}`,
    offer: `admission_offer_${suffix}`,
  };
  const slug = `blocked-admission-${suffix}`;

  try {
    await prisma.venue.create({
      data: {
        id: ids.venue,
        slug: `blocked-venue-${suffix}`,
        title: 'Blocked Venue',
        kind: 'MUSEUM_ART_SPACE',
        pageStatus: 'PUBLISHED',
      },
    });
    await prisma.supplier.create({
      data: {
        id: ids.supplier,
        slug: `blocked-supplier-${suffix}`,
        title: 'Blocked Supplier',
        status: 'ACTIVE',
        integrationMode: 'INTERNAL_SALES',
        defaultCatalogMode: 'INTERNAL_CHECKOUT',
      },
    });
    await prisma.admissionProduct.create({
      data: {
        id: ids.product,
        slug,
        title: 'Blocked Admission',
        type: 'MUSEUM_ENTRY',
        status: 'PUBLISHED',
        purchaseFlow: 'PLATFORM',
        managementMode: 'DAIBILET_MANAGED',
        sourceCode: 'MANUAL',
        priceFromRub: 800,
        ticketsVacant: 0,
        venueId: ids.venue,
        supplierId: ids.supplier,
      },
    });
    await prisma.admissionOffer.create({
      data: {
        id: ids.offer,
        admissionProductId: ids.product,
        sourceCode: 'MANUAL',
        title: 'Adult',
        priceRub: 800,
        active: true,
      },
    });

    const detail = await buildPublicAdmissionProductDetailDto(slug);
    assert.equal(detail?.slug, slug);
    assert.equal(detail?.canSell, false);
    assert.equal(detail?.checkoutPath, null);
    assert.equal(detail?.purchaseFlow, 'PLATFORM');
    assertNoForbiddenPublicKeys(detail);
  } finally {
    await prisma.admissionOffer.deleteMany({ where: { id: ids.offer } });
    await prisma.admissionProduct.deleteMany({ where: { id: ids.product } });
    await prisma.supplier.deleteMany({ where: { id: ids.supplier } });
    await prisma.venue.deleteMany({ where: { id: ids.venue } });
  }
});

test('projection m2m auth accepts bearer or explicit header when token is configured', () => {
  assert.equal(isProjectionRequestAuthorized(requestWithHeaders({}), null), true);
  assert.equal(isProjectionRequestAuthorized(requestWithHeaders({ authorization: 'Bearer secret' }), 'secret'), true);
  assert.equal(isProjectionRequestAuthorized(requestWithHeaders({ 'x-daibilet-projection-token': 'secret' }), 'secret'), true);
  assert.equal(isProjectionRequestAuthorized(requestWithHeaders({ authorization: 'Bearer wrong' }), 'secret'), false);
  assert.equal(isProjectionRequestAuthorized(requestWithHeaders({}), 'secret'), false);
});

function requestWithHeaders(headers: Record<string, string>): IncomingMessage {
  return { headers } as IncomingMessage;
}

function assertNoForbiddenPublicKeys(value: unknown): void {
  const json = JSON.stringify(value);
  for (const key of forbiddenPublicKeys) {
    assert.equal(json.includes(`"${key}"`), false, `public projection must not expose ${key}`);
  }
}
