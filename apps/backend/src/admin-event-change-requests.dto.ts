import type { EventChangeRequestStatus, EventChangeRequestType, Prisma } from '@daibilet/db';
import { prisma } from '@daibilet/db';
import type {
  AdminEventChangeRequestAdmissionProductDto,
  AdminEventChangeRequestDetailDto,
  AdminEventChangeRequestDiffItemDto,
  AdminEventChangeRequestPayloadPreviewSectionDto,
  AdminEventChangeRequestRowDto,
  AdminEventChangeRequestsListDto,
} from '@daibilet/contracts/admin';

export interface AdminEventChangeRequestsQuery {
  status?: string | null | undefined;
  type?: string | null | undefined;
  supplierId?: string | null | undefined;
  eventId?: string | null | undefined;
  q?: string | null | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

const changeRequestInclude = {
  event: {
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      managementMode: true,
      scheduleLocked: true,
      updatedAt: true,
    },
  },
  supplier: {
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      email: true,
      name: true,
    },
  },
  reviewedBy: {
    select: {
      id: true,
      email: true,
      name: true,
    },
  },
} as const satisfies Prisma.EventChangeRequestInclude;

type EventChangeRequestRow = Prisma.EventChangeRequestGetPayload<{
  include: typeof changeRequestInclude;
}>;

const changeRequestDetailInclude = {
  ...changeRequestInclude,
  event: {
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      kind: true,
      status: true,
      managementMode: true,
      scheduleLocked: true,
      ageLimit: true,
      imageUrl: true,
      seoH1: true,
      seoTitle: true,
      seoDescription: true,
      canonicalPath: true,
      isIndexable: true,
      priceFromRub: true,
      defaultCapacityTotal: true,
      openDateValidFrom: true,
      openDateValidTo: true,
      openDateValidDays: true,
      salesStartsAt: true,
      salesEndsAt: true,
      updatedAt: true,
      override: {
        select: {
          title: true,
          description: true,
          shortDescription: true,
          imageUrl: true,
          seoH1: true,
          seoTitle: true,
          seoDescription: true,
          canonicalPath: true,
          isIndexable: true,
        },
      },
      sessions: {
        select: {
          id: true,
          startsAt: true,
          endsAt: true,
          capacityTotal: true,
          isActive: true,
          cancelReason: true,
        },
        orderBy: { startsAt: 'asc' },
        take: 12,
      },
      offers: {
        select: {
          id: true,
          title: true,
          priceRub: true,
          oldPriceRub: true,
          capacityTotal: true,
          groupSize: true,
          weekdayMask: true,
          active: true,
          sourceCode: true,
        },
        where: { active: true },
        orderBy: [{ priceRub: 'asc' }, { title: 'asc' }],
        take: 20,
      },
    },
  },
} as const satisfies Prisma.EventChangeRequestInclude;

type EventChangeRequestDetailRow = Prisma.EventChangeRequestGetPayload<{
  include: typeof changeRequestDetailInclude;
}>;
type EventChangeRequestDetailEvent = NonNullable<EventChangeRequestDetailRow['event']>;

const admissionProductDetailSelect = {
  id: true,
  slug: true,
  title: true,
  shortTitle: true,
  description: true,
  shortDescription: true,
  type: true,
  status: true,
  imageUrl: true,
  priceFromRub: true,
  ticketsVacant: true,
  validityMode: true,
  validFrom: true,
  validTo: true,
  validDaysAfterPurchase: true,
  venueId: true,
  cityId: true,
  updatedAt: true,
  venue: { select: { id: true, title: true } },
  city: { select: { id: true, title: true } },
  offers: {
    where: { active: true },
    orderBy: [{ priceRub: 'asc' }, { title: 'asc' }],
    select: {
      id: true,
      title: true,
      priceRub: true,
      oldPriceRub: true,
      capacityTotal: true,
      groupSize: true,
      active: true,
    },
  },
} as const satisfies Prisma.AdmissionProductSelect;

type AdmissionProductDetailRow = Prisma.AdmissionProductGetPayload<{
  select: typeof admissionProductDetailSelect;
}>;

