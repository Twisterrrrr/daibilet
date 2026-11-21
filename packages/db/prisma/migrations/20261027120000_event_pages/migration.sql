CREATE TABLE "EventPage" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "content" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "seoH1" TEXT,
  "seoTitle" TEXT,
  "seoDescription" TEXT,
  "canonicalPath" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "isIndexable" BOOLEAN NOT NULL DEFAULT false,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EventPage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EventPageEvent" (
  "id" TEXT NOT NULL,
  "eventPageId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "role" TEXT NOT NULL DEFAULT 'PRIMARY',
  "sourceSnapshot" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EventPageEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EventPageRoute" (
  "id" TEXT NOT NULL,
  "eventPageId" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'HISTORICAL',
  "source" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EventPageRoute_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EventPageRevision" (
  "id" TEXT NOT NULL,
  "eventPageId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "content" JSONB NOT NULL,
  "sourceSnapshot" JSONB,
  "changeNote" TEXT,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EventPageRevision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EventPage_slug_key" ON "EventPage"("slug");
CREATE INDEX "EventPage_status_isIndexable_idx" ON "EventPage"("status", "isIndexable");
CREATE INDEX "EventPage_updatedAt_idx" ON "EventPage"("updatedAt");

CREATE UNIQUE INDEX "EventPageEvent_eventId_key" ON "EventPageEvent"("eventId");
CREATE UNIQUE INDEX "EventPageEvent_eventPageId_position_key" ON "EventPageEvent"("eventPageId", "position");
CREATE INDEX "EventPageEvent_eventPageId_role_idx" ON "EventPageEvent"("eventPageId", "role");

CREATE UNIQUE INDEX "EventPageRoute_path_key" ON "EventPageRoute"("path");
CREATE INDEX "EventPageRoute_eventPageId_kind_idx" ON "EventPageRoute"("eventPageId", "kind");

CREATE UNIQUE INDEX "EventPageRevision_eventPageId_version_key" ON "EventPageRevision"("eventPageId", "version");
CREATE INDEX "EventPageRevision_eventPageId_createdAt_idx" ON "EventPageRevision"("eventPageId", "createdAt");

ALTER TABLE "EventPageEvent" ADD CONSTRAINT "EventPageEvent_eventPageId_fkey"
  FOREIGN KEY ("eventPageId") REFERENCES "EventPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventPageEvent" ADD CONSTRAINT "EventPageEvent_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventPageRoute" ADD CONSTRAINT "EventPageRoute_eventPageId_fkey"
  FOREIGN KEY ("eventPageId") REFERENCES "EventPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventPageRevision" ADD CONSTRAINT "EventPageRevision_eventPageId_fkey"
  FOREIGN KEY ("eventPageId") REFERENCES "EventPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
