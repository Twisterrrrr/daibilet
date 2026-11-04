-- Venue title search (admin/public q contains / ILIKE on "Venue"."title")
CREATE INDEX IF NOT EXISTS "Venue_title_idx" ON "Venue" ("title");
