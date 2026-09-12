-- CreateTable
CREATE TABLE IF NOT EXISTS "HeroBanner" (
    "id" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "link" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HeroBanner_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "HeroBanner_isActive_sortOrder_idx" ON "HeroBanner"("isActive", "sortOrder");

-- Seed 4 rotator banners (static hero pool already on disk)
INSERT INTO "HeroBanner" ("id", "imageUrl", "title", "link", "isActive", "sortOrder", "createdAt", "updatedAt")
VALUES
  ('hero_banner_seed_01', '/images/hero/home-hero-friends-selfie.jpg', 'Друзья на экскурсии', '/events?date=weekend&sort=popular', true, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('hero_banner_seed_02', '/images/hero/hero-slavic-01.png', 'Прогулка по городу', '/events?category=%D0%AD%D0%BA%D1%81%D0%BA%D1%83%D1%80%D1%81%D0%B8%D0%B8&sort=popular', true, 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('hero_banner_seed_03', '/images/hero/hero-slavic-04.png', 'Вечер на набережной', '/events?date=evening&sort=time', true, 30, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('hero_banner_seed_04', '/images/hero/hero-slavic-06.png', 'Речная прогулка', '/podborki', true, 40, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

-- Podborki hero roles via existing Landing.layoutVariant (pragmatic, no new enum)
UPDATE "Landing"
SET "layoutVariant" = 'HERO_FEATURED', "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" IN ('river-cruises', 'bridges-night')
  AND ("layoutVariant" IS NULL OR "layoutVariant" = '');

UPDATE "Landing"
SET "layoutVariant" = 'HERO_TRENDING', "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" IN ('standup', 'bus-tours', 'family-kids', 'moscow-dinner-boat')
  AND ("layoutVariant" IS NULL OR "layoutVariant" = '');
