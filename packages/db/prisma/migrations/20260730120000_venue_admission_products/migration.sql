-- Add venue-level admission products for museums, art spaces, attractions and other open-date venue tickets.
-- This keeps imported/source-owned events intact while allowing venues to sell admission without a fake event.

CREATE TYPE "AdmissionProductType" AS ENUM (
    'MUSEUM_ENTRY',
    'GALLERY_ENTRY',
    'ART_SPACE_ENTRY',
    'EXHIBITION_ENTRY',
    'OBSERVATION_ENTRY',
    'PARK_ENTRY',
    'ATTRACTION_ENTRY',
    'ZOO_ENTRY',
    'AQUARIUM_ENTRY',
    'COMPLEX_ENTRY',
    'OTHER'
);

CREATE TYPE "AdmissionValidityMode" AS ENUM (
    'OPEN_DATE',
    'FIXED_WINDOW',
    'VALID_DAYS_AFTER_PURCHASE'
);

CREATE TYPE "CheckoutSubjectKind" AS ENUM (
    'EVENT',
    'VENUE_ADMISSION'
);

CREATE TABLE "AdmissionProduct" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "shortTitle" TEXT,
    "description" TEXT,
    "shortDescription" TEXT,
    "type" "AdmissionProductType" NOT NULL DEFAULT 'OTHER',
    "status" "PublishStatus" NOT NULL DEFAULT 'REVIEW',
    "purchaseFlow" "PurchaseFlow" NOT NULL DEFAULT 'PLATFORM',
    "managementMode" "EventManagementMode" NOT NULL DEFAULT 'DAIBILET_MANAGED',
    "sourceCode" "SourceCode" NOT NULL DEFAULT 'MANUAL',
    "sourceStatus" TEXT,
    "imageUrl" TEXT,
    "seoH1" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "canonicalPath" TEXT,
    "isIndexable" BOOLEAN NOT NULL DEFAULT true,
    "priceFromRub" INTEGER,
    "ticketsVacant" INTEGER,
    "defaultCapacityTotal" INTEGER,
    "validityMode" "AdmissionValidityMode" NOT NULL DEFAULT 'OPEN_DATE',
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "validDaysAfterPurchase" INTEGER,
    "salesStartsAt" TIMESTAMP(3),
    "salesEndsAt" TIMESTAMP(3),
    "cityId" TEXT,
    "venueId" TEXT NOT NULL,
    "categoryId" TEXT,
    "primarySubcategoryId" TEXT,
    "supplierId" TEXT,
    "createdByType" "EventActorType" NOT NULL DEFAULT 'SYSTEM',
    "createdBySiteUserId" TEXT,
    "moderatedBySiteUserId" TEXT,
    "moderatedAt" TIMESTAMP(3),
    "moderationComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdmissionProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AdmissionOffer" (
    "id" TEXT NOT NULL,
    "admissionProductId" TEXT NOT NULL,
    "sourceCode" "SourceCode" NOT NULL,
    "title" TEXT,
    "priceRub" INTEGER,
    "oldPriceRub" INTEGER,
    "capacityTotal" INTEGER,
    "groupSize" INTEGER NOT NULL DEFAULT 1,
    "weekdayMask" INTEGER,
    "widgetUrl" TEXT,
    "deeplinkUrl" TEXT,
    "payload" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdmissionOffer_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CheckoutItem"
    ADD COLUMN "subjectType" "CheckoutSubjectKind" NOT NULL DEFAULT 'EVENT',
    ADD COLUMN "admissionProductId" TEXT,
    ADD COLUMN "admissionOfferId" TEXT;

ALTER TABLE "FulfillmentItem"
    ADD COLUMN "admissionOfferId" TEXT;

ALTER TABLE "SupplierCommissionRule"
    ADD COLUMN "admissionProductId" TEXT;

CREATE UNIQUE INDEX "AdmissionProduct_slug_key" ON "AdmissionProduct"("slug");
CREATE INDEX "AdmissionProduct_status_idx" ON "AdmissionProduct"("status");
CREATE INDEX "AdmissionProduct_type_status_idx" ON "AdmissionProduct"("type", "status");
CREATE INDEX "AdmissionProduct_purchaseFlow_idx" ON "AdmissionProduct"("purchaseFlow");
CREATE INDEX "AdmissionProduct_managementMode_status_idx" ON "AdmissionProduct"("managementMode", "status");
CREATE INDEX "AdmissionProduct_cityId_idx" ON "AdmissionProduct"("cityId");
CREATE INDEX "AdmissionProduct_venueId_status_idx" ON "AdmissionProduct"("venueId", "status");
CREATE INDEX "AdmissionProduct_categoryId_idx" ON "AdmissionProduct"("categoryId");
CREATE INDEX "AdmissionProduct_supplierId_status_idx" ON "AdmissionProduct"("supplierId", "status");
CREATE INDEX "AdmissionProduct_validityMode_status_idx" ON "AdmissionProduct"("validityMode", "status");

CREATE INDEX "AdmissionOffer_admissionProductId_active_priceRub_idx"
    ON "AdmissionOffer"("admissionProductId", "active", "priceRub");
CREATE INDEX "AdmissionOffer_sourceCode_idx" ON "AdmissionOffer"("sourceCode");

CREATE INDEX "CheckoutItem_subjectType_idx" ON "CheckoutItem"("subjectType");
CREATE INDEX "CheckoutItem_admissionProductId_idx" ON "CheckoutItem"("admissionProductId");
CREATE INDEX "CheckoutItem_admissionOfferId_idx" ON "CheckoutItem"("admissionOfferId");
CREATE INDEX "FulfillmentItem_admissionOfferId_idx" ON "FulfillmentItem"("admissionOfferId");
CREATE INDEX "SupplierCommissionRule_admissionProductId_isActive_idx"
    ON "SupplierCommissionRule"("admissionProductId", "isActive");

ALTER TABLE "AdmissionProduct"
    ADD CONSTRAINT "AdmissionProduct_cityId_fkey"
    FOREIGN KEY ("cityId") REFERENCES "City"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AdmissionProduct"
    ADD CONSTRAINT "AdmissionProduct_venueId_fkey"
    FOREIGN KEY ("venueId") REFERENCES "Venue"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AdmissionProduct"
    ADD CONSTRAINT "AdmissionProduct_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "Category"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AdmissionProduct"
    ADD CONSTRAINT "AdmissionProduct_primarySubcategoryId_fkey"
    FOREIGN KEY ("primarySubcategoryId") REFERENCES "Subcategory"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AdmissionProduct"
    ADD CONSTRAINT "AdmissionProduct_supplierId_fkey"
    FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AdmissionProduct"
    ADD CONSTRAINT "AdmissionProduct_createdBySiteUserId_fkey"
    FOREIGN KEY ("createdBySiteUserId") REFERENCES "SiteUser"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AdmissionProduct"
    ADD CONSTRAINT "AdmissionProduct_moderatedBySiteUserId_fkey"
    FOREIGN KEY ("moderatedBySiteUserId") REFERENCES "SiteUser"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AdmissionOffer"
    ADD CONSTRAINT "AdmissionOffer_admissionProductId_fkey"
    FOREIGN KEY ("admissionProductId") REFERENCES "AdmissionProduct"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CheckoutItem"
    ADD CONSTRAINT "CheckoutItem_admissionProductId_fkey"
    FOREIGN KEY ("admissionProductId") REFERENCES "AdmissionProduct"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CheckoutItem"
    ADD CONSTRAINT "CheckoutItem_admissionOfferId_fkey"
    FOREIGN KEY ("admissionOfferId") REFERENCES "AdmissionOffer"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FulfillmentItem"
    ADD CONSTRAINT "FulfillmentItem_admissionOfferId_fkey"
    FOREIGN KEY ("admissionOfferId") REFERENCES "AdmissionOffer"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SupplierCommissionRule"
    ADD CONSTRAINT "SupplierCommissionRule_admissionProductId_fkey"
    FOREIGN KEY ("admissionProductId") REFERENCES "AdmissionProduct"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