export async function buildAdminEventChangeRequestsDto(
  query: AdminEventChangeRequestsQuery = {},
  now = new Date(),
): Promise<AdminEventChangeRequestsListDto> {
  const limit = normalizeLimit(query.limit);
  const offset = Math.max(0, query.offset || 0);
  const where = buildWhere(query);

  const [rows, total, statusCounts, typeCounts] = await Promise.all([
    prisma.eventChangeRequest.findMany({
      where,
      include: changeRequestInclude,
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      skip: offset,
      take: limit,
    }),
    prisma.eventChangeRequest.count({ where }),
    prisma.eventChangeRequest.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
    }),
    prisma.eventChangeRequest.groupBy({
      by: ['type'],
      where,
      _count: { _all: true },
    }),
  ]);

  return {
    generatedAt: now.toISOString(),
    total,
    limit,
    offset,
    hasMore: offset + rows.length < total,
    filters: {
      status: query.status || null,
      type: query.type || null,
      supplierId: query.supplierId || null,
      eventId: query.eventId || null,
      q: query.q || null,
    },
    facets: {
      statuses: Object.fromEntries(statusCounts.map((row) => [row.status, row._count._all])),
      types: Object.fromEntries(typeCounts.map((row) => [row.type, row._count._all])),
    },
    items: rows.map(mapEventChangeRequestRow),
  };
}

export async function buildAdminEventChangeRequestDetailDto(
  requestId: string,
): Promise<AdminEventChangeRequestDetailDto | null> {
  const row = await prisma.eventChangeRequest.findUnique({
    where: { id: requestId },
    include: changeRequestDetailInclude,
  });
  if (!row) return null;

  const admissionProduct = await loadAdmissionProductDetail(row.payload, row.supplierId);
  return mapEventChangeRequestDetailRow(row, admissionProduct);
}

export function mapEventChangeRequestDetailRow(
  row: EventChangeRequestDetailRow,
  admissionProduct: AdmissionProductDetailRow | null = null,
): AdminEventChangeRequestDetailDto {
  const mappedRow = mapEventChangeRequestRow(row);
  const diff = buildDiff(row, admissionProduct);
  return {
    ...mappedRow,
    actions: {
      ...mappedRow.actions,
      canApply: mappedRow.actions.canApply
        && !(mappedRow.subject === 'ADMISSION_PRODUCT' && row.type === 'UPDATE' && !admissionProduct)
        && !isStaleAdmissionRequest(row.payload, admissionProduct),
    },
    admissionProduct: admissionProduct ? mapAdmissionProduct(admissionProduct) : null,
    payloadPreview: buildPayloadPreview(row.payload),
    diff,
  };
}

function buildWhere(query: AdminEventChangeRequestsQuery): Prisma.EventChangeRequestWhereInput {
  const where: Prisma.EventChangeRequestWhereInput = {};
  if (query.status) where.status = query.status as EventChangeRequestStatus;
  if (query.type) where.type = query.type as EventChangeRequestType;
  if (query.supplierId) where.supplierId = query.supplierId;
  if (query.eventId) where.eventId = query.eventId;

  const q = query.q?.trim();
  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { summary: { contains: q, mode: 'insensitive' } },
      { adminComment: { contains: q, mode: 'insensitive' } },
      { event: { title: { contains: q, mode: 'insensitive' } } },
      { event: { slug: { contains: q, mode: 'insensitive' } } },
      { supplier: { title: { contains: q, mode: 'insensitive' } } },
      { supplier: { slug: { contains: q, mode: 'insensitive' } } },
    ];
  }

  return where;
}

