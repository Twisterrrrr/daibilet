-- Short links for «Мой день» viral share: /d/{code} → /my-day?city=&items=

CREATE TABLE "day_route_shares" (
    "code" TEXT NOT NULL,
    "citySlug" TEXT,
    "items" TEXT NOT NULL,
    "fromName" TEXT,
    "hitCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "day_route_shares_pkey" PRIMARY KEY ("code")
);

CREATE INDEX "day_route_shares_citySlug_items_idx" ON "day_route_shares"("citySlug", "items");

CREATE INDEX "day_route_shares_createdAt_idx" ON "day_route_shares"("createdAt");
