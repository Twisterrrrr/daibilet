import type {
  EventChangeRequestType,
  Prisma,
} from '@daibilet/db';
import { prisma } from '@daibilet/db';
import type {
  SupplierPortalAdmissionChangeRequestCreateDto,
  SupplierPortalChangeRequestCreateResultDto,
  SupplierPortalChangeRequestRowDto,
  SupplierPortalChangeRequestsListDto,
  SupplierPortalChangeRequestSubject,
  SupplierPortalEventChangeRequestCreateDto,
  SupplierPortalOfferDraftDto,
} from '@daibilet/contracts/supplier';
import { z } from 'zod';
import { sendJson } from './http.js';
import type { RouteContext } from './routing.js';
import { authenticateAccessToken, parseBearerToken } from './user-auth.js';
import type { TypedRouteHandler } from './validated-handler.js';
import { parseJsonBody, parseSearchParams } from './validation.js';

export interface SupplierChangeRequestsRouteHandlerDependencies {
  resolveSearchParams: (context: RouteContext) => Promise<URLSearchParams>;
}

type JwtPayload = {
  sub?: string;
};

type ChangeRequestRow = Prisma.EventChangeRequestGetPayload<{
  include: {
    event: {
      select: {
        id: true;
        slug: true;
        title: true;
        status: true;
        updatedAt: true;
      };
    };
  };
}>;

type AdmissionProductLookup = {
  id: string;
  slug: string;
  title: string;
  status: string;
};

/** Routing keys come from SPA (`supplier`) or auth resolve (`supplierId`); must not fail .strict(). */
const listQuerySchema = z.object({
  supplier: z.string().trim().optional(),
  supplierId: z.string().trim().optional(),
  slug: z.string().trim().optional(),
  status: z.string().trim().optional(),
  subject: z.enum(['EVENT', 'ADMISSION_PRODUCT']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
}).strict();

export function parseSupplierChangeRequestsListQuery(searchParams: URLSearchParams) {
  return parseSearchParams(listQuerySchema, searchParams);
}

const nullableString = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim() || null : value),
  z.string().nullable().optional(),
);

const requiredString = (max = 300) => z.string().trim().min(1).max(max);
const optionalString = (max = 300) => z.preprocess(
  (value) => (typeof value === 'string' ? value.trim() || null : value),
  z.string().max(max).nullable().optional(),
);

const isoDateTime = z.string().trim().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: 'Expected valid ISO date/time',
});

const offerDraftSchema = z.object({
  title: requiredString(200),
  priceRub: z.coerce.number().int().min(0).max(10_000_000),
  oldPriceRub: z.coerce.number().int().min(0).max(10_000_000).nullable().optional(),
  capacityTotal: z.coerce.number().int().positive().nullable().optional(),
  groupSize: z.coerce.number().int().min(1).max(100).optional(),
  active: z.boolean().optional(),
}).strict();

const admissionProductDraftSchema = z.object({
  title: optionalString(300),
  shortTitle: optionalString(160),
  description: optionalString(30_000),
  shortDescription: optionalString(1000),
  type: z.enum([
    'MUSEUM_ENTRY',
    'GALLERY_ENTRY',
    'ART_SPACE_ENTRY',
    'EXHIBITION_ENTRY',
    'OBSERVATION_ENTRY',
    'PARK_ENTRY',
    'ATTRACTION_ENTRY',
    'ZOO_ENTRY',
    'AQUARIUM_ENTRY',
    'COMPLEX_ENTRY',
    'OTHER',
  ]).nullable().optional(),
  venueId: optionalString(128),
  validityMode: z.enum(['OPEN_DATE', 'FIXED_WINDOW', 'VALID_DAYS_AFTER_PURCHASE']).nullable().optional(),
  validFrom: isoDateTime.nullable().optional(),
  validTo: isoDateTime.nullable().optional(),
  validDaysAfterPurchase: z.coerce.number().int().positive().max(3660).nullable().optional(),
  ticketsVacant: z.coerce.number().int().min(0).nullable().optional(),
  imageUrl: optionalString(2048),
}).strict();

