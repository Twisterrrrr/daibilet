CREATE TABLE "EventTourGroup" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EventTourGroup_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EventTourGroup_title_idx" ON "EventTourGroup"("title");

ALTER TABLE "EventPage" ADD COLUMN "tourGroupId" TEXT;
CREATE INDEX "EventPage_tourGroupId_idx" ON "EventPage"("tourGroupId");
ALTER TABLE "EventPage" ADD CONSTRAINT "EventPage_tourGroupId_fkey"
  FOREIGN KEY ("tourGroupId") REFERENCES "EventTourGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