export function mapEventChangeRequestRow(row: EventChangeRequestRow): AdminEventChangeRequestRowDto {
  const subject = payloadSubject(row.payload);
  const applyableStatus = row.status === 'APPROVED' || row.status === 'APPLY_FAILED';
  return {
    id: row.id,
    subject,
    subjectId: subject === 'ADMISSION_PRODUCT' ? admissionProductId(row.payload) : row.eventId,
    eventId: row.eventId,
    supplierId: row.supplierId,
    type: row.type,
    status: row.status,
    title: row.title,
    summary: row.summary,
    adminComment: row.adminComment,
    payloadKeys: payloadKeys(row.payload),
    submittedAt: toIso(row.submittedAt),
    reviewedAt: toIso(row.reviewedAt),
    appliedAt: toIso(row.appliedAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    event: row.event
      ? {
          id: row.event.id,
          title: row.event.title,
          slug: row.event.slug,
          status: row.event.status,
          managementMode: row.event.managementMode,
          scheduleLocked: row.event.scheduleLocked,
          updatedAt: row.event.updatedAt.toISOString(),
        }
      : null,
    supplier: row.supplier
      ? {
          id: row.supplier.id,
          title: row.supplier.title,
          slug: row.supplier.slug,
          status: row.supplier.status,
        }
      : null,
    createdBy: row.createdBy
      ? {
          id: row.createdBy.id,
          email: row.createdBy.email,
          name: row.createdBy.name,
        }
      : null,
    reviewedBy: row.reviewedBy
      ? {
          id: row.reviewedBy.id,
          email: row.reviewedBy.email,
          name: row.reviewedBy.name,
        }
      : null,
    actions: {
      canApprove: row.status === 'SUBMITTED',
      canReject: row.status === 'SUBMITTED',
      canApply: applyableStatus && (
        subject === 'ADMISSION_PRODUCT'
          ? (row.type === 'CREATE' || row.type === 'UPDATE')
          : Boolean(row.eventId) && row.type !== 'CREATE'
      ),
    },
  };
}

function normalizeLimit(limit: number | undefined): number {
  if (!limit || !Number.isFinite(limit)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Math.trunc(limit)));
}

function payloadKeys(payload: unknown): string[] {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return [];
  return Object.keys(payload).sort();
}

function payloadSubject(payload: unknown): 'EVENT' | 'ADMISSION_PRODUCT' {
  const record = asRecord(payload);
  return record?.subject === 'ADMISSION_PRODUCT' ? 'ADMISSION_PRODUCT' : 'EVENT';
}

