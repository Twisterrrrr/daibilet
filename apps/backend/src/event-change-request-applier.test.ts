import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyApprovedEventChangeRequest,
  EventChangeRequestApplyError,
  type EventChangeRequestApplierClient,
  type EventChangeRequestRecord,
  type EventChangeRequestTransaction,
} from './event-change-request-applier.js';

const eventUpdatedAt = new Date('2026-08-01T12:00:00.000Z');

test('applies content changes into event override and audit log', async () => {
  const { client, calls } = createMockClient({
    id: 'cr_1',
    eventId: 'evt_1',
    supplierId: 'sup_1',
    type: 'CONTENT_UPDATE',
    status: 'APPROVED',
    payload: {
      baseSnapshot: { eventUpdatedAt: eventUpdatedAt.toISOString() },
      title: 'Updated title',
      shortDescription: 'Short text',
      ageLimit: '12+',
    },
    event: {
      id: 'evt_1',
      updatedAt: eventUpdatedAt,
      managementMode: 'DAIBILET_MANAGED',
      scheduleLocked: false,
    },
  });

  const result = await applyApprovedEventChangeRequest({ requestId: 'cr_1' }, client);

  assert.equal(result.status, 'APPLIED');
  assert.equal(result.logAction, 'UPDATED');
  assert.deepEqual(calls.eventOverrideUpserts[0], {
    where: { eventId: 'evt_1' },
    create: { eventId: 'evt_1', title: 'Updated title', shortDescription: 'Short text' },
    update: { title: 'Updated title', shortDescription: 'Short text' },
  });
  assert.deepEqual(calls.eventUpdates[0], {
    where: { id: 'evt_1' },
    data: { ageLimit: '12+' },
  });
  assert.equal(calls.requestUpdates[0]?.data.status, 'APPLIED');
  assert.equal(calls.logs[0]?.data.action, 'UPDATED');
});

test('rejects stale existing-event payloads before writing', async () => {
  const { client, calls } = createMockClient({
    id: 'cr_1',
    eventId: 'evt_1',
    supplierId: null,
    type: 'SEO_UPDATE',
    status: 'APPROVED',
    payload: {
      baseSnapshot: { eventUpdatedAt: '2026-08-01T11:59:00.000Z' },
      seoTitle: 'Old snapshot',
    },
    event: {
      id: 'evt_1',
      updatedAt: eventUpdatedAt,
      managementMode: 'DAIBILET_MANAGED',
      scheduleLocked: false,
    },
  });

  await assert.rejects(
    () => applyApprovedEventChangeRequest({ requestId: 'cr_1' }, client),
    (error) => error instanceof EventChangeRequestApplyError
      && error.code === 'EVENT_CHANGE_REQUEST_STALE'
      && error.statusCode === 409,
  );
  assert.equal(calls.eventUpdates.length, 0);
  assert.equal(calls.eventOverrideUpserts.length, 0);
  assert.equal(calls.requestUpdates.length, 0);
});

test('replaces fixed schedule sessions in one transaction', async () => {
  const { client, calls } = createMockClient({
    id: 'cr_1',
    eventId: 'evt_1',
    supplierId: 'sup_1',
    type: 'SCHEDULE_UPDATE',
    status: 'APPROVED',
    payload: {
      baseSnapshot: { eventUpdatedAt: eventUpdatedAt.toISOString() },
      mode: 'SINGLE',
      defaultCapacityTotal: 20,
      sessions: [{
        startsAt: '2026-09-01T15:00:00.000+03:00',
        endsAt: '2026-09-01T17:00:00.000+03:00',
      }],
    },
    event: {
      id: 'evt_1',
      updatedAt: eventUpdatedAt,
      managementMode: 'DAIBILET_MANAGED',
      scheduleLocked: false,
    },
  });

  const result = await applyApprovedEventChangeRequest({ requestId: 'cr_1' }, client);

  assert.equal(result.logAction, 'SCHEDULE_CHANGED');
  assert.equal(calls.sessionDeletes[0]?.where.eventId, 'evt_1');
  assert.equal(calls.sessionCreates[0]?.data.length, 1);
  assert.equal(calls.sessionCreates[0]?.data[0].capacityTotal, 20);
  assert.equal(calls.eventUpdates[0]?.data.kind, 'SINGLE');
  assert.equal(calls.eventUpdates[0]?.data.openDateValidFrom, null);
});

