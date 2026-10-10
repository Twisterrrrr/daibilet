import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildProviderWidgetUrl,
  purchaseInfo,
  sanitizeTicketscloudPurchaseUrl,
} from './provider-purchase.js';

const originalToken = process.env.TICKETSCLOUD_WIDGET_TOKEN;
const originalBase = process.env.TICKETSCLOUD_WIDGET_BASE_URL;

test.before(() => {
  process.env.TICKETSCLOUD_WIDGET_TOKEN = 'r:test-jwt-token';
  delete process.env.TICKETSCLOUD_WIDGET_BASE_URL;
});

test.after(() => {
  if (originalToken == null) delete process.env.TICKETSCLOUD_WIDGET_TOKEN;
  else process.env.TICKETSCLOUD_WIDGET_TOKEN = originalToken;
  if (originalBase == null) delete process.env.TICKETSCLOUD_WIDGET_BASE_URL;
  else process.env.TICKETSCLOUD_WIDGET_BASE_URL = originalBase;
});

test('TC widget URL uses bare JWT without r: prefix', () => {
  const url = buildProviderWidgetUrl({
    sourceCode: 'TICKETSCLOUD',
    externalId: 'abc123',
  });
  assert.ok(url);
  const parsed = new URL(url!);
  assert.equal(parsed.searchParams.get('token'), 'test-jwt-token');
  assert.equal(parsed.searchParams.get('event'), 'abc123');
  assert.equal(parsed.hostname, 'ticketscloud.com');
});

test('sanitizeTicketscloudPurchaseUrl strips r: and rewrites .org', () => {
  const cleaned = sanitizeTicketscloudPurchaseUrl(
    'https://ticketscloud.org/v1/widgets/common?token=r%3AeyJ.test&event=evt1',
  );
  assert.ok(cleaned);
  const parsed = new URL(cleaned!);
  assert.equal(parsed.hostname, 'ticketscloud.com');
  assert.equal(parsed.searchParams.get('token'), 'eyJ.test');
  assert.equal(parsed.searchParams.get('event'), 'evt1');
});

test('purchaseInfo sanitizes stored offer widgetUrl with r: token', () => {
  const info = purchaseInfo({
    sourceCode: 'TICKETSCLOUD',
    offerWidgetUrl:
      'https://ticketscloud.org/v1/widgets/common?token=r:stored-jwt&event=evt9',
    externalId: 'evt9',
  });
  assert.ok(info.url);
  const parsed = new URL(info.url!);
  assert.equal(parsed.searchParams.get('token'), 'stored-jwt');
  assert.equal(parsed.hostname, 'ticketscloud.com');
});
