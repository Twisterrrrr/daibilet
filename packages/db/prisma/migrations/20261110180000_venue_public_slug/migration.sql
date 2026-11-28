ALTER TABLE "Venue" ADD COLUMN "publicSlug" TEXT;

CREATE UNIQUE INDEX "Venue_publicSlug_key" ON "Venue"("publicSlug");