const admissionRequestSchema = z.object({
  admissionProductId: optionalString(128),
  title: optionalString(300),
  summary: optionalString(1000),
  admissionProduct: admissionProductDraftSchema,
  offers: z.array(offerDraftSchema).max(50).optional(),
}).strict().superRefine((payload, ctx) => {
  if (!payload.admissionProductId && !payload.admissionProduct.title) {
    ctx.addIssue({ code: 'custom', path: ['admissionProduct', 'title'], message: 'Название входного билета обязательно.' });
  }
  if (!payload.admissionProductId && !payload.admissionProduct.venueId) {
    ctx.addIssue({ code: 'custom', path: ['admissionProduct', 'venueId'], message: 'Площадка обязательна для нового входного билета.' });
  }
});

const eventDraftSchema = z.object({
  title: optionalString(300),
  kind: z.enum(['SINGLE', 'RECURRING', 'OPEN_DATE']).nullable().optional(),
  description: optionalString(30_000),
  shortDescription: optionalString(1000),
  ageLimit: optionalString(20),
  primaryCityId: optionalString(128),
  venueId: optionalString(128),
  categoryId: optionalString(128),
  primarySubcategoryId: optionalString(128),
  imageUrl: optionalString(2048),
}).strict();

const contentDraftSchema = z.object({
  title: optionalString(300),
  description: optionalString(30_000),
  shortDescription: optionalString(1000),
  ageLimit: optionalString(20),
}).strict();

const openDateDraftSchema = z.object({
  validFrom: isoDateTime.nullable().optional(),
  validTo: isoDateTime.nullable().optional(),
  validDays: z.coerce.number().int().positive().max(3660).nullable().optional(),
}).strict();

const sessionDraftSchema = z.object({
  startsAt: isoDateTime,
  endsAt: isoDateTime.nullable().optional(),
  capacityTotal: z.coerce.number().int().positive().nullable().optional(),
}).strict();

const scheduleDraftSchema = z.object({
  mode: z.enum(['SINGLE', 'RECURRING', 'OPEN_DATE']).nullable().optional(),
  openDate: openDateDraftSchema.nullable().optional(),
  sessions: z.array(sessionDraftSchema).max(100).optional(),
  defaultCapacityTotal: z.coerce.number().int().positive().nullable().optional(),
}).strict();

const eventRequestSchema = z.object({
  eventId: optionalString(128),
  type: z.enum(['CREATE', 'UPDATE', 'CONTENT_UPDATE', 'SCHEDULE_UPDATE', 'OFFER_UPDATE']).nullable().optional(),
  title: optionalString(300),
  summary: optionalString(1000),
  event: eventDraftSchema.optional(),
  content: contentDraftSchema.optional(),
  schedule: scheduleDraftSchema.optional(),
  offers: z.array(offerDraftSchema).max(100).optional(),
}).strict().superRefine((payload, ctx) => {
  if (!payload.eventId && !payload.event?.title) {
    ctx.addIssue({ code: 'custom', path: ['event', 'title'], message: 'Название события обязательно.' });
  }
  if (!payload.eventId && !payload.event?.kind) {
    ctx.addIssue({ code: 'custom', path: ['event', 'kind'], message: 'Тип события обязателен.' });
  }
});

export function createSupplierChangeRequestsRouteHandler(
  deps: SupplierChangeRequestsRouteHandlerDependencies,
): TypedRouteHandler {
  return async (context: RouteContext) => {
    if (!context.pathname.startsWith('/api/supplier/change-requests')) return false;

    const searchParams = await deps.resolveSearchParams(context);
    if (context.method === 'GET' && context.pathname === '/api/supplier/change-requests') {
      // Parse resolved params (supplierId after auth), not raw URL — SPA always sends ?supplier=.
      const query = parseSupplierChangeRequestsListQuery(searchParams);
      sendJson(context.response, await buildSupplierChangeRequestsList(searchParams, query));
      return true;
    }

    if (context.method === 'POST' && context.pathname === '/api/supplier/change-requests/admissions') {
      const payload = await parseJsonBody(admissionRequestSchema, context.request);
      sendJson(
        context.response,
        await createSupplierAdmissionChangeRequest(searchParams, normalizeAdmissionRequest(payload), siteUserIdFromBearer(context)),
        { statusCode: 201 },
      );
      return true;
    }

    if (context.method === 'POST' && context.pathname === '/api/supplier/change-requests/events') {
      const payload = await parseJsonBody(eventRequestSchema, context.request);
      sendJson(
        context.response,
        await createSupplierEventChangeRequest(searchParams, normalizeEventRequest(payload), siteUserIdFromBearer(context)),
        { statusCode: 201 },
      );
      return true;
    }

    return false;
  };
}

