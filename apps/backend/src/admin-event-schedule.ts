import type {
  AdminEventScheduleDto,
  AdminEventScheduleLockCode,
  AdminEventScheduleSessionDto,
} from '@daibilet/contracts/admin';
import type { SourceCode } from '@daibilet/contracts/common';
import { prisma, type EventKind, type Prisma } from '@daibilet/db';
import type {
  AdminEventScheduleModePayload,
  AdminEventScheduleSessionCancelPayload,
  AdminEventScheduleSessionCreatePayload,
  AdminEventScheduleSessionPatchPayload,
} from './types/schemas.js';

const editableManagementModes = new Set(['DAIBILET_MANAGED', 'SUPPLIER_DRAFTS', 'SUPPLIER_SELF_SERVICE']);

export class AdminEventScheduleError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(code: string, message: string, statusCode = 400) {
    super(message);
    this.name = 'AdminEventScheduleError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export interface EventScheduleEditabilityInput {
  managementMode: string;
  scheduleLocked: boolean;
}

export interface EventScheduleEditabilityResult {
  editable: boolean;
  lockCode?: AdminEventScheduleLockCode;
  lockReason?: string;
}

export interface AdminScheduleValidationIssue {
  code: string;
  message: string;
  path?: string;
}

export interface ScheduleModePatchValidationInput {
  targetKind: string;
  hasOpenDateValidity: boolean;
  activeSessions: Array<{ id: string; capacitySold: number }>;
  openDateFieldTouched: boolean;
}

export interface SessionMutationValidationInput {
  kind: string;
  action: 'create' | 'update' | 'restore';
  targetSessionId?: string;
  startsAt?: string | null;
  willBeActive: boolean;
  capacityTotal?: number | null;
  capacitySold: number;
  activeSessions: Array<{ id: string; startsAt?: string | null }>;
}

type EventScheduleRecord = {
  id: string;
  slug: string;
  title: string;
  kind: string;
  status: string;
  purchaseFlow: string;
  managementMode: string;
  scheduleLocked: boolean;
  supplierId?: string | null;
  defaultCapacityTotal?: number | null;
  openDateValidFrom?: Date | string | null;
  openDateValidTo?: Date | string | null;
  openDateValidDays?: number | null;
  salesStartsAt?: Date | string | null;
  salesEndsAt?: Date | string | null;
  updatedAt: Date | string;
  sessions?: EventSessionRecord[];
  offers?: EventOfferRecord[];
};

type EventSessionRecord = {
  id: string;
  startsAt?: Date | string | null;
  endsAt?: Date | string | null;
  sourceStatus?: string | null;
  priceFromRub?: number | null;
  ticketsVacant?: number | null;
  capacityTotal?: number | null;
  capacitySold: number;
  isActive: boolean;
  cancelledAt?: Date | string | null;
  cancelReason?: string | null;
  externalId?: string | null;
};

type EventOfferRecord = {
  id: string;
  sourceCode: string;
  title?: string | null;
  priceRub?: number | null;
  oldPriceRub?: number | null;
  capacityTotal?: number | null;
  groupSize: number;
  weekdayMask?: number | null;
  active: boolean;
};

export async function buildAdminEventScheduleDto(idOrSlug: string): Promise<AdminEventScheduleDto> {
  const event = await loadEventSchedule(idOrSlug);
  if (!event) throw new AdminEventScheduleError('EVENT_NOT_FOUND', 'event_not_found', 404);
  return mapAdminEventScheduleDto(event);
}

