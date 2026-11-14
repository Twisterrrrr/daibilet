-- Split supplier connection type from supplier sales mode.
-- integrationMode answers "how this supplier is connected"; defaultCatalogMode still answers "where the buyer pays".

CREATE TYPE "SupplierIntegrationMode" AS ENUM (
    'IMPORTED_TICKETING_SYSTEM',
    'INTERNAL_SALES',
    'API_SYNC'
);

ALTER TABLE "Supplier"
    ADD COLUMN "integrationMode" "SupplierIntegrationMode" NOT NULL DEFAULT 'IMPORTED_TICKETING_SYSTEM';

CREATE INDEX "Supplier_integrationMode_idx" ON "Supplier"("integrationMode");
