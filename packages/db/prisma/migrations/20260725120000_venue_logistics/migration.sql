-- CV.9a: venue logistics fields (manual CMS)
ALTER TABLE "Venue" ADD COLUMN IF NOT EXISTS "metroStation" TEXT;
ALTER TABLE "Venue" ADD COLUMN IF NOT EXISTS "wayToFind" TEXT;
ALTER TABLE "Venue" ADD COLUMN IF NOT EXISTS "parkingInfo" TEXT;
