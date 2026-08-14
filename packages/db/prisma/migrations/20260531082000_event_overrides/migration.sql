CREATE TABLE "EventOverride" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "title" TEXT,
  "description" TEXT,
  "shortDescription" TEXT,
  "imageUrl" TEXT,
  "seoH1" TEXT,
  "seoTitle" TEXT,
  "seoDescription" TEXT,
  "canonicalPath" TEXT,
  "isIndexable" BOOLEAN,
  "editorStatus" "PublishStatus",
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EventOverride_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EventOverride_eventId_key" ON "EventOverride"("eventId");

ALTER TABLE "EventOverride"
  ADD CONSTRAINT "EventOverride_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
