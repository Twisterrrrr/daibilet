/**
 * Re-sync ProviderLink rows for one source after catalog import.
 * SQL mirrors packages/db/prisma/migrations/20260625174500_provider_links_backfill.
 */

async function syncProviderLinksForSource(client, sourceId) {
  await client.query(
    `
      INSERT INTO "ProviderLink" (
        "id", "sourceId", "entityKind", "eventId", "externalId", "externalParentId",
        "sourceUrl", "rawRecordId", "payload", "createdAt", "updatedAt"
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
      WHERE link."sourceId" = $1
      ON CONFLICT ("sourceId", "entityKind", "externalId", "externalParentId")
      DO UPDATE SET
        "eventId" = excluded."eventId",
        "sourceUrl" = excluded."sourceUrl",
        "rawRecordId" = excluded."rawRecordId",
        "payload" = excluded."payload",
        "updatedAt" = now()
    `,
    [sourceId],
  );

  const sessionResult = await client.query(
    `
      INSERT INTO "ProviderLink" (
        "id", "sourceId", "entityKind", "sessionId", "externalId", "externalParentId",
        "sourceUrl", "payload", "createdAt", "updatedAt"
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
      WHERE link."sourceId" = $1
        AND session."externalId" IS NOT NULL
        AND session."externalId" <> ''
      ORDER BY link."sourceId", session."externalId", link."externalId", session."startsAt" ASC NULLS LAST, session.id
      ON CONFLICT ("sourceId", "entityKind", "externalId", "externalParentId")
      DO UPDATE SET
        "sessionId" = excluded."sessionId",
        "sourceUrl" = excluded."sourceUrl",
        "payload" = excluded."payload",
        "updatedAt" = now()
    `,
    [sourceId],
  );

  const offerResult = await client.query(
    `
      INSERT INTO "ProviderLink" (
        "id", "sourceId", "entityKind", "offerId", "externalId", "externalParentId",
        "sourceUrl", "payload", "createdAt", "updatedAt"
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
      JOIN "Source" source ON source.id = $1 AND source.code::text = offer."sourceCode"::text
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
        "updatedAt" = now()
    `,
    [sourceId],
  );

  const venueResult = await client.query(
    `
      INSERT INTO "ProviderLink" (
        "id", "sourceId", "entityKind", "venueId", "externalId", "externalParentId",
        "payload", "createdAt", "updatedAt"
      )
      SELECT DISTINCT ON (source.id, alias."externalId")
        'pl_venue_' || md5(source.id || ':' || alias."externalId"),
        source.id,
        'VENUE',
        alias."venueId",
        alias."externalId",
        '',
        jsonb_strip_nulls(jsonb_build_object('title', alias.title, 'address', alias.address)),
        now(),
        now()
      FROM "VenueAlias" alias
      JOIN "Source" source ON source.id = $1 AND source.code::text = alias."sourceCode"::text
      WHERE alias."externalId" IS NOT NULL
        AND alias."externalId" <> ''
      ORDER BY source.id, alias."externalId", alias.id
      ON CONFLICT ("sourceId", "entityKind", "externalId", "externalParentId")
      DO UPDATE SET
        "venueId" = excluded."venueId",
        "payload" = excluded."payload",
        "updatedAt" = now()
    `,
    [sourceId],
  );

  const countResult = await client.query(
    `
      select count(*)::int as total
      from "ProviderLink"
      where "sourceId" = $1
    `,
    [sourceId],
  );

  return {
    sessionsUpserted: sessionResult.rowCount ?? 0,
    offersUpserted: offerResult.rowCount ?? 0,
    venuesUpserted: venueResult.rowCount ?? 0,
    total: countResult.rows[0]?.total ?? 0,
  };
}

module.exports = { syncProviderLinksForSource };
