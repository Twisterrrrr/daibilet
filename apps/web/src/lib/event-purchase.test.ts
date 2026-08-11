import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isEventPurchaseBlocked,
  resolveTcPurchaseTarget,
} from './event-purchase.ts';

test('listPurchasableSessionVariants drops STAND_BY and never falls back to blocked', async () => {
  const { listPurchasableSessionVariants } = await import('./event-purchase.ts');
  const rows = listPurchasableSessionVariants([
    {
      id: 'sess-closed',
      eventId: 'aaaaaaaaaaaaaaaaaaaa',
      sourceStatus: 'STAND_BY',
      purchaseUrl: 'https://widgets.ticketscloud.com/?event=aaaaaaaaaaaaaaaaaaaa',
      purchaseReady: true,
      vacant: 5,
      startsAt: '2026-08-15T15:30:00.000Z',
    },
    {
      id: 'sess-open',
      eventId: 'bbbbbbbbbbbbbbbbbbbb',
      sourceStatus: 'PUBLIC',
      purchaseUrl: 'https://widgets.ticketscloud.com/?event=bbbbbbbbbbbbbbbbbbbb',
      purchaseReady: true,
      vacant: 5,
      startsAt: '2026-08-15T17:30:00.000Z',
    },
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.id, 'sess-open');

  const onlyClosed = listPurchasableSessionVariants([
    {
      id: 'sess-closed-only',
      eventId: 'cccccccccccccccccccc',
      sourceStatus: 'closed',
      purchaseUrl: 'https://widgets.ticketscloud.com/?event=cccccccccccccccccccc',
      purchaseReady: true,
      vacant: 2,
    },
  ]);
  assert.equal(onlyClosed.length, 0);
});

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
