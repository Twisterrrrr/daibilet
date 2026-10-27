-- CreateEnum
CREATE TYPE "EventManagementMode" AS ENUM ('SOURCE_MANAGED', 'DAIBILET_MANAGED', 'SUPPLIER_DRAFTS', 'SUPPLIER_SELF_SERVICE');

-- CreateEnum
CREATE TYPE "EventActorType" AS ENUM ('ADMIN', 'SUPPLIER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "EventChangeRequestType" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'ARCHIVE', 'PUBLISH', 'UNPUBLISH', 'CONTENT_UPDATE', 'MEDIA_UPDATE', 'SEO_UPDATE', 'SCHEDULE_UPDATE', 'OFFER_UPDATE');

-- CreateEnum
CREATE TYPE "EventChangeRequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'APPLY_FAILED', 'REJECTED', 'CANCELLED', 'APPLIED');

-- CreateEnum
CREATE TYPE "EventChangeLogAction" AS ENUM ('CREATED', 'UPDATED', 'DELETED', 'ARCHIVED', 'RESTORED', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PUBLISHED', 'UNPUBLISHED', 'SCHEDULE_CHANGED', 'OFFER_CHANGED', 'APPLY_FAILED');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "createdBySiteUserId" TEXT,
ADD COLUMN     "createdByType" "EventActorType" NOT NULL DEFAULT 'SYSTEM',
ADD COLUMN     "defaultCapacityTotal" INTEGER,
ADD COLUMN     "managementMode" "EventManagementMode" NOT NULL DEFAULT 'SOURCE_MANAGED',
ADD COLUMN     "moderatedAt" TIMESTAMP(3),
ADD COLUMN     "moderatedBySiteUserId" TEXT,
ADD COLUMN     "moderationComment" TEXT,
ADD COLUMN     "openDateValidDays" INTEGER,
ADD COLUMN     "openDateValidFrom" TIMESTAMP(3),
ADD COLUMN     "openDateValidTo" TIMESTAMP(3),
ADD COLUMN     "purchaseFlow" "PurchaseFlow" NOT NULL DEFAULT 'EXTERNAL',
ADD COLUMN     "salesEndsAt" TIMESTAMP(3),
ADD COLUMN     "salesStartsAt" TIMESTAMP(3),
ADD COLUMN     "scheduleLocked" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "submittedAt" TIMESTAMP(3),
ADD COLUMN     "submittedBySiteUserId" TEXT,
ADD COLUMN     "supplierId" TEXT;

-- AlterTable
ALTER TABLE "EventOffer" ADD COLUMN     "capacityTotal" INTEGER,
ADD COLUMN     "groupSize" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "oldPriceRub" INTEGER,
ADD COLUMN     "weekdayMask" INTEGER;

-- AlterTable
ALTER TABLE "EventSession" ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "capacitySold" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "capacityTotal" INTEGER,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "ExternalOrder" ADD COLUMN     "buyerEmailNormalized" TEXT,
ADD COLUMN     "buyerPhoneNormalized" TEXT,
ADD COLUMN     "linkedAt" TIMESTAMP(3),
ADD COLUMN     "siteUserId" TEXT;

-- AlterTable
ALTER TABLE "SiteUser" ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "phone" TEXT;

-- AlterTable
ALTER TABLE "SupplierEvent" ADD COLUMN     "canEditContent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canEditMedia" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canEditOffers" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canEditSchedule" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canEditSeo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "managementMode" "EventManagementMode" NOT NULL DEFAULT 'SOURCE_MANAGED';

-- CreateTable
CREATE TABLE "EventChangeRequest" (
    "id" TEXT NOT NULL,
    "eventId" TEXT,
    "supplierId" TEXT,
    "type" "EventChangeRequestType" NOT NULL DEFAULT 'UPDATE',
    "status" "EventChangeRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "createdByType" "EventActorType" NOT NULL DEFAULT 'SUPPLIER',
    "createdBySiteUserId" TEXT,
    "reviewedBySiteUserId" TEXT,
    "title" TEXT,
    "summary" TEXT,
    "payload" JSONB,
    "adminComment" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventChangeLog" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "supplierId" TEXT,
    "actorType" "EventActorType" NOT NULL DEFAULT 'SYSTEM',
    "actorSiteUserId" TEXT,
    "action" "EventChangeLogAction" NOT NULL,
    "diff" JSONB,
    "metaJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Event_purchaseFlow_idx" ON "Event"("purchaseFlow");

-- CreateIndex
CREATE INDEX "Event_managementMode_status_idx" ON "Event"("managementMode", "status");

-- CreateIndex
CREATE INDEX "Event_supplierId_status_idx" ON "Event"("supplierId", "status");

-- CreateIndex
CREATE INDEX "EventSession_eventId_isActive_startsAt_idx" ON "EventSession"("eventId", "isActive", "startsAt");

-- CreateIndex
CREATE INDEX "ExternalOrder_siteUserId_purchasedAt_idx" ON "ExternalOrder"("siteUserId", "purchasedAt");

-- CreateIndex
CREATE INDEX "ExternalOrder_buyerEmailNormalized_idx" ON "ExternalOrder"("buyerEmailNormalized");

-- CreateIndex
CREATE INDEX "ExternalOrder_buyerPhoneNormalized_idx" ON "ExternalOrder"("buyerPhoneNormalized");

-- CreateIndex
CREATE INDEX "SupplierEvent_supplierId_managementMode_idx" ON "SupplierEvent"("supplierId", "managementMode");

-- CreateIndex
CREATE INDEX "EventChangeRequest_eventId_status_idx" ON "EventChangeRequest"("eventId", "status");

-- CreateIndex
CREATE INDEX "EventChangeRequest_supplierId_status_idx" ON "EventChangeRequest"("supplierId", "status");

-- CreateIndex
CREATE INDEX "EventChangeRequest_createdBySiteUserId_status_idx" ON "EventChangeRequest"("createdBySiteUserId", "status");

-- CreateIndex
CREATE INDEX "EventChangeRequest_status_createdAt_idx" ON "EventChangeRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "EventChangeLog_eventId_createdAt_idx" ON "EventChangeLog"("eventId", "createdAt");

-- CreateIndex
CREATE INDEX "EventChangeLog_supplierId_createdAt_idx" ON "EventChangeLog"("supplierId", "createdAt");

-- CreateIndex
CREATE INDEX "EventChangeLog_actorSiteUserId_createdAt_idx" ON "EventChangeLog"("actorSiteUserId", "createdAt");

-- CreateIndex
CREATE INDEX "EventChangeLog_action_createdAt_idx" ON "EventChangeLog"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_createdBySiteUserId_fkey" FOREIGN KEY ("createdBySiteUserId") REFERENCES "SiteUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_submittedBySiteUserId_fkey" FOREIGN KEY ("submittedBySiteUserId") REFERENCES "SiteUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_moderatedBySiteUserId_fkey" FOREIGN KEY ("moderatedBySiteUserId") REFERENCES "SiteUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalOrder" ADD CONSTRAINT "ExternalOrder_siteUserId_fkey" FOREIGN KEY ("siteUserId") REFERENCES "SiteUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventChangeRequest" ADD CONSTRAINT "EventChangeRequest_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventChangeRequest" ADD CONSTRAINT "EventChangeRequest_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventChangeRequest" ADD CONSTRAINT "EventChangeRequest_createdBySiteUserId_fkey" FOREIGN KEY ("createdBySiteUserId") REFERENCES "SiteUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventChangeRequest" ADD CONSTRAINT "EventChangeRequest_reviewedBySiteUserId_fkey" FOREIGN KEY ("reviewedBySiteUserId") REFERENCES "SiteUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventChangeLog" ADD CONSTRAINT "EventChangeLog_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventChangeLog" ADD CONSTRAINT "EventChangeLog_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventChangeLog" ADD CONSTRAINT "EventChangeLog_actorSiteUserId_fkey" FOREIGN KEY ("actorSiteUserId") REFERENCES "SiteUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
