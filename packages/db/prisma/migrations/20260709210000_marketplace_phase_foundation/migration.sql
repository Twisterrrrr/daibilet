-- CreateEnum
CREATE TYPE "SupplierStatus" AS ENUM ('DRAFT', 'REVIEW', 'ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SupplierKind" AS ENUM ('LEGAL_ENTITY', 'INDIVIDUAL_ENTREPRENEUR', 'SELF_EMPLOYED', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "SupplierRole" AS ENUM ('OWNER', 'ADMIN', 'OPERATOR', 'ACCOUNTANT', 'VIEWER');

-- CreateEnum
CREATE TYPE "SupplierCatalogMode" AS ENUM ('WIDGET_ONLY', 'INTERNAL_CHECKOUT', 'HYBRID');

-- CreateEnum
CREATE TYPE "CommissionScope" AS ENUM ('SUPPLIER', 'CATEGORY', 'EVENT');

-- CreateEnum
CREATE TYPE "CheckoutOrderStatus" AS ENUM ('DRAFT', 'PENDING_PAYMENT', 'PAID', 'CONFIRMED', 'FULFILLED', 'CANCELLED', 'REFUNDED', 'EXPIRED', 'FAILED');

-- CreateEnum
CREATE TYPE "CheckoutItemStatus" AS ENUM ('DRAFT', 'RESERVED', 'CONFIRMED', 'FULFILLED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('YOOKASSA', 'MANUAL');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'PENDING', 'WAITING_FOR_CAPTURE', 'SUCCEEDED', 'CANCELLED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "FiscalReceiptType" AS ENUM ('INCOME', 'REFUND');

-- CreateEnum
CREATE TYPE "FiscalReceiptStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'SENT', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('DRAFT', 'PENDING', 'PAID', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TripPlanStatus" AS ENUM ('DRAFT', 'RESERVED', 'PAID', 'CONFIRMED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "TripVoucherStatus" AS ENUM ('DRAFT', 'ISSUED', 'CANCELLED', 'REISSUED', 'USED', 'EXPIRED');

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "legalName" TEXT,
    "kind" "SupplierKind" NOT NULL DEFAULT 'LEGAL_ENTITY',
    "status" "SupplierStatus" NOT NULL DEFAULT 'DRAFT',
    "inn" TEXT,
    "kpp" TEXT,
    "ogrn" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "websiteUrl" TEXT,
    "yookassaShopId" TEXT,
    "defaultCatalogMode" "SupplierCatalogMode" NOT NULL DEFAULT 'WIDGET_ONLY',
    "defaultCommissionBps" INTEGER NOT NULL DEFAULT 0,
    "payoutBankName" TEXT,
    "payoutBankBic" TEXT,
    "payoutAccount" TEXT,
    "payoutCorrAccount" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierUser" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "siteUserId" TEXT NOT NULL,
    "role" "SupplierRole" NOT NULL DEFAULT 'OPERATOR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "invitedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierVenue" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierVenue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierEvent" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "catalogMode" "SupplierCatalogMode" NOT NULL DEFAULT 'WIDGET_ONLY',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierCommissionRule" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT,
    "eventId" TEXT,
    "categoryId" TEXT,
    "scope" "CommissionScope" NOT NULL DEFAULT 'SUPPLIER',
    "title" TEXT,
    "percentBps" INTEGER NOT NULL DEFAULT 0,
    "fixedFeeKopecks" INTEGER NOT NULL DEFAULT 0,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierCommissionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckoutOrder" (
    "id" TEXT NOT NULL,
    "publicCode" TEXT,
    "siteUserId" TEXT,
    "externalOrderId" TEXT,
    "status" "CheckoutOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "subtotalKopecks" INTEGER NOT NULL DEFAULT 0,
    "discountKopecks" INTEGER NOT NULL DEFAULT 0,
    "totalKopecks" INTEGER NOT NULL DEFAULT 0,
    "commissionKopecks" INTEGER NOT NULL DEFAULT 0,
    "buyerEmail" TEXT,
    "buyerPhone" TEXT,
    "buyerName" TEXT,
    "buyerSnapshot" JSONB,
    "checkoutUrl" TEXT,
    "expiresAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckoutOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckoutItem" (
    "id" TEXT NOT NULL,
    "checkoutOrderId" TEXT NOT NULL,
    "supplierId" TEXT,
    "eventId" TEXT,
    "sessionId" TEXT,
    "offerId" TEXT,
    "externalTicketId" TEXT,
    "title" TEXT NOT NULL,
    "ticketTitle" TEXT,
    "status" "CheckoutItemStatus" NOT NULL DEFAULT 'DRAFT',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPriceKopecks" INTEGER NOT NULL DEFAULT 0,
    "totalKopecks" INTEGER NOT NULL DEFAULT 0,
    "commissionKopecks" INTEGER NOT NULL DEFAULT 0,
    "attendeeName" TEXT,
    "attendeePhone" TEXT,
    "providerPayload" JSONB,
    "issuedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckoutItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "checkoutOrderId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'YOOKASSA',
    "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
    "amountKopecks" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "providerPaymentId" TEXT,
    "confirmationUrl" TEXT,
    "idempotenceKey" TEXT,
    "paidAt" TIMESTAMP(3),
    "capturedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "rawPayload" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FiscalReceipt" (
    "id" TEXT NOT NULL,
    "checkoutOrderId" TEXT,
    "paymentId" TEXT,
    "supplierId" TEXT,
    "type" "FiscalReceiptType" NOT NULL DEFAULT 'INCOME',
    "status" "FiscalReceiptStatus" NOT NULL DEFAULT 'PENDING',
    "amountKopecks" INTEGER NOT NULL DEFAULT 0,
    "providerReceiptId" TEXT,
    "fiscalDocumentNumber" TEXT,
    "fiscalDriveNumber" TEXT,
    "fiscalSign" TEXT,
    "receiptUrl" TEXT,
    "rawPayload" JSONB,
    "error" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FiscalReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "amountKopecks" INTEGER NOT NULL DEFAULT 0,
    "commissionKopecks" INTEGER NOT NULL DEFAULT 0,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "bankPaymentId" TEXT,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayoutItem" (
    "id" TEXT NOT NULL,
    "payoutId" TEXT,
    "supplierId" TEXT NOT NULL,
    "checkoutOrderId" TEXT,
    "checkoutItemId" TEXT,
    "amountKopecks" INTEGER NOT NULL DEFAULT 0,
    "commissionKopecks" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayoutItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripPlan" (
    "id" TEXT NOT NULL,
    "publicCode" TEXT,
    "siteUserId" TEXT,
    "cityId" TEXT,
    "title" TEXT,
    "status" "TripPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "travellerSnapshot" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripPlanItem" (
    "id" TEXT NOT NULL,
    "tripPlanId" TEXT NOT NULL,
    "eventId" TEXT,
    "sessionId" TEXT,
    "venueId" TEXT,
    "checkoutItemId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "title" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripPlanItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripVoucher" (
    "id" TEXT NOT NULL,
    "tripPlanId" TEXT NOT NULL,
    "checkoutOrderId" TEXT,
    "code" TEXT NOT NULL,
    "status" "TripVoucherStatus" NOT NULL DEFAULT 'DRAFT',
    "issuedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripVoucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripVoucherItem" (
    "id" TEXT NOT NULL,
    "tripVoucherId" TEXT NOT NULL,
    "tripPlanItemId" TEXT,
    "checkoutItemId" TEXT,
    "title" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripVoucherItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_slug_key" ON "Supplier"("slug");

-- CreateIndex
CREATE INDEX "Supplier_status_idx" ON "Supplier"("status");

-- CreateIndex
CREATE INDEX "Supplier_inn_idx" ON "Supplier"("inn");

-- CreateIndex
CREATE INDEX "SupplierUser_siteUserId_idx" ON "SupplierUser"("siteUserId");

-- CreateIndex
CREATE INDEX "SupplierUser_supplierId_isActive_idx" ON "SupplierUser"("supplierId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierUser_supplierId_siteUserId_key" ON "SupplierUser"("supplierId", "siteUserId");

-- CreateIndex
CREATE INDEX "SupplierVenue_venueId_isActive_idx" ON "SupplierVenue"("venueId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierVenue_supplierId_venueId_key" ON "SupplierVenue"("supplierId", "venueId");

-- CreateIndex
CREATE INDEX "SupplierEvent_eventId_isActive_idx" ON "SupplierEvent"("eventId", "isActive");

-- CreateIndex
CREATE INDEX "SupplierEvent_supplierId_catalogMode_idx" ON "SupplierEvent"("supplierId", "catalogMode");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierEvent_supplierId_eventId_key" ON "SupplierEvent"("supplierId", "eventId");

-- CreateIndex
CREATE INDEX "SupplierCommissionRule_supplierId_isActive_idx" ON "SupplierCommissionRule"("supplierId", "isActive");

-- CreateIndex
CREATE INDEX "SupplierCommissionRule_eventId_isActive_idx" ON "SupplierCommissionRule"("eventId", "isActive");

-- CreateIndex
CREATE INDEX "SupplierCommissionRule_categoryId_isActive_idx" ON "SupplierCommissionRule"("categoryId", "isActive");

-- CreateIndex
CREATE INDEX "SupplierCommissionRule_scope_priority_idx" ON "SupplierCommissionRule"("scope", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutOrder_publicCode_key" ON "CheckoutOrder"("publicCode");

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutOrder_externalOrderId_key" ON "CheckoutOrder"("externalOrderId");

-- CreateIndex
CREATE INDEX "CheckoutOrder_status_createdAt_idx" ON "CheckoutOrder"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CheckoutOrder_siteUserId_createdAt_idx" ON "CheckoutOrder"("siteUserId", "createdAt");

-- CreateIndex
CREATE INDEX "CheckoutOrder_buyerEmail_idx" ON "CheckoutOrder"("buyerEmail");

-- CreateIndex
CREATE INDEX "CheckoutOrder_updatedAt_idx" ON "CheckoutOrder"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutItem_externalTicketId_key" ON "CheckoutItem"("externalTicketId");

-- CreateIndex
CREATE INDEX "CheckoutItem_checkoutOrderId_idx" ON "CheckoutItem"("checkoutOrderId");

-- CreateIndex
CREATE INDEX "CheckoutItem_supplierId_status_idx" ON "CheckoutItem"("supplierId", "status");

-- CreateIndex
CREATE INDEX "CheckoutItem_eventId_idx" ON "CheckoutItem"("eventId");

-- CreateIndex
CREATE INDEX "CheckoutItem_sessionId_idx" ON "CheckoutItem"("sessionId");

-- CreateIndex
CREATE INDEX "CheckoutItem_offerId_idx" ON "CheckoutItem"("offerId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_providerPaymentId_key" ON "Payment"("providerPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_idempotenceKey_key" ON "Payment"("idempotenceKey");

-- CreateIndex
CREATE INDEX "Payment_checkoutOrderId_status_idx" ON "Payment"("checkoutOrderId", "status");

-- CreateIndex
CREATE INDEX "Payment_status_updatedAt_idx" ON "Payment"("status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "FiscalReceipt_providerReceiptId_key" ON "FiscalReceipt"("providerReceiptId");

-- CreateIndex
CREATE INDEX "FiscalReceipt_checkoutOrderId_idx" ON "FiscalReceipt"("checkoutOrderId");

-- CreateIndex
CREATE INDEX "FiscalReceipt_paymentId_idx" ON "FiscalReceipt"("paymentId");

-- CreateIndex
CREATE INDEX "FiscalReceipt_supplierId_status_idx" ON "FiscalReceipt"("supplierId", "status");

-- CreateIndex
CREATE INDEX "FiscalReceipt_status_updatedAt_idx" ON "FiscalReceipt"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "Payout_supplierId_status_idx" ON "Payout"("supplierId", "status");

-- CreateIndex
CREATE INDEX "Payout_status_createdAt_idx" ON "Payout"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PayoutItem_payoutId_idx" ON "PayoutItem"("payoutId");

-- CreateIndex
CREATE INDEX "PayoutItem_supplierId_idx" ON "PayoutItem"("supplierId");

-- CreateIndex
CREATE INDEX "PayoutItem_checkoutOrderId_idx" ON "PayoutItem"("checkoutOrderId");

-- CreateIndex
CREATE INDEX "PayoutItem_checkoutItemId_idx" ON "PayoutItem"("checkoutItemId");

-- CreateIndex
CREATE UNIQUE INDEX "TripPlan_publicCode_key" ON "TripPlan"("publicCode");

-- CreateIndex
CREATE INDEX "TripPlan_siteUserId_createdAt_idx" ON "TripPlan"("siteUserId", "createdAt");

-- CreateIndex
CREATE INDEX "TripPlan_cityId_startsAt_idx" ON "TripPlan"("cityId", "startsAt");

-- CreateIndex
CREATE INDEX "TripPlan_status_createdAt_idx" ON "TripPlan"("status", "createdAt");

-- CreateIndex
CREATE INDEX "TripPlanItem_tripPlanId_sortOrder_idx" ON "TripPlanItem"("tripPlanId", "sortOrder");

-- CreateIndex
CREATE INDEX "TripPlanItem_eventId_idx" ON "TripPlanItem"("eventId");

-- CreateIndex
CREATE INDEX "TripPlanItem_sessionId_idx" ON "TripPlanItem"("sessionId");

-- CreateIndex
CREATE INDEX "TripPlanItem_venueId_idx" ON "TripPlanItem"("venueId");

-- CreateIndex
CREATE INDEX "TripPlanItem_checkoutItemId_idx" ON "TripPlanItem"("checkoutItemId");

-- CreateIndex
CREATE UNIQUE INDEX "TripVoucher_code_key" ON "TripVoucher"("code");

-- CreateIndex
CREATE INDEX "TripVoucher_tripPlanId_status_idx" ON "TripVoucher"("tripPlanId", "status");

-- CreateIndex
CREATE INDEX "TripVoucher_checkoutOrderId_idx" ON "TripVoucher"("checkoutOrderId");

-- CreateIndex
CREATE INDEX "TripVoucher_status_createdAt_idx" ON "TripVoucher"("status", "createdAt");

-- CreateIndex
CREATE INDEX "TripVoucherItem_tripVoucherId_sortOrder_idx" ON "TripVoucherItem"("tripVoucherId", "sortOrder");

-- CreateIndex
CREATE INDEX "TripVoucherItem_tripPlanItemId_idx" ON "TripVoucherItem"("tripPlanItemId");

-- CreateIndex
CREATE INDEX "TripVoucherItem_checkoutItemId_idx" ON "TripVoucherItem"("checkoutItemId");

-- AddForeignKey
ALTER TABLE "SupplierUser" ADD CONSTRAINT "SupplierUser_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierUser" ADD CONSTRAINT "SupplierUser_siteUserId_fkey" FOREIGN KEY ("siteUserId") REFERENCES "SiteUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierVenue" ADD CONSTRAINT "SupplierVenue_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierVenue" ADD CONSTRAINT "SupplierVenue_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierEvent" ADD CONSTRAINT "SupplierEvent_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierEvent" ADD CONSTRAINT "SupplierEvent_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierCommissionRule" ADD CONSTRAINT "SupplierCommissionRule_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierCommissionRule" ADD CONSTRAINT "SupplierCommissionRule_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierCommissionRule" ADD CONSTRAINT "SupplierCommissionRule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutOrder" ADD CONSTRAINT "CheckoutOrder_siteUserId_fkey" FOREIGN KEY ("siteUserId") REFERENCES "SiteUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutOrder" ADD CONSTRAINT "CheckoutOrder_externalOrderId_fkey" FOREIGN KEY ("externalOrderId") REFERENCES "ExternalOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutItem" ADD CONSTRAINT "CheckoutItem_checkoutOrderId_fkey" FOREIGN KEY ("checkoutOrderId") REFERENCES "CheckoutOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutItem" ADD CONSTRAINT "CheckoutItem_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutItem" ADD CONSTRAINT "CheckoutItem_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutItem" ADD CONSTRAINT "CheckoutItem_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "EventSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutItem" ADD CONSTRAINT "CheckoutItem_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "EventOffer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutItem" ADD CONSTRAINT "CheckoutItem_externalTicketId_fkey" FOREIGN KEY ("externalTicketId") REFERENCES "ExternalTicket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_checkoutOrderId_fkey" FOREIGN KEY ("checkoutOrderId") REFERENCES "CheckoutOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FiscalReceipt" ADD CONSTRAINT "FiscalReceipt_checkoutOrderId_fkey" FOREIGN KEY ("checkoutOrderId") REFERENCES "CheckoutOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FiscalReceipt" ADD CONSTRAINT "FiscalReceipt_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FiscalReceipt" ADD CONSTRAINT "FiscalReceipt_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutItem" ADD CONSTRAINT "PayoutItem_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "Payout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutItem" ADD CONSTRAINT "PayoutItem_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutItem" ADD CONSTRAINT "PayoutItem_checkoutOrderId_fkey" FOREIGN KEY ("checkoutOrderId") REFERENCES "CheckoutOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutItem" ADD CONSTRAINT "PayoutItem_checkoutItemId_fkey" FOREIGN KEY ("checkoutItemId") REFERENCES "CheckoutItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripPlan" ADD CONSTRAINT "TripPlan_siteUserId_fkey" FOREIGN KEY ("siteUserId") REFERENCES "SiteUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripPlan" ADD CONSTRAINT "TripPlan_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripPlanItem" ADD CONSTRAINT "TripPlanItem_tripPlanId_fkey" FOREIGN KEY ("tripPlanId") REFERENCES "TripPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripPlanItem" ADD CONSTRAINT "TripPlanItem_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripPlanItem" ADD CONSTRAINT "TripPlanItem_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "EventSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripPlanItem" ADD CONSTRAINT "TripPlanItem_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripPlanItem" ADD CONSTRAINT "TripPlanItem_checkoutItemId_fkey" FOREIGN KEY ("checkoutItemId") REFERENCES "CheckoutItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripVoucher" ADD CONSTRAINT "TripVoucher_tripPlanId_fkey" FOREIGN KEY ("tripPlanId") REFERENCES "TripPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripVoucher" ADD CONSTRAINT "TripVoucher_checkoutOrderId_fkey" FOREIGN KEY ("checkoutOrderId") REFERENCES "CheckoutOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripVoucherItem" ADD CONSTRAINT "TripVoucherItem_tripVoucherId_fkey" FOREIGN KEY ("tripVoucherId") REFERENCES "TripVoucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripVoucherItem" ADD CONSTRAINT "TripVoucherItem_tripPlanItemId_fkey" FOREIGN KEY ("tripPlanItemId") REFERENCES "TripPlanItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripVoucherItem" ADD CONSTRAINT "TripVoucherItem_checkoutItemId_fkey" FOREIGN KEY ("checkoutItemId") REFERENCES "CheckoutItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
