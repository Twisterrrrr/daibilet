import assert from 'node:assert/strict';
import test from 'node:test';
import { maskAdminOrderPii, projectAdminOrdersPii } from './admin-order-pii.js';

test('masked order DTO removes raw snapshots and masks all contact fields server-side', () => {
  const projected = maskAdminOrderPii({
    id: 'order-1',
    buyer: { name: 'Анна Константинова', email: 'anna.k@example.com', phone: '+7 999 123-45-67', notes: 'call me' },
    buyerSnapshot: { customer: { name: 'Анна Константинова', email: 'anna.k@example.com' }, sourcePayload: { phone: '79991234567' } },
  });
  assert.deepEqual(projected.buyer, {
    name: 'А. К.', email: 'an****@example.com', phone: '+7 ****** 4567',
  });
  assert.equal(projected.buyerSnapshot, null);
  assert.equal(projected.piiLevel, 'masked');
  assert.equal(JSON.stringify(projected).includes('anna.k@example.com'), false);
  assert.equal(JSON.stringify(projected).includes('Анна Константинова'), false);
  assert.equal(JSON.stringify(projected).includes('call me'), false);
});

test('unmasked permission preserves the original DTO while unauthorized list projection masks rows and items', () => {
  const payload = { rows: [{ buyer: { name: 'Иван Петров', email: 'ivan@example.com' } }], items: [{ buyerPhone: '79991234567' }] };
  assert.equal(projectAdminOrdersPii(payload, true), payload);
  const masked = projectAdminOrdersPii(payload, false);
  assert.equal(masked.rows[0].buyer.name, 'И. П.');
  assert.equal(masked.items[0].buyerPhone, '+7 ****** 4567');
  assert.equal(JSON.stringify(masked).includes('ivan@example.com'), false);
});
