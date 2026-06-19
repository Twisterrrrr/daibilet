CREATE INDEX IF NOT EXISTS "ExternalOrder_status_idx" ON "ExternalOrder" ("status");
CREATE INDEX IF NOT EXISTS "ExternalOrder_purchasedAt_idx" ON "ExternalOrder" ("purchasedAt");
CREATE INDEX IF NOT EXISTS "ExternalOrder_updatedAt_idx" ON "ExternalOrder" ("updatedAt");

CREATE INDEX IF NOT EXISTS "ExternalTicket_externalOrderId_idx" ON "ExternalTicket" ("externalOrderId");
CREATE INDEX IF NOT EXISTS "ExternalTicket_externalTicketId_idx" ON "ExternalTicket" ("externalTicketId");
CREATE INDEX IF NOT EXISTS "ExternalTicket_eventId_idx" ON "ExternalTicket" ("eventId");
CREATE INDEX IF NOT EXISTS "ExternalTicket_sessionId_idx" ON "ExternalTicket" ("sessionId");