function admissionProductId(payload: unknown): string | null {
  const value = asRecord(payload)?.admissionProductId;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

async function loadAdmissionProductDetail(
  payload: unknown,
  supplierId: string | null,
): Promise<AdmissionProductDetailRow | null> {
  if (payloadSubject(payload) !== 'ADMISSION_PRODUCT') return null;
  const id = admissionProductId(payload);
  if (!id) return null;
  return prisma.admissionProduct.findFirst({
    where: { id, ...(supplierId ? { supplierId } : {}) },
    select: admissionProductDetailSelect,
  });
}

function mapAdmissionProduct(row: AdmissionProductDetailRow): AdminEventChangeRequestAdmissionProductDto {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    shortTitle: row.shortTitle,
    description: row.description,
    shortDescription: row.shortDescription,
    type: row.type,
    status: row.status,
    imageUrl: row.imageUrl,
    priceFromRub: row.priceFromRub,
    ticketsVacant: row.ticketsVacant,
    validityMode: row.validityMode,
    validFrom: toIso(row.validFrom),
    validTo: toIso(row.validTo),
    validDaysAfterPurchase: row.validDaysAfterPurchase,
    venueId: row.venueId,
    cityId: row.cityId,
    venue: row.venue,
    city: row.city,
    offers: row.offers,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toIso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function buildPayloadPreview(payload: unknown): AdminEventChangeRequestDetailDto['payloadPreview'] {
  const object = asRecord(payload);
  if (!object) return { baseSnapshot: null, sections: [] };

  const sections: AdminEventChangeRequestPayloadPreviewSectionDto[] = [];
  for (const [key, value] of Object.entries(object)) {
    if (key === 'baseSnapshot') continue;
    sections.push({
      id: key,
      title: payloadSectionTitle(key),
      kind: Array.isArray(value) ? 'array' : typeof value,
      value: compactValue(value),
    });
  }

  return {
    baseSnapshot: asRecord(object.baseSnapshot) ? compactValue(object.baseSnapshot) as Record<string, unknown> : null,
    sections,
  };
}

function buildDiff(
  row: EventChangeRequestDetailRow,
  admissionProduct: AdmissionProductDetailRow | null,
): AdminEventChangeRequestDetailDto['diff'] {
  const payload = asRecord(row.payload);
  const items: AdminEventChangeRequestDiffItemDto[] = [];
  const warnings: string[] = [];
  if (!payload) return { items, warnings: ['Payload is empty or not an object.'] };

  if (payloadSubject(payload) === 'ADMISSION_PRODUCT') {
    if (isStaleAdmissionRequest(payload, admissionProduct)) {
      warnings.push('Входной билет изменился после создания заявки. Попросите поставщика обновить заявку перед применением.');
    }
    if (row.type === 'UPDATE' && !admissionProduct) {
      warnings.push('Текущий входной билет не найден. Применение заявки заблокировано до проверки.');
    }
    pushAdmissionProductDiff(items, payload, admissionProduct);
  } else {
    const snapshot = asRecord(payload.baseSnapshot);
    const snapshotUpdatedAt = typeof snapshot?.eventUpdatedAt === 'string' ? snapshot.eventUpdatedAt : null;
    if (row.event && snapshotUpdatedAt && new Date(snapshotUpdatedAt).getTime() !== row.event.updatedAt.getTime()) {
      warnings.push('Событие изменилось после создания заявки. Перед применением нужно обновить заявку или проверить конфликт.');
    }
    if (row.type === 'CREATE') {
      pushCreateDiff(items, payload);
    } else if (!row.event) {
      warnings.push('Заявка не привязана к событию, поэтому сравнить текущие значения нельзя.');
    } else {
      pushExistingEventDiff(items, row, payload);
    }
  }

  if (hasNonEmptyArray(payload.contentBlocks)) warnings.push('Content blocks пока не применяются transactional applier и требуют отдельного storage слоя.');
  if (hasNonEmptyArray(payload.gallery)) warnings.push('Gallery пока не применяется transactional applier и требует отдельного media storage слоя.');
  if (asRecord(payload.recurrenceRule)) warnings.push('Recurring rule отображается как preview; apply требует уже сгенерированные sessions.');

  return { items, warnings };
}

function isStaleAdmissionRequest(
  payload: unknown,
  admissionProduct: AdmissionProductDetailRow | null,
): boolean {
  if (payloadSubject(payload) !== 'ADMISSION_PRODUCT' || !admissionProduct) return false;
  const snapshot = asRecord(asRecord(payload)?.baseSnapshot);
  const value = typeof snapshot?.admissionProductUpdatedAt === 'string'
    ? snapshot.admissionProductUpdatedAt
    : null;
  if (!value) return false;
  const snapshotTime = Date.parse(value);
  return !Number.isFinite(snapshotTime) || snapshotTime !== admissionProduct.updatedAt.getTime();
}

function pushAdmissionProductDiff(
  items: AdminEventChangeRequestDiffItemDto[],
  payload: Record<string, unknown>,
  current: AdmissionProductDetailRow | null,
): void {
  const draft = asRecord(payload.admissionProduct) || {};
  const currentRecord = current as unknown as Record<string, unknown> | null;
  const fields = [
    ['title', 'Название'],
    ['shortTitle', 'Короткое название'],
    ['description', 'Описание'],
    ['shortDescription', 'Краткое описание'],
    ['type', 'Тип входного билета'],
    ['imageUrl', 'Изображение'],
    ['validityMode', 'Срок действия'],
    ['validFrom', 'Действует с'],
    ['validTo', 'Действует до'],
    ['validDaysAfterPurchase', 'Дней после покупки'],
    ['ticketsVacant', 'Доступно билетов'],
    ['venueId', 'Площадка'],
  ] as const;
  for (const [key, label] of fields) {
    if (!Object.prototype.hasOwnProperty.call(draft, key)) continue;
    const currentValue = key === 'venueId' && current?.venue
      ? current.venue.title
      : currentRecord?.[key] ?? null;
    const proposedValue = key === 'venueId' && current?.venueId === draft[key] && current?.venue
      ? current.venue.title
      : draft[key];
    pushDiff(items, `admissionProduct.${key}`, label, currentValue, proposedValue);
  }

  if (Array.isArray(payload.offers) && payload.offers.length > 0) {
    const currentOffers = current?.offers.map((offer) => ({
      title: offer.title,
      priceRub: offer.priceRub,
      oldPriceRub: offer.oldPriceRub,
      capacityTotal: offer.capacityTotal,
      groupSize: offer.groupSize,
      active: offer.active,
    })) || [];
    pushDiff(items, 'offers.count', 'Билетные категории', currentOffers.length, payload.offers.length);
    pushDiff(items, 'offers.priceFromRub', 'Цена от', current?.priceFromRub ?? null, minOfferPrice(payload.offers));
  }
}

function pushCreateDiff(items: AdminEventChangeRequestDiffItemDto[], payload: Record<string, unknown>): void {
  const event = asRecord(payload.event);
  if (event) {
    for (const key of ['title', 'slug', 'kind', 'description', 'ageLimit', 'primaryCityId', 'venueId', 'categoryId', 'primarySubcategoryId']) {
      pushDiff(items, `event.${key}`, fieldLabel(key), null, event[key]);
    }
  }

  for (const section of ['content', 'media', 'seo', 'schedule']) {
    const value = asRecord(payload[section]);
    if (value) pushObjectDiff(items, section, null, value);
  }
  if (Array.isArray(payload.offers)) {
    pushDiff(items, 'offers.count', 'Билетные категории', 0, payload.offers.length);
    pushDiff(items, 'offers.preview', 'Первые категории', null, compactValue(payload.offers.slice(0, 5)));
  }
}

function pushExistingEventDiff(
  items: AdminEventChangeRequestDiffItemDto[],
  row: EventChangeRequestDetailRow,
  payload: Record<string, unknown>,
): void {
  switch (row.type) {
    case 'UPDATE':
      if (asRecord(payload.content)) pushContentDiff(items, row, asRecord(payload.content)!, 'content');
      if (asRecord(payload.media)) pushMediaDiff(items, row, asRecord(payload.media)!, 'media');
      if (asRecord(payload.seo)) pushSeoDiff(items, row, asRecord(payload.seo)!, 'seo');
      return;
    case 'CONTENT_UPDATE':
      pushContentDiff(items, row, payload, 'content');
      return;
    case 'MEDIA_UPDATE':
      pushMediaDiff(items, row, payload, 'media');
      return;
    case 'SEO_UPDATE':
      pushSeoDiff(items, row, payload, 'seo');
      return;
    case 'SCHEDULE_UPDATE':
      pushScheduleDiff(items, row, payload);
      return;
    case 'OFFER_UPDATE':
      pushOfferDiff(items, row, payload);
      return;
    case 'PUBLISH':
      pushDiff(items, 'status', 'Статус публикации', row.event?.status, 'PUBLISHED');
      return;
    case 'UNPUBLISH':
    case 'ARCHIVE':
    case 'DELETE':
      pushDiff(items, 'status', 'Статус публикации', row.event?.status, 'HIDDEN');
      return;
    case 'CREATE':
      pushCreateDiff(items, payload);
      return;
  }
}

function pushContentDiff(
  items: AdminEventChangeRequestDiffItemDto[],
  row: EventChangeRequestDetailRow,
  payload: Record<string, unknown>,
  prefix: string,
): void {
  pushIfOwn(items, payload, 'title', `${prefix}.title`, 'Название', visibleEventValue(row, 'title'));
  pushIfOwn(items, payload, 'description', `${prefix}.description`, 'Описание', visibleEventValue(row, 'description'));
  pushIfOwn(items, payload, 'shortDescription', `${prefix}.shortDescription`, 'Краткое описание', visibleEventValue(row, 'shortDescription'));
  pushIfOwn(items, payload, 'ageLimit', `${prefix}.ageLimit`, 'Возрастное ограничение', row.event?.ageLimit ?? null);
  if (Array.isArray(payload.contentBlocks)) {
    pushDiff(items, `${prefix}.contentBlocks.count`, 'Контентные блоки', 0, payload.contentBlocks.length);
  }
}

function pushMediaDiff(
  items: AdminEventChangeRequestDiffItemDto[],
  row: EventChangeRequestDetailRow,
  payload: Record<string, unknown>,
  prefix: string,
): void {
  pushIfOwn(items, payload, 'imageUrl', `${prefix}.imageUrl`, 'Изображение', visibleEventValue(row, 'imageUrl'));
  if (Array.isArray(payload.gallery)) {
    pushDiff(items, `${prefix}.gallery.count`, 'Галерея', 0, payload.gallery.length);
  }
}

function pushSeoDiff(
  items: AdminEventChangeRequestDiffItemDto[],
  row: EventChangeRequestDetailRow,
  payload: Record<string, unknown>,
  prefix: string,
): void {
  pushIfOwn(items, payload, 'seoH1', `${prefix}.seoH1`, 'SEO H1', visibleEventValue(row, 'seoH1'));
  pushIfOwn(items, payload, 'seoTitle', `${prefix}.seoTitle`, 'SEO title', visibleEventValue(row, 'seoTitle'));
  pushIfOwn(items, payload, 'seoDescription', `${prefix}.seoDescription`, 'SEO description', visibleEventValue(row, 'seoDescription'));
  pushIfOwn(items, payload, 'canonicalPath', `${prefix}.canonicalPath`, 'Canonical', visibleEventValue(row, 'canonicalPath'));
  pushIfOwn(items, payload, 'isIndexable', `${prefix}.isIndexable`, 'Индексируется', visibleEventValue(row, 'isIndexable'));
}

function pushScheduleDiff(
  items: AdminEventChangeRequestDiffItemDto[],
  row: EventChangeRequestDetailRow,
  payload: Record<string, unknown>,
): void {
  pushIfOwn(items, payload, 'mode', 'schedule.mode', 'Тип события', row.event?.kind ?? null);
  pushIfOwn(items, payload, 'defaultCapacityTotal', 'schedule.defaultCapacityTotal', 'Вместимость по умолчанию', row.event?.defaultCapacityTotal ?? null);
  const openDate = asRecord(payload.openDate);
  if (openDate || payload.mode === 'OPEN_DATE') {
    pushDiff(items, 'schedule.openDate.validFrom', 'Open date с', toIso(row.event?.openDateValidFrom ?? null), openDate?.validFrom ?? null);
    pushDiff(items, 'schedule.openDate.validTo', 'Open date до', toIso(row.event?.openDateValidTo ?? null), openDate?.validTo ?? null);
    pushDiff(items, 'schedule.openDate.validDays', 'Open date дней', row.event?.openDateValidDays ?? null, openDate?.validDays ?? null);
  }

  const salesPolicy = asRecord(payload.salesPolicy);
  if (salesPolicy) {
    pushDiff(items, 'schedule.salesPolicy.salesStartsAt', 'Продажи с', toIso(row.event?.salesStartsAt ?? null), salesPolicy.salesStartsAt ?? null);
    pushDiff(items, 'schedule.salesPolicy.salesEndsAt', 'Продажи до', toIso(row.event?.salesEndsAt ?? null), salesPolicy.salesEndsAt ?? null);
    pushDiff(items, 'schedule.salesPolicy.stopSalesBeforeMinutes', 'Стоп продаж до начала', null, salesPolicy.stopSalesBeforeMinutes ?? null);
  }

  if (Array.isArray(payload.sessions)) {
    pushDiff(items, 'schedule.sessions.count', 'Слоты расписания', row.event?.sessions.length ?? 0, payload.sessions.length);
    pushDiff(items, 'schedule.sessions.preview', 'Ближайшие слоты', sessionPreview(row.event?.sessions ?? []), compactValue(payload.sessions.slice(0, 6)));
  }
}

function pushOfferDiff(
  items: AdminEventChangeRequestDiffItemDto[],
  row: EventChangeRequestDetailRow,
  payload: Record<string, unknown>,
): void {
  const offers = Array.isArray(payload.offers) ? payload.offers : [];
  pushIfOwn(items, payload, 'mode', 'offers.mode', 'Режим обновления', null);
  pushDiff(items, 'offers.count', 'Билетные категории', row.event?.offers.length ?? 0, offers.length);
  pushDiff(items, 'offers.priceFromRub', 'Цена от', row.event?.priceFromRub ?? null, minOfferPrice(offers));
  pushDiff(items, 'offers.preview', 'Первые категории', offerPreview(row.event?.offers ?? []), compactValue(offers.slice(0, 8)));
}

function pushObjectDiff(
  items: AdminEventChangeRequestDiffItemDto[],
  prefix: string,
  current: Record<string, unknown> | null,
  proposed: Record<string, unknown>,
): void {
  for (const [key, value] of Object.entries(proposed)) {
    pushDiff(items, `${prefix}.${key}`, fieldLabel(key), current?.[key] ?? null, value);
  }
}

function pushIfOwn(
  items: AdminEventChangeRequestDiffItemDto[],
  payload: Record<string, unknown>,
  key: string,
  path: string,
  label: string,
  currentValue: unknown,
): void {
  if (!Object.prototype.hasOwnProperty.call(payload, key)) return;
  pushDiff(items, path, label, currentValue, payload[key]);
}

function pushDiff(
  items: AdminEventChangeRequestDiffItemDto[],
  path: string,
  label: string,
  currentValue: unknown,
  proposedValue: unknown,
): void {
  items.push({
    path,
    label,
    currentValue: compactValue(currentValue),
    proposedValue: compactValue(proposedValue),
    changeType: diffChangeType(currentValue, proposedValue),
  });
}

function visibleEventValue(row: EventChangeRequestDetailRow, field: string): unknown {
  const event = row.event;
  if (!event) return null;
  const override = event.override as Record<string, unknown> | null;
  if (override && Object.prototype.hasOwnProperty.call(override, field) && override[field] !== null) return override[field];
  return (event as unknown as Record<string, unknown>)[field] ?? null;
}

function diffChangeType(currentValue: unknown, proposedValue: unknown): AdminEventChangeRequestDiffItemDto['changeType'] {
  if (jsonKey(currentValue) === jsonKey(proposedValue)) return 'unchanged';
  if (currentValue == null && proposedValue != null) return 'added';
  if (currentValue != null && proposedValue == null) return 'removed';
  return 'changed';
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function compactValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value.length > 1200 ? `${value.slice(0, 1200)}...` : value;
  if (Array.isArray(value)) {
    const items = value.slice(0, 12).map(compactValue);
    if (value.length > 12) items.push({ truncated: value.length - 12 });
    return items;
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, compactValue(item)]));
  }
  return value ?? null;
}