export async function updateAdminEventScheduleMode(
  eventIdOrSlug: string,
  payload: AdminEventScheduleModePayload,
): Promise<AdminEventScheduleDto> {
  const eventId = await prisma.$transaction(async (tx) => {
    const event = await tx.event.findFirst({
      where: eventIdentityWhere(eventIdOrSlug),
      include: {
        sessions: {
          select: { id: true, isActive: true, capacitySold: true },
        },
      },
    });
    if (!event) throw new AdminEventScheduleError('EVENT_NOT_FOUND', 'event_not_found', 404);

    assertCanPatchScheduleMode(event, payload);
    const targetKind = String(payload.kind || event.kind);
    const activeSessions = event.sessions.filter((session) => session.isActive);
    const issues = validateScheduleModePatch({
      targetKind,
      hasOpenDateValidity: hasMergedOpenDateValidity(event, payload, targetKind),
      activeSessions,
      openDateFieldTouched: openDateFieldTouched(payload),
    });
    assertNoScheduleIssues(issues);

    const data = buildEventScheduleModeUpdateData(event, payload, targetKind);
    await tx.event.update({
      where: { id: event.id },
      data,
    });

    if (targetKind === 'OPEN_DATE' && activeSessions.length > 0) {
      await tx.eventSession.updateMany({
        where: { eventId: event.id, isActive: true },
        data: {
          isActive: false,
          cancelledAt: new Date(),
          cancelReason: 'admin_open_date_switch',
        },
      });
    }

    await writeScheduleLog(tx, event, {
      operation: 'mode_patch',
      payload: sanitizePayload(payload),
    });

    return event.id;
  });

  return buildAdminEventScheduleDto(eventId);
}

export async function createAdminEventScheduleSession(
  eventIdOrSlug: string,
  payload: AdminEventScheduleSessionCreatePayload,
): Promise<AdminEventScheduleDto> {
  const eventId = await prisma.$transaction(async (tx) => {
    const event = await tx.event.findFirst({
      where: eventIdentityWhere(eventIdOrSlug),
      include: { sessions: true },
    });
    if (!event) throw new AdminEventScheduleError('EVENT_NOT_FOUND', 'event_not_found', 404);
    assertCanEditSchedule(event);

    const activeSessions = mapValidationSessions(event.sessions);
    const issues = validateSessionMutation({
      kind: String(event.kind),
      action: 'create',
      startsAt: payload.startsAt,
      willBeActive: payload.isActive ?? true,
      capacityTotal: payload.capacityTotal ?? null,
      capacitySold: 0,
      activeSessions,
    });
    assertNoScheduleIssues(issues);

    await tx.eventSession.create({
      data: {
        eventId: event.id,
        startsAt: new Date(payload.startsAt),
        endsAt: toDateOrNull(payload.endsAt),
        priceFromRub: payload.priceFromRub ?? null,
        ticketsVacant: payload.ticketsVacant ?? null,
        capacityTotal: payload.capacityTotal ?? null,
        isActive: payload.isActive ?? true,
        sourceStatus: 'manual',
      },
    });

    await touchEvent(tx, event.id);
    await writeScheduleLog(tx, event, {
      operation: 'session_create',
      payload: sanitizePayload(payload),
    });

    return event.id;
  });

  return buildAdminEventScheduleDto(eventId);
}

export async function updateAdminEventScheduleSession(
  eventIdOrSlug: string,
  sessionId: string,
  payload: AdminEventScheduleSessionPatchPayload,
): Promise<AdminEventScheduleDto> {
  const eventId = await prisma.$transaction(async (tx) => {
    const event = await tx.event.findFirst({
      where: eventIdentityWhere(eventIdOrSlug),
      include: { sessions: true },
    });
    if (!event) throw new AdminEventScheduleError('EVENT_NOT_FOUND', 'event_not_found', 404);
    assertCanEditSchedule(event);

    const session = event.sessions.find((item) => item.id === sessionId);
    if (!session) throw new AdminEventScheduleError('SESSION_NOT_FOUND', 'session_not_found', 404);

    const startsAt = payload.startsAt ?? toIso(session.startsAt);
    const willBeActive = payload.isActive ?? session.isActive;
    const capacityTotal = payload.capacityTotal !== undefined ? payload.capacityTotal : session.capacityTotal;
    const issues = validateSessionMutation({
      kind: String(event.kind),
      action: 'update',
      targetSessionId: session.id,
      startsAt,
      willBeActive,
      capacityTotal,
      capacitySold: session.capacitySold,
      activeSessions: mapValidationSessions(event.sessions),
    });
    assertNoScheduleIssues(issues);

    const data = buildEventSessionUpdateData(session, payload);
    await tx.eventSession.update({
      where: { id: session.id },
      data,
    });

    await touchEvent(tx, event.id);
    await writeScheduleLog(tx, event, {
      operation: 'session_update',
      sessionId: session.id,
      payload: sanitizePayload(payload),
    });

    return event.id;
  });

  return buildAdminEventScheduleDto(eventId);
}

