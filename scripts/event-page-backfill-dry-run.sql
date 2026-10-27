-- Read-only estimate for EventPage backfill. It intentionally performs no writes.
-- Run against a disposable/local snapshot first; review the output before using
-- any grouping rule for production data.

WITH imported AS (
  SELECT DISTINCT ON (e.id)
    e.id AS event_id,
    e.slug,
    e.title,
    e.kind,
    e."primaryCityId" AS city_id,
    e."venueId" AS venue_id,
    s.code AS source_code,
    NULLIF(BTRIM(link."metaExternalId"), '') AS meta_external_id,
    NULLIF(BTRIM(link."externalId"), '') AS external_id
  FROM "EventSourceLink" link
  JOIN "Source" s ON s.id = link."sourceId"
  JOIN "Event" e ON e.id = link."eventId"
  WHERE s.code IN ('TICKETSCLOUD', 'TEPLOHOD')
  ORDER BY e.id, link."updatedAt" DESC, link.id DESC
),
identified AS (
  SELECT *,
    CASE
      WHEN source_code = 'TICKETSCLOUD' AND meta_external_id IS NOT NULL
        THEN concat_ws('|', source_code, 'meta', meta_external_id,
          COALESCE(city_id, ''), COALESCE(venue_id, ''))
      ELSE concat_ws('|', source_code, 'record', event_id)
    END AS proposed_identity
  FROM imported
),
groups AS (
  SELECT
    source_code,
    proposed_identity,
    COUNT(*)::int AS records,
    COUNT(DISTINCT NULLIF(LOWER(REGEXP_REPLACE(BTRIM(title), '\s+', ' ', 'g')), ''))::int AS title_variants,
    COUNT(DISTINCT COALESCE(city_id, '<null>'))::int AS cities,
    COUNT(DISTINCT COALESCE(venue_id, '<null>'))::int AS venues,
    BOOL_OR(city_id IS NULL) AS has_missing_city,
    BOOL_OR(venue_id IS NULL) AS has_missing_venue,
    ARRAY_AGG(event_id ORDER BY event_id) AS event_ids
  FROM identified
  GROUP BY source_code, proposed_identity
)
SELECT
  source_code,
  COUNT(*)::int AS proposed_pages,
  SUM(records)::int AS source_records,
  COUNT(*) FILTER (WHERE records > 1)::int AS grouped_pages,
  MAX(records)::int AS largest_group,
  COUNT(*) FILTER (WHERE title_variants > 1)::int AS title_conflict_groups,
  COUNT(*) FILTER (WHERE has_missing_city)::int AS groups_missing_city,
  COUNT(*) FILTER (WHERE has_missing_venue)::int AS groups_missing_venue
FROM groups
GROUP BY source_code
ORDER BY source_code;

-- TEP has no provider group ID in the current import. Exact title + local city
-- + venue repeats are candidates for human review only; this query does not
-- promote them to automatic merges.
WITH imported AS (
  SELECT DISTINCT ON (e.id)
    e.id AS event_id, e.title, e."primaryCityId" AS city_id, e."venueId" AS venue_id,
    s.code AS source_code
  FROM "EventSourceLink" link
  JOIN "Source" s ON s.id = link."sourceId"
  JOIN "Event" e ON e.id = link."eventId"
  WHERE s.code = 'TEPLOHOD'
  ORDER BY e.id, link."updatedAt" DESC, link.id DESC
)
SELECT
  COUNT(*)::int AS exact_local_repeat_groups,
  COALESCE(SUM(records), 0)::int AS records_in_repeat_groups,
  COALESCE(MAX(records), 0)::int AS largest_repeat
FROM (
  SELECT COUNT(*)::int AS records
  FROM imported
  WHERE source_code = 'TEPLOHOD'
  GROUP BY
    LOWER(REGEXP_REPLACE(BTRIM(title), '\s+', ' ', 'g')),
    COALESCE(city_id, '<null>'),
    COALESCE(venue_id, '<null>')
  HAVING COUNT(*) > 1
) repeats;

WITH tep_events AS (
  SELECT DISTINCT ON (e.id)
    e.id AS event_id, e.slug, e.title,
    e."primaryCityId" AS city_id, e."venueId" AS venue_id
  FROM "EventSourceLink" link
  JOIN "Source" s ON s.id = link."sourceId"
  JOIN "Event" e ON e.id = link."eventId"
  WHERE s.code = 'TEPLOHOD'
  ORDER BY e.id, link."updatedAt" DESC, link.id DESC
)
SELECT title, city_id, venue_id, COUNT(*)::int AS records,
       ARRAY_AGG(event_id ORDER BY event_id) AS event_ids
FROM tep_events
GROUP BY title, city_id, venue_id
HAVING COUNT(*) > 1
ORDER BY records DESC, title;

-- Suspicious source groups for manual inspection; still read-only.
WITH imported AS (
  SELECT DISTINCT ON (e.id)
    e.id AS event_id, e.slug, e.title, e.kind,
    e."primaryCityId" AS city_id, e."venueId" AS venue_id,
    s.code AS source_code,
    NULLIF(BTRIM(link."metaExternalId"), '') AS meta_external_id
  FROM "EventSourceLink" link
  JOIN "Source" s ON s.id = link."sourceId"
  JOIN "Event" e ON e.id = link."eventId"
  WHERE s.code IN ('TICKETSCLOUD', 'TEPLOHOD')
  ORDER BY e.id, link."updatedAt" DESC, link.id DESC
), identified AS (
  SELECT *, CASE
    WHEN source_code = 'TICKETSCLOUD' AND meta_external_id IS NOT NULL
      THEN concat_ws('|', source_code, 'meta', meta_external_id, COALESCE(city_id, ''), COALESCE(venue_id, ''))
    ELSE concat_ws('|', source_code, 'record', event_id)
  END AS proposed_identity
  FROM imported
), groups AS (
  SELECT source_code, proposed_identity, COUNT(*)::int AS records,
    COUNT(DISTINCT NULLIF(LOWER(REGEXP_REPLACE(BTRIM(title), '\s+', ' ', 'g')), ''))::int AS title_variants,
    COUNT(DISTINCT COALESCE(city_id, '<null>'))::int AS cities,
    COUNT(DISTINCT COALESCE(venue_id, '<null>'))::int AS venues,
    BOOL_OR(city_id IS NULL) AS has_missing_city,
    BOOL_OR(venue_id IS NULL) AS has_missing_venue,
    ARRAY_AGG(event_id ORDER BY event_id) AS event_ids
  FROM identified GROUP BY source_code, proposed_identity
)
SELECT source_code, proposed_identity, records, title_variants, cities, venues,
       has_missing_city, has_missing_venue, event_ids
FROM groups
WHERE records > 1
  AND (title_variants > 1 OR cities > 1 OR venues > 1 OR has_missing_city OR has_missing_venue)
ORDER BY records DESC
LIMIT 100;