test('archives active offers on replace-all and creates manual offers', async () => {
  const { client, calls } = createMockClient({
    id: 'cr_1',
    eventId: 'evt_1',
    supplierId: 'sup_1',
    type: 'OFFER_UPDATE',
    status: 'APPROVED',
    payload: {
      baseSnapshot: { eventUpdatedAt: eventUpdatedAt.toISOString() },
      mode: 'REPLACE_ALL',
      offers: [
        { title: 'Adult', priceRub: 1200, oldPriceRub: 1500 },
        { title: 'Child', priceRub: 800 },
      ],
    },
    event: {
      id: 'evt_1',
      updatedAt: eventUpdatedAt,
      managementMode: 'DAIBILET_MANAGED',
      scheduleLocked: false,
    },
  });

  const result = await applyApprovedEventChangeRequest({ requestId: 'cr_1' }, client);

  assert.equal(result.logAction, 'OFFER_CHANGED');
  assert.deepEqual(calls.offerUpdateMany[0], {
    where: { eventId: 'evt_1', active: true },
    data: { active: false },
  });
  assert.equal(calls.offerCreates.length, 2);
  assert.equal(calls.offerCreates[0]?.data.sourceCode, 'MANUAL');
  assert.equal(calls.eventUpdates.at(-1)?.data.priceFromRub, 800);
});

test('blocks source-managed schedule apply through state rules', async () => {
  const { client } = createMockClient({
    id: 'cr_1',
    eventId: 'evt_1',
    supplierId: null,
    type: 'SCHEDULE_UPDATE',
    status: 'APPROVED',
    payload: {
      baseSnapshot: { eventUpdatedAt: eventUpdatedAt.toISOString() },
      mode: 'OPEN_DATE',
      openDate: { validDays: 30 },
    },
    event: {
      id: 'evt_1',
      updatedAt: eventUpdatedAt,
      managementMode: 'SOURCE_MANAGED',
      scheduleLocked: true,
    },
  });

  await assert.rejects(
    () => applyApprovedEventChangeRequest({ requestId: 'cr_1' }, client),
    /schedule is locked/i,
  );
});

function createMockClient(request: EventChangeRequestRecord): {
  client: EventChangeRequestApplierClient;
  calls: MockCalls;
} {
  const calls: MockCalls = {
    eventUpdates: [],
    eventOverrideUpserts: [],
    sessionDeletes: [],
    sessionCreates: [],
    offerUpdateMany: [],
    offerCreates: [],
    requestUpdates: [],
    logs: [],
  };
  const tx: EventChangeRequestTransaction = {
    eventChangeRequest: {
      async findUnique() {
        return request;
      },
      async update(args: unknown) {
        calls.requestUpdates.push(args as MockCall);
        const data = (args as { data?: Record<string, unknown> }).data ?? {};
        return { ...request, ...data };
      },
    },
    event: {
      async update(args: unknown) {
        calls.eventUpdates.push(args as MockCall);
        return {};
      },
    },
    eventOverride: {
      async upsert(args: unknown) {
        calls.eventOverrideUpserts.push(args as MockCall);
        return {};
      },
    },
    eventSession: {
      async deleteMany(args: unknown) {
        calls.sessionDeletes.push(args as MockCall);
        return { count: 1 };
      },
      async createMany(args: unknown) {
        calls.sessionCreates.push(args as MockCall);
        return { count: ((args as { data?: unknown[] }).data || []).length };
      },
    },
    eventOffer: {
      async updateMany(args: unknown) {
        calls.offerUpdateMany.push(args as MockCall);
        return { count: 1 };
      },
      async create(args: unknown) {
        calls.offerCreates.push(args as MockCall);
        return {};
      },
    },
    eventChangeLog: {
      async create(args: unknown) {
        calls.logs.push(args as MockCall);
        return {};
      },
    },
  };

  return {
    calls,
    client: {
      async $transaction<T>(fn: (transaction: EventChangeRequestTransaction) => Promise<T>) {
        return fn(tx);
      },
    },
  };
}

interface MockCalls {
  eventUpdates: MockCall[];
  eventOverrideUpserts: MockCall[];
  sessionDeletes: MockCall[];
  sessionCreates: MockCall[];
  offerUpdateMany: MockCall[];
  offerCreates: MockCall[];
  requestUpdates: MockCall[];
  logs: MockCall[];
}

type MockCall = Record<string, any>;
