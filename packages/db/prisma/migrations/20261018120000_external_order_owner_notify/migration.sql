-- Owner notification for paid external orders (TC widget purchases).
ALTER TABLE "ExternalOrder" ADD COLUMN "ownerNotifiedAt" TIMESTAMP(3);
