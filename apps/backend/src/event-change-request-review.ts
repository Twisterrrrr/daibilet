import type {
  EventActorType,
  EventChangeLogAction,
  EventChangeRequestStatus,
  EventChangeRequestType,
  EventManagementMode,
} from '@daibilet/db';
import { prisma } from '@daibilet/db';
import type { AdminEventChangeRequestActionDto } from '@daibilet/contracts/admin';
import {
  type EventChangeRequestAction,
  validateEventChangeRequestTransition,
} from './event-change-request-state.js';

export interface ReviewEventChangeRequestInput {
  requestId: string;
  action: 'approve' | 'reject';
  adminComment?: string | null | undefined;
  actorSiteUserId?: string | null | undefined;
}

export class EventChangeRequestReviewError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(code: string, message: string, statusCode = 400) {
    super(message);
    this.name = 'EventChangeRequestReviewError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export interface EventChangeRequestReviewClient {
  $transaction<T>(fn: (tx: EventChangeRequestReviewTransaction) => Promise<T>): Promise<T>;
}

export interface EventChangeRequestReviewTransaction {
  eventChangeRequest: {
    findUnique(args: unknown): Promise<EventChangeRequestReviewRecord | null>;
    update(args: unknown): Promise<EventChangeRequestReviewRecord>;
  };
  eventChangeLog: {
    create(args: unknown): Promise<unknown>;
  };
}

export interface EventChangeRequestReviewRecord {
  id: string;
  eventId: string | null;
  supplierId: string | null;
  type: EventChangeRequestType;
  status: EventChangeRequestStatus;
  event: {
    id: string;
    managementMode: EventManagementMode;
    scheduleLocked: boolean;
  } | null;
}

export async function reviewEventChangeRequest(
  input: ReviewEventChangeRequestInput,
  client: EventChangeRequestReviewClient = prisma as unknown as EventChangeRequestReviewClient,
): Promise<AdminEventChangeRequestActionDto> {
  if (input.action === 'reject' && !input.adminComment?.trim()) {
    throw new EventChangeRequestReviewError(
      'EVENT_CHANGE_REJECT_REASON_REQUIRED',
      'Rejecting an event change request requires an admin comment.',
      400,
    );
  }

  return client.$transaction(async (tx) => {
    const request = await tx.eventChangeRequest.findUnique({
      where: { id: input.requestId },
      include: { event: true },
    });
    if (!request) {
      throw new EventChangeRequestReviewError(
        'EVENT_CHANGE_REQUEST_NOT_FOUND',
        'Event change request was not found.',
        404,
      );
    }

    const transition = transitionForAdminAction(request, input.action);
    const reviewedAt = new Date();
    const updated = await tx.eventChangeRequest.update({
      where: { id: request.id },
      data: {
        status: transition.to,
        reviewedAt,
        reviewedBySiteUserId: input.actorSiteUserId ?? null,
        adminComment: input.adminComment?.trim() || null,
      },
    });

    if (request.eventId) {
      await tx.eventChangeLog.create({
        data: {
          eventId: request.eventId,
          supplierId: request.supplierId,
          actorType: 'ADMIN' satisfies EventActorType,
          actorSiteUserId: input.actorSiteUserId ?? null,
          action: transition.logAction,
          diff: {
            requestId: request.id,
            requestType: request.type,
            from: transition.from,
            to: transition.to,
          },
          metaJson: {
            adminComment: input.adminComment?.trim() || null,
          },
        },
      });
    }

    const result: AdminEventChangeRequestActionDto = {
      requestId: updated.id,
      status: updated.status,
      reviewedAt: reviewedAt.toISOString(),
      logAction: transition.logAction,
    };
    if (transition.noOp !== undefined) result.noOp = transition.noOp;
    return result;
  });
}

function transitionForAdminAction(
  request: EventChangeRequestReviewRecord,
  action: EventChangeRequestAction,
) {
  const transitionResult = validateEventChangeRequestTransition({
    currentStatus: request.status,
    action,
    actorType: 'ADMIN',
    requestType: request.type,
    managementMode: request.event?.managementMode ?? 'DAIBILET_MANAGED',
    scheduleLocked: request.event?.scheduleLocked ?? false,
  });

  if (!transitionResult.ok) {
    throw new EventChangeRequestReviewError(
      transitionResult.code,
      transitionResult.message,
      transitionResult.code === 'INVALID_TRANSITION' ? 409 : 400,
    );
  }

  return transitionResult.transition;
}
