import type {
  EventActorType,
  EventChangeLogAction,
  EventChangeRequestStatus,
  EventChangeRequestType,
  EventKind,
  EventManagementMode,
  PublishStatus,
} from '@daibilet/db';
import { prisma } from '@daibilet/db';
import {
  assertEventChangeRequestPayload,
  type EventChangeRequestPayload,
} from './event-change-request-payload.js';
import { validateEventChangeRequestTransition } from './event-change-request-state.js';

export interface ApplyEventChangeRequestInput {
  requestId: string;
  actorSiteUserId?: string | null;
}

export interface ApplyEventChangeRequestResult {
  requestId: string;
  eventId: string;
  status: 'APPLIED';
  appliedAt: string;
  logAction: EventChangeLogAction;
}

export class EventChangeRequestApplyError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(code: string, message: string, statusCode = 400) {
    super(message);
    this.name = 'EventChangeRequestApplyError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export interface EventChangeRequestApplierClient {
  $transaction<T>(fn: (tx: EventChangeRequestTransaction) => Promise<T>): Promise<T>;
}

export interface EventChangeRequestTransaction {
  eventChangeRequest: {
    findUnique(args: unknown): Promise<EventChangeRequestRecord | null>;
    update(args: unknown): Promise<unknown>;
  };
  event: {
    update(args: unknown): Promise<unknown>;
  };
  eventOverride: {
    upsert(args: unknown): Promise<unknown>;
  };
  eventSession: {
    deleteMany(args: unknown): Promise<unknown>;
    createMany(args: unknown): Promise<unknown>;
  };
  eventOffer: {
    updateMany(args: unknown): Promise<{ count: number } | unknown>;
    create(args: unknown): Promise<unknown>;
  };
  eventChangeLog: {
    create(args: unknown): Promise<unknown>;
  };
}

export interface EventChangeRequestRecord {
  id: string;
  eventId: string | null;
  supplierId: string | null;
  type: EventChangeRequestType;
  status: EventChangeRequestStatus;
  payload: unknown;
  event: EventChangeRequestEventRecord | null;
}

export interface EventChangeRequestEventRecord {
  id: string;
  updatedAt: Date | string;
  managementMode: EventManagementMode;
  scheduleLocked: boolean;
}

export async function applyApprovedEventChangeRequest(
  input: ApplyEventChangeRequestInput,
  client: EventChangeRequestApplierClient = prisma as unknown as EventChangeRequestApplierClient,
): Promise<ApplyEventChangeRequestResult> {
  return client.$transaction(async (tx) => {
    const request = await tx.eventChangeRequest.findUnique({
      where: { id: input.requestId },
      include: { event: true },
    });
    if (!request) {
      throw new EventChangeRequestApplyError(
        'EVENT_CHANGE_REQUEST_NOT_FOUND',
        'Event change request was not found.',
        404,
      );
    }

    if (request.type === 'CREATE') {
      throw new EventChangeRequestApplyError(
        'EVENT_CHANGE_CREATE_UNSUPPORTED',
        'Applying CREATE requests is not enabled yet.',
        501,
      );
    }

    if (!request.eventId || !request.event) {
      throw new EventChangeRequestApplyError(
        'EVENT_CHANGE_REQUEST_EVENT_REQUIRED',
        'Existing event change request must be linked to an event.',
        409,
      );
    }

    const transitionResult = validateEventChangeRequestTransition({
      currentStatus: request.status,
      action: 'apply',
      actorType: 'SYSTEM',
      requestType: request.type,
      managementMode: request.event.managementMode,
      scheduleLocked: request.event.scheduleLocked,
    });
    if (!transitionResult.ok) {
      throw new EventChangeRequestApplyError(
        transitionResult.code,
        transitionResult.message,
        transitionResult.code === 'INVALID_TRANSITION' ? 409 : 400,
      );
    }
    const { transition } = transitionResult;

    const payload = assertEventChangeRequestPayload(request.type, request.payload, { mode: 'apply' });
    assertFreshBaseSnapshot(payload, request.event.updatedAt);

    await applyPayload(tx, request.eventId, request.type, payload);

    const appliedAt = new Date();
    const logAction = logActionForRequestType(request.type);
    await tx.eventChangeRequest.update({
      where: { id: request.id },
      data: {
        status: transition.to,
        appliedAt,
      },
    });
    await tx.eventChangeLog.create({
      data: {
        eventId: request.eventId,
        supplierId: request.supplierId,
        actorType: 'SYSTEM' satisfies EventActorType,
        actorSiteUserId: input.actorSiteUserId ?? null,
        action: logAction,
        diff: {
          requestId: request.id,
          requestType: request.type,
        },
        metaJson: {
          source: 'event-change-request-applier',
        },
      },
    });

    return {
      requestId: request.id,
      eventId: request.eventId,
      status: 'APPLIED',
      appliedAt: appliedAt.toISOString(),
      logAction,
    };
  });
}