export async function cancelAdminEventScheduleSession(
  eventIdOrSlug: string,
  sessionId: string,
  payload: AdminEventScheduleSessionCancelPayload = {},
): Promise<AdminEventScheduleDto> {
  const eventId = await prisma.$transaction(async (tx) => {
    const event = await tx.event.findFirst({
      where: eventIdentityWhere(eventIdOrSlug),
      include: { sessions: true },
    });
    if (!event) throw new AdminEventScheduleError('EVENT_NOT_FOUND', 'event_not_found', 404);
    assertCanEditSchedule(event);

    const session = event.sessions.find((item) => item.id === sessionId);
    if (!session) throw new AdminEventScheduleError('SESSION_NOT_FOUND', 'session_not_found', 404);
    if (session.capacitySold > 0) {
      throw new AdminEventScheduleError(
        'SESSION_HAS_SALES',
        'session_has_sales',
        409,
      );
    }

    await tx.eventSession.update({
      where: { id: session.id },
      data: {
        isActive: false,
        cancelledAt: new Date(),
        cancelReason: payload.reason || 'admin_cancelled',
      },
    });

    await touchEvent(tx, event.id);
    await writeScheduleLog(tx, event, {
      operation: 'session_cancel',
      sessionId: session.id,
      payload: sanitizePayload(payload),
    });

    return event.id;
  });

  return buildAdminEventScheduleDto(eventId);
}

export async function restoreAdminEventScheduleSession(
  eventIdOrSlug: string,
  sessionId: string,
): Promise<AdminEventScheduleDto> {
  const eventId = await prisma.$transaction(async (tx) => {
    const event = await tx.event.findFirst({
      where: eventIdentityWhere(eventIdOrSlug),
      include: { sessions: true },
    });
    if (!event) throw new AdminEventScheduleError('EVENT_NOT_FOUND', 'event_not_found', 404);
    assertCanEditSchedule(event);

    const session = event.sessions.find((item) => item.id === sessionId);
    if (!session) throw new AdminEventScheduleError('SESSION_NOT_FOUND', 'session_not_found', 404);

    const issues = validateSessionMutation({
      kind: String(event.kind),
      action: 'restore',
      targetSessionId: session.id,
      startsAt: toIso(session.startsAt),
      willBeActive: true,
      capacityTotal: session.capacityTotal,
      capacitySold: session.capacitySold,
      activeSessions: mapValidationSessions(event.sessions),
    });
    assertNoScheduleIssues(issues);

    await tx.eventSession.update({
      where: { id: session.id },
      data: {
        isActive: true,
        cancelledAt: null,
        cancelReason: null,
      },
    });

    await touchEvent(tx, event.id);
    await writeScheduleLog(tx, event, {
      operation: 'session_restore',
      sessionId: session.id,
    });

    return event.id;
  });

  return buildAdminEventScheduleDto(eventId);
}

