import { z } from 'zod';

export const DESTINATION_PDP_STATUSES = ['DRAFT', 'REVIEW', 'READY', 'PUBLISHED', 'HIDDEN'] as const;
export type DestinationPdpStatus = (typeof DESTINATION_PDP_STATUSES)[number];
export type DestinationPdpType = 'CITY' | 'REGION';

export const destinationPdpStatusPayloadSchema = z.object({
  status: z.enum(['DRAFT', 'REVIEW', 'READY', 'HIDDEN']),
  changeNote: z.string().trim().max(1000).nullable().optional(),
}).strict();

export const createDestinationRegionPayloadSchema = z.object({
  title: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
}).strict();

export interface DestinationPdpPlaceItem {
  name: string;
  description?: string | null;
  cityName?: string | null;
  address?: string | null;
  href?: string | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
  sourceUrl?: string | null;
}

export interface DestinationPdpSuburbItem extends DestinationPdpPlaceItem {
  travelVector?: string | null;
  travelTime?: string | null;
}

export interface DestinationPdpRouteItem {
  title: string;
  description?: string | null;
  duration?: string | null;
  distance?: string | null;
  stops?: string[];
  imageUrl?: string | null;
  sourceUrl?: string | null;
}

export interface DestinationPdpFaqItem {
  question: string;
  answer: string;
  sourceUrl?: string | null;
}

export interface DestinationPdpMediaItem {
  url: string;
  alt: string;
  caption?: string | null;
  credit?: string | null;
  sourceUrl?: string | null;
}

export interface DestinationPdpSourceItem {
  title: string;
  url: string;
  checkedAt?: string | null;
}

export interface PublishedDestinationPdpDto {
  version: number;
  summary: string | null;
  heroImageUrl: string | null;
  seoH1: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalPath: string | null;
  isIndexable: boolean;
  publishedAt: string | null;
  content: DestinationPdpContent;
}

/**
 * Structured editor content for city and regional hubs. Catalogue counts,
 * schedules and commercial availability remain live data and never belong here.
 */
export type DestinationPdpContent = z.infer<typeof destinationPdpContentSchema>;

const text = (max: number) => z.string().trim().min(1).max(max);
const nullableText = (max: number) => z.string().trim().max(max).nullable().optional();
const urlOrLocalPath = z.string().trim().min(1).max(2048).refine((value) => {
  if (value.startsWith('/')) return !value.startsWith('//');
  return /^https?:\/\/[^/?#\s]+(?:[/?#][^\s]*)?$/i.test(value);
}, 'Expected an http(s) URL or a local absolute path');

const placeItemSchema = z.object({
  name: text(240),
  description: nullableText(3000),
  cityName: nullableText(160),
  address: nullableText(500),
  href: urlOrLocalPath.nullable().optional(),
  imageUrl: urlOrLocalPath.nullable().optional(),
  imageAlt: nullableText(300),
  sourceUrl: urlOrLocalPath.nullable().optional(),
}).strict();

const suburbItemSchema = placeItemSchema.extend({
  travelVector: nullableText(500),
  travelTime: nullableText(160),
}).strict();

const routeItemSchema = z.object({
  title: text(240),
  description: nullableText(3000),
  duration: nullableText(160),
  distance: nullableText(160),
  stops: z.array(text(240)).max(40).optional(),
  imageUrl: urlOrLocalPath.nullable().optional(),
  sourceUrl: urlOrLocalPath.nullable().optional(),
}).strict();

const faqItemSchema = z.object({
  question: text(500),
  answer: text(3000),
  sourceUrl: urlOrLocalPath.nullable().optional(),
}).strict();

const mediaItemSchema = z.object({
  url: urlOrLocalPath,
  alt: text(300),
  caption: nullableText(500),
  credit: nullableText(300),
  sourceUrl: urlOrLocalPath.nullable().optional(),
}).strict();

const sourceItemSchema = z.object({
  title: text(240),
  url: urlOrLocalPath,
  checkedAt: z.string().date().nullable().optional(),
}).strict();

export const destinationPdpContentSchema = z.object({
  introTitle: nullableText(240),
  introText: nullableText(8000),
  regionBrief: nullableText(5000),
  mustSee: z.array(placeItemSchema).max(100).optional(),
  sights: z.array(placeItemSchema).max(100).optional(),
  significantSuburbs: z.array(suburbItemSchema).max(100).optional(),
  regionTopPlaces: z.array(placeItemSchema).max(100).optional(),
  routes: z.array(routeItemSchema).max(100).optional(),
  travelText: nullableText(5000),
  faq: z.array(faqItemSchema).max(50).optional(),
  gallery: z.array(mediaItemSchema).max(40).optional(),
  sources: z.array(sourceItemSchema).max(100).optional(),
}).strict();

export const saveDestinationPdpPayloadSchema = z.object({
  summary: nullableText(3000),
  heroImageUrl: urlOrLocalPath.nullable().optional(),
  seoH1: nullableText(240),
  seoTitle: nullableText(300),
  seoDescription: nullableText(500),
  canonicalPath: nullableText(500),
  content: destinationPdpContentSchema,
  changeNote: nullableText(1000),
}).strict();

export const publishDestinationPdpPayloadSchema = z.object({
  isIndexable: z.boolean().default(false),
  changeNote: nullableText(1000),
}).strict();

export type SaveDestinationPdpPayload = z.infer<typeof saveDestinationPdpPayloadSchema>;
export type PublishDestinationPdpPayload = z.infer<typeof publishDestinationPdpPayloadSchema>;
export type DestinationPdpStatusPayload = z.infer<typeof destinationPdpStatusPayloadSchema>;
export type CreateDestinationRegionPayload = z.infer<typeof createDestinationRegionPayloadSchema>;
