import assert from 'node:assert/strict';
import test from 'node:test';
import { changeUserPassword } from './user-api';

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