export async function buildSupplierChangeRequestsList(
  searchParams: URLSearchParams,
  query: z.infer<typeof listQuerySchema> = {},
): Promise<SupplierPortalChangeRequestsListDto> {
  const supplierId = requireSupplierId(searchParams);
  const limit = query.limit ?? 50;
  const offset = query.offset ?? 0;
  const subject = query.subject ?? null;
  const rows = await prisma.eventChangeRequest.findMany({
    where: {
      supplierId,
      ...(query.status ? { status: query.status as never } : {}),
    },
    include: {
      event: {
        select: {
          id: true,
          slug: true,
          title: true,
          status: true,
          updatedAt: true,
        },
      },
    },
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    take: 500,
  });
  const filtered = subject ? rows.filter((row) => payloadSubject(row.payload) === subject) : rows;
  const page = filtered.slice(offset, offset + limit);
  const admissionProducts = await loadAdmissionProductsForRows(page);

  return {
    generatedAt: new Date().toISOString(),
    total: filtered.length,
    limit,
    offset,
    hasMore: offset + page.length < filtered.length,
    filters: {
      status: query.status ?? null,
      subject,
    },
    items: page.map((row) => mapSupplierChangeRequestRow(row, admissionProducts)),
  };
}

export async function createSupplierAdmissionChangeRequest(
  searchParams: URLSearchParams,
  input: SupplierPortalAdmissionChangeRequestCreateDto,
  createdBySiteUserId: string | null = null,
): Promise<SupplierPortalChangeRequestCreateResultDto> {
  const supplierId = requireSupplierId(searchParams);
  const existingProduct = input.admissionProductId
    ? await prisma.admissionProduct.findFirst({
        where: { id: input.admissionProductId, supplierId },
        select: { id: true, slug: true, title: true, status: true },
      })
    : null;
  if (input.admissionProductId && !existingProduct) throwHttpError('Входной билет не найден у этого поставщика.', 404);

  const venueId = input.admissionProduct.venueId || null;
  if (venueId) await assertSupplierVenueAccess(supplierId, venueId);

  const payload = stripUndefined({
    subject: 'ADMISSION_PRODUCT',
    admissionProductId: existingProduct?.id ?? input.admissionProductId ?? null,
    admissionProduct: stripUndefined(input.admissionProduct),
    offers: normalizeOffers(input.offers || []),
  }) satisfies Prisma.InputJsonObject;

  const request = await prisma.eventChangeRequest.create({
    data: {
      supplierId,
      eventId: null,
      type: existingProduct ? 'UPDATE' : 'CREATE',
      status: 'SUBMITTED',
      createdByType: 'SUPPLIER',
      createdBySiteUserId,
      title: input.title || (existingProduct ? `Обновить входной билет: ${existingProduct.title}` : `Новый входной билет: ${input.admissionProduct.title}`),
      summary: input.summary || null,
      payload,
      submittedAt: new Date(),
    },
    include: {
      event: {
        select: { id: true, slug: true, title: true, status: true, updatedAt: true },
      },
    },
  });

  return {
    request: mapSupplierChangeRequestRow(
      request,
      existingProduct ? new Map([[existingProduct.id, existingProduct]]) : new Map(),
    ),
  };
}

