CREATE TABLE "PdpDocumentRevision" (
    "id" TEXT NOT NULL,
    "pdpDocumentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "variant" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PdpDocumentRevision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PdpDocumentRevision_pdpDocumentId_version_key"
ON "PdpDocumentRevision"("pdpDocumentId", "version");

CREATE INDEX "PdpDocumentRevision_pdpDocumentId_createdAt_idx"
ON "PdpDocumentRevision"("pdpDocumentId", "createdAt");

ALTER TABLE "PdpDocumentRevision"
ADD CONSTRAINT "PdpDocumentRevision_pdpDocumentId_fkey"
FOREIGN KEY ("pdpDocumentId") REFERENCES "PdpDocument"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "PdpDocumentRevision" (
    "id", "pdpDocumentId", "version", "variant", "status", "content", "createdAt"
)
SELECT
    'pdpdocrev_baseline_' || md5("id"), "id", "version", "variant", "status", "content", "updatedAt"
FROM "PdpDocument"
ON CONFLICT ("pdpDocumentId", "version") DO NOTHING;
