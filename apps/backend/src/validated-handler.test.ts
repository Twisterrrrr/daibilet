import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import { createValidatedHandler } from './validated-handler.ts';

test('rewrite queue remains closed to shared Basic Auth until session RBAC is enabled', async (t) => {
  const server = createServer(createValidatedHandler((_request, response) => {
    response.statusCode = 404;
    response.end();
  }, {
    adminAuth: {
      email: 'admin@example.test',
      password: 'secret',
      passwordHash: '',
      realm: 'test',
      requireAuth: true,
    },
    adminRbacEnforce: false,
  }));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const url = `http://127.0.0.1:${address.port}/api/admin/rewrite-queue`;
  const unauthenticated = await fetch(url);
  assert.equal(unauthenticated.status, 401);
  const basic = Buffer.from('admin@example.test:secret').toString('base64');
  const response = await fetch(url, { headers: { authorization: `Basic ${basic}` } });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'admin_rbac_required' });
});
