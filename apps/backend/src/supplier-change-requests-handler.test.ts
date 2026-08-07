import assert from 'node:assert/strict';
import test from 'node:test';
import { prisma } from '@daibilet/db';
import {
  buildSupplierChangeRequestsList,
  createSupplierAdmissionChangeRequest,
  createSupplierEventChangeRequest,
} from './supplier-change-requests-handler.js';

test('supplier change request write-flow creates admission and event requests', async (t) => {
  if (!await canReachDatabase()) {
    t.skip('database is not available');
    return;
  }

  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const supplierId = `sup_change_${suffix}`;
  const cityId = `city_change_${suffix}`;
  const venueId = `venue_change_${suffix}`;
  const outsiderVenueId = `venue_outside_${suffix}`;
  const searchParams = new URLSearchParams({ supplierId });

  try {
    await prisma.city.create({
      data: {
        id: cityId,
        slug: `change-city-${suffix}`,
        title: 'Тестовый город',
      },
    });
    await prisma.supplier.create({
      data: {
        id: supplierId,
        slug: `change-supplier-${suffix}`,
        title: 'Тестовый поставщик заявок',
        status: 'ACTIVE',
        integrationMode: 'INTERNAL_SALES',
        defaultCatalogMode: 'INTERNAL_CHECKOUT',
      },
    });
    await prisma.venue.createMany({
      data: [
        {
          id: venueId,
          slug: `change-venue-${suffix}`,
          title: 'Тестовый музей',
          cityId,
          pageStatus: 'PUBLISHED',
        },
        {
          id: outsiderVenueId,
          slug: `change-venue-outside-${suffix}`,
          title: 'Чужая площадка',
          cityId,
          pageStatus: 'PUBLISHED',
        },
      ],
    });
    await prisma.supplierVenue.create({
      data: {
        supplierId,
        venueId,
        isPrimary: true,
        isActive: true,
      },
    });

    const admission = await createSupplierAdmissionChangeRequest(searchParams, {
      title: 'Новый входной билет',
      summary: 'Проверить описание и цену',
      admissionProduct: {
        title: 'Билет в музей',
        type: 'MUSEUM_ENTRY',
        venueId,
        validityMode: 'OPEN_DATE',
        validDaysAfterPurchase: 30,
      },
      offers: [{ title: 'Взрослый', priceRub: 500, active: true }],
    });

    assert.equal(admission.request.subject, 'ADMISSION_PRODUCT');
    assert.equal(admission.request.type, 'CREATE');
    assert.equal(admission.request.status, 'SUBMITTED');
    assert.equal(admission.request.event, null);

    const event = await createSupplierEventChangeRequest(searchParams, {
      title: 'Новое событие',
      summary: 'Нужна публикация после проверки',
      event: {
        title: 'Ночь в музее',
        kind: 'OPEN_DATE',
        venueId,
        description: 'Открытая дата для тестового события',
      },
      schedule: {
        mode: 'OPEN_DATE',
        openDate: { validDays: 30 },
      },
      offers: [{ title: 'Билет', priceRub: 700, active: true }],
    });

    assert.equal(event.request.subject, 'EVENT');
    assert.equal(event.request.type, 'CREATE');
    assert.equal(event.request.status, 'SUBMITTED');

    const admissionList = await buildSupplierChangeRequestsList(searchParams, {
      subject: 'ADMISSION_PRODUCT',
      limit: 10,
      offset: 0,
    });
    assert.equal(admissionList.total, 1);
    assert.equal(admissionList.items[0]?.title, 'Новый входной билет');

    await assert.rejects(
      () => createSupplierEventChangeRequest(searchParams, {
        title: 'Чужое событие',
        event: {
          title: 'Чужая площадка',
          kind: 'OPEN_DATE',
          venueId: outsiderVenueId,
        },
      }),
      /Площадка не привязана/,
    );
  } finally {
    await prisma.eventChangeRequest.deleteMany({ where: { supplierId } });
    await prisma.supplierVenue.deleteMany({ where: { supplierId } });
    await prisma.venue.deleteMany({ where: { id: { in: [venueId, outsiderVenueId] } } });
    await prisma.supplier.deleteMany({ where: { id: supplierId } });
    await prisma.city.deleteMany({ where: { id: cityId } });
  }
});

async function canReachDatabase(): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;
  try {
    await prisma.$queryRaw`select 1`;
    return true;
  } catch {
    return false;
  }
}
