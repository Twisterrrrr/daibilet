import assert from 'node:assert/strict';
import test from 'node:test';
import { maskAdminOrderBuyer } from './admin-order-pii.ts';

test('server-side order buyer masking retains only initials and limited contact fragments', () => {
  const masked = maskAdminOrderBuyer({ name: 'Анна Константинова', email: 'anna.k@example.com', phone: '+7 999 123-45-67' });
  assert.deepEqual(masked, { name: 'А. К.', email: 'an****@example.com', phone: '+7 ****** 4567' });
});

test('invalid or missing buyer PII does not become a literal value', () => {
  assert.deepEqual(maskAdminOrderBuyer({ name: null, email: 'bad-email', phone: '123' }), {
    name: null, email: null, phone: null,
  });
});
