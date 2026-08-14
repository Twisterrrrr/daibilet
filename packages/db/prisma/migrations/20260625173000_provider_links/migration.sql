-- Add a provider identity layer for source-owned events, sessions, offers and venues.
-- This is additive: legacy EventSourceLink remains in place during DTO/import migration.

CREATE TYPE "ProviderEntityKind" AS ENUM ('EVENT', 'SESSION', 'OFFER', 'VENUE');

CREATE TABLE "ProviderLink" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "entityKind" "ProviderEntityKind" NOT NULL,
    "eventId" TEXT,
    "sessionId" TEXT,
    "offerId" TEXT,
    "venueId" TEXT,
    "externalId" TEXT NOT NULL,
    "externalParentId" TEXT NOT NULL DEFAULT '',
    "sourceUrl" TEXT,
    "rawRecordId" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderLink_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProviderLink_target_matches_entity" CHECK (
        (
            "entityKind" = 'EVENT'
            AND "eventId" IS NOT NULL
            AND "sessionId" IS NULL
            AND "offerId" IS NULL
            AND "venueId" IS NULL
        )
        OR (
            "entityKind" = 'SESSION'
            AND "eventId" IS NULL
            AND "sessionId" IS NOT NULL
            AND "offerId" IS NULL
            AND "venueId" IS NULL
        )
        OR (
            "entityKind" = 'OFFER'
            AND "eventId" IS NULL
            AND "sessionId" IS NULL
            AND "offerId" IS NOT NULL
            AND "venueId" IS NULL
        )
        OR (
            "entityKind" = 'VENUE'
            AND "eventId" IS NULL
            AND "sessionId" IS NULL
            AND "offerId" IS NULL
            AND "venueId" IS NOT NULL
        )
    )
);

CREATE UNIQUE INDEX "ProviderLink_sourceId_entityKind_externalId_externalParentId_key"
    ON "ProviderLink"("sourceId", "entityKind", "externalId", "externalParentId");

CREATE INDEX "ProviderLink_eventId_idx" ON "ProviderLink"("eventId");
CREATE INDEX "ProviderLink_sessionId_idx" ON "ProviderLink"("sessionId");
CREATE INDEX "ProviderLink_offerId_idx" ON "ProviderLink"("offerId");
CREATE INDEX "ProviderLink_venueId_idx" ON "ProviderLink"("venueId");
CREATE INDEX "ProviderLink_sourceId_entityKind_idx" ON "ProviderLink"("sourceId", "entityKind");

ALTER TABLE "ProviderLink"
    ADD CONSTRAINT "ProviderLink_sourceId_fkey"
    FOREIGN KEY ("sourceId") REFERENCES "Source"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProviderLink"
    ADD CONSTRAINT "ProviderLink_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "Event"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProviderLink"
    ADD CONSTRAINT "ProviderLink_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "EventSession"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProviderLink"
    ADD CONSTRAINT "ProviderLink_offerId_fkey"
    FOREIGN KEY ("offerId") REFERENCES "EventOffer"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProviderLink"
    ADD CONSTRAINT "ProviderLink_venueId_fkey"
    FOREIGN KEY ("venueId") REFERENCES "Venue"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
