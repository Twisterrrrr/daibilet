CREATE TYPE "PlaceType" AS ENUM ('ARCHITECTURE', 'MONUMENT', 'MUSEUM', 'RELIGION', 'NATURE', 'URBAN', 'THEATRE', 'ENTERTAINMENT', 'FOOD', 'VENUE', 'OTHER');

ALTER TABLE "Venue"
  ADD COLUMN "placeType" "PlaceType" NOT NULL DEFAULT 'VENUE',
  ADD COLUMN "poiSourceKey" TEXT,
  ADD COLUMN "isMainPlace" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isTouristPlace" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "hubTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "parentPlaceId" TEXT;

CREATE UNIQUE INDEX "Venue_poiSourceKey_key" ON "Venue"("poiSourceKey");
CREATE INDEX "Venue_cityId_isTouristPlace_isMainPlace_idx" ON "Venue"("cityId", "isTouristPlace", "isMainPlace");
CREATE INDEX "Venue_parentPlaceId_idx" ON "Venue"("parentPlaceId");
ALTER TABLE "Venue" ADD CONSTRAINT "Venue_parentPlaceId_fkey" FOREIGN KEY ("parentPlaceId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
