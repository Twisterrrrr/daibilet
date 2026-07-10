import { Prisma, prisma, type EventChangeRequestStatus, type EventChangeRequestType } from '@daibilet/db';
import type {
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
  return {
    id: row.id,
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
      canApply: (row.status === 'APPROVED' || row.status === 'APPLY_FAILED') && row.type !== 'CREATE',
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

function toIso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}