function sessionPreview(sessions: EventChangeRequestDetailEvent['sessions']): unknown {
  return sessions.slice(0, 6).map((session) => ({
    id: session.id,
    startsAt: toIso(session.startsAt),
    endsAt: toIso(session.endsAt),
    capacityTotal: session.capacityTotal,
    isActive: session.isActive,
  }));
}

function offerPreview(offers: EventChangeRequestDetailEvent['offers']): unknown {
  return offers.slice(0, 8).map((offer) => ({
    id: offer.id,
    title: offer.title,
    priceRub: offer.priceRub,
    oldPriceRub: offer.oldPriceRub,
    active: offer.active,
  }));
}

function minOfferPrice(offers: unknown[]): number | null {
  const prices = offers
    .map((offer) => asRecord(offer)?.priceRub)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return prices.length ? Math.min(...prices) : null;
}

function hasNonEmptyArray(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

function payloadSectionTitle(key: string): string {
  const labels: Record<string, string> = {
    event: 'Событие',
    subject: 'Тип объекта',
    admissionProductId: 'Входной билет',
    admissionProduct: 'Входной билет',
    content: 'Контент',
    media: 'Медиа',
    seo: 'SEO',
    schedule: 'Расписание',
    offers: 'Билетные категории',
    openDate: 'Open date',
    sessions: 'Слоты',
    recurrenceRule: 'Правило повторения',
    salesPolicy: 'Продажи',
    reason: 'Причина',
    note: 'Комментарий',
  };
  return labels[key] || fieldLabel(key);
}

function fieldLabel(key: string): string {
  const labels: Record<string, string> = {
    title: 'Название',
    slug: 'Slug',
    kind: 'Тип события',
    description: 'Описание',
    shortDescription: 'Краткое описание',
    ageLimit: 'Возраст',
    imageUrl: 'Изображение',
    seoH1: 'SEO H1',
    seoTitle: 'SEO title',
    seoDescription: 'SEO description',
    canonicalPath: 'Canonical',
    isIndexable: 'Индексируется',
    primaryCityId: 'Город',
    venueId: 'Площадка',
    categoryId: 'Категория',
    primarySubcategoryId: 'Подкатегория',
  };
  return labels[key] || key;
}

function jsonKey(value: unknown): string {
  return JSON.stringify(compactValue(value));
}
