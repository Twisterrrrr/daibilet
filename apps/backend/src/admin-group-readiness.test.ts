import assert from 'node:assert/strict';
import test from 'node:test';

import { finalizeGroupedAdminReadiness } from './dto.js';

const noFutureIssue = {
  code: 'NO_FUTURE_SESSIONS',
  label: 'нет будущих сеансов',
  severity: 'high',
};

const missingPriceIssue = {
  code: 'MISSING_PRICE',
  label: 'нет цены',
  severity: 'high',
};

const weakDescriptionIssue = {
  code: 'WEAK_DESCRIPTION',
  label: 'слабое описание',
  severity: 'medium',
};

test('future slot in group drops NO_FUTURE_SESSIONS blocker', () => {
  const result = finalizeGroupedAdminReadiness(
    {
      readiness: 'blocked',
      severity: 'high',
      status: 'needs_review',
      readinessIssues: [noFutureIssue],
      readinessCodes: ['NO_FUTURE_SESSIONS'],
      reasons: [noFutureIssue.label],
    },
    true,
  );

  assert.equal(result.readiness, 'ready');
  assert.equal(result.status, 'ready');
  assert.deepEqual(result.readinessCodes, []);
  assert.deepEqual(result.readinessIssues, []);
});

test('future slot keeps other high-severity blockers', () => {
  const result = finalizeGroupedAdminReadiness(
    {
      readiness: 'blocked',
      severity: 'high',
      status: 'needs_review',
      readinessIssues: [noFutureIssue, missingPriceIssue],
      readinessCodes: ['NO_FUTURE_SESSIONS', 'MISSING_PRICE'],
      reasons: [noFutureIssue.label, missingPriceIssue.label],
    },
    true,
  );

  assert.equal(result.readiness, 'blocked');
  assert.equal(result.severity, 'high');
  assert.deepEqual(result.readinessCodes, ['MISSING_PRICE']);
  assert.equal(result.readinessIssues.length, 1);
  assert.equal(result.readinessIssues[0].code, 'MISSING_PRICE');
});

test('past-only group keeps NO_FUTURE_SESSIONS as blocked', () => {
  const result = finalizeGroupedAdminReadiness(
    {
      readiness: 'blocked',
      severity: 'high',
      status: 'needs_review',
      readinessIssues: [noFutureIssue],
      readinessCodes: ['NO_FUTURE_SESSIONS'],
      reasons: [noFutureIssue.label],
    },
    false,
  );

  assert.equal(result.readiness, 'blocked');
  assert.deepEqual(result.readinessCodes, ['NO_FUTURE_SESSIONS']);
});

test('future slot with only medium issues becomes review', () => {
  const result = finalizeGroupedAdminReadiness(
    {
      readiness: 'blocked',
      severity: 'high',
      status: 'needs_review',
      readinessIssues: [noFutureIssue, weakDescriptionIssue],
      readinessCodes: ['NO_FUTURE_SESSIONS', 'WEAK_DESCRIPTION'],
      reasons: [noFutureIssue.label, weakDescriptionIssue.label],
    },
    true,
  );

  assert.equal(result.readiness, 'review');
  assert.equal(result.severity, 'medium');
  assert.deepEqual(result.readinessCodes, ['WEAK_DESCRIPTION']);
});
