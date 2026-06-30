-- Backfill provider identities from the existing MVP import columns.
-- The migration is idempotent through the ProviderLink unique key.

INSERT INTO "ProviderLink" (
    "id",
    "sourceId",
    "entityKind",
    "eventId",
    "externalId",
    "externalParentId",
    "sourceUrl",
    "rawRecordId",
    "payload",
    "createdAt",
    "updatedAt"
)
SELECT
    'pl_event_' || md5(link."sourceId" || ':' || link."externalId"),
    link."sourceId",
    'EVENT',
    link."eventId",
    link."externalId",
    '',
    link."sourceUrl",
    link."rawRecordId",
    jsonb_strip_nulls(jsonb_build_object('metaExternalId', link."metaExternalId")),
    now(),
    now()
FROM "EventSourceLink" link
ON CONFLICT ("sourceId", "entityKind", "externalId", "externalParentId")
DO UPDATE SET
    "eventId" = excluded."eventId",
    "sourceUrl" = excluded."sourceUrl",
    "rawRecordId" = excluded."rawRecordId",
    "payload" = excluded."payload",
    "updatedAt" = now();

INSERT INTO "ProviderLink" (
    "id",
    "sourceId",
    "entityKind",
    "sessionId",
    "externalId",
    "externalParentId",
    "sourceUrl",
    "payload",
    "createdAt",
    "updatedAt"
)
SELECT DISTINCT ON (link."sourceId", session."externalId", link."externalId")
    'pl_session_' || md5(link."sourceId" || ':' || session."externalId" || ':' || link."externalId"),
    link."sourceId",
    'SESSION',
    session.id,
    session."externalId",
    link."externalId",
    link."sourceUrl",
    jsonb_strip_nulls(jsonb_build_object(
        'eventExternalId', link."externalId",
        'metaExternalId', link."metaExternalId"
    )),
    now(),
    now()
FROM "EventSession" session
JOIN "EventSourceLink" link ON link."eventId" = session."eventId"
WHERE session."externalId" IS NOT NULL
  AND session."externalId" <> ''
ORDER BY link."sourceId", session."externalId", link."externalId", session."startsAt" ASC NULLS LAST, session.id
ON CONFLICT ("sourceId", "entityKind", "externalId", "externalParentId")
DO UPDATE SET
    "sessionId" = excluded."sessionId",
    "sourceUrl" = excluded."sourceUrl",
    "payload" = excluded."payload",
    "updatedAt" = now();

INSERT INTO "ProviderLink" (
    "id",
    "sourceId",
    "entityKind",
    "offerId",
    "externalId",
    "externalParentId",
    "sourceUrl",
    "payload",
    "createdAt",
    "updatedAt"
)
SELECT DISTINCT ON (source.id, offer_external.external_id, COALESCE(event_link."externalId", offer.payload->>'eventId', ''))
    'pl_offer_' || md5(source.id || ':' || offer_external.external_id || ':' || COALESCE(event_link."externalId", offer.payload->>'eventId', '')),
    source.id,
    'OFFER',
    offer.id,
    offer_external.external_id,
    COALESCE(event_link."externalId", offer.payload->>'eventId', ''),
    COALESCE(offer."widgetUrl", offer."deeplinkUrl", event_link."sourceUrl"),
    offer.payload,
    now(),
    now()
FROM "EventOffer" offer
JOIN "Source" source ON source.code::text = offer."sourceCode"::text
LEFT JOIN "EventSourceLink" event_link
    ON event_link."eventId" = offer."eventId"
   AND event_link."sourceId" = source.id
CROSS JOIN LATERAL (
    SELECT COALESCE(
        NULLIF(offer.payload->>'externalId', ''),
        NULLIF(offer.payload->>'eventId', ''),
        NULLIF(offer.payload #>> '{ticket,id}', ''),
        offer.id
    ) AS external_id
) offer_external
WHERE offer.active IS NOT FALSE
  AND offer_external.external_id IS NOT NULL
  AND offer_external.external_id <> ''
ORDER BY source.id, offer_external.external_id, COALESCE(event_link."externalId", offer.payload->>'eventId', ''), offer."priceRub" ASC NULLS LAST, offer.id
ON CONFLICT ("sourceId", "entityKind", "externalId", "externalParentId")
DO UPDATE SET
    "offerId" = excluded."offerId",
    "sourceUrl" = excluded."sourceUrl",
    "payload" = excluded."payload",
    "updatedAt" = now();

INSERT INTO "ProviderLink" (
    "id",
    "sourceId",
    "entityKind",
    "venueId",
    "externalId",
    "externalParentId",
    "payload",
    "createdAt",
    "updatedAt"
)
SELECT DISTINCT ON (source.id, alias."externalId")
    'pl_venue_' || md5(source.id || ':' || alias."externalId"),
    source.id,
    'VENUE',
    alias."venueId",
    alias."externalId",
    '',
    jsonb_strip_nulls(jsonb_build_object(
        'title', alias.title,
        'address', alias.address
    )),
    now(),
    now()
FROM "VenueAlias" alias
JOIN "Source" source ON source.code::text = alias."sourceCode"::text
WHERE alias."externalId" IS NOT NULL
  AND alias."externalId" <> ''
ORDER BY source.id, alias."externalId", alias.id
ON CONFLICT ("sourceId", "entityKind", "externalId", "externalParentId")
DO UPDATE SET
    "venueId" = excluded."venueId",
    "payload" = excluded."payload",
    "updatedAt" = now();
