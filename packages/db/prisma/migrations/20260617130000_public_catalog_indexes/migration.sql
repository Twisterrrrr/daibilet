CREATE INDEX IF NOT EXISTS "Event_status_idx" ON "Event" ("status");
CREATE INDEX IF NOT EXISTS "Event_primaryCityId_idx" ON "Event" ("primaryCityId");
CREATE INDEX IF NOT EXISTS "Event_venueId_idx" ON "Event" ("venueId");
CREATE INDEX IF NOT EXISTS "Event_categoryId_idx" ON "Event" ("categoryId");

CREATE INDEX IF NOT EXISTS "EventSourceLink_eventId_idx" ON "EventSourceLink" ("eventId");
CREATE INDEX IF NOT EXISTS "EventSourceLink_sourceId_metaExternalId_idx" ON "EventSourceLink" ("sourceId", "metaExternalId");

CREATE INDEX IF NOT EXISTS "EventSession_eventId_startsAt_idx" ON "EventSession" ("eventId", "startsAt");
CREATE INDEX IF NOT EXISTS "EventSession_startsAt_idx" ON "EventSession" ("startsAt");
CREATE INDEX IF NOT EXISTS "EventSession_externalId_idx" ON "EventSession" ("externalId");

CREATE INDEX IF NOT EXISTS "EventOffer_eventId_active_priceRub_idx" ON "EventOffer" ("eventId", "active", "priceRub");
CREATE INDEX IF NOT EXISTS "EventOffer_sourceCode_idx" ON "EventOffer" ("sourceCode");

CREATE INDEX IF NOT EXISTS "EventSubcategory_subcategoryId_idx" ON "EventSubcategory" ("subcategoryId");
CREATE INDEX IF NOT EXISTS "EventTag_tagId_idx" ON "EventTag" ("tagId");
