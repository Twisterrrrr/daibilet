CREATE TABLE "DestinationPdpDocument" (
    "id" TEXT NOT NULL,
    "cityId" TEXT,
    "regionId" TEXT,
    "summary" TEXT,
    "heroImageUrl" TEXT,
    "content" JSONB NOT NULL DEFAULT '{}',
    "publishedContent" JSONB,
    "seoH1" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "canonicalPath" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "isIndexable" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DestinationPdpDocument_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "DestinationPdpDocument_owner_check" CHECK (
        ("cityId" IS NOT NULL AND "regionId" IS NULL)
        OR ("cityId" IS NULL AND "regionId" IS NOT NULL)
    )
);

CREATE UNIQUE INDEX "DestinationPdpDocument_cityId_key"
    ON "DestinationPdpDocument"("cityId");
CREATE UNIQUE INDEX "DestinationPdpDocument_regionId_key"
    ON "DestinationPdpDocument"("regionId");
CREATE INDEX "DestinationPdpDocument_status_isIndexable_idx"
    ON "DestinationPdpDocument"("status", "isIndexable");
CREATE INDEX "DestinationPdpDocument_updatedAt_idx"
    ON "DestinationPdpDocument"("updatedAt");

ALTER TABLE "DestinationPdpDocument"
    ADD CONSTRAINT "DestinationPdpDocument_cityId_fkey"
    FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DestinationPdpDocument"
    ADD CONSTRAINT "DestinationPdpDocument_regionId_fkey"
    FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "DestinationPdpRevision" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "changeNote" TEXT,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DestinationPdpRevision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DestinationPdpRevision_documentId_version_key"
    ON "DestinationPdpRevision"("documentId", "version");
CREATE INDEX "DestinationPdpRevision_createdAt_idx"
    ON "DestinationPdpRevision"("createdAt");

ALTER TABLE "DestinationPdpRevision"
    ADD CONSTRAINT "DestinationPdpRevision_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "DestinationPdpDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
