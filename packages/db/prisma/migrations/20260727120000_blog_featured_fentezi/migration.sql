-- Blog Hero: снять open-air с featured, поставить fentezi-fest-bylinnyy-bereg
UPDATE "Article" SET "isFeatured" = false WHERE "isFeatured" = true;

UPDATE "Article"
SET "isFeatured" = true, "updatedAt" = now()
WHERE slug = 'fentezi-fest-bylinnyy-bereg';

UPDATE "Article"
SET status = 'HIDDEN'::"ArticleStatus", "isIndexable" = false, "isFeatured" = false, "updatedAt" = now()
WHERE slug = 'open-air-festy-vyhodnoi-ru';
