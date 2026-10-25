ALTER TABLE "HeroBanner" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "LandingCategory" ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER TABLE "Venue"
  ADD COLUMN IF NOT EXISTS "descriptionOverridden" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "openingHours" TEXT,
  ADD COLUMN IF NOT EXISTS "phone" TEXT,
  ADD COLUMN IF NOT EXISTS "websiteUrl" TEXT;

-- These columns were already added on some databases outside migration history.
-- Bring the required flag to the same definition in either case.
UPDATE "Venue" SET "descriptionOverridden" = false WHERE "descriptionOverridden" IS NULL;
ALTER TABLE "Venue" ALTER COLUMN "descriptionOverridden" SET DEFAULT false;
ALTER TABLE "Venue" ALTER COLUMN "descriptionOverridden" SET NOT NULL;

ALTER INDEX IF EXISTS "ProviderLink_sourceId_entityKind_externalId_externalParentId_ke"
  RENAME TO "ProviderLink_sourceId_entityKind_externalId_externalParentI_key";
