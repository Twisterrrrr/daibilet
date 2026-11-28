CREATE TABLE "SupplierLegalReviewSnapshot" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "legalProfileId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedBySiteUserId" TEXT,
    "snapshotJson" JSONB NOT NULL,
    "sha256" TEXT NOT NULL,
    CONSTRAINT "SupplierLegalReviewSnapshot_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SupplierLegalReviewSnapshot_supplierId_reviewedAt_idx"
    ON "SupplierLegalReviewSnapshot"("supplierId", "reviewedAt");

CREATE FUNCTION reject_supplier_legal_review_snapshot_mutation() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'SupplierLegalReviewSnapshot is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER supplier_legal_review_snapshot_immutable
BEFORE UPDATE OR DELETE ON "SupplierLegalReviewSnapshot"
FOR EACH ROW EXECUTE FUNCTION reject_supplier_legal_review_snapshot_mutation();