export async function createSupplierEventChangeRequest(
  searchParams: URLSearchParams,
  input: SupplierPortalEventChangeRequestCreateDto,
  createdBySiteUserId: string | null = null,
): Promise<SupplierPortalChangeRequestCreateResultDto> {
  const supplierId = requireSupplierId(searchParams);
  const event = input.eventId ? await loadSupplierEventForChangeRequest(supplierId, input.eventId) : null;
  if (input.eventId && !event) throwHttpError('Событие не найдено у этого поставщика или недоступно для заявок.', 404);
  const venueId = input.event?.venueId || null;
  if (venueId) await assertSupplierVenueAccess(supplierId, venueId);

  const type = resolveEventRequestType(input, Boolean(event)) as EventChangeRequestType;
  const payload = event
    ? buildExistingEventPayload(type, input, event)
    : buildCreateEventPayload(input);

  const request = await prisma.eventChangeRequest.create({
    data: {
      supplierId,
      eventId: event?.id ?? null,
      type,
      status: 'SUBMITTED',
      createdByType: 'SUPPLIER',
      createdBySiteUserId,
      title: input.title || (event ? `Обновить событие: ${event.title}` : `Новое событие: ${input.event?.title}`),
      summary: input.summary || null,
      payload,
      submittedAt: new Date(),
    },
    include: {
      event: {
        select: { id: true, slug: true, title: true, status: true, updatedAt: true },
      },
    },
  });

  return { request: mapSupplierChangeRequestRow(request, new Map()) };
}

function normalizeAdmissionRequest(
  payload: z.infer<typeof admissionRequestSchema>,
): SupplierPortalAdmissionChangeRequestCreateDto {
  const request: SupplierPortalAdmissionChangeRequestCreateDto = {
    admissionProductId: payload.admissionProductId ?? null,
    title: payload.title ?? null,
    summary: payload.summary ?? null,
    admissionProduct: stripUndefinedForDto(payload.admissionProduct) as SupplierPortalAdmissionChangeRequestCreateDto['admissionProduct'],
  };
  const offers = normalizeOfferDraftsForDto(payload.offers);
  if (offers) request.offers = offers;
  return request;
}

function normalizeEventRequest(
  payload: z.infer<typeof eventRequestSchema>,
): SupplierPortalEventChangeRequestCreateDto {
  const request: SupplierPortalEventChangeRequestCreateDto = {
    eventId: payload.eventId ?? null,
    type: payload.type ?? null,
    title: payload.title ?? null,
    summary: payload.summary ?? null,
  };
  if (payload.event) request.event = stripUndefinedForDto(payload.event) as NonNullable<SupplierPortalEventChangeRequestCreateDto['event']>;
  if (payload.content) request.content = stripUndefinedForDto(payload.content) as NonNullable<SupplierPortalEventChangeRequestCreateDto['content']>;
  if (payload.schedule) request.schedule = stripUndefinedForDto(payload.schedule) as NonNullable<SupplierPortalEventChangeRequestCreateDto['schedule']>;
  const offers = normalizeOfferDraftsForDto(payload.offers);
  if (offers) request.offers = offers;
  return request;
}

function resolveEventRequestType(input: SupplierPortalEventChangeRequestCreateDto, existing: boolean): string {
  if (!existing) return 'CREATE';
  if (input.type && input.type !== 'CREATE') return input.type;
  if (input.schedule) return 'SCHEDULE_UPDATE';
  if (input.offers?.length) return 'OFFER_UPDATE';
  return 'CONTENT_UPDATE';
}

function buildCreateEventPayload(input: SupplierPortalEventChangeRequestCreateDto): Prisma.InputJsonObject {
  const event = input.event || {};
  return stripUndefined({
    subject: 'EVENT',
    event: stripUndefined({
      title: event.title,
      kind: event.kind || 'OPEN_DATE',
      description: event.description,
      ageLimit: event.ageLimit,
      primaryCityId: event.primaryCityId,
      venueId: event.venueId,
      categoryId: event.categoryId,
      primarySubcategoryId: event.primarySubcategoryId,
    }),
    content: stripUndefined({
      title: event.title,
      description: event.description,
      shortDescription: event.shortDescription,
      ageLimit: event.ageLimit,
    }),
    media: event.imageUrl ? { imageUrl: event.imageUrl } : undefined,
    schedule: normalizeSchedule(input.schedule, event.kind || 'OPEN_DATE'),
    offers: normalizeOffers(input.offers || []),
  }) satisfies Prisma.InputJsonObject;
}

