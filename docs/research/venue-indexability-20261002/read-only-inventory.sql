-- Run with psql in a READ ONLY transaction against the catalog production DB.
-- Export each SELECT with \copy ... TO CSV; do not run against the 250-row local seed.
BEGIN TRANSACTION READ ONLY;

-- One row per venue. This defines the raw facts for the CSV inventory.
WITH future AS (
  SELECT e."venueId", COUNT(DISTINCT e.id) AS future_events
  FROM "Event" e
  JOIN "EventSession" s ON s."eventId" = e.id
  WHERE s."startsAt" >= now() AND s."isActive" = true AND s."cancelledAt" IS NULL
  GROUP BY e."venueId"
)
SELECT v.id, v.slug, v.title, v.kind, c.slug AS city_slug,
       v."canonicalPath", v."isIndexable", v."pageStatus",
       COALESCE(f.future_events, 0) AS future_events,
       length(trim(COALESCE(v.description, ''))) AS description_length,
       length(trim(COALESCE(v."shortDescription", ''))) AS short_description_length,
       (NULLIF(trim(COALESCE(v."heroImageUrl", '')), '') IS NOT NULL) AS has_hero,
       (v.latitude IS NOT NULL AND v.longitude IS NOT NULL) AS has_coordinates
FROM "Venue" v
LEFT JOIN "City" c ON c.id = v."cityId"
LEFT JOIN future f ON f."venueId" = v.id
ORDER BY v.kind, city_slug, v.title, v.id;

-- Name collisions are candidates for review, never automatic merge.
SELECT lower(regexp_replace(trim(v.title), '\s+', ' ', 'g')) AS normalized_title,
       count(*) AS rows,
       count(DISTINCT v."cityId") AS cities,
       string_agg(v.id || ':' || COALESCE(v."canonicalPath", '/venues/' || v.slug), ' | ' ORDER BY v.id) AS paths
FROM "Venue" v
GROUP BY 1 HAVING count(*) > 1
ORDER BY rows DESC, normalized_title;

-- Verify exact canonical-path duplicates; do not confuse these with sitemap URL groups.
SELECT "canonicalPath", count(*) AS rows, string_agg(id, ',' ORDER BY id) AS venue_ids
FROM "Venue"
WHERE "canonicalPath" IS NOT NULL AND "canonicalPath" <> ''
GROUP BY "canonicalPath" HAVING count(*) > 1;

COMMIT;
