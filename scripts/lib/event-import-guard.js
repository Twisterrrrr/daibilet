/**
 * SQL fragments: import must not overwrite protected admin moderation, SEO, or taxonomy fields on Event.
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

const EVENT_UPSERT_CATEGORY = `
  "categoryId" = case
    when exists (
      select 1 from "EventOverride" eo
      where eo."eventId" = "Event".id and eo."taxonomyManaged" = true
    ) then "Event"."categoryId"
    else excluded."categoryId"
  end`;

const EVENT_UPSERT_PRIMARY_SUBCATEGORY = `
  "primarySubcategoryId" = case
    when exists (
      select 1 from "EventOverride" eo
      where eo."eventId" = "Event".id and eo."taxonomyManaged" = true
    ) then "Event"."primarySubcategoryId"
    else excluded."primarySubcategoryId"
  end`;

module.exports = {
  EVENT_UPSERT_STATUS,
  EVENT_UPSERT_SLUG,
  EVENT_UPSERT_CATEGORY,
  EVENT_UPSERT_PRIMARY_SUBCATEGORY,
};
