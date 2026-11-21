-- Phase 3: editorial citySlug on Article for city-hub binding.
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "citySlug" TEXT;

CREATE INDEX IF NOT EXISTS "Article_citySlug_idx" ON "Article"("citySlug");

-- Backfill from City.slug + known article slug heuristics; normalize to blog canonical.
UPDATE "Article" a
SET "citySlug" = CASE
  WHEN a.slug IN ('afisha-regionalnye-goroda') THEN 'regions'
  WHEN a.slug IN ('myuzikly-teatr-novichok-msk-spb') THEN 'multi'
  WHEN a.slug LIKE 'spb-%' OR a.slug LIKE '%-spb' OR a.slug LIKE '%peterburg%' THEN 'saint-petersburg'
  WHEN a.slug LIKE 'moskva-%' OR a.slug LIKE '%-msk' THEN 'moscow'
  WHEN a.slug LIKE 'kazan-%' THEN 'kazan'
  WHEN c.slug IN ('sankt-peterburg', 'saint-petersburg', 'spb') THEN 'saint-petersburg'
  WHEN c.slug IN ('moscow', 'moskva', 'msk') THEN 'moscow'
  WHEN c.slug IS NOT NULL AND c.slug <> '' THEN c.slug
  ELSE a."citySlug"
END
FROM "City" c
WHERE c.id = a."cityId"
  AND (a."citySlug" IS NULL OR a."citySlug" = '');

-- Articles without cityId but with slug heuristics.
UPDATE "Article" a
SET "citySlug" = CASE
  WHEN a.slug IN ('afisha-regionalnye-goroda') THEN 'regions'
  WHEN a.slug IN ('myuzikly-teatr-novichok-msk-spb') THEN 'multi'
  WHEN a.slug LIKE 'spb-%' OR a.slug LIKE '%-spb' OR a.slug LIKE '%peterburg%' THEN 'saint-petersburg'
  WHEN a.slug LIKE 'moskva-%' OR a.slug LIKE '%-msk' THEN 'moscow'
  WHEN a.slug LIKE 'kazan-%' THEN 'kazan'
  ELSE a."citySlug"
END
WHERE a."citySlug" IS NULL OR a."citySlug" = '';
