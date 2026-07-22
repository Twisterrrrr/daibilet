import { z } from 'zod';

const optionalString = z.string().trim().min(1).optional();
const nullableString = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim() || null : value),
  z.string().nullable().optional(),
);
const optionalFlag = z.coerce.number().int().min(0).max(1).optional();
const idList = z.array(z.string().trim().min(1)).max(100).optional();
/** Comma-separated or repeated `ids=` query → favorites / by-key lookup (max 50). */
const csvIdList = z.preprocess((value) => {
  if (value == null || value === '') return undefined;
  const parts = Array.isArray(value)
    ? value.flatMap((item) => String(item).split(','))
    : String(value).split(',');
  const cleaned = parts.map((item) => item.trim()).filter(Boolean);
  return cleaned.length ? cleaned.slice(0, 50) : undefined;
}, z.array(z.string().min(1)).max(50).optional());
const publishStatus = z.enum(['DRAFT', 'REVIEW', 'READY', 'PUBLISHED', 'HIDDEN']);
const eventKind = z.enum(['SINGLE', 'RECURRING', 'OPEN_DATE']);
const nullableIsoDateTime = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim() || null : value),
  z.string().trim().refine((value) => !Number.isNaN(Date.parse(value)), {
    message: 'Expected a valid ISO date/time string',
  }).nullable().optional(),
);
const requiredIsoDateTime = z.string().trim().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: 'Expected a valid ISO date/time string',
}).refine((value) => /^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/.test(value), {
  message: 'Expected ISO date/time with timezone',
});
const nullablePositiveInt = z.coerce.number().int().positive().nullable().optional();
const nullableMoneyRub = z.coerce.number().int().min(0).max(10_000_000).nullable().optional();
const nullableNonNegativeInt = z.coerce.number().int().min(0).nullable().optional();

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(300).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  page: z.coerce.number().int().min(1).optional(),
});

export const publicCatalogQuerySchema = paginationQuerySchema.extend({
  q: optionalString,
  destination: optionalString,
  city: optionalString,
  category: optionalString,
  tag: optionalString,
  landing: optionalString,
  date: optionalString,
  from: optionalString,
  to: optionalString,
  sort: z.enum(['time', 'price', 'popular', 'departing_soon', 'price_asc', 'price_desc']).optional(),
  view: z.enum(['cards', 'list', 'table']).optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  priceMax: z.coerce.number().int().min(0).optional(),
  ageMax: z.coerce.number().int().min(-1).max(99).optional(),
  refresh: optionalFlag,
  ids: csvIdList,
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const adminEventsQuerySchema = paginationQuerySchema.extend({
  q: optionalString,
  source: optionalString,
  readiness: z.enum(['ready', 'review', 'blocked']).optional(),
  city: optionalString,
  category: optionalString,
  landing: optionalString,
  status: optionalString,
  view: optionalString,
  refresh: optionalFlag,
});

export const adminOrdersQuerySchema = paginationQuerySchema.extend({
  q: optionalString,
  provider: optionalString,
  source: optionalString,
  status: optionalString,
  view: optionalString,
  attention: optionalFlag,
  refresh: optionalFlag,
});

export const lookupQuerySchema = z.object({
  lookup: optionalString,
});

export const searchQuerySchema = paginationQuerySchema.extend({
  q: optionalString,
  source: optionalString,
  city: optionalString,
  category: optionalString,
  refresh: optionalFlag,
});

export const eventOverridePayloadSchema = z.object({
  title: nullableString,
  description: nullableString,
  shortDescription: nullableString,
  imageUrl: nullableString,
  seoH1: nullableString,
  seoTitle: nullableString,
  seoDescription: nullableString,
  canonicalPath: nullableString,
  isIndexable: z.boolean().nullable().optional(),
  editorStatus: publishStatus.nullable().optional(),
});

export const eventModerationPayloadSchema = z.object({
  editorStatus: publishStatus,
});

export const adminEventScheduleModePayloadSchema = z.object({
  kind: eventKind.optional(),
  scheduleLocked: z.boolean().optional(),
  defaultCapacityTotal: nullablePositiveInt,
  openDateValidFrom: nullableIsoDateTime,
  openDateValidTo: nullableIsoDateTime,
  openDateValidDays: z.coerce.number().int().positive().max(3660).nullable().optional(),
  salesStartsAt: nullableIsoDateTime,
  salesEndsAt: nullableIsoDateTime,
}).strict().superRefine((payload, ctx) => {
  const keys = [
    'kind',
    'scheduleLocked',
    'defaultCapacityTotal',
    'openDateValidFrom',
    'openDateValidTo',
    'openDateValidDays',
    'salesStartsAt',
    'salesEndsAt',
  ];
  if (!keys.some((key) => (payload as Record<string, unknown>)[key] !== undefined)) {
    ctx.addIssue({ code: 'custom', message: 'At least one schedule field is required' });
  }
  if (payload.openDateValidFrom && payload.openDateValidTo && Date.parse(payload.openDateValidTo) <= Date.parse(payload.openDateValidFrom)) {
    ctx.addIssue({ code: 'custom', path: ['openDateValidTo'], message: 'Open-date validTo must be after validFrom' });
  }
  if (payload.salesStartsAt && payload.salesEndsAt && Date.parse(payload.salesEndsAt) <= Date.parse(payload.salesStartsAt)) {
    ctx.addIssue({ code: 'custom', path: ['salesEndsAt'], message: 'Sales end must be after sales start' });
  }
});

export const adminEventScheduleSessionCreatePayloadSchema = z.object({
  startsAt: requiredIsoDateTime,
  endsAt: nullableIsoDateTime,
  priceFromRub: nullableMoneyRub,
  ticketsVacant: nullableNonNegativeInt,
  capacityTotal: nullablePositiveInt,
  isActive: z.boolean().optional(),
}).strict().superRefine((session, ctx) => {
  if (session.endsAt && Date.parse(session.endsAt) <= Date.parse(session.startsAt)) {
    ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'Session end must be after start' });
  }
});

