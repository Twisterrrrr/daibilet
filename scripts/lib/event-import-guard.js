/**
 * SQL fragments: import must not overwrite admin moderation / SEO overrides on Event.
 */

const EVENT_UPSERT_STATUS = `
  status = case
    when "Event".status::text = 'HIDDEN' then "Event".status
    when exists (
      select 1
      from "EventOverride" eo
      where eo."eventId" = "Event".id
        and (
          eo."editorStatus" is not null
          or eo.title is not null
          or eo.description is not null
          or eo."imageUrl" is not null
        )
    ) then "Event".status
    else excluded.status
  end`;

const EVENT_UPSERT_SLUG = `slug = "Event".slug`;

module.exports = {
  EVENT_UPSERT_STATUS,
  EVENT_UPSERT_SLUG,
};
