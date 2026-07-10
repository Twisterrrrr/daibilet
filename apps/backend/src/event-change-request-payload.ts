import type { EventChangeRequestType } from '@daibilet/db';
import { z } from 'zod';

export interface EventChangeRequestPayloadIssue {
  path: string;
  message: string;
}

export type EventChangeRequestPayloadValidationMode = 'draft' | 'apply';

export interface EventChangeRequestPayloadValidationOptions {
  mode?: EventChangeRequestPayloadValidationMode;
}

export type EventChangeRequestPayloadValidationResult =
  | { ok: true; payload: EventChangeRequestPayload }
  | { ok: false; code: 'PAYLOAD_INVALID'; issues: EventChangeRequestPayloadIssue[] };

export class EventChangeRequestPayloadValidationError extends Error {
  readonly issues: EventChangeRequestPayloadIssue[];

  constructor(issues: EventChangeRequestPayloadIssue[]) {
    super('Event change request payload validation failed');
    this.name = 'EventChangeRequestPayloadValidationError';
    this.issues = issues;
  }
}

const stringId = z.string().trim().min(1).max(128);
const slug = z.string().trim().min(1).max(220).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const optionalText = (max = 8000) => z.preprocess(
  (value) => (typeof value === 'string' ? value.trim() || null : value),
  z.string().max(max).nullable().optional(),
);
const requiredText = (max = 8000) => z.string().trim().min(1).max(max);
const isoDateTime = z.string().trim().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: 'Expected a valid ISO date/time string',
}).refine((value) => /^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/.test(value), {
  message: 'Expected ISO date/time with timezone',
});
const timeOfDay = z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:mm time');
const ianaTimeZone = z.string().trim().min(1).max(80).refine(isValidTimeZone, {
  message: 'Expected a valid IANA timezone',
});

const baseSnapshotSchema = z.object({
  eventId: stringId.optional(),
  eventSlug: z.string().trim().min(1).max(260).optional(),
  eventUpdatedAt: isoDateTime.optional(),
}).strict();

const contentBlockSchema = z.object({
  type: z.string().trim().min(1).max(80),
  title: optionalText(200),
  content: requiredText(10000),
  sortOrder: z.number().int().min(0).max(1000).optional(),
}).strict();

const contentPayloadBaseSchema = z.object({
  baseSnapshot: baseSnapshotSchema.optional(),
  title: z.string().trim().min(1).max(300).optional(),
  description: optionalText(30000),
  shortDescription: optionalText(1000),
  ageLimit: optionalText(20),
  contentBlocks: z.array(contentBlockSchema).max(50).optional(),
}).strict();
const contentPayloadSchema = contentPayloadBaseSchema.superRefine(refineContentPayload);
const contentPatchSchema = contentPayloadBaseSchema.omit({ baseSnapshot: true }).superRefine(refineContentPayload);

const mediaItemSchema = z.object({
  url: requiredText(2048),
  alt: optionalText(300),
  sortOrder: z.number().int().min(0).max(1000).optional(),
}).strict();

const mediaPayloadBaseSchema = z.object({
  baseSnapshot: baseSnapshotSchema.optional(),
  imageUrl: optionalText(2048),
  gallery: z.array(mediaItemSchema).max(80).optional(),
}).strict();
const mediaPayloadSchema = mediaPayloadBaseSchema.superRefine(refineMediaPayload);
const mediaPatchSchema = mediaPayloadBaseSchema.omit({ baseSnapshot: true }).superRefine(refineMediaPayload);

const seoPayloadBaseSchema = z.object({
  baseSnapshot: baseSnapshotSchema.optional(),
  seoH1: optionalText(300),
  seoTitle: optionalText(300),
  seoDescription: optionalText(500),
  canonicalPath: optionalText(500),
  isIndexable: z.boolean().optional(),
}).strict();
const seoPayloadSchema = seoPayloadBaseSchema.superRefine(refineSeoPayload);
const seoPatchSchema = seoPayloadBaseSchema.omit({ baseSnapshot: true }).superRefine(refineSeoPayload);

const sessionPayloadSchema = z.object({
  id: stringId.optional(),
  startsAt: isoDateTime,
  endsAt: isoDateTime.optional(),
  capacityTotal: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
  cancelReason: optionalText(500),
}).strict().superRefine((session, ctx) => {
  if (session.endsAt && Date.parse(session.endsAt) <= Date.parse(session.startsAt)) {
    ctx.addIssue({
      code: 'custom',
      path: ['endsAt'],
      message: 'Session end must be after start',
    });
  }
});

