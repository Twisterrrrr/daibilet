CREATE TYPE "EventPageStatus" AS ENUM ('CANDIDATE', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "EventPageType" AS ENUM ('EVENT', 'SERIES');
CREATE TYPE "EventPageMatchMethod" AS ENUM ('SOURCE_GROUP_ID', 'MANUAL', 'REVIEWED_MATCH');

CREATE TABLE "event_pages" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "pageType" "EventPageType" NOT NULL DEFAULT 'EVENT',
  "status" "EventPageStatus" NOT NULL DEFAULT 'CANDIDATE',
  "isIndexable" BOOLEAN NOT NULL DEFAULT false,
  "cityId" TEXT,
  "venueId" TEXT,
  "seoH1" TEXT,
  "seoTitle" TEXT,
  "seoDescription" TEXT,
  "canonicalPath" TEXT,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "event_pages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "event_page_members" (
  "id" TEXT NOT NULL,
  "pageId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "matchMethod" "EventPageMatchMethod" NOT NULL,
  "confidence" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "event_page_members_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "event_page_slug_aliases" (
  "id" TEXT NOT NULL,
  "pageId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "event_page_slug_aliases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "event_pages_slug_key" ON "event_pages"("slug");
CREATE INDEX "event_pages_status_isIndexable_idx" ON "event_pages"("status", "isIndexable");
CREATE INDEX "event_pages_cityId_status_idx" ON "event_pages"("cityId", "status");
CREATE INDEX "event_pages_venueId_status_idx" ON "event_pages"("venueId", "status");

CREATE UNIQUE INDEX "event_page_members_eventId_key" ON "event_page_members"("eventId");
CREATE INDEX "event_page_members_pageId_idx" ON "event_page_members"("pageId");
CREATE UNIQUE INDEX "event_page_slug_aliases_slug_key" ON "event_page_slug_aliases"("slug");
CREATE INDEX "event_page_slug_aliases_pageId_idx" ON "event_page_slug_aliases"("pageId");

ALTER TABLE "event_pages" ADD CONSTRAINT "event_pages_cityId_fkey"
  FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "event_pages" ADD CONSTRAINT "event_pages_venueId_fkey"
  FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "event_page_members" ADD CONSTRAINT "event_page_members_pageId_fkey"
  FOREIGN KEY ("pageId") REFERENCES "event_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_page_members" ADD CONSTRAINT "event_page_members_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_page_slug_aliases" ADD CONSTRAINT "event_page_slug_aliases_pageId_fkey"
  FOREIGN KEY ("pageId") REFERENCES "event_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
