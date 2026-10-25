import test from 'node:test';
import assert from 'node:assert/strict';
import { supplierOrderBuyerFields, supplierOrderCanSeeTicketNumbers } from './supplier-order-pii.js';

test('supplier order contacts are masked for operational roles and absent for viewers', () => {
  const buyer = { name: 'Анна Каренина', email: 'anna@example.com', phone: '+7 999 123-45-67' };
  assert.deepEqual(supplierOrderBuyerFields(buyer, 'OWNER'), {
    buyerPiiLevel: 'masked',
    buyerName: 'А. К.',
    buyerEmail: 'an***@example.com',
    buyerPhone: '***-**-67',
  });
  for (const role of ['VIEWER', 'UNKNOWN', null]) {
    assert.deepEqual(supplierOrderBuyerFields(buyer, role), {
      buyerPiiLevel: 'omitted',
      buyerName: null,
      buyerEmail: null,
      buyerPhone: null,
    });
  }
  assert.equal(supplierOrderCanSeeTicketNumbers('OWNER'), true);
  assert.equal(supplierOrderCanSeeTicketNumbers('ACCOUNTANT'), false);
  assert.equal(supplierOrderCanSeeTicketNumbers('VIEWER'), false);
});
