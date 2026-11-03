CREATE TYPE "SupplierPlaceRequestType" AS ENUM ('CREATE', 'UPDATE');
CREATE TYPE "SupplierPlaceRequestStatus" AS ENUM ('SUBMITTED', 'NEEDS_INFO', 'APPROVED', 'REJECTED', 'APPLIED');

CREATE TABLE "SupplierPlaceRequest" (
  "id" TEXT NOT NULL,
  "supplierId" TEXT NOT NULL,
  "venueId" TEXT,
  "createdBySiteUserId" TEXT,
  "type" "SupplierPlaceRequestType" NOT NULL,
  "status" "SupplierPlaceRequestStatus" NOT NULL DEFAULT 'SUBMITTED',
  "title" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "sourceSnapshot" JSONB,
  "adminComment" TEXT,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  "appliedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupplierPlaceRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SupplierPlaceRequest_supplierId_status_submittedAt_idx"
  ON "SupplierPlaceRequest"("supplierId", "status", "submittedAt");
CREATE INDEX "SupplierPlaceRequest_venueId_status_idx"
  ON "SupplierPlaceRequest"("venueId", "status");
CREATE INDEX "SupplierPlaceRequest_createdBySiteUserId_submittedAt_idx"
  ON "SupplierPlaceRequest"("createdBySiteUserId", "submittedAt");

ALTER TABLE "SupplierPlaceRequest"
  ADD CONSTRAINT "SupplierPlaceRequest_supplierId_fkey"
  FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupplierPlaceRequest"
  ADD CONSTRAINT "SupplierPlaceRequest_venueId_fkey"
  FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupplierPlaceRequest"
  ADD CONSTRAINT "SupplierPlaceRequest_createdBySiteUserId_fkey"
  FOREIGN KEY ("createdBySiteUserId") REFERENCES "SiteUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
