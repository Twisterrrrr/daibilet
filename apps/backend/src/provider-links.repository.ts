import type { ProviderEntityKind, SourceCode } from '@daibilet/db';
import { prisma } from '@daibilet/db';

export interface ProviderIdentityLookup {
  sourceCode: SourceCode;
  entityKind: ProviderEntityKind;
  externalId: string;
  externalParentId?: string;
}

export interface ProviderIdentityDto {
  id: string;
  sourceId: string;
  sourceCode: SourceCode;
  entityKind: ProviderEntityKind;
  externalId: string;
  externalParentId: string;
  eventId: string | null;
  sessionId: string | null;
  offerId: string | null;
  venueId: string | null;
  sourceUrl: string | null;
  payload: unknown;
}

const providerIdentitySelect = {
  id: true,
  sourceId: true,
  entityKind: true,
  externalId: true,
  externalParentId: true,
  eventId: true,
  sessionId: true,
  offerId: true,
  venueId: true,
  sourceUrl: true,
  payload: true,
  source: { select: { code: true } },
} as const;

export async function findProviderIdentity(
  lookup: ProviderIdentityLookup,
): Promise<ProviderIdentityDto | null> {
  const row = await prisma.providerLink.findFirst({
    where: {
      entityKind: lookup.entityKind,
      externalId: lookup.externalId,
      externalParentId: lookup.externalParentId || '',
      source: { code: lookup.sourceCode },
    },
    select: providerIdentitySelect,
  });

  return row ? mapProviderIdentity(row) : null;
}

export async function findEntityProviderIdentities(input: {
  entityKind: ProviderEntityKind;
  entityId: string;
}): Promise<ProviderIdentityDto[]> {
  const entityField = {
    EVENT: 'eventId',
    SESSION: 'sessionId',
    OFFER: 'offerId',
    VENUE: 'venueId',
  }[input.entityKind];

  const rows = await prisma.providerLink.findMany({
    where: {
      entityKind: input.entityKind,
      [entityField]: input.entityId,
    },
    orderBy: [
      { source: { code: 'asc' } },
      { externalParentId: 'asc' },
      { externalId: 'asc' },
    ],
    select: providerIdentitySelect,
  });

  return rows.map(mapProviderIdentity);
}

function mapProviderIdentity(row: {
  id: string;
  sourceId: string;
  entityKind: ProviderEntityKind;
  externalId: string;
  externalParentId: string;
  eventId: string | null;
  sessionId: string | null;
  offerId: string | null;
  venueId: string | null;
  sourceUrl: string | null;
  payload: unknown;
  source: { code: SourceCode };
}): ProviderIdentityDto {
  return {
    id: row.id,
    sourceId: row.sourceId,
    sourceCode: row.source.code,
    entityKind: row.entityKind,
    externalId: row.externalId,
    externalParentId: row.externalParentId,
    eventId: row.eventId,
    sessionId: row.sessionId,
    offerId: row.offerId,
    venueId: row.venueId,
    sourceUrl: row.sourceUrl,
    payload: row.payload,
  };
}
