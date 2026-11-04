-- CreateEnum
CREATE TYPE "PurchaseFlow" AS ENUM ('PLATFORM', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "FulfillmentStatus" AS ENUM ('PENDING', 'RESERVING', 'RESERVED', 'CONFIRMED', 'REFUND_PENDING', 'FAILED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "RefundRequestStatus" AS ENUM ('CREATED', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "RefundRequestReason" AS ENUM ('USER_REQUEST', 'EVENT_CANCELLED', 'SUPPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "RefundCreatedByType" AS ENUM ('ADMIN', 'USER', 'SUPPLIER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "IdempotencyScope" AS ENUM ('CHECKOUT_CREATE', 'PAYMENT_CREATE', 'REFUND_CREATE', 'YOOKASSA_WEBHOOK', 'EMAIL_SEND', 'EXTERNAL_CALLBACK');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('SINGLE_MERCHANT', 'AGENT_SINGLE_PAYOUT', 'SPLIT_MERCHANT');

-- CreateEnum
CREATE TYPE "PspFeeMode" AS ENUM ('PLATFORM_PAYS', 'SUPPLIER_PAYS', 'SHARED_50_50', 'SERVICE_FEE');

-- CreateEnum
CREATE TYPE "SupplierLegalProfileStatus" AS ENUM ('DRAFT', 'INCOMPLETE', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TaxMode" AS ENUM ('OSNO', 'USN_6', 'USN_15', 'AUSN', 'NPD');

-- CreateEnum
CREATE TYPE "SupplierLedgerEntryType" AS ENUM ('SALE', 'COMMISSION', 'REFUND', 'PAYOUT', 'ADJUSTMENT', 'CHARGEBACK_ADJUSTMENT', 'FEE_RECHARGE');

-- CreateEnum
CREATE TYPE "SupplierReportBasis" AS ENUM ('SOLD', 'COMPLETED');

-- CreateEnum
CREATE TYPE "SupplierReportStatus" AS ENUM ('DRAFT', 'FINAL');

-- CreateEnum
CREATE TYPE "SupplierReportLineType" AS ENUM ('SALE', 'COMMISSION', 'REFUND', 'PAYOUT', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "SupplierDocumentType" AS ENUM ('AGENT_REPORT', 'SERVICE_ACT', 'UPD', 'INVOICE', 'VAT_INVOICE', 'COMMISSION_ACT', 'PAYOUT_STATEMENT');

-- CreateEnum
CREATE TYPE "SupplierDocumentStatus" AS ENUM ('DRAFT', 'GENERATED', 'ISSUED', 'SENT', 'DELIVERED', 'SIGNED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SupplierDocumentFileKind" AS ENUM ('PDF', 'HTML', 'JSON_SNAPSHOT');

-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('DRAFT', 'CALCULATED', 'APPROVED', 'FINALIZED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SupplierDisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SupplierDisputeReasonCategory" AS ENUM ('WRONG_COMMISSION', 'MISSING_SALE', 'WRONG_DETAILS', 'OTHER');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING_EMAIL', 'PENDING_MODERATION', 'APPROVED', 'REJECTED', 'HIDDEN');

-- CreateEnum
CREATE TYPE "ReviewSupplierResponseStatus" AS ENUM ('DRAFT', 'PENDING_MODERATION', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReviewDisputeStatus" AS ENUM ('MODERATOR_REVIEW', 'RESOLVED_KEEP', 'RESOLVED_EDIT', 'RESOLVED_HIDE', 'RESOLVED_DELETE');

-- CreateEnum
CREATE TYPE "ReviewDisputeReasonCode" AS ENUM ('FAKE', 'OFFENSIVE', 'NOT_CUSTOMER', 'WRONG_EVENT', 'LEGAL', 'OTHER');

-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN     "agentSchemeEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paymentMode" "PaymentMode" NOT NULL DEFAULT 'SINGLE_MERCHANT',
ADD COLUMN     "pspFeeMode" "PspFeeMode" NOT NULL DEFAULT 'PLATFORM_PAYS',
ADD COLUMN     "splitEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "SupplierLegalProfile" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "status" "SupplierLegalProfileStatus" NOT NULL DEFAULT 'DRAFT',
    "legalName" TEXT NOT NULL,
    "legalAddress" TEXT,
    "inn" TEXT,
    "kpp" TEXT,
    "ogrn" TEXT,
    "taxMode" "TaxMode" NOT NULL DEFAULT 'OSNO',
    "isVatPayer" BOOLEAN NOT NULL DEFAULT false,
    "defaultVatRate" INTEGER,
    "signerFullName" TEXT,
    "signerPosition" TEXT,
    "financeEmail" TEXT,
    "docsEmail" TEXT,
    "verifiedBySiteUserId" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "rejectionComment" TEXT,
    "metaJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierLegalProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierBankAccount" (
    "id" TEXT NOT NULL,
    "supplierLegalProfileId" TEXT NOT NULL,
    "bankName" TEXT,
    "bik" TEXT,
    "accountNumber" TEXT,
    "correspondentAccount" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierBankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FulfillmentItem" (
    "id" TEXT NOT NULL,
    "checkoutOrderId" TEXT NOT NULL,
    "checkoutItemId" TEXT,
    "lineItemIndex" INTEGER NOT NULL DEFAULT 0,
    "offerId" TEXT,
    "purchaseFlow" "PurchaseFlow" NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'INTERNAL',
    "status" "FulfillmentStatus" NOT NULL DEFAULT 'PENDING',
    "externalOrderId" TEXT,
    "externalPaymentUrl" TEXT,
    "providerData" JSONB,
    "amountKopecks" INTEGER NOT NULL DEFAULT 0,
    "refundedKopecks" INTEGER NOT NULL DEFAULT 0,
    "refundProviderId" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "nextRetryAt" TIMESTAMP(3),
    "lastError" TEXT,
    "escalatedAt" TIMESTAMP(3),
    "resolvedBySiteUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FulfillmentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefundRequest" (
    "id" TEXT NOT NULL,
    "checkoutOrderId" TEXT,
    "fulfillmentItemId" TEXT,
    "paymentId" TEXT,
    "supplierId" TEXT,
    "createdByUserId" TEXT,
    "amountKopecks" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "reason" "RefundRequestReason" NOT NULL DEFAULT 'OTHER',
    "reasonNote" TEXT,
    "status" "RefundRequestStatus" NOT NULL DEFAULT 'CREATED',
    "createdByType" "RefundCreatedByType" NOT NULL DEFAULT 'ADMIN',
    "providerRefundId" TEXT,
    "providerPayload" JSONB,
    "adminComment" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefundRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentEventLog" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "paymentId" TEXT,
    "providerEventId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentEventLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessedWebhookEvent" (
    "id" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "result" TEXT,
    "paymentId" TEXT,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyKey" (
    "id" TEXT NOT NULL,
    "scope" "IdempotencyScope" NOT NULL,
    "key" TEXT NOT NULL,
    "entityId" TEXT,
    "status" TEXT NOT NULL,
    "response" JSONB,
    "metaJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierLedgerEntry" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "type" "SupplierLedgerEntryType" NOT NULL,
    "amountKopecks" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "referenceType" TEXT,
    "referenceId" TEXT,
    "checkoutOrderId" TEXT,
    "checkoutItemId" TEXT,
    "paymentId" TEXT,
    "note" TEXT,
    "metaJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierReport" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "basis" "SupplierReportBasis" NOT NULL,
    "status" "SupplierReportStatus" NOT NULL DEFAULT 'DRAFT',
    "hasConflict" BOOLEAN NOT NULL DEFAULT false,
    "acceptedAt" TIMESTAMP(3),
    "acceptedByUserId" TEXT,
    "grossKopecks" INTEGER NOT NULL DEFAULT 0,
    "commissionKopecks" INTEGER NOT NULL DEFAULT 0,
    "refundKopecks" INTEGER NOT NULL DEFAULT 0,
    "netKopecks" INTEGER NOT NULL DEFAULT 0,
    "snapshotJson" JSONB,
    "legalProfileSnapshot" JSONB,
    "metaJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierReportLine" (
    "id" TEXT NOT NULL,
    "supplierReportId" TEXT NOT NULL,
    "ledgerEntryId" TEXT,
    "type" "SupplierReportLineType" NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "amountKopecks" INTEGER NOT NULL DEFAULT 0,
    "netKopecks" INTEGER NOT NULL DEFAULT 0,
    "metaJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierReportLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierSettlement" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "grossKopecks" INTEGER NOT NULL DEFAULT 0,
    "commissionKopecks" INTEGER NOT NULL DEFAULT 0,
    "adjustmentKopecks" INTEGER NOT NULL DEFAULT 0,
    "netKopecks" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "status" "SettlementStatus" NOT NULL DEFAULT 'DRAFT',
    "payoutId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "finalizedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "metaJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierDocument" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "reportId" TEXT,
    "settlementId" TEXT,
    "type" "SupplierDocumentType" NOT NULL,
    "status" "SupplierDocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "payloadJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierDocumentFile" (
    "id" TEXT NOT NULL,
    "supplierDocumentId" TEXT NOT NULL,
    "kind" "SupplierDocumentFileKind" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierDocumentFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierDispute" (
    "id" TEXT NOT NULL,
    "supplierReportId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "status" "SupplierDisputeStatus" NOT NULL DEFAULT 'OPEN',
    "reasonCategory" "SupplierDisputeReasonCategory" NOT NULL,
    "reasonText" TEXT,
    "resolutionText" TEXT,
    "openedByUserId" TEXT,
    "resolvedByUserId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierDispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "eventId" TEXT,
    "venueId" TEXT,
    "supplierId" TEXT,
    "siteUserId" TEXT,
    "checkoutOrderId" TEXT,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "text" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorEmail" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "voucherCode" TEXT,
    "verifyToken" TEXT,
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING_EMAIL',
    "adminComment" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewSupplierResponse" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "status" "ReviewSupplierResponseStatus" NOT NULL DEFAULT 'DRAFT',
    "moderationComment" TEXT,
    "moderatedByUserId" TEXT,
    "moderatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewSupplierResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewDispute" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "status" "ReviewDisputeStatus" NOT NULL DEFAULT 'MODERATOR_REVIEW',
    "reasonCode" "ReviewDisputeReasonCode" NOT NULL,
    "claimText" TEXT NOT NULL,
    "supplierConfirmedTruth" BOOLEAN NOT NULL DEFAULT false,
    "decisionComment" TEXT,
    "handledByUserId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewDispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewActionLog" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT,
    "disputeId" TEXT,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "actionType" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewActionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalReview" (
    "id" TEXT NOT NULL,
    "eventId" TEXT,
    "venueId" TEXT,
    "supplierId" TEXT,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "authorName" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewRequest" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "checkoutOrderId" TEXT,
    "token" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reminderSentAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "reviewId" TEXT,

    CONSTRAINT "ReviewRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SupplierLegalProfile_supplierId_key" ON "SupplierLegalProfile"("supplierId");

-- CreateIndex
CREATE INDEX "SupplierLegalProfile_status_idx" ON "SupplierLegalProfile"("status");

-- CreateIndex
CREATE INDEX "SupplierLegalProfile_inn_idx" ON "SupplierLegalProfile"("inn");

-- CreateIndex
CREATE INDEX "SupplierBankAccount_supplierLegalProfileId_idx" ON "SupplierBankAccount"("supplierLegalProfileId");

-- CreateIndex
CREATE INDEX "SupplierBankAccount_isPrimary_idx" ON "SupplierBankAccount"("isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "FulfillmentItem_checkoutItemId_key" ON "FulfillmentItem"("checkoutItemId");

-- CreateIndex
CREATE INDEX "FulfillmentItem_checkoutOrderId_idx" ON "FulfillmentItem"("checkoutOrderId");

-- CreateIndex
CREATE INDEX "FulfillmentItem_offerId_idx" ON "FulfillmentItem"("offerId");

-- CreateIndex
CREATE INDEX "FulfillmentItem_purchaseFlow_status_idx" ON "FulfillmentItem"("purchaseFlow", "status");

-- CreateIndex
CREATE INDEX "FulfillmentItem_provider_idx" ON "FulfillmentItem"("provider");

-- CreateIndex
CREATE INDEX "FulfillmentItem_status_nextRetryAt_idx" ON "FulfillmentItem"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX "FulfillmentItem_status_escalatedAt_idx" ON "FulfillmentItem"("status", "escalatedAt");

-- CreateIndex
CREATE INDEX "RefundRequest_checkoutOrderId_idx" ON "RefundRequest"("checkoutOrderId");

-- CreateIndex
CREATE INDEX "RefundRequest_fulfillmentItemId_idx" ON "RefundRequest"("fulfillmentItemId");

-- CreateIndex
CREATE INDEX "RefundRequest_paymentId_idx" ON "RefundRequest"("paymentId");

-- CreateIndex
CREATE INDEX "RefundRequest_supplierId_status_idx" ON "RefundRequest"("supplierId", "status");

-- CreateIndex
CREATE INDEX "RefundRequest_status_createdAt_idx" ON "RefundRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentEventLog_provider_eventType_idx" ON "PaymentEventLog"("provider", "eventType");

-- CreateIndex
CREATE INDEX "PaymentEventLog_paymentId_idx" ON "PaymentEventLog"("paymentId");

-- CreateIndex
CREATE INDEX "PaymentEventLog_providerEventId_idx" ON "PaymentEventLog"("providerEventId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentEventLog_provider_eventType_idempotencyKey_key" ON "PaymentEventLog"("provider", "eventType", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessedWebhookEvent_dedupeKey_key" ON "ProcessedWebhookEvent"("dedupeKey");

-- CreateIndex
CREATE INDEX "ProcessedWebhookEvent_provider_eventType_idx" ON "ProcessedWebhookEvent"("provider", "eventType");

-- CreateIndex
CREATE INDEX "ProcessedWebhookEvent_paymentId_idx" ON "ProcessedWebhookEvent"("paymentId");

-- CreateIndex
CREATE INDEX "ProcessedWebhookEvent_providerEventId_idx" ON "ProcessedWebhookEvent"("providerEventId");

-- CreateIndex
CREATE INDEX "IdempotencyKey_expiresAt_idx" ON "IdempotencyKey"("expiresAt");

-- CreateIndex
CREATE INDEX "IdempotencyKey_entityId_idx" ON "IdempotencyKey"("entityId");

-- CreateIndex
CREATE INDEX "IdempotencyKey_status_idx" ON "IdempotencyKey"("status");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyKey_scope_key_key" ON "IdempotencyKey"("scope", "key");

-- CreateIndex
CREATE INDEX "SupplierLedgerEntry_supplierId_idx" ON "SupplierLedgerEntry"("supplierId");

-- CreateIndex
CREATE INDEX "SupplierLedgerEntry_supplierId_createdAt_idx" ON "SupplierLedgerEntry"("supplierId", "createdAt");

-- CreateIndex
CREATE INDEX "SupplierLedgerEntry_referenceType_referenceId_idx" ON "SupplierLedgerEntry"("referenceType", "referenceId");

-- CreateIndex
CREATE INDEX "SupplierLedgerEntry_checkoutOrderId_idx" ON "SupplierLedgerEntry"("checkoutOrderId");

-- CreateIndex
CREATE INDEX "SupplierLedgerEntry_paymentId_idx" ON "SupplierLedgerEntry"("paymentId");

-- CreateIndex
CREATE INDEX "SupplierReport_supplierId_periodStart_periodEnd_idx" ON "SupplierReport"("supplierId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "SupplierReport_status_idx" ON "SupplierReport"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierReport_supplierId_periodStart_periodEnd_basis_key" ON "SupplierReport"("supplierId", "periodStart", "periodEnd", "basis");

-- CreateIndex
CREATE INDEX "SupplierReportLine_supplierReportId_idx" ON "SupplierReportLine"("supplierReportId");

-- CreateIndex
CREATE INDEX "SupplierReportLine_ledgerEntryId_idx" ON "SupplierReportLine"("ledgerEntryId");

-- CreateIndex
CREATE INDEX "SupplierReportLine_referenceType_referenceId_idx" ON "SupplierReportLine"("referenceType", "referenceId");

-- CreateIndex
CREATE INDEX "SupplierSettlement_supplierId_periodStart_periodEnd_idx" ON "SupplierSettlement"("supplierId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "SupplierSettlement_status_idx" ON "SupplierSettlement"("status");

-- CreateIndex
CREATE INDEX "SupplierDocument_supplierId_idx" ON "SupplierDocument"("supplierId");

-- CreateIndex
CREATE INDEX "SupplierDocument_reportId_idx" ON "SupplierDocument"("reportId");

-- CreateIndex
CREATE INDEX "SupplierDocument_settlementId_idx" ON "SupplierDocument"("settlementId");

-- CreateIndex
CREATE INDEX "SupplierDocument_status_idx" ON "SupplierDocument"("status");

-- CreateIndex
CREATE INDEX "SupplierDocumentFile_supplierDocumentId_idx" ON "SupplierDocumentFile"("supplierDocumentId");

-- CreateIndex
CREATE INDEX "SupplierDispute_supplierReportId_idx" ON "SupplierDispute"("supplierReportId");

-- CreateIndex
CREATE INDEX "SupplierDispute_supplierId_status_idx" ON "SupplierDispute"("supplierId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Review_verifyToken_key" ON "Review"("verifyToken");

-- CreateIndex
CREATE INDEX "Review_eventId_status_idx" ON "Review"("eventId", "status");

-- CreateIndex
CREATE INDEX "Review_venueId_status_idx" ON "Review"("venueId", "status");

-- CreateIndex
CREATE INDEX "Review_supplierId_status_idx" ON "Review"("supplierId", "status");

-- CreateIndex
CREATE INDEX "Review_siteUserId_idx" ON "Review"("siteUserId");

-- CreateIndex
CREATE INDEX "Review_checkoutOrderId_idx" ON "Review"("checkoutOrderId");

-- CreateIndex
CREATE INDEX "Review_status_idx" ON "Review"("status");

-- CreateIndex
CREATE INDEX "Review_createdAt_idx" ON "Review"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewSupplierResponse_reviewId_key" ON "ReviewSupplierResponse"("reviewId");

-- CreateIndex
CREATE INDEX "ReviewSupplierResponse_supplierId_status_idx" ON "ReviewSupplierResponse"("supplierId", "status");

-- CreateIndex
CREATE INDEX "ReviewSupplierResponse_status_idx" ON "ReviewSupplierResponse"("status");

-- CreateIndex
CREATE INDEX "ReviewDispute_supplierId_status_idx" ON "ReviewDispute"("supplierId", "status");

-- CreateIndex
CREATE INDEX "ReviewDispute_status_idx" ON "ReviewDispute"("status");

-- CreateIndex
CREATE INDEX "ReviewDispute_createdAt_idx" ON "ReviewDispute"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewDispute_reviewId_key" ON "ReviewDispute"("reviewId");

-- CreateIndex
CREATE INDEX "ReviewActionLog_reviewId_createdAt_idx" ON "ReviewActionLog"("reviewId", "createdAt");

-- CreateIndex
CREATE INDEX "ReviewActionLog_disputeId_createdAt_idx" ON "ReviewActionLog"("disputeId", "createdAt");

-- CreateIndex
CREATE INDEX "ReviewActionLog_actionType_idx" ON "ReviewActionLog"("actionType");

-- CreateIndex
CREATE INDEX "ExternalReview_eventId_source_idx" ON "ExternalReview"("eventId", "source");

-- CreateIndex
CREATE INDEX "ExternalReview_venueId_source_idx" ON "ExternalReview"("venueId", "source");

-- CreateIndex
CREATE INDEX "ExternalReview_supplierId_idx" ON "ExternalReview"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewRequest_token_key" ON "ReviewRequest"("token");

-- CreateIndex
CREATE INDEX "ReviewRequest_token_idx" ON "ReviewRequest"("token");

-- CreateIndex
CREATE INDEX "ReviewRequest_eventId_idx" ON "ReviewRequest"("eventId");

-- CreateIndex
CREATE INDEX "ReviewRequest_checkoutOrderId_idx" ON "ReviewRequest"("checkoutOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewRequest_email_eventId_key" ON "ReviewRequest"("email", "eventId");

-- AddForeignKey
ALTER TABLE "SupplierLegalProfile" ADD CONSTRAINT "SupplierLegalProfile_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierBankAccount" ADD CONSTRAINT "SupplierBankAccount_supplierLegalProfileId_fkey" FOREIGN KEY ("supplierLegalProfileId") REFERENCES "SupplierLegalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FulfillmentItem" ADD CONSTRAINT "FulfillmentItem_checkoutOrderId_fkey" FOREIGN KEY ("checkoutOrderId") REFERENCES "CheckoutOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FulfillmentItem" ADD CONSTRAINT "FulfillmentItem_checkoutItemId_fkey" FOREIGN KEY ("checkoutItemId") REFERENCES "CheckoutItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundRequest" ADD CONSTRAINT "RefundRequest_checkoutOrderId_fkey" FOREIGN KEY ("checkoutOrderId") REFERENCES "CheckoutOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundRequest" ADD CONSTRAINT "RefundRequest_fulfillmentItemId_fkey" FOREIGN KEY ("fulfillmentItemId") REFERENCES "FulfillmentItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundRequest" ADD CONSTRAINT "RefundRequest_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundRequest" ADD CONSTRAINT "RefundRequest_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundRequest" ADD CONSTRAINT "RefundRequest_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "SiteUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessedWebhookEvent" ADD CONSTRAINT "ProcessedWebhookEvent_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierLedgerEntry" ADD CONSTRAINT "SupplierLedgerEntry_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierReport" ADD CONSTRAINT "SupplierReport_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierReportLine" ADD CONSTRAINT "SupplierReportLine_supplierReportId_fkey" FOREIGN KEY ("supplierReportId") REFERENCES "SupplierReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierSettlement" ADD CONSTRAINT "SupplierSettlement_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierDocument" ADD CONSTRAINT "SupplierDocument_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierDocument" ADD CONSTRAINT "SupplierDocument_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "SupplierReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierDocument" ADD CONSTRAINT "SupplierDocument_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "SupplierSettlement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierDocumentFile" ADD CONSTRAINT "SupplierDocumentFile_supplierDocumentId_fkey" FOREIGN KEY ("supplierDocumentId") REFERENCES "SupplierDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierDispute" ADD CONSTRAINT "SupplierDispute_supplierReportId_fkey" FOREIGN KEY ("supplierReportId") REFERENCES "SupplierReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierDispute" ADD CONSTRAINT "SupplierDispute_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_siteUserId_fkey" FOREIGN KEY ("siteUserId") REFERENCES "SiteUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_checkoutOrderId_fkey" FOREIGN KEY ("checkoutOrderId") REFERENCES "CheckoutOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewSupplierResponse" ADD CONSTRAINT "ReviewSupplierResponse_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewSupplierResponse" ADD CONSTRAINT "ReviewSupplierResponse_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewDispute" ADD CONSTRAINT "ReviewDispute_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewDispute" ADD CONSTRAINT "ReviewDispute_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewActionLog" ADD CONSTRAINT "ReviewActionLog_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewActionLog" ADD CONSTRAINT "ReviewActionLog_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "ReviewDispute"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalReview" ADD CONSTRAINT "ExternalReview_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalReview" ADD CONSTRAINT "ExternalReview_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalReview" ADD CONSTRAINT "ExternalReview_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewRequest" ADD CONSTRAINT "ReviewRequest_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewRequest" ADD CONSTRAINT "ReviewRequest_checkoutOrderId_fkey" FOREIGN KEY ("checkoutOrderId") REFERENCES "CheckoutOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