async function applyPayload(
  tx: EventChangeRequestTransaction,
  eventId: string,
  type: EventChangeRequestType,
  payload: EventChangeRequestPayload,
): Promise<void> {
  switch (type) {
    case 'UPDATE':
      await applyCompositeUpdate(tx, eventId, payload as CompositeUpdatePayload);
      return;
    case 'CONTENT_UPDATE':
      await applyContentUpdate(tx, eventId, payload as ContentUpdatePayload);
      return;
    case 'MEDIA_UPDATE':
      await applyMediaUpdate(tx, eventId, payload as MediaUpdatePayload);
      return;
    case 'SEO_UPDATE':
      await applySeoUpdate(tx, eventId, payload as SeoUpdatePayload);
      return;
    case 'SCHEDULE_UPDATE':
      await applyScheduleUpdate(tx, eventId, payload as ScheduleUpdatePayload);
      return;
    case 'OFFER_UPDATE':
      await applyOfferUpdate(tx, eventId, payload as OfferUpdatePayload);
      return;
    case 'PUBLISH':
      await applyStatusUpdate(tx, eventId, 'PUBLISHED');
      return;
    case 'UNPUBLISH':
    case 'ARCHIVE':
    case 'DELETE':
      await applyStatusUpdate(tx, eventId, 'HIDDEN');
      return;
    case 'CREATE':
      throw new EventChangeRequestApplyError(
        'EVENT_CHANGE_CREATE_UNSUPPORTED',
        'Applying CREATE requests is not enabled yet.',
        501,
      );
  }
}

async function applyCompositeUpdate(
  tx: EventChangeRequestTransaction,
  eventId: string,
  payload: CompositeUpdatePayload,
): Promise<void> {
  if (payload.content) await applyContentUpdate(tx, eventId, payload.content);
  if (payload.media) await applyMediaUpdate(tx, eventId, payload.media);
  if (payload.seo) await applySeoUpdate(tx, eventId, payload.seo);
}

async function applyContentUpdate(
  tx: EventChangeRequestTransaction,
  eventId: string,
  payload: ContentUpdatePayload,
): Promise<void> {
  if (payload.contentBlocks?.length) {
    throw new EventChangeRequestApplyError(
      'CONTENT_BLOCK_APPLY_UNSUPPORTED',
      'Content block apply is not enabled until the content block storage is connected.',
      501,
    );
  }

  const overrideData = pickDefined({
    title: payload.title,
    description: payload.description,
    shortDescription: payload.shortDescription,
  });
  if (Object.keys(overrideData).length > 0) await upsertEventOverride(tx, eventId, overrideData);

  const eventData = pickDefined({ ageLimit: payload.ageLimit });
  if (Object.keys(eventData).length > 0) {
    await tx.event.update({ where: { id: eventId }, data: eventData });
  }
}

async function applyMediaUpdate(
  tx: EventChangeRequestTransaction,
  eventId: string,
  payload: MediaUpdatePayload,
): Promise<void> {
  if (payload.gallery?.length) {
    throw new EventChangeRequestApplyError(
      'GALLERY_APPLY_UNSUPPORTED',
      'Gallery apply is not enabled until media storage is connected.',
      501,
    );
  }

  const overrideData = pickDefined({ imageUrl: payload.imageUrl });
  if (Object.keys(overrideData).length > 0) await upsertEventOverride(tx, eventId, overrideData);
}

