import { z } from 'zod';

const optionalString = z.string().trim().min(1).optional();
const nullableString = z.string().trim().min(1).nullable().optional();

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const publicCatalogQuerySchema = paginationQuerySchema.extend({
  q: optionalString,
  city: optionalString,
  category: optionalString,
  tag: optionalString,
  landing: optionalString,
  date: optionalString,
  from: optionalString,
  to: optionalString,
  sort: z.enum(['popular', 'departing_soon', 'price_asc', 'price_desc']).optional(),
  priceMax: z.coerce.number().int().min(0).optional(),
  refresh: z.coerce.number().int().min(0).max(1).optional(),
});

export const adminEventsQuerySchema = paginationQuerySchema.extend({
  q: optionalString,
  source: optionalString,
  readiness: z.enum(['ready', 'review', 'blocked']).optional(),
  city: optionalString,
  category: optionalString,
  landing: optionalString,
  status: optionalString,
});

export const adminOrdersQuerySchema = paginationQuerySchema.extend({
  q: optionalString,
  source: optionalString,
  status: optionalString,
  attention: z.coerce.number().int().min(0).max(1).optional(),
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
  editorStatus: nullableString,
});

export const landingMatchPayloadSchema = z.object({
  status: z.enum(['AUTO', 'PINNED', 'EXCLUDED', 'REVIEW']),
  note: nullableString,
});

export const orderTicketPayloadSchema = z.object({
  id: optionalString,
  sourceTicketId: nullableString,
  ticketNumber: nullableString,
  status: z.string().trim().min(1),
  title: nullableString,
  priceRub: z.coerce.number().int().min(0).nullable().optional(),
  holderName: nullableString,
});

export type PublicCatalogQuery = z.infer<typeof publicCatalogQuerySchema>;
export type AdminEventsQuery = z.infer<typeof adminEventsQuerySchema>;
export type AdminOrdersQuery = z.infer<typeof adminOrdersQuerySchema>;
export type EventOverridePayload = z.infer<typeof eventOverridePayloadSchema>;
export type LandingMatchPayload = z.infer<typeof landingMatchPayloadSchema>;
export type OrderTicketPayload = z.infer<typeof orderTicketPayloadSchema>;