export function mapAdminEventScheduleDto(event: EventScheduleRecord): AdminEventScheduleDto {
  const editability = resolveEventScheduleEditability(event);
  return {
    eventId: event.id,
    slug: event.slug,
    title: event.title,
    kind: event.kind,
    status: event.status,
    purchaseFlow: event.purchaseFlow,
    managementMode: event.managementMode,
    scheduleLocked: event.scheduleLocked,
    editable: editability.editable,
    lockCode: editability.lockCode ?? null,
    lockReason: editability.lockReason ?? null,
    defaultCapacityTotal: event.defaultCapacityTotal ?? null,
    openDate: {
      validFrom: toIso(event.openDateValidFrom),
      validTo: toIso(event.openDateValidTo),
      validDays: event.openDateValidDays ?? null,
    },
    salesPolicy: {
      startsAt: toIso(event.salesStartsAt),
      endsAt: toIso(event.salesEndsAt),
    },
    sessions: (event.sessions || []).map(mapSession),
    offers: (event.offers || []).map((offer) => ({
      id: offer.id,
      sourceCode: offer.sourceCode as SourceCode,
      title: offer.title ?? null,
      priceRub: offer.priceRub ?? null,
      oldPriceRub: offer.oldPriceRub ?? null,
      capacityTotal: offer.capacityTotal ?? null,
      groupSize: offer.groupSize,
      weekdayMask: offer.weekdayMask ?? null,
      active: offer.active,
    })),
    updatedAt: toIso(event.updatedAt) || new Date(0).toISOString(),
  };
}

export function resolveEventScheduleEditability(
  input: EventScheduleEditabilityInput,
): EventScheduleEditabilityResult {
  if (!editableManagementModes.has(input.managementMode)) {
    return {
      editable: false,
      lockCode: 'SOURCE_MANAGED',
      lockReason: 'Расписание управляется внешним источником',
    };
  }

  if (input.scheduleLocked) {
    return {
      editable: false,
      lockCode: 'SCHEDULE_LOCKED',
      lockReason: 'Расписание заблокировано до явного переключения в ручной режим',
    };
  }

  return { editable: true };
}

export function validateScheduleModePatch(input: ScheduleModePatchValidationInput): AdminScheduleValidationIssue[] {
  const issues: AdminScheduleValidationIssue[] = [];

  if (input.targetKind === 'OPEN_DATE') {
    if (!input.hasOpenDateValidity) {
      issues.push({
        code: 'OPEN_DATE_REQUIRES_VALIDITY',
        path: 'openDate',
        message: 'Open-date schedule requires validFrom, validTo or validDays',
      });
    }
    const soldSessions = input.activeSessions.filter((session) => session.capacitySold > 0);
    if (soldSessions.length > 0) {
      issues.push({
        code: 'OPEN_DATE_HAS_SOLD_SESSIONS',
        path: 'sessions',
        message: 'Cannot switch to open date while active sessions have sales',
      });
    }
    return issues;
  }

  if (input.openDateFieldTouched) {
    issues.push({
      code: 'FIXED_SCHEDULE_CANNOT_SET_OPEN_DATE',
      path: 'openDate',
      message: 'Fixed schedule cannot include open-date fields',
    });
  }

  return issues;
}

export function validateSessionMutation(input: SessionMutationValidationInput): AdminScheduleValidationIssue[] {
  const issues: AdminScheduleValidationIssue[] = [];

  if (input.kind === 'OPEN_DATE') {
    issues.push({
      code: 'OPEN_DATE_CANNOT_HAVE_SESSIONS',
      path: 'kind',
      message: 'Open-date event cannot contain fixed sessions',
    });
    return issues;
  }

  if (input.capacityTotal != null && input.capacityTotal < input.capacitySold) {
    issues.push({
      code: 'CAPACITY_BELOW_SOLD',
      path: 'capacityTotal',
      message: 'Capacity cannot be lower than already sold tickets',
    });
  }

  if (!input.willBeActive) return issues;

  const otherActiveSessions = input.activeSessions.filter((session) => session.id !== input.targetSessionId);
  if (input.kind === 'SINGLE' && otherActiveSessions.length > 0) {
    issues.push({
      code: 'SINGLE_REQUIRES_ONE_SESSION',
      path: 'sessions',
      message: 'Single event can have only one active session',
    });
  }

  const startsAt = parseTime(input.startsAt);
  if (startsAt != null) {
    const duplicate = otherActiveSessions.find((session) => parseTime(session.startsAt) === startsAt);
    if (duplicate) {
      issues.push({
        code: 'DUPLICATE_SESSION_START',
        path: 'startsAt',
        message: 'Another active session has the same start time',
      });
    }
  }

  return issues;
}

