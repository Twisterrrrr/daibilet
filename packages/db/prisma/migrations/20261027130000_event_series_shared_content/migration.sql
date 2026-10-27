CREATE TABLE "event_series" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "imageUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "event_series_pkey" PRIMARY KEY ("id")
);

CREATE TYPE "EventPageEditorialStatus" AS ENUM ('NEEDS_EDITORIAL', 'IN_REVIEW', 'READY');
ALTER TABLE "event_pages"
  ADD COLUMN "editorialStatus" "EventPageEditorialStatus" NOT NULL DEFAULT 'NEEDS_EDITORIAL',
  ADD COLUMN "editorialIssues" JSONB;
CREATE INDEX "event_pages_editorialStatus_status_idx" ON "event_pages"("editorialStatus", "status");

CREATE INDEX "event_series_title_idx" ON "event_series"("title");

ALTER TABLE "event_pages" ADD COLUMN "seriesId" TEXT;
CREATE INDEX "event_pages_seriesId_idx" ON "event_pages"("seriesId");
ALTER TABLE "event_pages" ADD CONSTRAINT "event_pages_seriesId_fkey"
  FOREIGN KEY ("seriesId") REFERENCES "event_series"("id") ON DELETE SET NULL ON UPDATE CASCADE;
