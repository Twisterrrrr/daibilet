/**
 * Ticketscloud only exposes PUBLIC + STAND_BY.
 * Cancelled / deleted events disappear from both feeds but used to stay
 * stale as PUBLIC in our DB → live pages still open the TC widget
 * («Мероприятие отменено организатором»).
 *
 * Mark those rows cancelled so catalog filters + purchase blockers apply.
 */

const TICKETSCLOUD_SOURCE_ID = "src_ticketscloud";

/**
 * @param {import('pg').PoolClient} client
 * @param {Iterable<string>} liveExternalIds - externalIds currently returned by TC PUBLIC∪STAND_BY
 * @returns {Promise<{ missingLinks: number, eventsMarked: number, sessionsMarked: number }>}
 */
async function deactivateMissingTicketscloudEvents(client, liveExternalIds) {
  const liveIds = [...new Set([...liveExternalIds].map(String).filter(Boolean))];

  const missing = await client.query(
    `
      select esl."eventId", esl."externalId"
      from "EventSourceLink" esl
      where esl."sourceId" = $1
        and esl."externalId" <> all($2::text[])
        and lower(coalesce(
          (select e."sourceStatus" from "Event" e where e.id = esl."eventId"),
          ''
        )) not in ('cancelled', 'canceled', 'deleted', 'hidden', 'stand_by')
    `,
    [TICKETSCLOUD_SOURCE_ID, liveIds],
  );

  const eventIds = missing.rows.map((row) => row.eventId).filter(Boolean);
  if (!eventIds.length) {
    return { missingLinks: missing.rows.length, eventsMarked: 0, sessionsMarked: 0 };
  }

  const events = await client.query(
    `
      update "Event"
      set
        "sourceStatus" = 'cancelled',
        status = case
          when status::text = 'HIDDEN' then status
          else 'HIDDEN'::"PublishStatus"
        end,
        "isIndexable" = false,
        "updatedAt" = now()
      where id = any($1::text[])
      returning id
    `,
    [eventIds],
  );

  const sessions = await client.query(
    `
      update "EventSession"
      set
        "isActive" = false,
        "sourceStatus" = 'cancelled',
        "cancelledAt" = coalesce("cancelledAt", now())
      where "eventId" = any($1::text[])
        and (
          "isActive" is distinct from false
          or "cancelledAt" is null
          or lower(coalesce("sourceStatus", '')) not in ('cancelled', 'canceled')
        )
      returning id
    `,
    [eventIds],
  );

  return {
    missingLinks: missing.rows.length,
    eventsMarked: events.rowCount || 0,
    sessionsMarked: sessions.rowCount || 0,
  };
}

module.exports = {
  TICKETSCLOUD_SOURCE_ID,
  deactivateMissingTicketscloudEvents,
};
