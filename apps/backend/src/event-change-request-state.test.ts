import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertEventChangeRequestTransition,
  EventChangeRequestTransitionError,
  validateEventChangeRequestTransition,
} from './event-change-request-state.js';

test('allows supplier to submit a permitted draft content change', () => {
  const result = validateEventChangeRequestTransition({
    currentStatus: 'DRAFT',
    action: 'submit',
    actorType: 'SUPPLIER',
    requestType: 'CONTENT_UPDATE',
    managementMode: 'SUPPLIER_DRAFTS',
    permissions: { canEditContent: true },
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.transition.to, 'SUBMITTED');
  assert.equal(result.transition.logAction, 'SUBMITTED');
});

test('allows supplier to revise a rejected request back to draft', () => {
  const result = validateEventChangeRequestTransition({
    currentStatus: 'REJECTED',
    action: 'edit',
    actorType: 'SUPPLIER',
    requestType: 'CONTENT_UPDATE',
    managementMode: 'SUPPLIER_DRAFTS',
    permissions: { canEditContent: true },
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.transition.to, 'DRAFT');
});

test('blocks supplier changes outside supplier-managed modes', () => {
  const result = validateEventChangeRequestTransition({
    currentStatus: 'DRAFT',
    action: 'submit',
    actorType: 'SUPPLIER',
    requestType: 'CONTENT_UPDATE',
    managementMode: 'DAIBILET_MANAGED',
    permissions: { canEditContent: true },
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'SUPPLIER_MODE_REQUIRED');
});

test('blocks supplier schedule changes without explicit permission', () => {
  const result = validateEventChangeRequestTransition({
    currentStatus: 'DRAFT',
    action: 'submit',
    actorType: 'SUPPLIER',
    requestType: 'SCHEDULE_UPDATE',
    managementMode: 'SUPPLIER_DRAFTS',
    scheduleLocked: false,
    permissions: { canEditContent: true, canEditSchedule: false },
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'SUPPLIER_PERMISSION_REQUIRED');
});

test('allows supplier schedule changes only when event is unlocked and permission is explicit', () => {
  const result = validateEventChangeRequestTransition({
    currentStatus: 'DRAFT',
    action: 'submit',
    actorType: 'SUPPLIER',
    requestType: 'SCHEDULE_UPDATE',
    managementMode: 'SUPPLIER_DRAFTS',
    scheduleLocked: false,
    permissions: { canEditSchedule: true },
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.transition.to, 'SUBMITTED');
});

test('keeps imported source-managed schedules and offers read-only', () => {
  const lockedSchedule = validateEventChangeRequestTransition({
    currentStatus: 'DRAFT',
    action: 'submit',
    actorType: 'ADMIN',
    requestType: 'SCHEDULE_UPDATE',
    managementMode: 'DAIBILET_MANAGED',
  });

  assert.equal(lockedSchedule.ok, false);
  if (lockedSchedule.ok) return;
  assert.equal(lockedSchedule.code, 'SOURCE_MANAGED_READ_ONLY');

  const sourceOffer = validateEventChangeRequestTransition({
    currentStatus: 'DRAFT',
    action: 'submit',
    actorType: 'ADMIN',
    requestType: 'OFFER_UPDATE',
    managementMode: 'SOURCE_MANAGED',
    scheduleLocked: false,
  });

  assert.equal(sourceOffer.ok, false);
  if (sourceOffer.ok) return;
  assert.equal(sourceOffer.code, 'SOURCE_MANAGED_READ_ONLY');
});

test('does not allow supplier to request publication actions', () => {
  const result = validateEventChangeRequestTransition({
    currentStatus: 'DRAFT',
    action: 'submit',
    actorType: 'SUPPLIER',
    requestType: 'PUBLISH',
    managementMode: 'SUPPLIER_DRAFTS',
    permissions: { canEditContent: true },
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'SUPPLIER_PERMISSION_REQUIRED');
});

test('allows admin approval and system application as separate steps', () => {
  const approval = validateEventChangeRequestTransition({
    currentStatus: 'SUBMITTED',
    action: 'approve',
    actorType: 'ADMIN',
    requestType: 'CONTENT_UPDATE',
    managementMode: 'SUPPLIER_DRAFTS',
  });

  assert.equal(approval.ok, true);
  if (!approval.ok) return;
  assert.equal(approval.transition.to, 'APPROVED');
  assert.equal(approval.transition.logAction, 'APPROVED');

  const application = validateEventChangeRequestTransition({
    currentStatus: approval.transition.to,
    action: 'apply',
    actorType: 'SYSTEM',
    requestType: 'CONTENT_UPDATE',
    managementMode: 'SUPPLIER_DRAFTS',
  });

  assert.equal(application.ok, true);
  if (!application.ok) return;
  assert.equal(application.transition.to, 'APPLIED');
});

test('blocks admin from applying approved payload directly', () => {
  const result = validateEventChangeRequestTransition({
    currentStatus: 'APPROVED',
    action: 'apply',
    actorType: 'ADMIN',
    requestType: 'CONTENT_UPDATE',
    managementMode: 'SUPPLIER_DRAFTS',
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'ACTOR_NOT_ALLOWED');
});

test('records apply failures and allows a system retry', () => {
  const failed = validateEventChangeRequestTransition({
    currentStatus: 'APPROVED',
    action: 'failApply',
    actorType: 'SYSTEM',
    requestType: 'CONTENT_UPDATE',
    managementMode: 'SUPPLIER_DRAFTS',
  });

  assert.equal(failed.ok, true);
  if (!failed.ok) return;
  assert.equal(failed.transition.to, 'APPLY_FAILED');
  assert.equal(failed.transition.logAction, 'APPLY_FAILED');

  const retried = validateEventChangeRequestTransition({
    currentStatus: failed.transition.to,
    action: 'apply',
    actorType: 'SYSTEM',
    requestType: 'CONTENT_UPDATE',
    managementMode: 'SUPPLIER_DRAFTS',
  });

  assert.equal(retried.ok, true);
  if (!retried.ok) return;
  assert.equal(retried.transition.to, 'APPLIED');
});

test('treats repeated terminal operations as idempotent no-ops', () => {
  const applied = validateEventChangeRequestTransition({
    currentStatus: 'APPLIED',
    action: 'apply',
    actorType: 'SYSTEM',
    requestType: 'CONTENT_UPDATE',
    managementMode: 'SUPPLIER_DRAFTS',
  });

  assert.equal(applied.ok, true);
  if (!applied.ok) return;
  assert.equal(applied.transition.to, 'APPLIED');
  assert.equal(applied.transition.noOp, true);

  const approved = validateEventChangeRequestTransition({
    currentStatus: 'APPROVED',
    action: 'approve',
    actorType: 'ADMIN',
    requestType: 'CONTENT_UPDATE',
    managementMode: 'SUPPLIER_DRAFTS',
  });

  assert.equal(approved.ok, true);
  if (!approved.ok) return;
  assert.equal(approved.transition.to, 'APPROVED');
  assert.equal(approved.transition.noOp, true);
});

test('treats repeated terminal apply as no-op before source scope checks', () => {
  const result = validateEventChangeRequestTransition({
    currentStatus: 'APPLIED',
    action: 'apply',
    actorType: 'SYSTEM',
    requestType: 'SCHEDULE_UPDATE',
    managementMode: 'SOURCE_MANAGED',
    scheduleLocked: true,
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.transition.noOp, true);
  assert.equal(result.transition.to, 'APPLIED');
});

test('keeps applied requests terminal', () => {
  const result = validateEventChangeRequestTransition({
    currentStatus: 'APPLIED',
    action: 'edit',
    actorType: 'ADMIN',
    requestType: 'CONTENT_UPDATE',
    managementMode: 'DAIBILET_MANAGED',
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'INVALID_TRANSITION');
});

test('assert helper throws typed transition errors', () => {
  assert.throws(
    () => assertEventChangeRequestTransition({
      currentStatus: 'DRAFT',
      action: 'approve',
      actorType: 'SUPPLIER',
      requestType: 'CONTENT_UPDATE',
      managementMode: 'SUPPLIER_DRAFTS',
      permissions: { canEditContent: true },
    }),
    (error) => error instanceof EventChangeRequestTransitionError
      && error.code === 'ACTOR_NOT_ALLOWED',
  );
});