async function applySeoUpdate(
  tx: EventChangeRequestTransaction,
  eventId: string,
  payload: SeoUpdatePayload,
): Promise<void> {
  const overrideData = pickDefined({
    seoH1: payload.seoH1,
    seoTitle: payload.seoTitle,
    seoDescription: payload.seoDescription,
    canonicalPath: payload.canonicalPath,
    isIndexable: payload.isIndexable,
  });
  if (Object.keys(overrideData).length > 0) await upsertEventOverride(tx, eventId, overrideData);
}

async function applyScheduleUpdate(
  tx: EventChangeRequestTransaction,
  eventId: string,
  payload: ScheduleUpdatePayload,
): Promise<void> {
  const eventData = pickDefined({
    kind: payload.mode as EventKind,
    defaultCapacityTotal: payload.defaultCapacityTotal,
    openDateValidFrom: payload.openDate?.validFrom ? new Date(payload.openDate.validFrom) : payload.mode === 'OPEN_DATE' ? null : undefined,
    openDateValidTo: payload.openDate?.validTo ? new Date(payload.openDate.validTo) : payload.mode === 'OPEN_DATE' ? null : undefined,
    openDateValidDays: payload.openDate?.validDays ?? (payload.mode === 'OPEN_DATE' ? null : undefined),
    salesStartsAt: payload.salesPolicy?.salesStartsAt ? new Date(payload.salesPolicy.salesStartsAt) : undefined,
    salesEndsAt: payload.salesPolicy?.salesEndsAt ? new Date(payload.salesPolicy.salesEndsAt) : undefined,
    scheduleLocked: false,
  });

  if (payload.mode !== 'OPEN_DATE') {
    eventData.openDateValidFrom = null;
    eventData.openDateValidTo = null;
    eventData.openDateValidDays = null;
  }

  await tx.event.update({ where: { id: eventId }, data: eventData });
  await tx.eventSession.deleteMany({ where: { eventId } });

  if (payload.mode === 'OPEN_DATE') return;

  await tx.eventSession.createMany({
    data: (payload.sessions || []).map((session) => ({
      id: session.id,
      eventId,
      startsAt: new Date(session.startsAt),
      endsAt: session.endsAt ? new Date(session.endsAt) : null,
      capacityTotal: session.capacityTotal ?? payload.defaultCapacityTotal ?? null,
      isActive: session.isActive ?? true,
      cancelReason: session.cancelReason ?? null,
    })),
  });
}

async function applyOfferUpdate(
  tx: EventChangeRequestTransaction,
  eventId: string,
  payload: OfferUpdatePayload,
): Promise<void> {
  if (payload.mode === 'REPLACE_ALL') {
    await tx.eventOffer.updateMany({
      where: { eventId, active: true },
      data: { active: false },
    });
  }

  let minPrice: number | null = null;
  for (const offer of payload.offers) {
    minPrice = minPrice == null ? offer.priceRub : Math.min(minPrice, offer.priceRub);
    const data = {
      title: offer.title,
      priceRub: offer.priceRub,
      oldPriceRub: offer.oldPriceRub ?? null,
      capacityTotal: offer.capacityTotal ?? null,
      groupSize: offer.groupSize ?? 1,
      weekdayMask: offer.weekdayMask ?? null,
      active: offer.active ?? true,
    };

    if (offer.id) {
      const result = await tx.eventOffer.updateMany({
        where: { id: offer.id, eventId },
        data,
      }) as { count?: number };
      if (result.count === 0) {
        throw new EventChangeRequestApplyError(
          'EVENT_OFFER_NOT_FOUND',
          `Ticket offer ${offer.id} was not found for this event.`,
          404,
        );
      }
      continue;
    }

    await tx.eventOffer.create({
      data: {
        eventId,
        sourceCode: 'MANUAL',
        ...data,
      },
    });
  }

  if (minPrice != null) {
    await tx.event.update({
      where: { id: eventId },
      data: { priceFromRub: minPrice },
    });
  }
}

