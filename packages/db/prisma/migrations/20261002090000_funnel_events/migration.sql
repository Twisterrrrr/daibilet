-- Purchase funnel events.

-- The store only ever held finished orders, so a visitor who opened a vendor
-- widget and left left no trace and the drop-off could only be guessed at.
-- Counts funnel steps, never orders: the order sync upserts the same rows on a
-- 3-day lookback, so order_created must be recorded at checkout instead.

CREATE TABLE IF NOT EXISTS "FunnelEvent" (
    "id"         TEXT        NOT NULL,
    "kind"       TEXT        NOT NULL,
    "ref"        TEXT,
    "provider"   TEXT,
    "visitorId"  TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FunnelEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "FunnelEvent_kind_occurredAt_idx" ON "FunnelEvent"("kind", "occurredAt");
CREATE INDEX IF NOT EXISTS "FunnelEvent_ref_idx" ON "FunnelEvent"("ref");
CREATE INDEX IF NOT EXISTS "FunnelEvent_visitorId_idx" ON "FunnelEvent"("visitorId");