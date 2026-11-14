-- Description text provenance + AI rewrite revision queue (post-sync description canon,
-- owner rule 2026-10-20: sanitize new imported events right after sync; AI rewrite is
-- queued and published only after editorial approval).

-- CreateEnum
CREATE TYPE "DescriptionOrigin" AS ENUM ('AUTO', 'EDITORIAL', 'AI');

-- CreateEnum
CREATE TYPE "DescriptionRevisionStatus" AS ENUM ('QUEUED', 'GENERATED', 'CHECKED', 'APPROVED', 'PUBLISHED', 'STALE');

-- AlterTable
ALTER TABLE "EventOverride"
  ADD COLUMN "descriptionOrigin" "DescriptionOrigin",
  ADD COLUMN "descriptionSourceHash" TEXT;

-- CreateTable
CREATE TABLE "EventDescriptionRevision" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "status" "DescriptionRevisionStatus" NOT NULL DEFAULT 'QUEUED',
    "priority" TEXT,
    "sourceHash" TEXT NOT NULL,
    "promptVersion" TEXT,
    "model" TEXT,
    "sourceText" TEXT NOT NULL,
    "draftText" TEXT,
    "finalText" TEXT,
    "qaFlags" JSONB,
    "createdBy" TEXT,
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventDescriptionRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventDescriptionRevision_eventId_idx" ON "EventDescriptionRevision"("eventId");

-- CreateIndex
CREATE INDEX "EventDescriptionRevision_status_idx" ON "EventDescriptionRevision"("status");

-- CreateIndex
CREATE UNIQUE INDEX "EventDescriptionRevision_eventId_sourceHash_key" ON "EventDescriptionRevision"("eventId", "sourceHash");

-- AddForeignKey
ALTER TABLE "EventDescriptionRevision"
  ADD CONSTRAINT "EventDescriptionRevision_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;