const recurrenceRuleSchema = z.object({
  frequency: z.enum(['daily', 'weekly']),
  interval: z.number().int().min(1).max(365),
  byWeekday: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  times: z.array(timeOfDay).min(1).max(24),
  validFrom: isoDateTime.optional(),
  validTo: isoDateTime.optional(),
  count: z.number().int().positive().max(10000).optional(),
}).strict().superRefine((rule, ctx) => {
  if (rule.frequency === 'weekly' && (!rule.byWeekday || rule.byWeekday.length === 0)) {
    ctx.addIssue({
      code: 'custom',
      path: ['byWeekday'],
      message: 'Weekly recurrence requires at least one weekday',
    });
  }
  if (rule.validFrom && rule.validTo && Date.parse(rule.validTo) <= Date.parse(rule.validFrom)) {
    ctx.addIssue({
      code: 'custom',
      path: ['validTo'],
      message: 'Recurrence validTo must be after validFrom',
    });
  }
  if (!rule.validTo && !rule.count) {
    ctx.addIssue({
      code: 'custom',
      path: ['count'],
      message: 'Recurring schedule must have count or validTo',
    });
  }
});

const openDateSchema = z.object({
  validFrom: isoDateTime.optional(),
  validTo: isoDateTime.optional(),
  validDays: z.number().int().positive().max(3660).optional(),
}).strict().superRefine((openDate, ctx) => {
  if (!openDate.validFrom && !openDate.validTo && !openDate.validDays) {
    ctx.addIssue({
      code: 'custom',
      message: 'Open-date schedule requires validFrom, validTo or validDays',
    });
  }
  if (openDate.validFrom && openDate.validTo && Date.parse(openDate.validTo) <= Date.parse(openDate.validFrom)) {
    ctx.addIssue({
      code: 'custom',
      path: ['validTo'],
      message: 'Open-date validTo must be after validFrom',
    });
  }
});

const salesPolicySchema = z.object({
  salesStartsAt: isoDateTime.optional(),
  salesEndsAt: isoDateTime.optional(),
  stopSalesBeforeMinutes: z.number().int().min(0).max(525600).optional(),
}).strict().superRefine((policy, ctx) => {
  if (policy.salesStartsAt && policy.salesEndsAt && Date.parse(policy.salesEndsAt) <= Date.parse(policy.salesStartsAt)) {
    ctx.addIssue({
      code: 'custom',
      path: ['salesEndsAt'],
      message: 'Sales end must be after sales start',
    });
  }
});

const schedulePayloadBaseSchema = z.object({
  baseSnapshot: baseSnapshotSchema.optional(),
  mode: z.enum(['SINGLE', 'RECURRING', 'OPEN_DATE']),
  timezone: ianaTimeZone.optional(),
  sessions: z.array(sessionPayloadSchema).max(500).optional(),
  recurrenceRule: recurrenceRuleSchema.optional(),
  openDate: openDateSchema.optional(),
  salesPolicy: salesPolicySchema.optional(),
  defaultCapacityTotal: z.number().int().positive().optional(),
}).strict();
const schedulePayloadSchema = schedulePayloadBaseSchema.superRefine(refineSchedulePayload);
const schedulePatchSchema = schedulePayloadBaseSchema.omit({ baseSnapshot: true }).superRefine(refineSchedulePayload);

function refineContentPayload(payload: Record<string, unknown>, ctx: z.RefinementCtx) {
  requireAtLeastOneDefined(payload, ['title', 'description', 'shortDescription', 'ageLimit', 'contentBlocks'], ctx);
}

function refineMediaPayload(payload: Record<string, unknown>, ctx: z.RefinementCtx) {
  requireAtLeastOneDefined(payload, ['imageUrl', 'gallery'], ctx);
}

function refineSeoPayload(payload: Record<string, unknown>, ctx: z.RefinementCtx) {
  requireAtLeastOneDefined(payload, ['seoH1', 'seoTitle', 'seoDescription', 'canonicalPath', 'isIndexable'], ctx);
}

