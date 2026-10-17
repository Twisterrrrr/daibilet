-- Reviews ↔ ExternalOrder (TC sync) + purchase snapshot fields for review requests
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "externalOrderId" TEXT;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "purchaseRef" TEXT;

ALTER TABLE "ReviewRequest" ADD COLUMN IF NOT EXISTS "externalOrderId" TEXT;
ALTER TABLE "ReviewRequest" ADD COLUMN IF NOT EXISTS "purchaseDate" TIMESTAMP(3);
ALTER TABLE "ReviewRequest" ADD COLUMN IF NOT EXISTS "purchaseRef" TEXT;
ALTER TABLE "ReviewRequest" ADD COLUMN IF NOT EXISTS "buyerName" TEXT;

CREATE INDEX IF NOT EXISTS "Review_externalOrderId_idx" ON "Review"("externalOrderId");
CREATE INDEX IF NOT EXISTS "ReviewRequest_externalOrderId_idx" ON "ReviewRequest"("externalOrderId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Review_externalOrderId_fkey'
  ) THEN
    ALTER TABLE "Review"
      ADD CONSTRAINT "Review_externalOrderId_fkey"
      FOREIGN KEY ("externalOrderId") REFERENCES "ExternalOrder"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ReviewRequest_externalOrderId_fkey'
  ) THEN
    ALTER TABLE "ReviewRequest"
      ADD CONSTRAINT "ReviewRequest_externalOrderId_fkey"
      FOREIGN KEY ("externalOrderId") REFERENCES "ExternalOrder"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
