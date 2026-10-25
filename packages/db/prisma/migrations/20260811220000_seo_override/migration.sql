-- CreateTable
CREATE TABLE "SeoOverride" (
    "id" SERIAL NOT NULL,
    "citySlug" TEXT NOT NULL,
    "landingSlug" TEXT NOT NULL,
    "customTitle" TEXT,
    "customDescription" TEXT,
    "customH1" TEXT,
    "customText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeoOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SeoOverride_citySlug_landingSlug_key" ON "SeoOverride"("citySlug", "landingSlug");