function refineSchedulePayload(payload: z.infer<typeof schedulePayloadBaseSchema>, ctx: z.RefinementCtx) {
  const sessions = payload.sessions ?? [];
  const starts = sessions.map((session) => Date.parse(session.startsAt));
  if (new Set(starts).size !== starts.length) {
    ctx.addIssue({
      code: 'custom',
      path: ['sessions'],
      message: 'Schedule contains duplicate startsAt values',
    });
  }

  if (payload.mode === 'OPEN_DATE') {
    if (sessions.length > 0 || payload.recurrenceRule) {
      ctx.addIssue({
        code: 'custom',
        message: 'Open-date event cannot contain fixed sessions or recurrence',
      });
    }
    if (!payload.openDate) {
      ctx.addIssue({
        code: 'custom',
        path: ['openDate'],
        message: 'Open-date payload requires openDate settings',
      });
    }
    return;
  }

  if (payload.openDate) {
    ctx.addIssue({
      code: 'custom',
      path: ['openDate'],
      message: 'Scheduled event cannot include openDate settings',
    });
  }

  if (payload.mode === 'SINGLE') {
    if (sessions.length !== 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['sessions'],
        message: 'Single event requires exactly one session',
      });
    }
    if (payload.recurrenceRule) {
      ctx.addIssue({
        code: 'custom',
        path: ['recurrenceRule'],
        message: 'Single event cannot include recurrence',
      });
    }
  }

  if (payload.mode === 'RECURRING' && sessions.length === 0 && !payload.recurrenceRule) {
    ctx.addIssue({
      code: 'custom',
      path: ['recurrenceRule'],
      message: 'Recurring event requires recurrenceRule or generated sessions',
    });
  }
}

const offerBaseSchema = z.object({
  id: stringId.optional(),
  title: requiredText(200),
  priceRub: z.number().int().min(0).max(10_000_000),
  oldPriceRub: z.number().int().min(0).max(10_000_000).nullable().optional(),
  capacityTotal: z.number().int().positive().nullable().optional(),
  groupSize: z.number().int().min(1).max(100).optional(),
  weekdayMask: z.number().int().min(1).max(127).nullable().optional(),
  active: z.boolean().optional(),
}).strict();
const offerSchema = offerBaseSchema.superRefine(refineOffer);

function refineOffer(offer: z.infer<typeof offerBaseSchema>, ctx: z.RefinementCtx) {
  if (offer.oldPriceRub != null && offer.oldPriceRub <= offer.priceRub) {
    ctx.addIssue({
      code: 'custom',
      path: ['oldPriceRub'],
      message: 'Old price must be greater than current price when specified',
    });
  }
}

const offersPayloadSchema = z.object({
  baseSnapshot: baseSnapshotSchema.optional(),
  mode: z.enum(['UPSERT_LIST', 'REPLACE_ALL']),
  offers: z.array(offerSchema).min(1).max(100),
}).strict().superRefine((payload, ctx) => {
  const seenIds = new Set<string>();
  const seenTitles = new Set<string>();
  for (const [index, offer] of payload.offers.entries()) {
    if (offer.id) {
      if (seenIds.has(offer.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['offers', index, 'id'],
          message: 'Duplicate offer id',
        });
      }
      seenIds.add(offer.id);
    }

    const title = offer.title.toLocaleLowerCase('ru-RU');
    if (seenTitles.has(title)) {
      ctx.addIssue({
        code: 'custom',
        path: ['offers', index, 'title'],
        message: 'Duplicate offer title',
      });
    }
    seenTitles.add(title);
  }
});

const adminReasonPayloadSchema = z.object({
  baseSnapshot: baseSnapshotSchema.optional(),
  reason: requiredText(1000),
}).strict();

const publishPayloadSchema = z.object({
  baseSnapshot: baseSnapshotSchema.optional(),
  note: optionalText(1000),
}).strict();

const eventIdentitySchema = z.object({
  title: requiredText(300),
  slug: slug.optional(),
  kind: z.enum(['SINGLE', 'RECURRING', 'OPEN_DATE']),
  description: optionalText(30000),
  shortDescription: optionalText(1000),
  ageLimit: optionalText(20),
  primaryCityId: stringId.optional(),
  venueId: stringId.nullable().optional(),
  categoryId: stringId.optional(),
  primarySubcategoryId: stringId.optional(),
}).strict();

const createPayloadSchema = z.object({
  baseSnapshot: baseSnapshotSchema.optional(),
  event: eventIdentitySchema,
  content: contentPatchSchema.optional(),
  media: mediaPatchSchema.optional(),
  seo: seoPatchSchema.optional(),
  schedule: schedulePatchSchema.optional(),
  offers: z.array(offerSchema).max(100).optional(),
}).strict().superRefine((payload, ctx) => {
  if (payload.schedule && payload.schedule.mode !== payload.event.kind) {
    ctx.addIssue({
      code: 'custom',
      path: ['schedule', 'mode'],
      message: 'Schedule mode must match event kind',
    });
  }
});

const updatePayloadSchema = z.object({
  baseSnapshot: baseSnapshotSchema.optional(),
  content: contentPatchSchema.optional(),
  media: mediaPatchSchema.optional(),
  seo: seoPatchSchema.optional(),
}).strict().superRefine((payload, ctx) => {
  requireAtLeastOneDefined(payload, ['content', 'media', 'seo'], ctx);
});

