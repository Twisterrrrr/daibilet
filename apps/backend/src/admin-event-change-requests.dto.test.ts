import assert from 'node:assert/strict';
import test from 'node:test';
import { mapEventChangeRequestDetailRow, mapEventChangeRequestRow } from './admin-event-change-requests.dto.js';

test('maps event change request row for admin operations', () => {
  const row = mapEventChangeRequestRow({
    id: 'cr_1',
    eventId: 'evt_1',
    supplierId: 'sup_1',
    type: 'CONTENT_UPDATE',
    status: 'SUBMITTED',
    title: 'Update title',
    summary: 'Supplier changed title',
    payload: { title: 'New title', baseSnapshot: { eventUpdatedAt: '2026-08-01T12:00:00.000Z' } },
    adminComment: null,
    submittedAt: new Date('2026-08-01T10:00:00.000Z'),
    reviewedAt: null,
    appliedAt: null,
    createdAt: new Date('2026-08-01T09:00:00.000Z'),
    updatedAt: new Date('2026-08-01T10:00:00.000Z'),
    event: {
      id: 'evt_1',
      title: 'Original event',
      slug: 'original-event',
      status: 'REVIEW',
      managementMode: 'SUPPLIER_DRAFTS',
      scheduleLocked: false,
      updatedAt: new Date('2026-08-01T12:00:00.000Z'),
    },
    supplier: {
      id: 'sup_1',
      title: 'Museum',
      slug: 'museum',
      status: 'ACTIVE',
    },
    createdBy: {
      id: 'user_1',
      email: 'supplier@example.com',
      name: 'Supplier',
    },
    reviewedBy: null,
  } as any);

  assert.equal(row.id, 'cr_1');
  assert.deepEqual(row.payloadKeys, ['baseSnapshot', 'title']);
  assert.equal(row.event?.title, 'Original event');
  assert.equal(row.supplier?.title, 'Museum');
  assert.equal(row.actions.canApprove, true);
  assert.equal(row.actions.canReject, true);
  assert.equal(row.actions.canApply, false);
});

test('allows apply action for approved non-create requests', () => {
  const row = mapEventChangeRequestRow({
    id: 'cr_1',
    eventId: 'evt_1',
    supplierId: null,
    type: 'SEO_UPDATE',
    status: 'APPROVED',
    title: null,
    summary: null,
    payload: { seoTitle: 'SEO' },
    adminComment: null,
    submittedAt: null,
    reviewedAt: null,
    appliedAt: null,
    createdAt: new Date('2026-08-01T09:00:00.000Z'),
    updatedAt: new Date('2026-08-01T10:00:00.000Z'),
    event: null,
    supplier: null,
    createdBy: null,
    reviewedBy: null,
  } as any);

  assert.equal(row.actions.canApprove, false);
  assert.equal(row.actions.canReject, false);
  assert.equal(row.actions.canApply, true);
});

test('allows apply action for approved admission product create requests', () => {
  const row = mapEventChangeRequestRow({
    id: 'cr_adm',
    eventId: null,
    supplierId: 'sup_1',
    type: 'CREATE',
    status: 'APPROVED',
    title: 'Новый входной билет',
    summary: null,
    payload: { subject: 'ADMISSION_PRODUCT', admissionProduct: { title: 'Билет' }, offers: [] },
    adminComment: null,
    submittedAt: null,
    reviewedAt: null,
    appliedAt: null,
    createdAt: new Date('2026-08-01T09:00:00.000Z'),
    updatedAt: new Date('2026-08-01T10:00:00.000Z'),
    event: null,
    supplier: null,
    createdBy: null,
    reviewedBy: null,
  } as any);

  assert.equal(row.actions.canApprove, false);
  assert.equal(row.actions.canReject, false);
  assert.equal(row.actions.canApply, true);
});

test('builds admission product update diff with current ticket categories', () => {
  const productUpdatedAt = new Date('2026-08-02T12:00:00.000Z');
  const detail = mapEventChangeRequestDetailRow({
    id: 'cr_adm_update',
    eventId: null,
    supplierId: 'sup_1',
    type: 'UPDATE',
    status: 'APPROVED',
    title: 'Обновить входной билет: Билет в музей',
    summary: 'Добавить льготную категорию',
    payload: {
      subject: 'ADMISSION_PRODUCT',
      admissionProductId: 'adm_1',
      baseSnapshot: { admissionProductUpdatedAt: productUpdatedAt.toISOString() },
      admissionProduct: {
        title: 'Билет в музей и галерею',
        venueId: 'venue_1',
        validityMode: 'OPEN_DATE',
      },
      offers: [
        { title: 'Льготный', priceRub: 300, active: true },
        { title: 'Взрослый', priceRub: 650, active: true },
      ],
    },
    adminComment: null,
    submittedAt: new Date('2026-08-02T13:00:00.000Z'),
    reviewedAt: new Date('2026-08-02T14:00:00.000Z'),
    appliedAt: null,
    createdAt: new Date('2026-08-02T13:00:00.000Z'),
    updatedAt: new Date('2026-08-02T14:00:00.000Z'),
    event: null,
    supplier: { id: 'sup_1', title: 'Музей', slug: 'museum', status: 'ACTIVE' },
    createdBy: null,
    reviewedBy: null,
  } as any, {
    id: 'adm_1',
    slug: 'museum-ticket',
    title: 'Билет в музей',
    shortTitle: null,
    description: null,
    shortDescription: null,
    type: 'MUSEUM_ENTRY',
    status: 'PUBLISHED',
    imageUrl: null,
    priceFromRub: 500,
    ticketsVacant: 50,
    validityMode: 'OPEN_DATE',
    validFrom: null,
    validTo: null,
    validDaysAfterPurchase: null,
    venueId: 'venue_1',
    cityId: 'city_1',
    updatedAt: productUpdatedAt,
    venue: { id: 'venue_1', title: 'Тестовый музей' },
    city: { id: 'city_1', title: 'Москва' },
    offers: [{
      id: 'offer_1',
      title: 'Взрослый',
      priceRub: 500,
      oldPriceRub: null,
      capacityTotal: 50,
      groupSize: 1,
      active: true,
    }],
  } as any);

  assert.equal(detail.subject, 'ADMISSION_PRODUCT');
  assert.equal(detail.subjectId, 'adm_1');
  assert.equal(detail.admissionProduct?.title, 'Билет в музей');
  assert.equal(detail.diff.items.find((item) => item.path === 'admissionProduct.title')?.currentValue, 'Билет в музей');
  assert.equal(detail.diff.items.find((item) => item.path === 'admissionProduct.title')?.proposedValue, 'Билет в музей и галерею');
  assert.equal(detail.diff.items.find((item) => item.path === 'offers.count')?.currentValue, 1);
  assert.equal(detail.diff.items.find((item) => item.path === 'offers.count')?.proposedValue, 2);
  assert.equal(detail.diff.items.find((item) => item.path === 'offers.priceFromRub')?.proposedValue, 300);
  assert.deepEqual(detail.diff.warnings, []);
  assert.equal(detail.actions.canApply, true);
});

