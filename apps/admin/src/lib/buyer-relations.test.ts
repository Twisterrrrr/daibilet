import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BUYER_APPEALS_PENDING_NOTE,
  buyerOrdersHref,
  buyerRefundsHref,
  buyerRelationLinks,
  buyerRelationLookup,
} from './buyer-relations.ts';

test('поисковый ключ берётся из данных сервера по приоритету и не выдумывается', () => {
  assert.equal(
    buyerRelationLookup({ email: 'a@b.c', phone: '+71', lastOrderNumber: 'DB-1', lookup: 'x' }),
    'a@b.c',
  );
  assert.equal(buyerRelationLookup({ phone: ' +71 ', lastOrderNumber: 'DB-1' }), '+71');
  assert.equal(buyerRelationLookup({ lastOrderNumber: 'DB-1', lookup: 'x' }), 'DB-1');
  assert.equal(buyerRelationLookup({ lookup: 'x' }), 'x');
  assert.equal(buyerRelationLookup({}), '');
});

test('переходы к заказам и возвратам сохраняют поисковый ключ', () => {
  const source = { email: 'buyer+test@example.com' };
  assert.equal(buyerOrdersHref(source), '/orders?q=buyer%2Btest%40example.com');
  assert.equal(buyerOrdersHref(source, 'archive'), '/orders?q=buyer%2Btest%40example.com&view=archive');
  assert.equal(buyerRefundsHref(source), '/orders?q=buyer%2Btest%40example.com&view=pending_refunds');
});

test('без поискового ключа ссылки не содержат пустого q', () => {
  assert.equal(buyerOrdersHref({}), '/orders');
  assert.equal(buyerOrdersHref({}, 'archive'), '/orders?view=archive');
  assert.equal(buyerRefundsHref({}), '/orders?view=pending_refunds');
});

test('обращения без серверной связи не получают выдуманный адрес', () => {
  const links = buyerRelationLinks({ email: 'a@b.c' });
  assert.deepEqual(
    links.map((link) => [link.id, link.href]),
    [
      ['orders', '/orders?q=a%40b.c'],
      ['refunds', '/orders?q=a%40b.c&view=pending_refunds'],
      ['appeals', null],
    ],
  );
  const appeals = links.find((link) => link.id === 'appeals');
  assert.equal(appeals?.note, BUYER_APPEALS_PENDING_NOTE);
});
