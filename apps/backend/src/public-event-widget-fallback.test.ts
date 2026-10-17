import assert from 'node:assert/strict';
import test from 'node:test';

import {
  extractTcEventIdFromPurchaseUrl,
  pickPrimarySessionPurchase,
  shouldSynthesizeWidgetOnlySession,
} from './public-event-widget-fallback.js';

/**
 * Regression: «Особо опасен» / past dated TC must not become fake open-date.
 * Synthetic widget slots are only for true OPEN_DATE schedules.
 */

test('does not synthesize widget slot for past TicketsCloud dated RECURRING', () => {
  assert.equal(
    shouldSynthesizeWidgetOnlySession({
      sessionsLength: 0,
      kind: 'RECURRING',
      sourceStatus: 'PUBLIC',
      purchaseReady: true,
    }),
    false,
  );
});

test('does not synthesize widget slot for past TicketsCloud dated SINGLE', () => {
  assert.equal(
    shouldSynthesizeWidgetOnlySession({
      sessionsLength: 0,
      kind: 'SINGLE',
      sourceStatus: null,
      purchaseReady: true,
    }),
    false,
  );
});

test('does not synthesize when purchaseReady is false even for OPEN_DATE', () => {
  assert.equal(
    shouldSynthesizeWidgetOnlySession({
      sessionsLength: 0,
      kind: 'OPEN_DATE',
      sourceStatus: 'open_date',
      purchaseReady: false,
    }),
    false,
  );
});

test('still synthesizes widget slot for OPEN_DATE without sessions', () => {
  assert.equal(
    shouldSynthesizeWidgetOnlySession({
      sessionsLength: 0,
      kind: 'OPEN_DATE',
      sourceStatus: 'open_date',
      purchaseReady: true,
    }),
    true,
  );
});

test('synthesizes when only sourceStatus is open_date (kind missing)', () => {
  assert.equal(
    shouldSynthesizeWidgetOnlySession({
      sessionsLength: 0,
      kind: null,
      sourceStatus: 'open_date',
      purchaseReady: true,
    }),
    true,
  );
});

test('does not synthesize when real upcoming sessions already exist', () => {
  assert.equal(
    shouldSynthesizeWidgetOnlySession({
      sessionsLength: 2,
      kind: 'OPEN_DATE',
      sourceStatus: 'open_date',
      purchaseReady: true,
    }),
    false,
  );
});

test('extractTcEventIdFromPurchaseUrl reads event query param', () => {
  assert.equal(
    extractTcEventIdFromPurchaseUrl('https://widget.ticketscloud.ru/?token=x&event=6a3d446f'),
    '6a3d446f',
  );
  assert.equal(extractTcEventIdFromPurchaseUrl(null), null);
  assert.equal(extractTcEventIdFromPurchaseUrl('https://example.com/'), null);
});

test('pickPrimarySessionPurchase switches to future meta-sibling eventId', () => {
  const pastUrl = 'https://widget.ticketscloud.ru/?token=t&event=6a3d444c';
  const futureUrl = 'https://widget.ticketscloud.ru/?token=t&event=6a3d446f';

  const primary = pickPrimarySessionPurchase(
    [
      { purchaseUrl: pastUrl, purchaseReady: false, vacant: 0 },
      { purchaseUrl: futureUrl, purchaseReady: true, vacant: 12, purchaseUrlSource: 'offer' },
    ],
    pastUrl,
    '6a3d444c',
  );

  assert.equal(primary.purchaseUrl, futureUrl);
  assert.equal(primary.externalId, '6a3d446f');
  assert.equal(primary.urlSource, 'offer');
});

test('pickPrimarySessionPurchase still returns sold-out url via firstWithUrl fallback', () => {
  const soldOut = 'https://widget.ticketscloud.ru/?token=t&event=sold';
  const fallback = 'https://widget.ticketscloud.ru/?token=t&event=fallback';

  const primary = pickPrimarySessionPurchase(
    [{ purchaseUrl: soldOut, purchaseReady: true, vacant: 0 }],
    fallback,
    'fallback',
  );

  assert.equal(primary.purchaseUrl, soldOut);
  assert.equal(primary.externalId, 'sold');
});

test('pickPrimarySessionPurchase uses fallback when no session urls', () => {
  const primary = pickPrimarySessionPurchase([], 'https://widget/?event=root', 'root');
  assert.equal(primary.purchaseUrl, 'https://widget/?event=root');
  assert.equal(primary.externalId, 'root');
  assert.equal(primary.urlSource, null);
});
