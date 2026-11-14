-- Venue PDP quality audit.
--
-- "Filled" is not the same as "good". A venue can clear every presence check and
-- still be unusable on the PDP: half of them turn out to be missing hookFact and
-- wayToFind, some descriptions are a verbatim copy of the title, some are an
-- emoji checklist copied out of a supplier feed.
--
-- Read-only. Emits one row per venue with a defect list and a verdict, so a
-- review pass can be scoped without reading every page by hand.
--
-- Run: psql "$DATABASE_URL" -At -F'|' -f scripts/venue-quality-audit.sql
with t as (
  select v.id, v.slug, v.title, c.title as city, v.kind::text as kind,
         v.description, v."shortDescription" as sd,
         v."hookFact" as hf, v."wayToFind" as wf, v.address,
         length(trim(coalesce(v.description, ''))) as desc_len
  from "Venue" v
  join "City" c on c.id = v."cityId"
  where v.description is not null and length(trim(v.description)) >= 120
    and v.address is not null and v."heroImageUrl" is not null
    and v.kind::text not in ('OUTDOOR_LOCATION', 'MEETING_POINT')
)
select
  slug, title, city, kind,
  desc_len,
  (hf is null or length(trim(hf)) = 0) as missing_hookfact,
  (wf is null or length(trim(wf)) = 0) as missing_waytofind,
  (lower(left(trim(description), 40)) = lower(left(trim(title), 40))) as desc_copies_title,
  (description ~ '[😀-🿿🚀]') as has_emoji,
  (description ~* '(невероятн|уникальн|поражающ|незабываем|волшебн|лучш(ий|ая)|самый (большой|крупн))') as has_cliche,
  (desc_len < 300) as desc_thin,
  (sd is not null and length(trim(sd)) > 0) as has_short,
  trim(
    concat_ws(', ',
      case when (hf is null or length(trim(hf)) = 0) then 'NO_HOOKFACT' end,
      case when (wf is null or length(trim(wf)) = 0) then 'NO_WAYTOFIND' end,
      case when lower(left(trim(description), 40)) = lower(left(trim(title), 40)) then 'COPIES_TITLE' end,
      case when description ~ '[😀-🿿🚀]' then 'EMOJI' end,
      case when description ~* '(невероятн|уникальн|поражающ|незабываем|волшебн|лучш(ий|ая)|самый (большой|крупн))' then 'CLICHE' end,
      case when desc_len < 300 then 'THIN' end
    ),
    ', '
  ) as defects,
  case
    when lower(left(trim(description), 40)) = lower(left(trim(title), 40))
      or description ~ '[😀-🿿🚀]' then 'REWRITE'
    when (hf is null or length(trim(hf)) = 0) then 'FILL_MISSING'
    when desc_len < 300 or description ~* '(невероятн|уникальн|поражающ|незабываем|волшебн|лучш(ий|ая)|самый (большой|крупн))' then 'POLISH'
    else 'OK'
  end as verdict
from t
order by
  case
    when lower(left(trim(description), 40)) = lower(left(trim(title), 40))
      or description ~ '[😀-🿿🚀]' then 1
    when (hf is null or length(trim(hf)) = 0) then 2
    when desc_len < 300 then 3
    when description ~* '(невероятн|уникальн|поражающ|незабываем|волшебн|лучш(ий|ая)|самый (большой|крупн))' then 4
    else 5
  end,
  desc_len