ALTER TABLE "EventSession"
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "archiveReason" TEXT;

CREATE INDEX "EventSession_archivedAt_endsAt_idx"
  ON "EventSession"("archivedAt", "endsAt");
