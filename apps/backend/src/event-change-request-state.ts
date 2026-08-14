import type {
  EventActorType,
  EventChangeLogAction,
  EventChangeRequestStatus,
  EventChangeRequestType,
  EventManagementMode,
} from '@daibilet/db';

export type EventChangeRequestAction =
  | 'edit'
  | 'submit'
  | 'approve'
  | 'reject'
  | 'cancel'
  | 'apply'
  | 'failApply';

export interface EventChangeRequestPermissions {
  canEditContent: boolean;
  canEditMedia: boolean;
  canEditSeo: boolean;
  canEditSchedule: boolean;
  canEditOffers: boolean;
}

export interface EventChangeRequestTransitionInput {
  currentStatus: EventChangeRequestStatus;
  action: EventChangeRequestAction;
  actorType: EventActorType;
  requestType: EventChangeRequestType;
  managementMode: EventManagementMode;
  scheduleLocked?: boolean;
  permissions?: Partial<EventChangeRequestPermissions>;
}

export interface EventChangeRequestTransition {
  from: EventChangeRequestStatus;
  to: EventChangeRequestStatus;
  action: EventChangeRequestAction;
  logAction: EventChangeLogAction;
  noOp?: boolean;
}

export type EventChangeRequestTransitionResult =
  | { ok: true; transition: EventChangeRequestTransition }
  | { ok: false; code: EventChangeRequestTransitionErrorCode; message: string };

export type EventChangeRequestTransitionErrorCode =
  | 'INVALID_TRANSITION'
  | 'ACTOR_NOT_ALLOWED'
  | 'SOURCE_MANAGED_READ_ONLY'
  | 'SUPPLIER_MODE_REQUIRED'
  | 'SUPPLIER_PERMISSION_REQUIRED';

const transitions: Record<EventChangeRequestStatus, Partial<Record<EventChangeRequestAction, EventChangeRequestStatus>>> = {
  DRAFT: {
    edit: 'DRAFT',
    submit: 'SUBMITTED',
    cancel: 'CANCELLED',
  },
  SUBMITTED: {
    approve: 'APPROVED',
    reject: 'REJECTED',
    cancel: 'CANCELLED',
  },
  APPROVED: {
    approve: 'APPROVED',
    apply: 'APPLIED',
    failApply: 'APPLY_FAILED',
  },
  APPLY_FAILED: {
    edit: 'DRAFT',
    apply: 'APPLIED',
    failApply: 'APPLY_FAILED',
    cancel: 'CANCELLED',
  },
  REJECTED: {
    edit: 'DRAFT',
    reject: 'REJECTED',
    cancel: 'CANCELLED',
  },
  CANCELLED: {
    cancel: 'CANCELLED',
  },
  APPLIED: {
    apply: 'APPLIED',
  },
};

const logActionByAction: Record<EventChangeRequestAction, EventChangeLogAction> = {
  edit: 'UPDATED',
  submit: 'SUBMITTED',
  approve: 'APPROVED',
  reject: 'REJECTED',
  cancel: 'UPDATED',
  apply: 'UPDATED',
  failApply: 'APPLY_FAILED',
};

const actorActions: Record<EventActorType, ReadonlySet<EventChangeRequestAction>> = {
  ADMIN: new Set(['edit', 'submit', 'approve', 'reject', 'cancel']),
  SUPPLIER: new Set(['edit', 'submit', 'cancel']),
  SYSTEM: new Set(['apply', 'failApply']),
};

const sourceManagedReadOnlyRequestTypes = new Set<EventChangeRequestType>([
  'SCHEDULE_UPDATE',
  'OFFER_UPDATE',
]);

const supplierManagedModes = new Set<EventManagementMode>([
  'SUPPLIER_DRAFTS',
  'SUPPLIER_SELF_SERVICE',
]);

const supplierForbiddenRequestTypes = new Set<EventChangeRequestType>([
  'DELETE',
  'ARCHIVE',
  'PUBLISH',
  'UNPUBLISH',
]);

export class EventChangeRequestTransitionError extends Error {
  readonly code: EventChangeRequestTransitionErrorCode;