async function applyStatusUpdate(
  tx: EventChangeRequestTransaction,
  eventId: string,
  status: PublishStatus,
): Promise<void> {
  await tx.event.update({ where: { id: eventId }, data: { status } });
}

async function upsertEventOverride(
  tx: EventChangeRequestTransaction,
  eventId: string,
  data: Record<string, unknown>,
): Promise<void> {
  await tx.eventOverride.upsert({
    where: { eventId },
    create: { eventId, ...data },
    update: data,
  });
}

function assertFreshBaseSnapshot(payload: EventChangeRequestPayload, eventUpdatedAt: Date | string): void {
  const snapshot = payload as { baseSnapshot?: { eventUpdatedAt?: string } };
  const snapshotTime = snapshot.baseSnapshot?.eventUpdatedAt
    ? Date.parse(snapshot.baseSnapshot.eventUpdatedAt)
    : Number.NaN;
  const eventTime = new Date(eventUpdatedAt).getTime();
  if (!Number.isFinite(snapshotTime) || snapshotTime !== eventTime) {
    throw new EventChangeRequestApplyError(
      'EVENT_CHANGE_REQUEST_STALE',
      'Event was changed after this change request was created.',
      409,
    );
  }
}

function logActionForRequestType(type: EventChangeRequestType): EventChangeLogAction {
  switch (type) {
    case 'SCHEDULE_UPDATE':
      return 'SCHEDULE_CHANGED';
    case 'OFFER_UPDATE':
      return 'OFFER_CHANGED';
    case 'PUBLISH':
      return 'PUBLISHED';
    case 'UNPUBLISH':
      return 'UNPUBLISHED';
    case 'ARCHIVE':
      return 'ARCHIVED';
    case 'DELETE':
      return 'DELETED';
    case 'CREATE':
      return 'CREATED';
    case 'UPDATE':
    case 'CONTENT_UPDATE':
    case 'MEDIA_UPDATE':
    case 'SEO_UPDATE':
      return 'UPDATED';
  }
}

function pickDefined<T extends Record<string, unknown>>(data: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

type BasePayload = {
  baseSnapshot?: { eventUpdatedAt?: string };
};

type ContentUpdatePayload = BasePayload & {
  title?: string;
  description?: string | null;
  shortDescription?: string | null;
  ageLimit?: string | null;
  contentBlocks?: unknown[];
};

type MediaUpdatePayload = BasePayload & {
  imageUrl?: string | null;
  gallery?: unknown[];
};

type SeoUpdatePayload = BasePayload & {
  seoH1?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  canonicalPath?: string | null;
  isIndexable?: boolean;
};

type CompositeUpdatePayload = BasePayload & {
  content?: ContentUpdatePayload;
  media?: MediaUpdatePayload;
  seo?: SeoUpdatePayload;
};

type ScheduleUpdatePayload = BasePayload & {
  mode: 'SINGLE' | 'RECURRING' | 'OPEN_DATE';
  sessions?: Array<{
    id?: string;
    startsAt: string;
    endsAt?: string;
    capacityTotal?: number;
    isActive?: boolean;
    cancelReason?: string | null;
  }>;
  openDate?: {
    validFrom?: string;
    validTo?: string;
    validDays?: number;
  };
  salesPolicy?: {
    salesStartsAt?: string;
    salesEndsAt?: string;
    stopSalesBeforeMinutes?: number;
  };
  defaultCapacityTotal?: number;
};

type OfferUpdatePayload = BasePayload & {
  mode: 'UPSERT_LIST' | 'REPLACE_ALL';
  offers: Array<{
    id?: string;
    title: string;
    priceRub: number;
    oldPriceRub?: number | null;
    capacityTotal?: number | null;
    groupSize?: number;
    weekdayMask?: number | null;
    active?: boolean;
  }>;
};
