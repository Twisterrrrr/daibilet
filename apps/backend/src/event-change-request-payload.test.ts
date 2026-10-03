import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertEventChangeRequestPayload,
  EventChangeRequestPayloadValidationError,
  validateEventChangeRequestPayload,
} from './event-change-request-payload.js';

test('accepts and normalizes a content update payload', () => {
  const result = validateEventChangeRequestPayload('CONTENT_UPDATE', {
    baseSnapshot: { eventUpdatedAt: '2026-07-10T10:00:00.000Z' },
    title: '  Новая экскурсия  ',
    shortDescription: '  Короткое описание  ',
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal((result.payload as { title: string }).title, 'Новая экскурсия');
  assert.equal((result.payload as { shortDescription: string }).shortDescription, 'Короткое описание');
});

test('rejects empty content updates', () => {
  const result = validateEventChangeRequestPayload('CONTENT_UPDATE', {
    baseSnapshot: { eventUpdatedAt: '2026-07-10T10:00:00.000Z' },
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'PAYLOAD_INVALID');
  assert.ok(result.issues.some((issue) => issue.message.includes('At least one')));
});

test('rejects unknown payload fields', () => {
  const result = validateEventChangeRequestPayload('SEO_UPDATE', {
    seoTitle: 'Title',
    sourceId: 'technical-leak',
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.ok(result.issues.some((issue) => issue.message.includes('sourceId')));
});

test('rejects schedule and offers inside generic update payload', () => {
  const result = validateEventChangeRequestPayload('UPDATE', {
    content: { title: 'Allowed content patch' },
    schedule: { mode: 'OPEN_DATE', openDate: { validDays: 30 } },
    offers: [{ title: 'Adult', priceRub: 1000 }],
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.ok(result.issues.some((issue) => issue.message.includes('schedule')));
  assert.ok(result.issues.some((issue) => issue.message.includes('offers')));
});

test('rejects open-date schedule mixed with fixed sessions', () => {
  const result = validateEventChangeRequestPayload('SCHEDULE_UPDATE', {
    mode: 'OPEN_DATE',
    openDate: { validDays: 30 },
    sessions: [{ startsAt: '2026-08-01T12:00:00.000Z' }],
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.ok(result.issues.some((issue) => issue.message.includes('Open-date event cannot contain fixed sessions')));
});

test('requires exactly one session for single event schedule', () => {
  const result = validateEventChangeRequestPayload('SCHEDULE_UPDATE', {
    mode: 'SINGLE',
    sessions: [
      { startsAt: '2026-08-01T12:00:00.000Z' },
      { startsAt: '2026-08-02T12:00:00.000Z' },
    ],
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.ok(result.issues.some((issue) => issue.message.includes('exactly one session')));
});

test('accepts recurring schedule with recurrence rule', () => {
  const result = validateEventChangeRequestPayload('SCHEDULE_UPDATE', {
    mode: 'RECURRING',
    timezone: 'Europe/Moscow',
    recurrenceRule: {
      frequency: 'weekly',
      interval: 1,
      byWeekday: [1, 3, 5],
      times: ['12:00', '15:00'],
      validFrom: '2026-08-01T00:00:00.000Z',
      validTo: '2026-09-01T00:00:00.000Z',
    },
  });

  assert.equal(result.ok, true);
});

test('rejects duplicate session starts', () => {
  const result = validateEventChangeRequestPayload('SCHEDULE_UPDATE', {
    mode: 'RECURRING',
    sessions: [
      { startsAt: '2026-08-01T15:00:00.000+03:00' },
      { startsAt: '2026-08-01T12:00:00.000Z' },
    ],
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.ok(result.issues.some((issue) => issue.message.includes('duplicate startsAt')));
});

test('validates ticket offer pricing shape', () => {
  const valid = validateEventChangeRequestPayload('OFFER_UPDATE', {
    mode: 'UPSERT_LIST',
    offers: [{
      title: 'Взрослый',
      priceRub: 1200,
      oldPriceRub: 1500,
      groupSize: 1,
      weekdayMask: 62,
    }],
  });

  assert.equal(valid.ok, true);

  const invalid = validateEventChangeRequestPayload('OFFER_UPDATE', {
    mode: 'UPSERT_LIST',
    offers: [{
      title: 'Детский',
      priceRub: 500,
      oldPriceRub: 400,
    }],
  });

  assert.equal(invalid.ok, false);
  if (invalid.ok) return;
  assert.ok(invalid.issues.some((issue) => issue.path.endsWith('oldPriceRub')));
});

test('requires explicit offer operation semantics and rejects duplicate offers', () => {
  const missingMode = validateEventChangeRequestPayload('OFFER_UPDATE', {
    offers: [{ title: 'Adult', priceRub: 1200 }],
  });

  assert.equal(missingMode.ok, false);
  if (missingMode.ok) return;
  assert.ok(missingMode.issues.some((issue) => issue.path === 'mode'));

  const duplicate = validateEventChangeRequestPayload('OFFER_UPDATE', {
    mode: 'REPLACE_ALL',
    offers: [
      { title: 'Adult', priceRub: 1200 },
      { title: 'adult', priceRub: 1300 },
    ],
  });

  assert.equal(duplicate.ok, false);
  if (duplicate.ok) return;
  assert.ok(duplicate.issues.some((issue) => issue.message.includes('Duplicate offer title')));
});

test('rejects schedule date-times without timezone', () => {
  const result = validateEventChangeRequestPayload('SCHEDULE_UPDATE', {
    mode: 'SINGLE',
    sessions: [{ startsAt: '2026-08-01T12:00:00' }],
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.ok(result.issues.some((issue) => issue.message.includes('timezone')));
});

test('rejects invalid IANA schedule timezone', () => {
  const result = validateEventChangeRequestPayload('SCHEDULE_UPDATE', {
    mode: 'RECURRING',
    timezone: 'Mars/Phobos',
    recurrenceRule: {
      frequency: 'weekly',
      interval: 1,
      byWeekday: [1],
      times: ['12:00'],
      count: 4,
    },
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.ok(result.issues.some((issue) => issue.path === 'timezone'));
});

test('requires reason for destructive admin requests', () => {
  const result = validateEventChangeRequestPayload('ARCHIVE', {});

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.ok(result.issues.some((issue) => issue.path === 'reason'));
});

test('accepts create payload when event kind matches schedule mode', () => {
  const result = validateEventChangeRequestPayload('CREATE', {
    event: {
      title: 'Открытый билет в музей',
      kind: 'OPEN_DATE',
      slug: 'otkrytyy-bilet-v-muzey',
      primaryCityId: 'city-spb',
    },
    schedule: {
      mode: 'OPEN_DATE',
      openDate: { validDays: 14 },
    },
    offers: [{
      title: 'Входной билет',
      priceRub: 700,
    }],
  });

  assert.equal(result.ok, true);
});

test('rejects create payload when event kind and schedule mode differ', () => {
  const result = validateEventChangeRequestPayload('CREATE', {
    event: {
      title: 'Разовое событие',
      kind: 'SINGLE',
    },
    schedule: {
      mode: 'OPEN_DATE',
      openDate: { validDays: 14 },
    },
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.ok(result.issues.some((issue) => issue.path === 'schedule.mode'));
});

test('rejects server-owned fields inside create event payload', () => {
  const result = validateEventChangeRequestPayload('CREATE', {
    event: {
      title: 'Supplier draft',
      kind: 'OPEN_DATE',
      supplierId: 'supplier-1',
      purchaseFlow: 'PLATFORM',
      managementMode: 'SUPPLIER_SELF_SERVICE',
    },
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.ok(result.issues.some((issue) => issue.message.includes('supplierId')));
  assert.ok(result.issues.some((issue) => issue.message.includes('purchaseFlow')));
  assert.ok(result.issues.some((issue) => issue.message.includes('managementMode')));
});

test('allows create draft without schedule but rejects it in apply mode', () => {
  const payload = {
    event: {
      title: 'Draft event',
      kind: 'OPEN_DATE',
      primaryCityId: 'city-spb',
    },
  };

  const draftResult = validateEventChangeRequestPayload('CREATE', payload);
  assert.equal(draftResult.ok, true);

  const applyResult = validateEventChangeRequestPayload('CREATE', payload, { mode: 'apply' });
  assert.equal(applyResult.ok, false);
  if (applyResult.ok) return;
  assert.ok(applyResult.issues.some((issue) => issue.path === 'schedule'));
});

test('requires base snapshot for existing event apply payloads', () => {
  const draftContent = validateEventChangeRequestPayload('CONTENT_UPDATE', {
    title: 'Updated title',
  });
  assert.equal(draftContent.ok, true);

  const missingContentSnapshot = validateEventChangeRequestPayload('CONTENT_UPDATE', {
    title: 'Updated title',
  }, { mode: 'apply' });
  assert.equal(missingContentSnapshot.ok, false);
  if (missingContentSnapshot.ok) return;
  assert.ok(missingContentSnapshot.issues.some((issue) => issue.path === 'baseSnapshot.eventUpdatedAt'));

  const withContentSnapshot = validateEventChangeRequestPayload('CONTENT_UPDATE', {
    baseSnapshot: { eventUpdatedAt: '2026-08-01T12:00:00.000Z' },
    title: 'Updated title',
  }, { mode: 'apply' });
  assert.equal(withContentSnapshot.ok, true);
});

test('requires base snapshot for destructive apply mode payloads', () => {
  const draftResult = validateEventChangeRequestPayload('UNPUBLISH', {
    reason: 'Temporary stop',
  });
  assert.equal(draftResult.ok, true);

  const missingSnapshot = validateEventChangeRequestPayload('UNPUBLISH', {
    reason: 'Temporary stop',
  }, { mode: 'apply' });
  assert.equal(missingSnapshot.ok, false);
  if (missingSnapshot.ok) return;
  assert.ok(missingSnapshot.issues.some((issue) => issue.path === 'baseSnapshot.eventUpdatedAt'));

  const withSnapshot = validateEventChangeRequestPayload('UNPUBLISH', {
    baseSnapshot: { eventUpdatedAt: '2026-08-01T12:00:00.000Z' },
    reason: 'Temporary stop',
  }, { mode: 'apply' });
  assert.equal(withSnapshot.ok, true);
});

test('requires generated sessions before applying recurring schedule payloads', () => {
  const payload = {
    baseSnapshot: { eventUpdatedAt: '2026-08-01T12:00:00.000Z' },
    mode: 'RECURRING',
    timezone: 'Europe/Moscow',
    recurrenceRule: {
      frequency: 'weekly',
      interval: 1,
      byWeekday: [1],
      times: ['12:00'],
      count: 4,
    },
  } as const;

  const draftResult = validateEventChangeRequestPayload('SCHEDULE_UPDATE', payload);
  assert.equal(draftResult.ok, true);

  const applyResult = validateEventChangeRequestPayload('SCHEDULE_UPDATE', payload, { mode: 'apply' });
  assert.equal(applyResult.ok, false);
  if (applyResult.ok) return;
  assert.ok(applyResult.issues.some((issue) => issue.path === 'sessions'));
});

test('requires timezone before applying recurring expansion payloads', () => {
  const result = validateEventChangeRequestPayload('SCHEDULE_UPDATE', {
    baseSnapshot: { eventUpdatedAt: '2026-08-01T12:00:00.000Z' },
    mode: 'RECURRING',
    sessions: [{ startsAt: '2026-08-03T09:00:00.000Z' }],
    recurrenceRule: {
      frequency: 'weekly',
      interval: 1,
      byWeekday: [1],
      times: ['12:00'],
      count: 1,
    },
  }, { mode: 'apply' });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.ok(result.issues.some((issue) => issue.path === 'timezone'));
});

test('assert helper throws typed validation errors', () => {
  assert.throws(
    () => assertEventChangeRequestPayload('MEDIA_UPDATE', { gallery: [] }),
    (error) => error instanceof EventChangeRequestPayloadValidationError
      && error.issues.some((issue) => issue.message.includes('At least one')),
  );
});
