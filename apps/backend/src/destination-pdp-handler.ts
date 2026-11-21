import type { Prisma, PrismaClient } from '@daibilet/db';
import {
  createDestinationRegionPayloadSchema,
  destinationPdpContentSchema,
  destinationPdpStatusPayloadSchema,
  publishDestinationPdpPayloadSchema,
  saveDestinationPdpPayloadSchema,
  type DestinationPdpStatus,
  type DestinationPdpType,
} from '@daibilet/contracts/city-pdp';
import { canTransitionDestinationPdpStatus, checkDestinationPdpReadiness } from './destination-pdp-policy.js';
import { sendJson } from './http.js';
import { matchPath, type RouteContext } from './routing.js';
import type { TypedRouteHandler } from './validated-handler.js';
import { parseJsonBody } from './validation.js';

type DestinationPdpOwner = {
  id: string;
  title: string;
  slug: string;
  legacyDraft: {
    introTitle: string | null;
    introText: string | null;
    heroImageUrl: string | null;
    seoH1: string | null;
    seoTitle: string | null;
    seoDescription: string | null;
    canonicalPath: string | null;
  };
};
type CacheInvalidator = (reason: string, options?: { warm?: boolean; slug?: string }) => void;

export interface AdminDestinationPdpHandlerDependencies {
  prisma: PrismaClient;
  invalidatePublicCaches: CacheInvalidator;
}

const basePath = /^\/api\/admin\/destinations\/(cities|regions)\/([^/]+)\/pdp$/;
const statusPath = /^\/api\/admin\/destinations\/(cities|regions)\/([^/]+)\/pdp\/status$/;
const publishPath = /^\/api\/admin\/destinations\/(cities|regions)\/([^/]+)\/pdp\/publish$/;

/** Admin-only editorial API. A content save never replaces the published snapshot. */
export function createAdminDestinationPdpRouteHandler(
  deps: AdminDestinationPdpHandlerDependencies,
): TypedRouteHandler {
  return async (context) => {
    if (context.pathname === '/api/admin/destinations/regions') {
      if (context.method === 'GET') {
        const regions = await deps.prisma.region.findMany({
          orderBy: { title: 'asc' },
          select: {
            id: true,
            title: true,
            slug: true,
            _count: { select: { cities: true } },
            pdpDocument: { select: { status: true, isIndexable: true, publishedAt: true, updatedAt: true } },
          },
        });
        sendJson(context.response, { regions });
        return true;
      }
      if (context.method === 'POST') {
        const payload = await parseJsonBody(createDestinationRegionPayloadSchema, context.request);
        const [duplicateRegion, duplicateCity] = await Promise.all([
          deps.prisma.region.findUnique({ where: { slug: payload.slug }, select: { id: true } }),
          deps.prisma.city.findUnique({ where: { slug: payload.slug }, select: { id: true } }),
        ]);
        if (duplicateRegion || duplicateCity) {
          sendJson(context.response, { error: 'destination_slug_exists' }, { statusCode: 409 });
          return true;
        }
        const region = await deps.prisma.region.create({ data: payload, select: { id: true, title: true, slug: true } });
        deps.invalidatePublicCaches('destination region created');
        sendJson(context.response, { region }, { statusCode: 201 });
        return true;
      }
      sendJson(context.response, { error: 'method_not_allowed' }, { statusCode: 405 });
      return true;
    }

    const baseMatch = matchPath(context.pathname, basePath);
    const statusMatch = matchPath(context.pathname, statusPath);
    const publishMatch = matchPath(context.pathname, publishPath);
    const match = baseMatch || statusMatch || publishMatch;
    if (!match?.[0] || !match[1]) return false;

    const type: DestinationPdpType = match[0] === 'cities' ? 'CITY' : 'REGION';
    const ownerId = match[1];
    const action = statusMatch ? 'status' : publishMatch ? 'publish' : null;
    const owner = await findOwner(deps.prisma, type, ownerId);
    if (!owner) {
      sendJson(context.response, { error: type === 'CITY' ? 'city_not_found' : 'region_not_found' }, { statusCode: 404 });
      return true;
    }

    if (context.method === 'GET' && action === null) {
      const document = await findDocument(deps.prisma, type, ownerId);
      sendJson(context.response, {
        owner: { type, id: owner.id, slug: owner.slug, title: owner.title, legacyDraft: owner.legacyDraft },
        document: document ? toDocumentDto(document) : null,
        readiness: document ? checkDestinationPdpReadiness(document.content) : checkDestinationPdpReadiness({}),
      });
      return true;
    }

    if (context.method === 'PATCH' && action === null) {
      const payload = await parseJsonBody(saveDestinationPdpPayloadSchema, context.request);
      const document = await saveDocument(deps.prisma, type, ownerId, payload);
      deps.invalidatePublicCaches('destination PDP editorial save');
      sendJson(context.response, { document: toDocumentDto(document), readiness: checkDestinationPdpReadiness(document.content) });
      return true;
    }

    if (context.method === 'POST' && action === 'status') {
      const payload = await parseJsonBody(destinationPdpStatusPayloadSchema, context.request);
      const document = await updateStatus(deps.prisma, type, ownerId, payload.status, payload.changeNote ?? null);
      deps.invalidatePublicCaches('destination PDP status update');
      sendJson(context.response, { document: toDocumentDto(document), readiness: checkDestinationPdpReadiness(document.content) });
      return true;
    }

    if (context.method === 'POST' && action === 'publish') {
      const payload = await parseJsonBody(publishDestinationPdpPayloadSchema, context.request);
      const document = await publishDocument(
        deps.prisma,
        type,
        ownerId,
        payload.isIndexable,
        payload.changeNote ?? null,
      );
      deps.invalidatePublicCaches('destination PDP published');
      sendJson(context.response, { document: toDocumentDto(document), readiness: checkDestinationPdpReadiness(document.content) });
      return true;
    }

    sendJson(context.response, { error: 'method_not_allowed' }, { statusCode: 405 });
    return true;
  };
}

