CREATE TABLE "supplier_user_access_logs" (
  "id" TEXT NOT NULL,
  "supplierId" TEXT NOT NULL,
  "supplierUserId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "previousRole" TEXT NOT NULL,
  "newRole" TEXT NOT NULL,
  "previousActive" BOOLEAN NOT NULL,
  "newActive" BOOLEAN NOT NULL,
  "actor" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "supplier_user_access_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "supplier_user_access_logs_supplierId_createdAt_idx"
  ON "supplier_user_access_logs"("supplierId", "createdAt");
