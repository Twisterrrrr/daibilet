-- CreateEnum
CREATE TYPE "SourceCode" AS ENUM ('TICKETSCLOUD', 'TEPLOHOD', 'MANUAL');

-- CreateEnum
CREATE TYPE "EventKind" AS ENUM ('SINGLE', 'RECURRING', 'OPEN_DATE');

-- CreateEnum
CREATE TYPE "PublishStatus" AS ENUM ('DRAFT', 'REVIEW', 'READY', 'PUBLISHED', 'HIDDEN');

-- CreateEnum
CREATE TYPE "VenueKind" AS ENUM ('VENUE', 'MUSEUM_ART_SPACE', 'THEATER', 'CONCERT_HALL', 'CLUB_BAR_RESTAURANT', 'PIER', 'MEETING_POINT', 'OUTDOOR_LOCATION', 'SPORT_ACTIVITY_SPACE', 'ATTRACTION', 'ONLINE', 'OTHER');

-- CreateEnum
CREATE TYPE "VenuePageStatus" AS ENUM ('NONE', 'CANDIDATE', 'PUBLISHED', 'HIDDEN');

-- CreateEnum
CREATE TYPE "LandingType" AS ENUM ('CITY', 'MULTI_CITY');

-- CreateEnum
CREATE TYPE "LandingBlockType" AS ENUM ('HERO', 'TRUST_BADGES', 'VALUE_PROPS', 'QUICK_FILTERS', 'FEATURED_VARIANTS', 'SCHEDULE_PREVIEW', 'CITY_GRID', 'CATEGORY_CHIPS', 'INFO_ICONS', 'STORY', 'HIGHLIGHTS', 'ITINERARY', 'PRICING', 'FAQ', 'REVIEWS', 'COMPARISON', 'RELATED_LANDINGS', 'RELATED_COLLECTIONS', 'RELATED_ARTICLES', 'CTA_BANNER', 'SEO_TEXT', 'RAW_RICH_TEXT');

-- CreateEnum
CREATE TYPE "CanonicalMode" AS ENUM ('SELF', 'CUSTOM', 'CANONICAL_LANDING', 'NOINDEX');

-- CreateEnum
CREATE TYPE "SeoEntityType" AS ENUM ('EVENT', 'VENUE', 'CITY', 'REGION', 'LANDING', 'ARTICLE', 'COLLECTION');

-- CreateEnum
CREATE TYPE "ArticleStatus" AS ENUM ('DRAFT', 'REVIEW', 'PUBLISHED', 'HIDDEN');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "code" "SourceCode" NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceSyncRun" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'RUNNING',
    "mode" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "stats" JSONB,
    "error" TEXT,

    CONSTRAINT "SourceSyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RawImportRecord" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "payloadHash" TEXT,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RawImportRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "kind" "EventKind" NOT NULL,
    "status" "PublishStatus" NOT NULL DEFAULT 'REVIEW',
    "sourceStatus" TEXT,
    "ageLimit" TEXT,
    "imageUrl" TEXT,
    "seoH1" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "canonicalPath" TEXT,
    "isIndexable" BOOLEAN NOT NULL DEFAULT true,
    "priceFromRub" INTEGER,
    "ticketsVacant" INTEGER,
    "primaryCityId" TEXT,
    "venueId" TEXT,
    "categoryId" TEXT,
    "primarySubcategoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventSourceLink" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "metaExternalId" TEXT,
    "sourceUrl" TEXT,
    "rawRecordId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventSourceLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventSession" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "sourceStatus" TEXT,
    "priceFromRub" INTEGER,
    "ticketsVacant" INTEGER,
    "externalId" TEXT,

    CONSTRAINT "EventSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventOffer" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "sourceCode" "SourceCode" NOT NULL,
    "title" TEXT,
    "priceRub" INTEGER,
    "widgetUrl" TEXT,
    "deeplinkUrl" TEXT,
    "payload" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "EventOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subcategory" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Subcategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventSubcategory" (
    "eventId" TEXT NOT NULL,
    "subcategoryId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "EventSubcategory_pkey" PRIMARY KEY ("eventId","subcategoryId")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventTag" (
    "eventId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "EventTag_pkey" PRIMARY KEY ("eventId","tagId")
);

