import assert from 'node:assert/strict';
import test from 'node:test';
import {
  mapAdminEventScheduleDto,
  resolveEventScheduleEditability,
  validateScheduleModePatch,
  validateSessionMutation,
} from './admin-event-schedule.js';

test('marks imported/source-managed schedules as read-only', () => {
  const result = resolveEventScheduleEditability({
    managementMode: 'SOURCE_MANAGED',
    scheduleLocked: true,
  });

  assert.equal(result.editable, false);
  assert.equal(result.lockCode, 'SOURCE_MANAGED');
});

test('allows unlocked Daibilet-managed schedule editing', () => {
  const result = resolveEventScheduleEditability({
    managementMode: 'DAIBILET_MANAGED',
    scheduleLocked: false,
  });

  assert.equal(result.editable, true);
  assert.equal(result.lockCode, undefined);
});

test('blocks open-date mode without validity or with sold active sessions', () => {
  const issues = validateScheduleModePatch({
    targetKind: 'OPEN_DATE',
    hasOpenDateValidity: false,
    activeSessions: [
      { id: 'ses_1', capacitySold: 2 },
      { id: 'ses_2', capacitySold: 0 },
    ],
    openDateFieldTouched: false,
  });

  assert.deepEqual(issues.map((issue) => issue.code), [
    'OPEN_DATE_REQUIRES_VALIDITY',
    'OPEN_DATE_HAS_SOLD_SESSIONS',
  ]);
});

test('blocks open-date fields on fixed schedules', () => {
  const issues = validateScheduleModePatch({
    targetKind: 'RECURRING',
    hasOpenDateValidity: false,
    activeSessions: [],
    openDateFieldTouched: true,
  });

  assert.deepEqual(issues.map((issue) => issue.code), ['FIXED_SCHEDULE_CANNOT_SET_OPEN_DATE']);
});

test('validates fixed slot invariants before writes', () => {
  const singleIssues = validateSessionMutation({
    kind: 'SINGLE',
    action: 'create',
    startsAt: '2026-09-01T15:00:00.000+03:00',
    willBeActive: true,
    capacitySold: 0,
    activeSessions: [{ id: 'ses_existing', startsAt: '2026-09-01T13:00:00.000Z' }],
  });
  assert.deepEqual(singleIssues.map((issue) => issue.code), ['SINGLE_REQUIRES_ONE_SESSION']);

  const duplicateIssues = validateSessionMutation({
    kind: 'RECURRING',
    action: 'create',
    startsAt: '2026-09-01T15:00:00.000+03:00',
    willBeActive: true,
    capacitySold: 0,
    activeSessions: [{ id: 'ses_existing', startsAt: '2026-09-01T12:00:00.000Z' }],
  });
  assert.deepEqual(duplicateIssues.map((issue) => issue.code), ['DUPLICATE_SESSION_START']);

  const capacityIssues = validateSessionMutation({
    kind: 'RECURRING',
    action: 'update',
    targetSessionId: 'ses_1',
    startsAt: '2026-09-01T15:00:00.000+03:00',
    willBeActive: true,
    capacitySold: 5,
    capacityTotal: 4,
    activeSessions: [{ id: 'ses_1', startsAt: '2026-09-01T12:00:00.000Z' }],
  });
  assert.deepEqual(capacityIssues.map((issue) => issue.code), ['CAPACITY_BELOW_SOLD']);
});

test('maps event schedule DTO with sessions, offers and lock reason', () => {
  const dto = mapAdminEventScheduleDto({
    id: 'evt_1',
    slug: 'manual-event',
    title: 'Manual Event',
    kind: 'RECURRING',
    status: 'READY',
    purchaseFlow: 'PLATFORM',
    managementMode: 'DAIBILET_MANAGED',
    scheduleLocked: true,
    defaultCapacityTotal: 20,
    openDateValidFrom: null,
    openDateValidTo: null,
    openDateValidDays: null,
    salesStartsAt: '2026-08-01T09:00:00.000Z',
    salesEndsAt: null,
    updatedAt: '2026-08-01T10:00:00.000Z',
    sessions: [{
      id: 'ses_1',
      startsAt: '2026-09-01T15:00:00.000+03:00',
      endsAt: null,
      priceFromRub: 1200,
      ticketsVacant: 18,
      capacityTotal: 20,
      capacitySold: 2,
      isActive: true,
      cancelledAt: null,
      cancelReason: null,
      sourceStatus: 'manual',
      externalId: null,
    }],
    offers: [{
      id: 'off_1',
      sourceCode: 'MANUAL',
      title: 'Adult',
      priceRub: 1200,
      oldPriceRub: null,
      capacityTotal: 20,
      groupSize: 1,
      weekdayMask: null,
      active: true,
    }],
  });

  assert.equal(dto.editable, false);
  assert.equal(dto.lockCode, 'SCHEDULE_LOCKED');
  assert.equal(dto.sessions[0]?.hasSales, true);
  assert.equal(dto.offers[0]?.priceRub, 1200);
});
