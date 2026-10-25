ALTER TABLE "AdminUser"
  ADD COLUMN "mfaSecretCiphertext" TEXT,
  ADD COLUMN "mfaEnabledAt" TIMESTAMP(3),
  ADD COLUMN "mfaLastTotpStep" BIGINT,
  ADD COLUMN "mfaPendingSecretCiphertext" TEXT,
  ADD COLUMN "mfaPendingExpiresAt" TIMESTAMP(3);

ALTER TABLE "AdminSession" ADD COLUMN "mfaVerifiedAt" TIMESTAMP(3);

CREATE TABLE "AdminMfaRecoveryCode" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminMfaRecoveryCode_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AdminMfaRecoveryCode_codeHash_key" ON "AdminMfaRecoveryCode"("codeHash");
CREATE INDEX "AdminMfaRecoveryCode_userId_usedAt_idx" ON "AdminMfaRecoveryCode"("userId", "usedAt");
ALTER TABLE "AdminMfaRecoveryCode" ADD CONSTRAINT "AdminMfaRecoveryCode_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
