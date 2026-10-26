import assert from 'node:assert/strict';
import test from 'node:test';
import { changeUserPassword, requestBuyerRefund } from './user-api';

test('password change sends the authenticated token and password fields', async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; method: string; authorization: string | null; body: unknown }> = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({
      url: String(input),
      method: String(init?.method || 'GET'),
      authorization: new Headers(init?.headers).get('authorization'),
      body: JSON.parse(String(init?.body || '{}')),
    });
    return new Response(JSON.stringify({ changed: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;

  try {
    assert.deepEqual(await changeUserPassword('access-token', 'old-password', 'new-password'), { changed: true });
    assert.deepEqual(calls, [{
      url: '/api/user/auth/change-password',
      method: 'POST',
      authorization: 'Bearer access-token',
      body: { currentPassword: 'old-password', newPassword: 'new-password' },
    }]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('buyer refund request sends the authenticated token, public order code and explanation', async () => {
  const originalFetch = globalThis.fetch;
  let call: { url: string; method: string; authorization: string | null; body: unknown } | null = null;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    call = {
      url: String(input),
      method: String(init?.method || 'GET'),
      authorization: new Headers(init?.headers).get('authorization'),
      body: JSON.parse(String(init?.body || '{}')),
    };
    return new Response(JSON.stringify({ requestId: 'refund-1', status: 'CREATED', amountKopecks: 35000, currency: 'RUB', createdAt: '2026-10-26T10:00:00.000Z' }), {
      status: 201,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;

  try {
    assert.deepEqual(await requestBuyerRefund('access-token', 'DB26-784501', 'Не смогу посетить событие'), {
      requestId: 'refund-1', status: 'CREATED', amountKopecks: 35000, currency: 'RUB', createdAt: '2026-10-26T10:00:00.000Z',
    });
    assert.deepEqual(call, {
      url: '/api/account/purchases/DB26-784501/refunds',
      method: 'POST',
      authorization: 'Bearer access-token',
      body: { reasonNote: 'Не смогу посетить событие' },
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
