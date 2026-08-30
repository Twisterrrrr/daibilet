import { z } from 'zod';

import { CATALOG_PAGE_SIZE_MAX } from './catalog';

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
  sort: z.enum(['time', 'price', 'popular', 'departing_soon', 'price_asc', 'price_desc', 'random']).optional(),
  view: z.enum(['cards', 'list', 'table']).optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  priceMax: z.coerce.number().int().min(0).optional(),
  ageMax: z.coerce.number().int().min(-1).max(99).optional(),
  refresh: optionalFlag,
  ids: csvIdList,
  limit: z.coerce.number().int().min(1).max(CATALOG_PAGE_SIZE_MAX).optional(),
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
export type LandingMatchPayload = z.infer<typeof landingMatchPayloadSchema>;
export type OrderTicketPayload = z.infer<typeof orderTicketPayloadSchema>;