async function findOwner(
  prisma: PrismaClient,
  type: DestinationPdpType,
  id: string,
): Promise<DestinationPdpOwner | null> {
  if (type === 'CITY') {
    const city = await prisma.city.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
        title: true,
        introTitle: true,
        introText: true,
        heroImageUrl: true,
        seoH1: true,
        seoTitle: true,
        seoDescription: true,
        canonicalPath: true,
      },
    });
    if (!city) return null;
    const { id: cityId, slug, title, ...legacyDraft } = city;
    return { id: cityId, slug, title, legacyDraft };
  }
  const region = await prisma.region.findUnique({ where: { id }, select: { id: true, slug: true, title: true } });
  if (!region) return null;
  return {
    ...region,
    legacyDraft: {
      introTitle: null,
      introText: null,
      heroImageUrl: null,
      seoH1: null,
      seoTitle: null,
      seoDescription: null,
      canonicalPath: null,
    },
  };
}

function ownerWhere(type: DestinationPdpType, ownerId: string): { cityId: string } | { regionId: string } {
  return type === 'CITY' ? { cityId: ownerId } : { regionId: ownerId };
}

async function findDocument(prisma: PrismaClient, type: DestinationPdpType, ownerId: string) {
  return prisma.destinationPdpDocument.findUnique({
    where: ownerWhere(type, ownerId),
    include: { revisions: { orderBy: { createdAt: 'desc' }, take: 20 } },
  });
}

function toDocumentDto(document: NonNullable<Awaited<ReturnType<typeof findDocument>>>) {
  return {
    id: document.id,
    summary: document.summary,
    heroImageUrl: document.heroImageUrl,
    content: document.content,
    publishedContent: document.publishedContent,
    seoH1: document.seoH1,
    seoTitle: document.seoTitle,
    seoDescription: document.seoDescription,
    canonicalPath: document.canonicalPath,
    status: document.status,
    isIndexable: document.isIndexable,
    publishedAt: document.publishedAt,
    version: document.version,
    updatedAt: document.updatedAt,
    revisions: document.revisions,
  };
}

