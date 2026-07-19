import assert from 'node:assert/strict';
import test from 'node:test';

import { isOpenDateCatalogRow } from './catalog-availability.js';

/**
 * Mirrors buildWidgetOnlySessions gate: synthetic "В виджете" slots are only
 * for true open-date schedules, never for every TicketsCloud event.
 */
function shouldSynthesizeWidgetOnlySession(input: {
  sessionsLength: number;
  kind?: string | null;
  sourceStatus?: string | null;
  purchaseReady: boolean;
  purchaseProvider?: string | null;
}): boolean {
  if (input.sessionsLength > 0 || !input.purchaseReady) return false;
  return isOpenDateCatalogRow({ kind: input.kind, sourceStatus: input.sourceStatus });
}

test('does not synthesize widget slot for past TicketsCloud dated event', () => {
  assert.equal(
    shouldSynthesizeWidgetOnlySession({
      sessionsLength: 0,
      kind: 'RECURRING',
      sourceStatus: 'PUBLIC',
      purchaseReady: true,
      purchaseProvider: 'TICKETSCLOUD',
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
      purchaseProvider: 'TICKETSCLOUD',
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