async function loadEventSchedule(idOrSlug: string): Promise<EventScheduleRecord | null> {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return prisma.event.findFirst({
    where: eventIdentityWhere(idOrSlug),
    include: {
      sessions: {
        where: {
          OR: [
            { startsAt: null },
            { startsAt: { gte: yesterday } },
            { isActive: false },
          ],
        },
        orderBy: [{ isActive: 'desc' }, { startsAt: 'asc' }],
        take: 300,
      },
      offers: {
        orderBy: [{ active: 'desc' }, { priceRub: 'asc' }],
        take: 100,
      },
    },
  }) as Promise<EventScheduleRecord | null>;
}

function assertCanPatchScheduleMode(event: EventScheduleEditabilityInput, payload: AdminEventScheduleModePayload): void {
  if (!editableManagementModes.has(event.managementMode)) {
    throw new AdminEventScheduleError('SOURCE_MANAGED_SCHEDULE', 'source_managed_schedule', 409);
  }
  if (event.scheduleLocked && payload.scheduleLocked !== false) {
    throw new AdminEventScheduleError('SCHEDULE_LOCKED', 'schedule_locked', 409);
  }
}

function assertCanEditSchedule(event: EventScheduleEditabilityInput): void {
  const result = resolveEventScheduleEditability(event);
  if (result.editable) return;
  throw new AdminEventScheduleError(result.lockCode || 'SCHEDULE_NOT_EDITABLE', result.lockReason || 'schedule_not_editable', 409);
}

function assertNoScheduleIssues(issues: AdminScheduleValidationIssue[]): void {
  if (issues.length === 0) return;
  const first = issues[0];
  throw new AdminEventScheduleError(first?.code || 'SCHEDULE_INVALID', first?.message || 'schedule_invalid', 409);
}

function buildEventScheduleModeUpdateData(
  event: EventScheduleRecord,
  payload: AdminEventScheduleModePayload,
  targetKind: string,
): Prisma.EventUpdateInput {
  const data: Prisma.EventUpdateInput = {};

  if (payload.kind !== undefined) data.kind = payload.kind as EventKind;
  if (payload.scheduleLocked !== undefined) data.scheduleLocked = payload.scheduleLocked;
  if (payload.defaultCapacityTotal !== undefined) data.defaultCapacityTotal = payload.defaultCapacityTotal;
  if (payload.salesStartsAt !== undefined) data.salesStartsAt = toDateOrNull(payload.salesStartsAt);
  if (payload.salesEndsAt !== undefined) data.salesEndsAt = toDateOrNull(payload.salesEndsAt);

  if (targetKind === 'OPEN_DATE') {
    if (payload.openDateValidFrom !== undefined) data.openDateValidFrom = toDateOrNull(payload.openDateValidFrom);
    if (payload.openDateValidTo !== undefined) data.openDateValidTo = toDateOrNull(payload.openDateValidTo);
    if (payload.openDateValidDays !== undefined) data.openDateValidDays = payload.openDateValidDays;
  } else if (payload.kind && payload.kind !== 'OPEN_DATE' && event.kind === 'OPEN_DATE') {
    data.openDateValidFrom = null;
    data.openDateValidTo = null;
    data.openDateValidDays = null;
  }

  return data;
}