const payloadSchemas = {
  CREATE: createPayloadSchema,
  UPDATE: updatePayloadSchema,
  DELETE: adminReasonPayloadSchema,
  ARCHIVE: adminReasonPayloadSchema,
  PUBLISH: publishPayloadSchema,
  UNPUBLISH: adminReasonPayloadSchema,
  CONTENT_UPDATE: contentPayloadSchema,
  MEDIA_UPDATE: mediaPayloadSchema,
  SEO_UPDATE: seoPayloadSchema,
  SCHEDULE_UPDATE: schedulePayloadSchema,
  OFFER_UPDATE: offersPayloadSchema,
} satisfies Record<EventChangeRequestType, z.ZodType>;

export type EventChangeRequestPayload = z.infer<(typeof payloadSchemas)[EventChangeRequestType]>;

export function validateEventChangeRequestPayload(
  type: EventChangeRequestType,
  payload: unknown,
  options: EventChangeRequestPayloadValidationOptions = {},
): EventChangeRequestPayloadValidationResult {
  const schema = (payloadSchemas as Partial<Record<EventChangeRequestType, z.ZodType>>)[type];
  if (!schema) {
    return {
      ok: false,
      code: 'PAYLOAD_INVALID',
      issues: [{ path: 'type', message: `Unsupported event change request type: ${String(type)}` }],
    };
  }

  const result = schema.safeParse(payload);
  if (!result.success) return { ok: false, code: 'PAYLOAD_INVALID', issues: mapIssues(result.error) };

  const applyIssues = options.mode === 'apply'
    ? validateApplyPayload(type, result.data)
    : [];
  if (applyIssues.length > 0) {
    return { ok: false, code: 'PAYLOAD_INVALID', issues: applyIssues };
  }

  return { ok: true, payload: result.data as EventChangeRequestPayload };
}

export function assertEventChangeRequestPayload(
  type: EventChangeRequestType,
  payload: unknown,
  options: EventChangeRequestPayloadValidationOptions = {},
): unknown {
  const result = validateEventChangeRequestPayload(type, payload, options);
  if (result.ok) return result.payload;
  throw new EventChangeRequestPayloadValidationError(result.issues);
}

function validateApplyPayload(
  type: EventChangeRequestType,
  payload: unknown,
): EventChangeRequestPayloadIssue[] {
  const issues: EventChangeRequestPayloadIssue[] = [];
  const data = payload as { baseSnapshot?: { eventUpdatedAt?: string }; schedule?: unknown };

  if (isExistingEventMutation(type) && !data.baseSnapshot?.eventUpdatedAt) {
    issues.push({
      path: 'baseSnapshot.eventUpdatedAt',
      message: 'Apply mode requires baseSnapshot.eventUpdatedAt for existing event mutations',
    });
  }

  if (type === 'CREATE' && !data.schedule) {
    issues.push({
      path: 'schedule',
      message: 'Apply mode requires schedule for CREATE requests',
    });
  }

  const schedulePayload = type === 'SCHEDULE_UPDATE'
    ? payload as { mode?: string; timezone?: string; sessions?: unknown[]; recurrenceRule?: unknown }
    : type === 'CREATE'
      ? (payload as { schedule?: { mode?: string; timezone?: string; sessions?: unknown[]; recurrenceRule?: unknown } }).schedule
      : undefined;
  if (schedulePayload?.mode === 'RECURRING' && (!schedulePayload.sessions || schedulePayload.sessions.length === 0)) {
    issues.push({
      path: type === 'CREATE' ? 'schedule.sessions' : 'sessions',
      message: 'Apply mode requires generated sessions for recurring schedules',
    });
  }
  if (schedulePayload?.mode === 'RECURRING' && schedulePayload.recurrenceRule && !schedulePayload.timezone) {
    issues.push({
      path: type === 'CREATE' ? 'schedule.timezone' : 'timezone',
      message: 'Apply mode requires timezone for recurring schedule expansion',
    });
  }

  return issues;
}

function isExistingEventMutation(type: EventChangeRequestType): boolean {
  return type !== 'CREATE';
}

function requireAtLeastOneDefined(
  payload: Record<string, unknown>,
  keys: string[],
  ctx: z.RefinementCtx,
) {
  if (keys.some((key) => hasUsefulValue(payload[key]))) return;
  ctx.addIssue({
    code: 'custom',
    message: `At least one of ${keys.join(', ')} is required`,
  });
}

function hasUsefulValue(value: unknown): boolean {
  if (value == null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
}

function isValidTimeZone(value: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

function mapIssues(error: z.ZodError): EventChangeRequestPayloadIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.join('.') || 'payload',
    message: issue.message,
  }));
}
