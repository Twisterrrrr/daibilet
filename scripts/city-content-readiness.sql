-- r6: content readiness by city.
--
-- Read-only. Answers "can we write real content for this city, or would it be a
-- thin layer?" - a count of venues in the sitemap is not enough, because a venue
-- with no description, no address and no photo yields a thin page no matter how
-- many URLs point at it.
--
-- Only venues with at least one future session are counted. A city whose live
-- venues are mostly empty needs data work, not text.
--
-- NB: no dollar-quoting anywhere. A literal inside $$...$$ that itself contains
-- $$ breaks psql's variable permuter, and PostgreSQL 16 has no
-- enable_query_rewriter to switch it off.
with live as (
  select distinct v.id, v."cityId" as city_id, v.title, v.description,
         v."shortDescription" as short_description, v.address, v.latitude, v.longitude,
         v."heroImageUrl" as hero_image_url, v."wayToFind" as way_to_find,
         v."hookFact" as hook_fact, v."pageStatus"::text as page_status
  from "Venue" v
  join "Event" e on e."venueId" = v.id
  join "EventSession" s on s."eventId" = e.id
  where s."startsAt" > now()
),
agg as (
  select c.id as city_id, c.slug, c.title,
         count(*) as venues_live,
         count(*) filter (where l.description is not null and length(trim(l.description)) >= 120) as with_text,
         count(*) filter (where l.short_description is not null and length(trim(l.short_description)) > 0) as with_short,
         count(*) filter (where l.address is not null and length(trim(l.address)) > 0) as with_address,
         count(*) filter (where l.latitude is not null and l.longitude is not null) as with_coords,
         count(*) filter (where l.hero_image_url is not null and length(trim(l.hero_image_url)) > 0) as with_photo,
         count(*) filter (where l.way_to_find is not null and length(trim(l.way_to_find)) > 0) as with_waytofind,
         count(*) filter (where l.hook_fact is not null and length(trim(l.hook_fact)) > 0) as with_hookfact,
         count(*) filter (where l.page_status = 'PUBLISHED') as published
  from live l
  join "City" c on c.id = l.city_id
  group by c.id, c.slug, c.title
)
select slug, title, venues_live,
       with_text, with_short, with_address, with_coords, with_photo, with_waytofind, with_hookfact, published,
       round(100.0 * with_text / nullif(venues_live, 0)) as pct_text,
       round(100.0 * with_photo / nullif(venues_live, 0)) as pct_photo,
       case
         when venues_live >= 10 and with_text >= 8 and with_photo >= 6 then 'TIER1'
         when venues_live >= 5  and with_text >= 4 then 'TIER2'
         when venues_live >= 2  and with_text >= 1 then 'TIER3'
         else 'NOT_READY'
       end as tier
from agg
order by
  case
    when venues_live >= 10 and with_text >= 8 and with_photo >= 6 then 1
    when venues_live >= 5  and with_text >= 4 then 2
    when venues_live >= 2  and with_text >= 1 then 3
    else 4
  end,
  venues_live desc, with_text desc;