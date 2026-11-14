-- Blog Hero: one featured article on /blog (admin-controlled).
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "isFeatured" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "Article_isFeatured_idx" ON "Article"("isFeatured");
