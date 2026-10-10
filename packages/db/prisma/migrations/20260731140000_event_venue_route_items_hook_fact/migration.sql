-- Location↔Excursion Phase A: EventVenueRouteItem + Venue.hookFact
-- (PARK/MONUMENT already in 20260731130000_venue_kind_park_monument)
-- Event.venueId = start; route items hold STOP / START / NEARBY_HUB.

-- CreateEnum
CREATE TYPE "RouteItemRole" AS ENUM ('STOP', 'START', 'NEARBY_HUB');

-- CreateTable
CREATE TABLE "event_venue_route_items" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "role" "RouteItemRole" NOT NULL DEFAULT 'STOP',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_venue_route_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_venue_route_items_eventId_venueId_role_key" ON "event_venue_route_items"("eventId", "venueId", "role");

-- CreateIndex
CREATE INDEX "event_venue_route_items_eventId_sortOrder_idx" ON "event_venue_route_items"("eventId", "sortOrder");

-- CreateIndex
CREATE INDEX "event_venue_route_items_venueId_idx" ON "event_venue_route_items"("venueId");

-- AddForeignKey
ALTER TABLE "event_venue_route_items" ADD CONSTRAINT "event_venue_route_items_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_venue_route_items" ADD CONSTRAINT "event_venue_route_items_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Venue" ADD COLUMN IF NOT EXISTS "hookFact" TEXT;