function buildExistingEventPayload(
  type: EventChangeRequestType,
  input: SupplierPortalEventChangeRequestCreateDto,
  event: Awaited<ReturnType<typeof loadSupplierEventForChangeRequest>>,
): Prisma.InputJsonObject {
  if (!event) throwHttpError('Событие не найдено.', 404);
  const baseSnapshot = {
    eventId: event.id,
    eventSlug: event.slug,
    eventUpdatedAt: event.updatedAt.toISOString(),
  };

  if (type === 'SCHEDULE_UPDATE') {
    return stripUndefined({
      subject: 'EVENT',
      baseSnapshot,
      ...normalizeSchedule(input.schedule, input.schedule?.mode || event.kind),
    }) satisfies Prisma.InputJsonObject;
  }
  if (type === 'OFFER_UPDATE') {
    return {
      subject: 'EVENT',
      baseSnapshot,
      mode: 'REPLACE_ALL',
      offers: normalizeOffers(input.offers || []),
    } satisfies Prisma.InputJsonObject;
  }
  if (type === 'UPDATE') {
    return stripUndefined({
      subject: 'EVENT',
      baseSnapshot,
      content: stripUndefined(input.content || input.event || {}),
    }) satisfies Prisma.InputJsonObject;
  }

  return stripUndefined({
    subject: 'EVENT',
    baseSnapshot,
    ...(input.content || input.event || {}),
  }) satisfies Prisma.InputJsonObject;
}

function normalizeSchedule(
  schedule: SupplierPortalEventChangeRequestCreateDto['schedule'] | undefined,
  fallbackMode: string | null | undefined,
): Prisma.InputJsonObject | undefined {
  if (!schedule && !fallbackMode) return undefined;
  const mode = schedule?.mode || fallbackMode || 'OPEN_DATE';
  const sessions = (schedule?.sessions || []).map((session) => stripUndefined({
    startsAt: session.startsAt,
    endsAt: session.endsAt || undefined,
    capacityTotal: session.capacityTotal ?? undefined,
  }));
  return stripUndefined({
    mode,
    openDate: schedule?.openDate ? stripUndefined({
      validFrom: schedule.openDate.validFrom || undefined,
      validTo: schedule.openDate.validTo || undefined,
      validDays: schedule.openDate.validDays ?? undefined,
    }) : mode === 'OPEN_DATE' ? { validDays: 30 } : undefined,
    sessions: sessions.length ? sessions : undefined,
    defaultCapacityTotal: schedule?.defaultCapacityTotal ?? undefined,
  }) satisfies Prisma.InputJsonObject;
}

function normalizeOffers(offers: SupplierPortalOfferDraftDto[]): Prisma.InputJsonArray {
  return offers.map((offer) => stripUndefined({
    title: offer.title,
    priceRub: offer.priceRub,
    oldPriceRub: offer.oldPriceRub ?? undefined,
    capacityTotal: offer.capacityTotal ?? undefined,
    groupSize: offer.groupSize ?? 1,
    active: offer.active ?? true,
  }));
}

function normalizeOfferDraftsForDto(
  offers: z.infer<typeof offerDraftSchema>[] | undefined,
): SupplierPortalOfferDraftDto[] | undefined {
  if (!offers) return undefined;
  return offers.map((offer) => stripUndefinedForDto(offer) as SupplierPortalOfferDraftDto);
}

async function loadSupplierEventForChangeRequest(supplierId: string, eventId: string) {
  return prisma.event.findFirst({
    where: {
      id: eventId,
      supplierLinks: { some: { supplierId, isActive: true } },
    },
    select: {
      id: true,
      slug: true,
      title: true,
      kind: true,
      status: true,
      updatedAt: true,
    },
  });
}

