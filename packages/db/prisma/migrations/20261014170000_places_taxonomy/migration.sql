CREATE TYPE "PlaceType" AS ENUM ('ARCHITECTURE', 'MONUMENT', 'MUSEUM', 'RELIGION', 'NATURE', 'URBAN', 'THEATRE', 'ENTERTAINMENT', 'FOOD', 'VENUE', 'TRANSPORT', 'OTHER');
CREATE TYPE "PlacePageTemplate" AS ENUM ('DEFAULT', 'PIER_DEPARTURES');

ALTER TABLE "Venue"
  ADD COLUMN "placeType" "PlaceType",
  ADD COLUMN "placeSubtype" TEXT,
  ADD COLUMN "pageTemplate" "PlacePageTemplate" NOT NULL DEFAULT 'DEFAULT',
  ADD COLUMN "placeRoles" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "poiSourceKey" TEXT,
  ADD COLUMN "isMainPlace" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isTouristPlace" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "hubTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "parentPlaceId" TEXT;

CREATE UNIQUE INDEX "Venue_poiSourceKey_key" ON "Venue"("poiSourceKey");
CREATE INDEX "Venue_cityId_isTouristPlace_isMainPlace_idx" ON "Venue"("cityId", "isTouristPlace", "isMainPlace");
CREATE INDEX "Venue_parentPlaceId_idx" ON "Venue"("parentPlaceId");
ALTER TABLE "Venue" ADD CONSTRAINT "Venue_parentPlaceId_fkey" FOREIGN KEY ("parentPlaceId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "TripDeparture" (
  id TEXT PRIMARY KEY,
  "sessionId" TEXT NOT NULL,
  "departurePlaceId" TEXT NOT NULL,
  "arrivalPlaceId" TEXT,
  "departsAt" TIMESTAMP(3),
  "arrivesAt" TIMESTAMP(3),
  "sourceCode" "SourceCode",
  verified BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "TripDeparture_sessionId_departurePlaceId_key" ON "TripDeparture"("sessionId", "departurePlaceId");
CREATE INDEX "TripDeparture_departurePlaceId_departsAt_idx" ON "TripDeparture"("departurePlaceId", "departsAt");
CREATE INDEX "TripDeparture_arrivalPlaceId_idx" ON "TripDeparture"("arrivalPlaceId");
ALTER TABLE "TripDeparture" ADD CONSTRAINT "TripDeparture_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "EventSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TripDeparture" ADD CONSTRAINT "TripDeparture_departurePlaceId_fkey" FOREIGN KEY ("departurePlaceId") REFERENCES "Venue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TripDeparture" ADD CONSTRAINT "TripDeparture_arrivalPlaceId_fkey" FOREIGN KEY ("arrivalPlaceId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
