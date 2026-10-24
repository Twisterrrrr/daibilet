import assert from 'node:assert/strict';
import test from 'node:test';
import { getAdminOrderDeleteGuard } from './admin-order-delete-guard.js';

test('hard delete of an admin order is explicitly blocked', () => {
  assert.deepEqual(getAdminOrderDeleteGuard('DELETE', '/api/admin/orders/ORD-123'), {
    statusCode: 403,
    body: {
      error: 'order_delete_disabled',
      message: 'Удаление заказов отключено. Историю заказа нужно сохранять.',
    },
  });
});

test('the delete guard does not intercept reads, other methods, or nested resources', () => {
  assert.equal(getAdminOrderDeleteGuard('GET', '/api/admin/orders/ORD-123'), null);
  assert.equal(getAdminOrderDeleteGuard('POST', '/api/admin/orders/ORD-123'), null);
  assert.equal(getAdminOrderDeleteGuard('DELETE', '/api/admin/orders/ORD-123/tickets'), null);
  assert.equal(getAdminOrderDeleteGuard('DELETE', '/api/admin/events/ORD-123'), null);
});
