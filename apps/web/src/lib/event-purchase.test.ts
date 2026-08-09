import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isEventPurchaseBlocked,
  resolveTcPurchaseTarget,
} from './event-purchase.ts';

test('isEventPurchaseBlocked: event sourceStatus cancelled', () => {
  assert.equal(
    isEventPurchaseBlocked(
      { sourceStatus: 'cancelled', purchaseUrl: 'https://widgets.ticketscloud.com/?event=abc' },
      [{ id: 'sess-1', purchaseUrl: 'https://widgets.ticketscloud.com/?event=abc', purchaseReady: true }],
    ),
    true,
  );
});

test('isEventPurchaseBlocked: all sessions STAND_BY', () => {
  assert.equal(
    isEventPurchaseBlocked(
      { sourceStatus: 'PUBLIC', purchaseUrl: 'https://widgets.ticketscloud.com/?event=abc' },
      [
        {
          id: 'sess-1',
          eventId: 'aaaaaaaaaaaaaaaaaaaa',
          sourceStatus: 'STAND_BY',
          purchaseUrl: 'https://widgets.ticketscloud.com/?event=abc',
          purchaseReady: true,
        },
      ],
    ),
    true,
  );
});

test('resolveTcPurchaseTarget does not fall back to stale event widget when blocked', () => {
  const result = resolveTcPurchaseTarget(
    {
      externalId: '6a09d8b4e48a687d8b91acfc',
      purchaseUrl: 'https://widgets.ticketscloud.com/?event=6a09d8b4e48a687d8b91acfc',
      widgetUrl: 'https://widgets.ticketscloud.com/?event=6a09d8b4e48a687d8b91acfc',
      widgetProvider: 'TICKETSCLOUD',
      sourceStatus: 'PUBLIC',
    },
    [
      {
        id: 'sess-1',
        eventId: '6a09d8b4e48a687d8b91acfc',
        sourceStatus: 'cancelled',
        purchaseUrl: 'https://widgets.ticketscloud.com/?event=6a09d8b4e48a687d8b91acfc',
        purchaseReady: true,
      },
    ],
  );
  assert.equal(result.isTcWidget, false);
  assert.equal(result.tcEventId, null);
  assert.equal(result.purchaseUrl, null);
});
