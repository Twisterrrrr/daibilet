-- Venue and location tiers across all 4304 rows.
--
-- Read-only. A venue with no scheduled event is still worth writing for: with a
-- description, an address and a photo it is a long-tail page. Tiers therefore
-- follow content readiness, never event presence.
--
-- Locations are tiered separately. For an outdoor location or a meeting point
-- what matters is whether it can anchor a route: coordinates, a hookFact or a
-- wayToFind. An event schedule is close to irrelevant there.
--
-- HOLD means there is no prose and no address to work from, so text cannot fix
-- it - the record needs data first.
--
-- Run: psql "$DATABASE_URL" -At -F'|' -f scripts/venue-tiering.sql
with v as (
  select id, slug, title, "cityId" as city_id, kind::text as kind,
         (description is not null and length(trim(description)) >= 120) as has_text,
         (address is not null and length(trim(address)) > 0) as has_address,
         ("heroImageUrl" is not null and length(trim("heroImageUrl")) > 0) as has_photo,
         (latitude is not null and longitude is not null) as has_coords,
         ("wayToFind" is not null and length(trim("wayToFind")) > 0) as has_way_to_find,
         ("hookFact" is not null and length(trim("hookFact")) > 0) as has_hook
  from "Venue"
)
select
  case
    when kind in ('OUTDOOR_LOCATION', 'MEETING_POINT') then
      case
        when has_coords and has_hook then 'LOC_T1'
        when has_coords and (has_way_to_find or has_hook) then 'LOC_T2'
        when has_coords then 'LOC_T3'
        else 'LOC_HOLD'
      end
    else
      case
        when has_text and has_address and has_photo then 'T1'
        when has_text and has_address then 'T2'
        when has_address then 'T3'
        else 'HOLD'
      end
  end as tier,
  count(*) as venues,
  count(*) filter (where has_text) as with_text,
  count(*) filter (where has_photo) as with_photo,
  count(*) filter (where has_coords) as with_coords
from v
group by 1
order by 1;