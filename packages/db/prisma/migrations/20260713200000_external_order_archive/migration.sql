-- Soft-archive for cancelled / deleted external orders in admin.
ALTER TABLE "ExternalOrder" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "ExternalOrder_archivedAt_idx" ON "ExternalOrder"("archivedAt");
