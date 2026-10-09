import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EventChangeRequestReviewError,
  reviewEventChangeRequest,
  type EventChangeRequestReviewClient,
  type EventChangeRequestReviewRecord,
  type EventChangeRequestReviewTransaction,
} from './event-change-request-review.js';

test('approves submitted request and writes audit log', async () => {
  const { client, calls } = createMockClient({
    id: 'cr_1',
    eventId: 'evt_1',
    supplierId: 'sup_1',
    type: 'CONTENT_UPDATE',
    status: 'SUBMITTED',
    event: {
      id: 'evt_1',
      managementMode: 'SUPPLIER_DRAFTS',
      scheduleLocked: false,
    },
  });

  const result = await reviewEventChangeRequest({
    requestId: 'cr_1',
    action: 'approve',
    adminComment: 'Ok',
  }, client);

  assert.equal(result.status, 'APPROVED');
  assert.equal(result.logAction, 'APPROVED');
  assert.equal(calls.requestUpdates[0]?.data.status, 'APPROVED');
  assert.equal(calls.requestUpdates[0]?.data.adminComment, 'Ok');
  assert.equal(calls.logs[0]?.data.action, 'APPROVED');
  assert.equal(calls.logs[0]?.data.diff.requestId, 'cr_1');
});

test('reject requires admin comment', async () => {
  const { client } = createMockClient({
    id: 'cr_1',
    eventId: 'evt_1',
    supplierId: null,
    type: 'CONTENT_UPDATE',
    status: 'SUBMITTED',
    event: {
      id: 'evt_1',
      managementMode: 'DAIBILET_MANAGED',
      scheduleLocked: false,
    },
  });

  await assert.rejects(
    () => reviewEventChangeRequest({ requestId: 'cr_1', action: 'reject' }, client),
    (error) => error instanceof EventChangeRequestReviewError
      && error.code === 'EVENT_CHANGE_REJECT_REASON_REQUIRED',
  );
});

test('rejects invalid review transition as conflict', async () => {
  const { client } = createMockClient({
    id: 'cr_1',
    eventId: 'evt_1',
    supplierId: null,
    type: 'CONTENT_UPDATE',
    status: 'APPLIED',
    event: {
      id: 'evt_1',
      managementMode: 'DAIBILET_MANAGED',
      scheduleLocked: false,
    },
  });

  await assert.rejects(
    () => reviewEventChangeRequest({ requestId: 'cr_1', action: 'approve' }, client),
    (error) => error instanceof EventChangeRequestReviewError
      && error.code === 'INVALID_TRANSITION'
      && error.statusCode === 409,
  );
});

test('approves create request without event log when event does not exist yet', async () => {
  const { client, calls } = createMockClient({
    id: 'cr_1',
    eventId: null,
    supplierId: 'sup_1',
    type: 'CREATE',
    status: 'SUBMITTED',
    event: null,
  });

  const result = await reviewEventChangeRequest({ requestId: 'cr_1', action: 'approve' }, client);

  assert.equal(result.status, 'APPROVED');
  assert.equal(calls.logs.length, 0);
});

function createMockClient(request: EventChangeRequestReviewRecord): {
  client: EventChangeRequestReviewClient;
  calls: MockCalls;
} {
  const calls: MockCalls = {
    requestUpdates: [],
    logs: [],
  };
  const tx: EventChangeRequestReviewTransaction = {
    eventChangeRequest: {
      async findUnique() {
        return request;
      },
      async update(args: unknown) {
        calls.requestUpdates.push(args as MockCall);
        const data = (args as { data?: Record<string, unknown> }).data ?? {};
        return { ...request, ...data } as EventChangeRequestReviewRecord;
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
      async $transaction<T>(fn: (transaction: EventChangeRequestReviewTransaction) => Promise<T>) {
        return fn(tx);
      },
    },
  };
}

interface MockCalls {
  requestUpdates: MockCall[];
  logs: MockCall[];
}

type MockCall = Record<string, any>;
