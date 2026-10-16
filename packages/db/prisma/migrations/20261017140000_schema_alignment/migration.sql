ALTER TABLE "HeroBanner" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "LandingCategory" ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER TABLE "Venue"
  ADD COLUMN "descriptionOverridden" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "openingHours" TEXT,
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "websiteUrl" TEXT;

ALTER INDEX "ProviderLink_sourceId_entityKind_externalId_externalParentId_ke"
  RENAME TO "ProviderLink_sourceId_entityKind_externalId_externalParentI_key";
