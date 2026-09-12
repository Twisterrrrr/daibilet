import assert from 'node:assert/strict';
import test from 'node:test';

import { publishGate } from './dto.js';

test('publishGate blocks when high readiness issues present', () => {
  const gate = publishGate(
    {
      priceFrom: 500,
      purchaseReady: true,
      startsAt: '2026-08-01T12:00:00.000Z',
      venue: 'Зал',
      city: 'СПб',
    },
    ['нет будущих сеансов'],
    [{ code: 'NO_FUTURE_SESSIONS', label: 'нет будущих сеансов', severity: 'high' }],
  );

  assert.ok(gate.blockers.includes('нет будущих сеансов'));
});

test('publishGate keeps classic blockers', () => {
  const gate = publishGate(
    {
      priceFrom: null,
      purchaseReady: false,
      startsAt: null,
      venue: '',
      city: '',
      kind: 'SESSION',
    },
    [],
    [],
  );

  assert.ok(gate.blockers.includes('нет цены / offer'));
  assert.ok(gate.blockers.includes('нет виджета'));
  assert.ok(gate.blockers.includes('нет даты'));
  assert.ok(gate.blockers.includes('нет площадки'));
  assert.ok(gate.blockers.includes('нет города'));
});

test('medium readiness stays warning, not blocker', () => {
  const gate = publishGate(
    {
      priceFrom: 500,
      purchaseReady: true,
      startsAt: '2026-08-01T12:00:00.000Z',
      venue: 'Зал',
      city: 'СПб',
    },
    ['слабое описание'],
    [{ code: 'WEAK_DESCRIPTION', label: 'слабое описание', severity: 'medium' }],
  );

  assert.equal(gate.blockers.length, 0);
  assert.ok(gate.warnings.includes('слабое описание'));
});