-- CreateTable
CREATE TABLE "Region" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "City" (
    "id" TEXT NOT NULL,
    "regionId" TEXT,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sourceTitle" TEXT,
    "introTitle" TEXT,
    "introText" TEXT,
    "heroImageUrl" TEXT,
    "seoH1" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "canonicalPath" TEXT,
    "isDestination" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venue" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "shortDescription" TEXT,
    "heroImageUrl" TEXT,
    "seoH1" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "canonicalPath" TEXT,
    "isIndexable" BOOLEAN NOT NULL DEFAULT true,
    "cityId" TEXT,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "kind" "VenueKind" NOT NULL DEFAULT 'OTHER',
    "pageStatus" "VenuePageStatus" NOT NULL DEFAULT 'NONE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VenueAlias" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "sourceCode" "SourceCode" NOT NULL,
    "externalId" TEXT,
    "title" TEXT NOT NULL,
    "address" TEXT,

    CONSTRAINT "VenueAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Landing" (
    "id" TEXT NOT NULL,
    "type" "LandingType" NOT NULL DEFAULT 'MULTI_CITY',
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "status" "PublishStatus" NOT NULL DEFAULT 'REVIEW',
    "cityId" TEXT,
    "themeId" TEXT,
    "rules" JSONB NOT NULL,
    "heroTitle" TEXT,
    "heroSubtitle" TEXT,
    "heroBadge" TEXT,
    "heroImageUrl" TEXT,
    "heroMobileImageUrl" TEXT,
    "templateType" TEXT,
    "layoutVariant" TEXT,
    "surfaceVariant" TEXT,
    "seoH1" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "ogImageUrl" TEXT,
    "canonicalMode" "CanonicalMode" NOT NULL DEFAULT 'SELF',
    "canonicalUrl" TEXT,
    "canonicalLandingId" TEXT,
    "isIndexable" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Landing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandingMatch" (
    "landingId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "reasons" JSONB,

    CONSTRAINT "LandingMatch_pkey" PRIMARY KEY ("landingId","eventId")
);

-- CreateTable
CREATE TABLE "LandingTheme" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "defaultHeroTitle" TEXT,
    "defaultHeroBody" TEXT,
    "defaultSeoTitle" TEXT,
    "defaultSeoDescription" TEXT,
    "coverImageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandingTheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandingContentBlock" (
    "id" TEXT NOT NULL,
    "landingId" TEXT NOT NULL,
    "type" "LandingBlockType" NOT NULL,
    "variant" TEXT,
    "title" TEXT,
    "subtitle" TEXT,
    "eyebrow" TEXT,
    "body" TEXT,
    "richTextJson" JSONB,
    "payload" JSONB,
    "assetUrl" TEXT,
    "mobileAssetUrl" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "visibilityRules" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandingContentBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandingRelatedLink" (
    "id" TEXT NOT NULL,
    "landingId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LandingRelatedLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "ArticleStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" TEXT,
    "coverImageUrl" TEXT,
    "cityId" TEXT,
    "seoH1" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "canonicalPath" TEXT,
    "isIndexable" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeoMeta" (
    "id" TEXT NOT NULL,
    "entityType" "SeoEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "h1" TEXT,
    "canonicalUrl" TEXT,
    "robots" TEXT,
    "ogTitle" TEXT,
    "ogDescription" TEXT,
    "ogImageUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeoMeta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalOrder" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "externalOrderId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "buyerSnapshot" JSONB,
    "purchasedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalTicket" (
    "id" TEXT NOT NULL,
    "externalOrderId" TEXT NOT NULL,
    "externalTicketId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "eventId" TEXT,
    "sessionId" TEXT,

    CONSTRAINT "ExternalTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityIssue" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "QualityIssue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Source_code_key" ON "Source"("code");

-- CreateIndex
CREATE UNIQUE INDEX "RawImportRecord_sourceId_entityType_externalId_key" ON "RawImportRecord"("sourceId", "entityType", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "EventSourceLink_sourceId_externalId_key" ON "EventSourceLink"("sourceId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Subcategory_slug_key" ON "Subcategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Region_slug_key" ON "Region"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "City_slug_key" ON "City"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Venue_slug_key" ON "Venue"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Landing_slug_key" ON "Landing"("slug");

-- CreateIndex
CREATE INDEX "Landing_type_isActive_isIndexable_idx" ON "Landing"("type", "isActive", "isIndexable");

-- CreateIndex
CREATE INDEX "Landing_cityId_slug_idx" ON "Landing"("cityId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "LandingTheme_slug_key" ON "LandingTheme"("slug");

-- CreateIndex
CREATE INDEX "LandingContentBlock_landingId_sortOrder_idx" ON "LandingContentBlock"("landingId", "sortOrder");

-- CreateIndex
CREATE INDEX "LandingRelatedLink_landingId_sortOrder_idx" ON "LandingRelatedLink"("landingId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");

-- CreateIndex
CREATE INDEX "Article_status_isIndexable_publishedAt_idx" ON "Article"("status", "isIndexable", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SeoMeta_entityType_entityId_key" ON "SeoMeta"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalOrder_sourceId_externalOrderId_key" ON "ExternalOrder"("sourceId", "externalOrderId");

-- AddForeignKey
ALTER TABLE "SourceSyncRun" ADD CONSTRAINT "SourceSyncRun_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawImportRecord" ADD CONSTRAINT "RawImportRecord_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_primaryCityId_fkey" FOREIGN KEY ("primaryCityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_primarySubcategoryId_fkey" FOREIGN KEY ("primarySubcategoryId") REFERENCES "Subcategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventSourceLink" ADD CONSTRAINT "EventSourceLink_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventSourceLink" ADD CONSTRAINT "EventSourceLink_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventSession" ADD CONSTRAINT "EventSession_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventOffer" ADD CONSTRAINT "EventOffer_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subcategory" ADD CONSTRAINT "Subcategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventSubcategory" ADD CONSTRAINT "EventSubcategory_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventSubcategory" ADD CONSTRAINT "EventSubcategory_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "Subcategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTag" ADD CONSTRAINT "EventTag_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTag" ADD CONSTRAINT "EventTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "City" ADD CONSTRAINT "City_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venue" ADD CONSTRAINT "Venue_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenueAlias" ADD CONSTRAINT "VenueAlias_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Landing" ADD CONSTRAINT "Landing_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Landing" ADD CONSTRAINT "Landing_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "LandingTheme"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandingMatch" ADD CONSTRAINT "LandingMatch_landingId_fkey" FOREIGN KEY ("landingId") REFERENCES "Landing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandingMatch" ADD CONSTRAINT "LandingMatch_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandingContentBlock" ADD CONSTRAINT "LandingContentBlock_landingId_fkey" FOREIGN KEY ("landingId") REFERENCES "Landing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandingRelatedLink" ADD CONSTRAINT "LandingRelatedLink_landingId_fkey" FOREIGN KEY ("landingId") REFERENCES "Landing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalOrder" ADD CONSTRAINT "ExternalOrder_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalTicket" ADD CONSTRAINT "ExternalTicket_externalOrderId_fkey" FOREIGN KEY ("externalOrderId") REFERENCES "ExternalOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityIssue" ADD CONSTRAINT "QualityIssue_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
