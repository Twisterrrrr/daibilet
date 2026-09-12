-- Fuzzy / morphology-ish name search for header UX (pg_trgm).
-- Meilisearch remains P2; this is the practical Postgres path.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Btree on Event.title for ILIKE prefix / admin contains (align with Venue_title_idx).
CREATE INDEX IF NOT EXISTS "Event_title_idx" ON "Event" ("title");

-- GIN trgm for similarity / % operator on public search fields.
CREATE INDEX IF NOT EXISTS "Venue_title_trgm_idx" ON "Venue" USING gin (lower("title") gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Event_title_trgm_idx" ON "Event" USING gin (lower("title") gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "City_title_trgm_idx" ON "City" USING gin (lower("title") gin_trgm_ops);