async function assertSupplierVenueAccess(supplierId: string, venueId: string): Promise<void> {
  const link = await prisma.supplierVenue.findFirst({
    where: { supplierId, venueId, isActive: true },
    select: { id: true },
  });
  if (!link) throwHttpError('Площадка не привязана к этому поставщику.', 403);
}

async function loadAdmissionProductsForRows(
  rows: ChangeRequestRow[],
): Promise<Map<string, AdmissionProductLookup>> {
  const ids = rows
    .map((row) => admissionProductIdFromPayload(row.payload))
    .filter((value): value is string => Boolean(value));
  if (!ids.length) return new Map();
  const products = await prisma.admissionProduct.findMany({
    where: { id: { in: [...new Set(ids)] } },
    select: { id: true, slug: true, title: true, status: true },
  });
  return new Map(products.map((product) => [product.id, { ...product, status: String(product.status) }]));
}

function mapSupplierChangeRequestRow(
  row: ChangeRequestRow,
  admissionProducts: Map<string, AdmissionProductLookup>,
): SupplierPortalChangeRequestRowDto {
  const subject = payloadSubject(row.payload);
  const admissionProductId = admissionProductIdFromPayload(row.payload);
  const admissionProduct = admissionProductId ? admissionProducts.get(admissionProductId) || null : null;
  return {
    id: row.id,
    subject,
    subjectId: subject === 'ADMISSION_PRODUCT' ? admissionProductId : row.eventId,
    type: row.type,
    status: row.status,
    title: row.title,
    summary: row.summary,
    adminComment: row.adminComment,
    submittedAt: toIso(row.submittedAt),
    reviewedAt: toIso(row.reviewedAt),
    appliedAt: toIso(row.appliedAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    event: row.event
      ? {
          id: row.event.id,
          slug: row.event.slug,
          title: row.event.title,
          status: String(row.event.status),
        }
      : null,
    admissionProduct,
  };
}

function payloadSubject(payload: unknown): SupplierPortalChangeRequestSubject {
  const record = asRecord(payload);
  return record?.subject === 'ADMISSION_PRODUCT' ? 'ADMISSION_PRODUCT' : 'EVENT';
}

function admissionProductIdFromPayload(payload: unknown): string | null {
  const record = asRecord(payload);
  return cleanString(record?.admissionProductId) || null;
}

function requireSupplierId(searchParams: URLSearchParams): string {
  const supplierId = cleanString(searchParams.get('supplierId')) ||
    cleanString(searchParams.get('supplier')) ||
    cleanString(searchParams.get('slug'));
  if (!supplierId) throwHttpError('Поставщик не выбран.', 400);
  return supplierId;
}

function siteUserIdFromBearer(context: RouteContext): string | null {
  const token = parseBearerToken(context.request);
  if (!token) return null;
  const payload = authenticateAccessToken(token) as JwtPayload | null;
  return cleanString(payload?.sub);
}

function stripUndefined(input: Record<string, unknown>): Prisma.InputJsonObject {
  const output: Record<string, Prisma.InputJsonValue> = {};
  for (const [key, value] of Object.entries(input)) {
    const jsonValue = toJsonValue(value);
    if (jsonValue !== undefined) output[key] = jsonValue;
  }
  return output as Prisma.InputJsonObject;
}

function toJsonValue(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined;
  if (value === null) return value as unknown as Prisma.InputJsonValue;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    return value
      .map((item) => toJsonValue(item))
      .filter((item): item is Prisma.InputJsonValue => item !== undefined) as Prisma.InputJsonArray;
  }
  if (typeof value === 'object') return stripUndefined(value as Record<string, unknown>);
  return String(value);
}

function stripUndefinedForDto<T>(input: T): T {
  return stripDtoValue(input) as T;
}

function stripDtoValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => stripDtoValue(item));
  }
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      if (item !== undefined) output[key] = stripDtoValue(item);
    }
    return output;
  }
  return value;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function cleanString(value: unknown): string | null {
  const text = String(value || '').trim();
  return text || null;
}

function toIso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function throwHttpError(message: string, statusCode: number): never {
  const error = new Error(message);
  (error as Error & { statusCode: number }).statusCode = statusCode;
  throw error;
}
