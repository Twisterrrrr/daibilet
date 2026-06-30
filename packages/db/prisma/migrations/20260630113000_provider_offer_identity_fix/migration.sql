-- Correct Teplohod offer identities: ticket.id is the provider-owned offer id,
-- while eventId is only its parent. The original backfill used eventId first
-- and therefore collapsed all ticket categories of one event into one link.

DELETE FROM "ProviderLink" link
USING "Source" source
WHERE link."sourceId" = source.id
  AND link."entityKind" = 'OFFER'
  AND source.code = 'TEPLOHOD';

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
SELECT
    'pl_offer_' || md5(source.id || ':' || (offer.payload #>> '{ticket,id}') || ':' || COALESCE(event_link."externalId", offer.payload->>'eventId', '')),
    source.id,
    'OFFER',
    offer.id,
    offer.payload #>> '{ticket,id}',
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
WHERE offer."sourceCode" = 'TEPLOHOD'
  AND offer.active IS NOT FALSE
  AND NULLIF(offer.payload #>> '{ticket,id}', '') IS NOT NULL
ON CONFLICT ("sourceId", "entityKind", "externalId", "externalParentId")
DO UPDATE SET
    "offerId" = excluded."offerId",
    "sourceUrl" = excluded."sourceUrl",
    "payload" = excluded."payload",
    "updatedAt" = now();
