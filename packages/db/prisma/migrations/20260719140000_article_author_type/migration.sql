-- Article filters: author + type (+ backfill from slug heuristics)
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "authorId" TEXT;
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "authorName" TEXT;
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "articleType" TEXT;

CREATE INDEX IF NOT EXISTS "Article_authorId_idx" ON "Article"("authorId");
CREATE INDEX IF NOT EXISTS "Article_articleType_idx" ON "Article"("articleType");

-- Backfill author / type for known inventory (17+ evergreen + column)
UPDATE "Article" SET
  "authorId" = CASE slug
    WHEN 'open-air-festy-vyhodnoi-ru' THEN 'max'
    WHEN 'kuda-poyti-s-detmi' THEN 'elena'
    WHEN 'spb-planetarium-gid' THEN 'elena'
    WHEN 'spb-dvory-paradnye-kommunalki' THEN 'anna'
    WHEN 'moskva-immersivnye-vystavki' THEN 'anna'
    WHEN 'myuzikly-teatr-novichok-msk-spb' THEN 'anna'
    ELSE COALESCE("authorId", 'editorial')
  END,
  "authorName" = CASE slug
    WHEN 'open-air-festy-vyhodnoi-ru' THEN 'Макс'
    WHEN 'kuda-poyti-s-detmi' THEN 'Елена'
    WHEN 'spb-planetarium-gid' THEN 'Елена'
    WHEN 'spb-dvory-paradnye-kommunalki' THEN 'Анна'
    WHEN 'moskva-immersivnye-vystavki' THEN 'Анна'
    WHEN 'myuzikly-teatr-novichok-msk-spb' THEN 'Анна'
    ELSE COALESCE("authorName", 'Редакция')
  END,
  "articleType" = CASE slug
    WHEN 'open-air-festy-vyhodnoi-ru' THEN 'column'
    WHEN 'moskva-avtobusnaya-obzornaya' THEN 'obzor'
    WHEN 'afisha-regionalnye-goroda' THEN 'obzor'
    ELSE CASE
      WHEN slug LIKE 'afisha-nedeli-%' THEN 'digest'
      ELSE COALESCE("articleType", 'gid')
    END
  END
WHERE "authorId" IS NULL OR "authorName" IS NULL OR "articleType" IS NULL;

-- Digest slug pattern (any weekly digests already in DB)
UPDATE "Article"
SET "articleType" = 'digest',
    "authorId" = COALESCE("authorId", 'editorial'),
    "authorName" = COALESCE("authorName", 'Редакция')
WHERE slug LIKE 'afisha-nedeli-%'
  AND ("articleType" IS NULL OR "articleType" = 'gid');
