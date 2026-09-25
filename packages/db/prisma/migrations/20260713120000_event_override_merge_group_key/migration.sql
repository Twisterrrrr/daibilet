ALTER TABLE "EventOverride" ADD COLUMN "mergeGroupKey" TEXT;

CREATE INDEX "EventOverride_mergeGroupKey_idx" ON "EventOverride"("mergeGroupKey");
