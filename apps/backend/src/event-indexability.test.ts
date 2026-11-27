import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateEventIndexability, type EventIndexabilityInput } from './event-indexability.js';

const now = new Date('2026-11-27T12:00:00.000Z');
const goodSession = {
  kind: 'SINGLE',
  startsAt: '2026-12-01T12:00:00.000Z',
  isActive: true,
  purchaseReady: true,
};

function ready(overrides: Partial<EventIndexabilityInput> = {}): EventIndexabilityInput {
  return {
    published: true,
    title: 'Спектакль',
    city: 'Москва',
    venue: 'Театр',
    canonicalValid: true,
    duplicate: 'CLEAR',
    syncState: 'SUCCESS',
    sessions: [goodSession],
    eventKind: 'SINGLE',
    purchaseReady: true,
    priceFrom: 1500,
    description: 'Подробное описание события и условий посещения.',
    now,
    ...overrides,
  };
}

test('AUTO previews index when all quality and technical gates pass', () => {
  assert.equal(calculateEventIndexability(ready()).proposed, 'INDEX');
});

test('source and rewritten descriptions use the same indexability rule', () => {
  assert.equal(calculateEventIndexability(ready({ description: 'Исходный текст организатора с полезными сведениями.' })).proposed, 'INDEX');
  assert.equal(calculateEventIndexability(ready({ description: 'Редакционно переработанный текст с подтверждёнными фактами.' })).proposed, 'INDEX');
});

test('short description is a preview noindex reason', () => {
  const result = calculateEventIndexability(ready({ description: 'Спектакль' }));
  assert.equal(result.proposed, 'NOINDEX');
  assert.ok(result.reasons.includes('DESCRIPTION_TOO_SHORT'));
});

test('one-off event with no active schedule does not pass AUTO', () => {
  const result = calculateEventIndexability(ready({ sessions: [], scheduleConfidence: 'INACTIVE' }));
  assert.equal(result.proposed, 'NOINDEX');
  assert.ok(result.reasons.includes('NO_ACTIVE_OR_APPROVED_SCHEDULE'));
});

test('an explicitly approved permanent booking scenario may pass without dated sessions', () => {
  assert.equal(calculateEventIndexability(ready({
    sessions: [],
    eventKind: 'OPEN_DATE',
    evergreenBookingApproved: true,
  })).proposed, 'INDEX');
});

test('blocked or cancelled sessions do not count as active purchase sessions', () => {
  const result = calculateEventIndexability(ready({ sessions: [{ ...goodSession, sourceStatus: 'STAND_BY' }] }));
  assert.equal(result.proposed, 'NOINDEX');
  assert.equal(result.hasActivePurchaseSession, false);
});

test('confirmed internal duplicate is a hard noindex gate', () => {
  const result = calculateEventIndexability(ready({ duplicate: 'DUPLICATE' }));
  assert.equal(result.proposed, 'NOINDEX');
  assert.ok(result.reasons.includes('CONFIRMED_DUPLICATE'));
});

test('manual NOINDEX remains effective independently of sync uncertainty', () => {
  assert.equal(calculateEventIndexability(ready({
    seoStatus: 'NOINDEX',
    syncState: 'FAILED',
    scheduleConfidence: 'UNKNOWN',
  })).proposed, 'NOINDEX');
  assert.equal(calculateEventIndexability(ready({
    seoStatus: 'NOINDEX',
    published: null,
    canonicalValid: null,
    duplicate: 'UNKNOWN',
  })).proposed, 'NOINDEX');
});

test('manual INDEX may bypass quality checks but not publication and technical gates', () => {
  assert.equal(calculateEventIndexability(ready({ seoStatus: 'INDEX', description: '', purchaseReady: false })).proposed, 'INDEX');
  assert.equal(calculateEventIndexability(ready({ seoStatus: 'INDEX', published: false })).proposed, 'NOINDEX');
  assert.equal(calculateEventIndexability(ready({ seoStatus: 'INDEX', canonicalValid: false })).proposed, 'NOINDEX');
  assert.equal(calculateEventIndexability(ready({ seoStatus: 'INDEX', technicalError: true })).proposed, 'NOINDEX');
});

test('failed sync preserves the last confirmed decision as UNKNOWN preview', () => {
  const result = calculateEventIndexability(ready({
    syncState: 'FAILED',
    scheduleConfidence: 'UNKNOWN',
    confirmedIndexability: 'INDEX',
  }));
  assert.equal(result.proposed, 'UNKNOWN');
  assert.equal(result.effective, 'INDEX');
  assert.ok(result.reasons.includes('SYNC_FAILED'));
});

test('uncertain duplicate status is not treated as confirmed absence of duplicates', () => {
  const result = calculateEventIndexability(ready({ duplicate: 'UNKNOWN', confirmedIndexability: 'NOINDEX' }));
  assert.equal(result.proposed, 'UNKNOWN');
  assert.equal(result.effective, 'NOINDEX');
});

test('free admission is an explicit price alternative', () => {
  assert.equal(calculateEventIndexability(ready({ priceFrom: null, isFree: true })).proposed, 'INDEX');
});
