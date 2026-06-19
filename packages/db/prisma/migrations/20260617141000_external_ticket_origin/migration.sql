ALTER TABLE "ExternalTicket"
ADD COLUMN IF NOT EXISTS "origin" TEXT NOT NULL DEFAULT 'source';

CREATE INDEX IF NOT EXISTS "ExternalTicket_origin_idx" ON "ExternalTicket" ("origin");
