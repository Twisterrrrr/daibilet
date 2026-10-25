import assert from 'node:assert/strict';
import test from 'node:test';
import { maskAdminOrderBuyer, projectInternalAdminOrder } from './admin-order-pii.ts';

test('server-side order buyer masking retains only initials and limited contact fragments', () => {
  const masked = maskAdminOrderBuyer({ name: 'Анна Константинова', email: 'anna.k@example.com', phone: '+7 999 123-45-67' });
  assert.deepEqual(masked, { name: 'А. К.', email: 'an****@example.com', phone: '+7 ****** 4567' });
});

test('invalid or missing buyer PII does not become a literal value', () => {
  assert.deepEqual(maskAdminOrderBuyer({ name: null, email: 'bad-email', phone: '123' }), {
    name: null, email: null, phone: null,
  });
});

test('internal order finance data is omitted unless the staff member has finance.read', () => {
  const raw = {
    id: 'order-1',
    publicCode: '1234567',
    status: 'CONFIRMED',
    displayStatus: 'Оплачен',
    sourceKind: 'internal',
    amountRub: 350,
    buyer: { name: 'Анна Константинова', email: 'anna@example.com', phone: '+7 999 123-45-67' },
    finance: { payments: [{ status: 'SUCCEEDED', amountKopecks: 35000 }], refunds: [] },
    internalDebug: 'must not escape',
  };

  const projected = projectInternalAdminOrder(raw, { canReadPii: true, canReadFinance: false, canCancel: true, canExecuteRefund: false });
  assert.equal(projected.finance, null);
  assert.equal(projected.amountRub, null);
  assert.equal('internalDebug' in projected, false);
  assert.equal(projected.buyer.email, 'anna@example.com');
});

test('finance.read and orders.pii.read are independent for internal order details', () => {
  const raw = {
    id: 'order-1',
    publicCode: '1234567',
    status: 'CONFIRMED',
    displayStatus: 'Оплачен',
    sourceKind: 'internal',
    buyer: { name: 'Анна Константинова', email: 'anna@example.com', phone: '+7 999 123-45-67' },
    finance: { payments: [{ status: 'SUCCEEDED', amountKopecks: 35000 }], refunds: [] },
  };

  const financeOnly = projectInternalAdminOrder(raw, { canReadPii: false, canReadFinance: true, canCancel: false, canExecuteRefund: true });
  assert.equal(financeOnly.buyer.email, 'an**@example.com');
  assert.deepEqual(financeOnly.finance, raw.finance);

  const neither = projectInternalAdminOrder(raw, { canReadPii: false, canReadFinance: false, canCancel: false, canExecuteRefund: false });
  assert.equal(neither.buyer.phone, '+7 ****** 4567');
  assert.equal(neither.finance, null);
  assert.equal(neither.amountRub, null);
});
