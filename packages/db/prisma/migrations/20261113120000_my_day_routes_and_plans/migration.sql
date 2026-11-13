CREATE TABLE "my_day_editorial_routes" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "citySlug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "my_day_editorial_routes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "my_day_editorial_route_stops" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "visitMinutes" INTEGER,
    "period" TEXT,
    "startsAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "my_day_editorial_route_stops_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "my_day_plans" (
    "id" TEXT NOT NULL,
    "publicCode" TEXT NOT NULL,
    "siteUserId" TEXT NOT NULL,
    "sourceRouteId" TEXT,
    "sourceRouteSlug" TEXT,
    "citySlug" TEXT,
    "title" TEXT,
    "travelMode" TEXT NOT NULL DEFAULT 'walk',
    "hourStart" TEXT NOT NULL DEFAULT '10:00',
    "hourEnd" TEXT NOT NULL DEFAULT '22:00',
    "hourPlanOn" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "my_day_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "my_day_plan_stops" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "title" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "address" TEXT,
    "note" TEXT,
    "visitMinutes" INTEGER,
    "period" TEXT,
    "startsAt" TIMESTAMP(3),
    "sessionLabel" TEXT,
    "ticketBought" BOOLEAN NOT NULL DEFAULT false,
    "isSuburb" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "my_day_plan_stops_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "my_day_editorial_routes_slug_key" ON "my_day_editorial_routes"("slug");
CREATE INDEX "my_day_editorial_routes_citySlug_status_publishedAt_idx" ON "my_day_editorial_routes"("citySlug", "status", "publishedAt");
CREATE INDEX "my_day_editorial_routes_updatedAt_idx" ON "my_day_editorial_routes"("updatedAt");
CREATE UNIQUE INDEX "my_day_editorial_route_stops_routeId_position_key" ON "my_day_editorial_route_stops"("routeId", "position");
CREATE INDEX "my_day_editorial_route_stops_sourceType_sourceId_idx" ON "my_day_editorial_route_stops"("sourceType", "sourceId");
CREATE UNIQUE INDEX "my_day_plans_publicCode_key" ON "my_day_plans"("publicCode");
CREATE INDEX "my_day_plans_siteUserId_updatedAt_idx" ON "my_day_plans"("siteUserId", "updatedAt");
CREATE INDEX "my_day_plans_sourceRouteId_idx" ON "my_day_plans"("sourceRouteId");
CREATE UNIQUE INDEX "my_day_plan_stops_planId_position_key" ON "my_day_plan_stops"("planId", "position");
CREATE INDEX "my_day_plan_stops_sourceType_sourceId_idx" ON "my_day_plan_stops"("sourceType", "sourceId");

ALTER TABLE "my_day_editorial_route_stops" ADD CONSTRAINT "my_day_editorial_route_stops_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "my_day_editorial_routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "my_day_plans" ADD CONSTRAINT "my_day_plans_siteUserId_fkey" FOREIGN KEY ("siteUserId") REFERENCES "SiteUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "my_day_plans" ADD CONSTRAINT "my_day_plans_sourceRouteId_fkey" FOREIGN KEY ("sourceRouteId") REFERENCES "my_day_editorial_routes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "my_day_plan_stops" ADD CONSTRAINT "my_day_plan_stops_planId_fkey" FOREIGN KEY ("planId") REFERENCES "my_day_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
