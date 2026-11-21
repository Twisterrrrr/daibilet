CREATE TABLE "BuyerTicketEmailDelivery" (
    "id" TEXT NOT NULL,
    "publicCode" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BuyerTicketEmailDelivery_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BuyerTicketEmailDelivery_publicCode_key" ON "BuyerTicketEmailDelivery"("publicCode");
CREATE INDEX "BuyerTicketEmailDelivery_status_nextAttemptAt_idx" ON "BuyerTicketEmailDelivery"("status", "nextAttemptAt");
