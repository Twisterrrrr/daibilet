-- /podborki: sense-blocks (categories) for landing carousels
CREATE TABLE IF NOT EXISTS "LandingCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LandingCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LandingCategory_slug_key" ON "LandingCategory"("slug");
CREATE INDEX IF NOT EXISTS "LandingCategory_isActive_sortOrder_idx" ON "LandingCategory"("isActive", "sortOrder");

ALTER TABLE "Landing" ADD COLUMN IF NOT EXISTS "categoryId" TEXT;

CREATE INDEX IF NOT EXISTS "Landing_categoryId_sortOrder_idx" ON "Landing"("categoryId", "sortOrder");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Landing_categoryId_fkey'
  ) THEN
    ALTER TABLE "Landing"
      ADD CONSTRAINT "Landing_categoryId_fkey"
      FOREIGN KEY ("categoryId") REFERENCES "LandingCategory"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

INSERT INTO "LandingCategory" ("id", "slug", "title", "subtitle", "sortOrder", "isActive", "createdAt", "updatedAt")
VALUES
  ('lcat_by_type', 'by-type', 'По типу событий', 'Экскурсии, концерты, музеи и активный отдых', 10, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('lcat_for_whom', 'for-whom', 'Для кого', 'Семьям, вечеринкам и тем, кто любит драйв', 20, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('lcat_seasonal', 'seasonal', 'Сезонное', 'Праздники, салюты и сезонные программы', 30, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO UPDATE SET
  "title" = EXCLUDED."title",
  "subtitle" = EXCLUDED."subtitle",
  "sortOrder" = EXCLUDED."sortOrder",
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = CURRENT_TIMESTAMP;

-- Backfill known podborki landings (Landing rows that already exist)
UPDATE "Landing" SET "categoryId" = 'lcat_seasonal', "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" IN ('new-year', 'salute-9-may');

UPDATE "Landing" SET "categoryId" = 'lcat_for_whom', "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" IN ('family-kids', 'river-party', 'active-sport');

UPDATE "Landing" SET "categoryId" = 'lcat_by_type', "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" IN (
  'river-cruises',
  'bus-tours',
  'walking-tours',
  'excursions',
  'country-tours',
  'exhibitions',
  'concerts-genre',
  'standup',
  'unusual-theatres',
  'rooftops',
  'planetarium',
  'moscow-museums',
  'spb-yards',
  'bridges-night',
  'moscow-dinner-boat'
)
AND ("categoryId" IS NULL OR "categoryId" = 'lcat_by_type');
