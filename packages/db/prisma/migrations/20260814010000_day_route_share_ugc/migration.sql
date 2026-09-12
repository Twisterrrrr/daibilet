-- My Day share UGC scaffold: title/slug, counters, ratings, status
-- Nullable + defaults so existing /d/{code} rows remain valid.

ALTER TABLE "day_route_shares" ADD COLUMN "title" TEXT;
ALTER TABLE "day_route_shares" ADD COLUMN "titleSlug" TEXT;
ALTER TABLE "day_route_shares" ADD COLUMN "authorName" TEXT;
ALTER TABLE "day_route_shares" ADD COLUMN "saveCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "day_route_shares" ADD COLUMN "ratingSum" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "day_route_shares" ADD COLUMN "ratingCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "day_route_shares" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'PUBLISHED';

CREATE INDEX "day_route_shares_status_createdAt_idx" ON "day_route_shares"("status", "createdAt");
CREATE INDEX "day_route_shares_titleSlug_idx" ON "day_route_shares"("titleSlug");