function buildEventSessionUpdateData(
  session: EventSessionRecord,
  payload: AdminEventScheduleSessionPatchPayload,
): Prisma.EventSessionUpdateInput {
  const data: Prisma.EventSessionUpdateInput = {};

  if (payload.startsAt !== undefined) data.startsAt = new Date(payload.startsAt);
  if (payload.endsAt !== undefined) data.endsAt = toDateOrNull(payload.endsAt);
  if (payload.priceFromRub !== undefined) data.priceFromRub = payload.priceFromRub;
  if (payload.ticketsVacant !== undefined) data.ticketsVacant = payload.ticketsVacant;
  if (payload.capacityTotal !== undefined) data.capacityTotal = payload.capacityTotal;

  if (payload.isActive !== undefined) {
    if (!payload.isActive && session.capacitySold > 0) {
      throw new AdminEventScheduleError('SESSION_HAS_SALES', 'session_has_sales', 409);
    }
    data.isActive = payload.isActive;
    data.cancelledAt = payload.isActive ? null : new Date();
    data.cancelReason = payload.isActive ? null : (payload.cancelReason || 'admin_disabled');
  } else if (payload.cancelReason !== undefined) {
    data.cancelReason = payload.cancelReason;
  }

  return data;
}

function hasMergedOpenDateValidity(
  event: EventScheduleRecord,
  payload: AdminEventScheduleModePayload,
  targetKind: string,
): boolean {
  if (targetKind !== 'OPEN_DATE') return false;
  const validFrom = payload.openDateValidFrom !== undefined ? payload.openDateValidFrom : toIso(event.openDateValidFrom);
  const validTo = payload.openDateValidTo !== undefined ? payload.openDateValidTo : toIso(event.openDateValidTo);
  const validDays = payload.openDateValidDays !== undefined ? payload.openDateValidDays : event.openDateValidDays;
  return Boolean(validFrom || validTo || validDays);
}

function openDateFieldTouched(payload: AdminEventScheduleModePayload): boolean {
  return payload.openDateValidFrom !== undefined
    || payload.openDateValidTo !== undefined
    || payload.openDateValidDays !== undefined;
}

function mapSession(session: EventSessionRecord): AdminEventScheduleSessionDto {
  return {
    id: session.id,
    startsAt: toIso(session.startsAt),
    endsAt: toIso(session.endsAt),
    sourceStatus: session.sourceStatus ?? null,
    priceFromRub: session.priceFromRub ?? null,
    ticketsVacant: session.ticketsVacant ?? null,
    capacityTotal: session.capacityTotal ?? null,
    capacitySold: session.capacitySold,
    isActive: session.isActive,
    cancelledAt: toIso(session.cancelledAt),
    cancelReason: session.cancelReason ?? null,
    externalId: session.externalId ?? null,
    hasSales: session.capacitySold > 0,
  };
}

function mapValidationSessions(sessions: EventSessionRecord[]): Array<{ id: string; startsAt?: string | null }> {
  return sessions
    .filter((session) => session.isActive)
    .map((session) => ({ id: session.id, startsAt: toIso(session.startsAt) }));
}

function eventIdentityWhere(idOrSlug: string): Prisma.EventWhereInput {
  return {
    OR: [
      { id: idOrSlug },
      { slug: idOrSlug },
    ],
  };
}

async function writeScheduleLog(
  tx: Prisma.TransactionClient,
  event: { id: string; supplierId?: string | null },
  diff: Record<string, unknown>,
): Promise<void> {
  await tx.eventChangeLog.create({
    data: {
      eventId: event.id,
      supplierId: event.supplierId ?? null,
      actorType: 'ADMIN',
      action: 'SCHEDULE_CHANGED',
      diff: diff as Prisma.InputJsonValue,
      metaJson: { source: 'admin-event-schedule' },
    },
  });
}

async function touchEvent(tx: Prisma.TransactionClient, eventId: string): Promise<void> {
  await tx.event.update({
    where: { id: eventId },
    data: { updatedAt: new Date() },
  });
}

function toDateOrNull(value: string | Date | null | undefined): Date | null {
  if (value == null) return null;
  return value instanceof Date ? value : new Date(value);
}

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parseTime(value: string | Date | null | undefined): number | null {
  if (!value) return null;
  const time = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

function sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  );
}