async function saveDocument(
  prisma: PrismaClient,
  type: DestinationPdpType,
  ownerId: string,
  payload: ReturnType<typeof saveDestinationPdpPayloadSchema.parse>,
) {
  const content = destinationPdpContentSchema.parse(payload.content);
  return prisma.$transaction(async (tx) => {
    const existing = await tx.destinationPdpDocument.findUnique({ where: ownerWhere(type, ownerId) });
    const nextVersion = (existing?.version ?? 0) + 1;
    const nextStatus = existing && ['READY', 'PUBLISHED', 'HIDDEN'].includes(existing.status) ? 'REVIEW' : existing?.status ?? 'DRAFT';
    const data = {
      summary: payload.summary ?? null,
      heroImageUrl: payload.heroImageUrl ?? null,
      seoH1: payload.seoH1 ?? null,
      seoTitle: payload.seoTitle ?? null,
      seoDescription: payload.seoDescription ?? null,
      canonicalPath: payload.canonicalPath ?? null,
      content: content as Prisma.InputJsonValue,
      status: nextStatus,
      version: nextVersion,
    };
    const document = existing
      ? await tx.destinationPdpDocument.update({ where: { id: existing.id }, data })
      : await tx.destinationPdpDocument.create({
          data: {
            ...data,
            cityId: type === 'CITY' ? ownerId : null,
            regionId: type === 'REGION' ? ownerId : null,
          },
        });
    await tx.destinationPdpRevision.create({
      data: {
        documentId: document.id,
        version: nextVersion,
        snapshot: toRevisionSnapshot(document),
        changeNote: payload.changeNote ?? null,
      },
    });
    return tx.destinationPdpDocument.findUniqueOrThrow({
      where: { id: document.id },
      include: { revisions: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });
  });
}

async function updateStatus(
  prisma: PrismaClient,
  type: DestinationPdpType,
  ownerId: string,
  status: Exclude<DestinationPdpStatus, 'PUBLISHED'>,
  changeNote: string | null,
) {
  return prisma.$transaction(async (tx) => {
    const document = await tx.destinationPdpDocument.findUnique({ where: ownerWhere(type, ownerId) });
    if (!document) throw httpError(404, 'destination_pdp_not_found');
    if (!isDestinationPdpStatus(document.status) || !canTransitionDestinationPdpStatus(document.status, status)) {
      throw httpError(409, `invalid_status_transition:${document.status}:${status}`);
    }
    if (status === 'READY') {
      const readiness = checkDestinationPdpReadiness(document.content);
      if (!readiness.ready) throw httpError(409, 'destination_pdp_not_ready');
    }
    const updated = await tx.destinationPdpDocument.update({
      where: { id: document.id },
      data: { status, version: document.version + 1, isIndexable: status === 'HIDDEN' ? false : document.isIndexable },
    });
    await tx.destinationPdpRevision.create({
      data: {
        documentId: document.id,
        version: updated.version,
        snapshot: toRevisionSnapshot(updated),
        changeNote,
      },
    });
    return tx.destinationPdpDocument.findUniqueOrThrow({
      where: { id: document.id },
      include: { revisions: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });
  });
}

async function publishDocument(
  prisma: PrismaClient,
  type: DestinationPdpType,
  ownerId: string,
  isIndexable: boolean,
  changeNote: string | null,
) {
  return prisma.$transaction(async (tx) => {
    const document = await tx.destinationPdpDocument.findUnique({ where: ownerWhere(type, ownerId) });
    if (!document) throw httpError(404, 'destination_pdp_not_found');
    if (document.status !== 'READY') throw httpError(409, 'destination_pdp_must_be_ready');
    const readiness = checkDestinationPdpReadiness(document.content);
    if (!readiness.ready) throw httpError(409, 'destination_pdp_not_ready');
    const updated = await tx.destinationPdpDocument.update({
      where: { id: document.id },
      data: {
        status: 'PUBLISHED',
        isIndexable,
        publishedAt: new Date(),
        publishedContent: toJsonInput(toRevisionSnapshot({ ...document, version: document.version + 1 })),
        version: document.version + 1,
      },
    });
    await tx.destinationPdpRevision.create({
      data: {
        documentId: document.id,
        version: updated.version,
        snapshot: toRevisionSnapshot(updated),
        changeNote,
      },
    });
    return tx.destinationPdpDocument.findUniqueOrThrow({
      where: { id: document.id },
      include: { revisions: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });
  });
}

function isDestinationPdpStatus(value: string): value is DestinationPdpStatus {
  return ['DRAFT', 'REVIEW', 'READY', 'PUBLISHED', 'HIDDEN'].includes(value);
}

function toRevisionSnapshot(document: {
  summary: string | null;
  heroImageUrl: string | null;
  content: Prisma.JsonValue;
  seoH1: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalPath: string | null;
  version: number;
  status: string;
  isIndexable: boolean;
  publishedAt: Date | null;
}): Prisma.InputJsonObject {
  return {
    version: document.version,
    summary: document.summary,
    heroImageUrl: document.heroImageUrl,
    content: toJsonInput(document.content),
    seoH1: document.seoH1,
    seoTitle: document.seoTitle,
    seoDescription: document.seoDescription,
    canonicalPath: document.canonicalPath,
    status: document.status,
    isIndexable: document.isIndexable,
    publishedAt: document.publishedAt?.toISOString() ?? null,
  };
}

function toJsonInput(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function httpError(statusCode: number, message: string): Error & { statusCode: number } {
  return Object.assign(new Error(message), { statusCode });
}
