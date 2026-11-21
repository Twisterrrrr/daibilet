CREATE TYPE "SupplierIntegrationStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ERROR', 'ARCHIVED');

CREATE TABLE "SupplierIntegration" (
  "id" TEXT NOT NULL,
  "supplierId" TEXT NOT NULL,
  "providerCode" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" "SupplierIntegrationStatus" NOT NULL DEFAULT 'DRAFT',
  "sourceCode" "SourceCode",
  "baseUrl" TEXT,
  "capabilities" JSONB,
  "configJson" JSONB,
  "secretRef" TEXT,
  "lastSuccessAt" TIMESTAMP(3),
  "lastFailureAt" TIMESTAMP(3),
  "consecutiveErrors" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SupplierIntegration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupplierIntegrationRun" (
  "id" TEXT NOT NULL,
  "integrationId" TEXT NOT NULL,
  "status" "SyncStatus" NOT NULL DEFAULT 'RUNNING',
  "mode" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "stats" JSONB,
  "error" TEXT,

  CONSTRAINT "SupplierIntegrationRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupplierIntegrationIssue" (
  "id" TEXT NOT NULL,
  "integrationId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),

  CONSTRAINT "SupplierIntegrationIssue_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SupplierIntegration_supplierId_providerCode_key"
  ON "SupplierIntegration"("supplierId", "providerCode");
CREATE INDEX "SupplierIntegration_status_idx" ON "SupplierIntegration"("status");
CREATE INDEX "SupplierIntegration_sourceCode_idx" ON "SupplierIntegration"("sourceCode");
CREATE INDEX "SupplierIntegration_supplierId_status_idx" ON "SupplierIntegration"("supplierId", "status");

CREATE INDEX "SupplierIntegrationRun_integrationId_startedAt_idx"
  ON "SupplierIntegrationRun"("integrationId", "startedAt");
CREATE INDEX "SupplierIntegrationRun_status_startedAt_idx"
  ON "SupplierIntegrationRun"("status", "startedAt");

CREATE INDEX "SupplierIntegrationIssue_integrationId_resolvedAt_idx"
  ON "SupplierIntegrationIssue"("integrationId", "resolvedAt");
CREATE INDEX "SupplierIntegrationIssue_severity_createdAt_idx"
  ON "SupplierIntegrationIssue"("severity", "createdAt");

ALTER TABLE "SupplierIntegration"
  ADD CONSTRAINT "SupplierIntegration_supplierId_fkey"
  FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SupplierIntegrationRun"
  ADD CONSTRAINT "SupplierIntegrationRun_integrationId_fkey"
  FOREIGN KEY ("integrationId") REFERENCES "SupplierIntegration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SupplierIntegrationIssue"
  ADD CONSTRAINT "SupplierIntegrationIssue_integrationId_fkey"
  FOREIGN KEY ("integrationId") REFERENCES "SupplierIntegration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
