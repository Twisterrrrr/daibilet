CREATE TABLE "FinanceAdminAuditEvent" (
  "id" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "actorName" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "assertionId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "resourceType" TEXT NOT NULL,
  "resourceId" TEXT,
  "outcome" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinanceAdminAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FinanceAdminAuditEvent_actorId_createdAt_idx"
  ON "FinanceAdminAuditEvent"("actorId", "createdAt");
CREATE INDEX "FinanceAdminAuditEvent_resourceType_resourceId_createdAt_idx"
  ON "FinanceAdminAuditEvent"("resourceType", "resourceId", "createdAt");
CREATE INDEX "FinanceAdminAuditEvent_assertionId_idx"
  ON "FinanceAdminAuditEvent"("assertionId");