export const adminEventScheduleSessionPatchPayloadSchema = z.object({
  startsAt: requiredIsoDateTime.optional(),
  endsAt: nullableIsoDateTime,
  priceFromRub: nullableMoneyRub,
  ticketsVacant: nullableNonNegativeInt,
  capacityTotal: nullablePositiveInt,
  isActive: z.boolean().optional(),
  cancelReason: nullableString,
}).strict().superRefine((session, ctx) => {
  const keys = ['startsAt', 'endsAt', 'priceFromRub', 'ticketsVacant', 'capacityTotal', 'isActive', 'cancelReason'];
  if (!keys.some((key) => (session as Record<string, unknown>)[key] !== undefined)) {
    ctx.addIssue({ code: 'custom', message: 'At least one session field is required' });
  }
  if (session.startsAt && session.endsAt && Date.parse(session.endsAt) <= Date.parse(session.startsAt)) {
    ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'Session end must be after start' });
  }
});

export const adminEventScheduleSessionCancelPayloadSchema = z.object({
  reason: nullableString,
}).strict();

export const landingMatchPayloadSchema = z.object({
  status: z.enum(['PINNED', 'EXCLUDED', 'REVIEW']),
  note: nullableString,
  eventIds: idList,
  groupEventIds: idList,
});

export const orderTicketPayloadSchema = z.object({
  id: optionalString,
  ticketId: optionalString,
  externalTicketId: nullableString,
  number: nullableString,
  sourceTicketId: nullableString,
  ticketNumber: nullableString,
  status: optionalString,
  ticketStatus: optionalString,
  eventId: nullableString,
  sessionId: nullableString,
  title: nullableString,
  priceRub: z.coerce.number().int().min(0).nullable().optional(),
  holderName: nullableString,
});

export type PublicCatalogQuery = z.infer<typeof publicCatalogQuerySchema>;
export type AdminEventsQuery = z.infer<typeof adminEventsQuerySchema>;
export type AdminOrdersQuery = z.infer<typeof adminOrdersQuerySchema>;
export type LookupQuery = z.infer<typeof lookupQuerySchema>;
export type SearchQuery = z.infer<typeof searchQuerySchema>;
export type EventOverridePayload = z.infer<typeof eventOverridePayloadSchema>;
export type EventModerationPayload = z.infer<typeof eventModerationPayloadSchema>;
export type AdminEventScheduleModePayload = z.infer<typeof adminEventScheduleModePayloadSchema>;
export type AdminEventScheduleSessionCreatePayload = z.infer<typeof adminEventScheduleSessionCreatePayloadSchema>;
export type AdminEventScheduleSessionPatchPayload = z.infer<typeof adminEventScheduleSessionPatchPayloadSchema>;
export type AdminEventScheduleSessionCancelPayload = z.infer<typeof adminEventScheduleSessionCancelPayloadSchema>;
export type LandingMatchPayload = z.infer<typeof landingMatchPayloadSchema>;
export type OrderTicketPayload = z.infer<typeof orderTicketPayloadSchema>;