  constructor(code: EventChangeRequestTransitionErrorCode, message: string) {
    super(message);
    this.name = 'EventChangeRequestTransitionError';
    this.code = code;
  }
}

export function validateEventChangeRequestTransition(
  input: EventChangeRequestTransitionInput,
): EventChangeRequestTransitionResult {
  const actorIssue = validateActor(input);
  if (actorIssue) return actorIssue;

  const nextStatus = transitions[input.currentStatus][input.action];
  if (!nextStatus) {
    return deny(
      'INVALID_TRANSITION',
      `Cannot ${input.action} event change request from ${input.currentStatus}.`,
    );
  }

  const result: EventChangeRequestTransitionResult = {
    ok: true,
    transition: {
      from: input.currentStatus,
      to: nextStatus,
      action: input.action,
      logAction: logActionByAction[input.action],
      noOp: input.currentStatus === nextStatus,
    },
  };

  if (input.currentStatus === nextStatus) return result;

  const scopeIssue = validateRequestScope(input);
  if (scopeIssue) return scopeIssue;

  return result;
}

export function assertEventChangeRequestTransition(
  input: EventChangeRequestTransitionInput,
): EventChangeRequestTransition {
  const result = validateEventChangeRequestTransition(input);
  if (result.ok) return result.transition;
  throw new EventChangeRequestTransitionError(result.code, result.message);
}

function validateActor(input: EventChangeRequestTransitionInput): EventChangeRequestTransitionResult | null {
  if (!actorActions[input.actorType].has(input.action)) {
    return deny(
      'ACTOR_NOT_ALLOWED',
      `${input.actorType} cannot ${input.action} event change requests.`,
    );
  }

  return null;
}

function validateRequestScope(input: EventChangeRequestTransitionInput): EventChangeRequestTransitionResult | null {
  if (input.requestType === 'SCHEDULE_UPDATE' && input.scheduleLocked !== false) {
    return deny(
      'SOURCE_MANAGED_READ_ONLY',
      'This event schedule is locked. Imported schedules stay source-managed and manual schedule edits must explicitly unlock it.',
    );
  }

  if (input.managementMode === 'SOURCE_MANAGED' && sourceManagedReadOnlyRequestTypes.has(input.requestType)) {
    return deny(
      'SOURCE_MANAGED_READ_ONLY',
      'Imported source-managed schedules and ticket offers are read-only in Daibilet.',
    );
  }

  if (input.actorType !== 'SUPPLIER' || input.action === 'cancel') {
    return null;
  }

  if (!supplierManagedModes.has(input.managementMode)) {
    return deny(
      'SUPPLIER_MODE_REQUIRED',
      'Supplier changes require SUPPLIER_DRAFTS or SUPPLIER_SELF_SERVICE management mode.',
    );
  }

  if (supplierForbiddenRequestTypes.has(input.requestType)) {
    return deny(
      'SUPPLIER_PERMISSION_REQUIRED',
      `Supplier cannot request ${input.requestType}; this action is admin-managed.`,
    );
  }

  const permission = requiredSupplierPermission(input.requestType);
  if (permission && input.permissions?.[permission] !== true) {
    return deny(
      'SUPPLIER_PERMISSION_REQUIRED',
      `Supplier change request ${input.requestType} requires ${permission}.`,
    );
  }

  return null;
}

function requiredSupplierPermission(type: EventChangeRequestType): keyof EventChangeRequestPermissions | null {
  switch (type) {
    case 'CREATE':
    case 'UPDATE':
    case 'CONTENT_UPDATE':
      return 'canEditContent';
    case 'MEDIA_UPDATE':
      return 'canEditMedia';
    case 'SEO_UPDATE':
      return 'canEditSeo';
    case 'SCHEDULE_UPDATE':
      return 'canEditSchedule';
    case 'OFFER_UPDATE':
      return 'canEditOffers';
    case 'DELETE':
    case 'ARCHIVE':
    case 'PUBLISH':
    case 'UNPUBLISH':
      return null;
  }
}

function deny(
  code: EventChangeRequestTransitionErrorCode,
  message: string,
): EventChangeRequestTransitionResult {
  return { ok: false, code, message };
}
