/**
 * Reuse reviewed editorial copy for a new Ticketscloud slot in the same meta event.
 * Exact title and source description equality keep changed editions in the rewrite queue.
 */
async function inheritTicketscloudSeriesEditorial(client, input) {
  const eventId = String(input.eventId || '').trim();
  const sourceId = String(input.sourceId || '').trim();
  const metaExternalId = String(input.metaExternalId || '').trim();
  const overrideId = String(input.overrideId || '').trim();
  if (!eventId || !sourceId || !metaExternalId || !overrideId) return false;

  const result = await client.query(
    `
      insert into "EventOverride" (
        id, "eventId", description, "shortDescription", "seoDescription", "createdAt", "updatedAt"
      )
      select
        $1,
        requested."eventId",
        editorial.description,
        editorial."shortDescription",
        editorial."seoDescription",
        now(),
        now()
      from "EventSourceLink" requested
      join "Event" requested_event on requested_event.id = requested."eventId"
      join "EventSourceLink" sibling
        on sibling."sourceId" = requested."sourceId"
       and sibling."metaExternalId" = requested."metaExternalId"
       and sibling."eventId" <> requested."eventId"
      join "Event" sibling_event on sibling_event.id = sibling."eventId"
      join "EventOverride" editorial on editorial."eventId" = sibling."eventId"
      where requested."eventId" = $2
        and requested."sourceId" = $3
        and requested."metaExternalId" = $4
        and sibling_event.title = requested_event.title
        and coalesce(sibling_event.description, '') = coalesce(requested_event.description, '')
        and nullif(btrim(editorial.description), '') is not null
      order by editorial."updatedAt" desc
      limit 1
      on conflict ("eventId") do nothing
      returning id
    `,
    [overrideId, eventId, sourceId, metaExternalId],
  );

  return Number(result.rowCount || result.rows?.length || 0) > 0;
}

module.exports = { inheritTicketscloudSeriesEditorial };