test('blocks stale admission product request in admin detail', () => {
  const detail = mapEventChangeRequestDetailRow({
    id: 'cr_adm_stale',
    eventId: null,
    supplierId: 'sup_1',
    type: 'UPDATE',
    status: 'APPROVED',
    title: 'Обновить входной билет',
    summary: null,
    payload: {
      subject: 'ADMISSION_PRODUCT',
      admissionProductId: 'adm_1',
      baseSnapshot: { admissionProductUpdatedAt: '2026-08-01T12:00:00.000Z' },
      admissionProduct: { title: 'Старая правка' },
      offers: [],
    },
    adminComment: null,
    submittedAt: null,
    reviewedAt: null,
    appliedAt: null,
    createdAt: new Date('2026-08-02T13:00:00.000Z'),
    updatedAt: new Date('2026-08-02T14:00:00.000Z'),
    event: null,
    supplier: null,
    createdBy: null,
    reviewedBy: null,
  } as any, {
    id: 'adm_1',
    slug: 'museum-ticket',
    title: 'Билет в музей',
    type: 'MUSEUM_ENTRY',
    status: 'PUBLISHED',
    priceFromRub: 500,
    ticketsVacant: 50,
    validityMode: 'OPEN_DATE',
    validFrom: null,
    validTo: null,
    validDaysAfterPurchase: null,
    venueId: 'venue_1',
    cityId: 'city_1',
    updatedAt: new Date('2026-08-02T12:00:00.000Z'),
    venue: { id: 'venue_1', title: 'Тестовый музей' },
    city: null,
    offers: [],
  } as any);

  assert.equal(detail.actions.canApply, false);
  assert.match(detail.diff.warnings[0] || '', /изменился после создания заявки/i);
});

test('builds detail diff from current override and proposed payload', () => {
  const detail = mapEventChangeRequestDetailRow({
    id: 'cr_1',
    eventId: 'evt_1',
    supplierId: 'sup_1',
    type: 'CONTENT_UPDATE',
    status: 'SUBMITTED',
    title: 'Update title',
    summary: 'Supplier changed title',
    payload: {
      baseSnapshot: { eventUpdatedAt: '2026-08-01T12:00:00.000Z' },
      title: 'New title',
      ageLimit: '12+',
    },
    adminComment: null,
    submittedAt: new Date('2026-08-01T10:00:00.000Z'),
    reviewedAt: null,
    appliedAt: null,
    createdAt: new Date('2026-08-01T09:00:00.000Z'),
    updatedAt: new Date('2026-08-01T10:00:00.000Z'),
    event: {
      id: 'evt_1',
      title: 'Source title',
      slug: 'source-title',
      description: 'Source description',
      kind: 'SINGLE',
      status: 'REVIEW',
      managementMode: 'SUPPLIER_DRAFTS',
      scheduleLocked: false,
      ageLimit: null,
      imageUrl: null,
      seoH1: null,
      seoTitle: null,
      seoDescription: null,
      canonicalPath: null,
      isIndexable: true,
      priceFromRub: 1000,
      defaultCapacityTotal: null,
      openDateValidFrom: null,
      openDateValidTo: null,
      openDateValidDays: null,
      salesStartsAt: null,
      salesEndsAt: null,
      updatedAt: new Date('2026-08-01T12:00:00.000Z'),
      override: {
        title: 'Current override title',
        description: null,
        shortDescription: null,
        imageUrl: null,
        seoH1: null,
        seoTitle: null,
        seoDescription: null,
        canonicalPath: null,
        isIndexable: null,
      },
      sessions: [],
      offers: [],
    },
    supplier: {
      id: 'sup_1',
      title: 'Museum',
      slug: 'museum',
      status: 'ACTIVE',
    },
    createdBy: null,
    reviewedBy: null,
  } as any);

  assert.deepEqual(detail.payloadPreview.baseSnapshot, {
    eventUpdatedAt: '2026-08-01T12:00:00.000Z',
  });
  assert.equal(detail.diff.items.find((item) => item.path === 'content.title')?.currentValue, 'Current override title');
  assert.equal(detail.diff.items.find((item) => item.path === 'content.title')?.proposedValue, 'New title');
  assert.equal(detail.diff.items.find((item) => item.path === 'content.ageLimit')?.changeType, 'added');
  assert.deepEqual(detail.diff.warnings, []);
});
