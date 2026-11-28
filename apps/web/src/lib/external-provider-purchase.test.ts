import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildTeplohodPurchaseUrl,
  extractTeplohodEventId,
  isSafeExternalPurchaseUrl,
  isTrustedProviderPurchaseUrl,
  isTrustedTeplohodPurchaseUrl,
  normalizeTeplohodEventId,
  normalizeTicketscloudPurchaseUrl,
} from './external-provider-purchase.ts';

test('Ticketscloud purchase URL normalization only accepts HTTPS vendor hosts', () => {
  assert.equal(
    normalizeTicketscloudPurchaseUrl('https://ticketscloud.org/v1/widgets/common?token=r%3Ajwt&event=abc'),
    'https://ticketscloud.com/v1/widgets/common?token=jwt&event=abc',
  );
  assert.equal(normalizeTicketscloudPurchaseUrl('https://ticketscloud.com.evil.example/pay'), null);
  assert.equal(normalizeTicketscloudPurchaseUrl('http://ticketscloud.com/pay'), null);
  assert.equal(normalizeTicketscloudPurchaseUrl('/checkout/order/123'), null);
  assert.equal(normalizeTicketscloudPurchaseUrl('https://daibilet.ru/checkout/order/123'), null);
});

test('Teplohod links and event IDs must be attributable to the provider', () => {
  assert.equal(normalizeTeplohodEventId('tep-12345'), '12345');
  assert.equal(normalizeTeplohodEventId('12345x'), null);
  assert.equal(extractTeplohodEventId('https://account.teplohod.info/order/event-order?event_id=12345'), '12345');
  assert.equal(extractTeplohodEventId('https://teplohod.info.evil.example/event/12345'), null);
  assert.equal(buildTeplohodPurchaseUrl({ eventId: '12345', widgetId: '14460' }),
    'https://account.teplohod.info/order/event-order?widget_id=14460&event_id=12345');
  assert.equal(buildTeplohodPurchaseUrl({ eventId: '/checkout/123' }), null);
});

test('generic fallback URLs never send a buyer to Daibilet checkout', () => {
  assert.equal(isSafeExternalPurchaseUrl('https://organizer.example/tickets'), true);
  assert.equal(isSafeExternalPurchaseUrl('https://daibilet.ru/checkout/admissions/event'), false);
  assert.equal(isSafeExternalPurchaseUrl('/checkout/admissions/event'), false);
  assert.equal(isTrustedProviderPurchaseUrl('https://account.teplohod.info/order/event-order?event_id=1'), true);
  assert.equal(isTrustedProviderPurchaseUrl('https://checkout.daibilet.ru/checkout/123'), false);
  assert.equal(isTrustedTeplohodPurchaseUrl('https://account.teplohod.info/path'), true);
});
