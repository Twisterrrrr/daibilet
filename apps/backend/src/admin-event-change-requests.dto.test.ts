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
