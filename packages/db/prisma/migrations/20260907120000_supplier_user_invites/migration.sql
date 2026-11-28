ALTER TABLE "SupplierUser"
  ADD COLUMN "inviteTokenHash" TEXT,
  ADD COLUMN "inviteExpiresAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "SupplierUser_inviteTokenHash_key"
  ON "SupplierUser"("inviteTokenHash");

CREATE INDEX "SupplierUser_inviteExpiresAt_idx"
  ON "SupplierUser"("inviteExpiresAt");
