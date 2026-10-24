CREATE TABLE "PdpDocument" (
  "id" TEXT NOT NULL,
  "venueId" TEXT,
  "eventId" TEXT,
  "variant" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "content" JSONB NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PdpDocument_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PdpDocument_owner_check" CHECK (("venueId" IS NOT NULL) <> ("eventId" IS NOT NULL))
);

CREATE UNIQUE INDEX "PdpDocument_venueId_key" ON "PdpDocument"("venueId");
CREATE UNIQUE INDEX "PdpDocument_eventId_key" ON "PdpDocument"("eventId");
CREATE INDEX "PdpDocument_variant_status_idx" ON "PdpDocument"("variant", "status");

ALTER TABLE "PdpDocument" ADD CONSTRAINT "PdpDocument_venueId_fkey"
  FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PdpDocument" ADD CONSTRAINT "PdpDocument_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
