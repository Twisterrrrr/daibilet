BEGIN TRANSACTION READ ONLY;
COPY (
WITH activity AS (
  SELECT
    pe."eventPageId",
    count(DISTINCT e.id) AS linked_event_count,
    string_agg(DISTINCT c.title, ' | ' ORDER BY c.title) FILTER (WHERE c.title IS NOT NULL) AS cities,
    string_agg(DISTINCT COALESCE(v.title, e."venueId"), ' | ' ORDER BY COALESCE(v.title, e."venueId")) FILTER (WHERE COALESCE(v.title, e."venueId") IS NOT NULL) AS venues,
    count(DISTINCT s.id) FILTER (
      WHERE e.status = 'READY' AND s."isActive" AND s."archivedAt" IS NULL
        AND s."startsAt" >= (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Moscow')
    ) AS future_active_slots,
    count(DISTINCT s.id) FILTER (
      WHERE e.status = 'READY' AND s."isActive" AND s."archivedAt" IS NULL
        AND s."startsAt" >= (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Moscow')
        AND o.id IS NOT NULL
    ) AS future_sellable_slots,
    count(DISTINCT e.id) FILTER (
      WHERE e.status = 'READY' AND e.kind = 'OPEN_DATE' AND o.id IS NOT NULL
        AND (e."openDateValidFrom" IS NULL OR e."openDateValidFrom" <= (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Moscow'))
        AND (e."openDateValidTo" IS NULL OR e."openDateValidTo" >= (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Moscow'))
    ) AS valid_open_date_events,
    count(DISTINCT o.id) AS active_offer_count,
    min(s."startsAt") FILTER (
      WHERE e.status = 'READY' AND s."isActive" AND s."archivedAt" IS NULL
        AND s."startsAt" >= (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Moscow') AND o.id IS NOT NULL
    ) AS next_sellable_slot
  FROM "EventPageEvent" pe
  JOIN "Event" e ON e.id = pe."eventId"
  LEFT JOIN "City" c ON c.id = e."primaryCityId"
  LEFT JOIN "Venue" v ON v.id = e."venueId"
  LEFT JOIN "EventSession" s ON s."eventId" = e.id
  LEFT JOIN "EventOffer" o ON o."eventId" = e.id AND o.active = true
  GROUP BY pe."eventPageId"
), latest_revision AS (
  SELECT DISTINCT ON (r."eventPageId")
    r."eventPageId", r.version, r."createdAt", r."changeNote"
  FROM "EventPageRevision" r
  ORDER BY r."eventPageId", r.version DESC
)
SELECT
  (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Moscow') AS checked_at_msk,
  p.id AS eventpage_id,
  'https://daibilet.ru/events/' || p.slug AS url,
  p.slug,
  p.title,
  COALESCE(a.cities, '') AS cities,
  COALESCE(a.venues, '') AS venues,
  p.status AS page_status,
  p."isIndexable" AS is_indexable,
  p."publishedAt" AS published_at,
  p."updatedAt" AS page_updated_at,
  (p.content::text LIKE '%ACTIVE_EDITORIAL_REWRITE%') AS has_active_editorial_rewrite,
  COALESCE(lr.version, 0) AS latest_revision,
  lr."createdAt" AS latest_revision_at,
  COALESCE(lr."changeNote", '') AS latest_change_note,
  COALESCE(a.linked_event_count, 0) AS linked_event_count,
  COALESCE(a.future_active_slots, 0) AS future_active_slots,
  COALESCE(a.future_sellable_slots, 0) AS future_sellable_slots,
  COALESCE(a.valid_open_date_events, 0) AS valid_open_date_events,
  COALESCE(a.active_offer_count, 0) AS active_offer_count,
  a.next_sellable_slot,
  CASE
    WHEN COALESCE(a.future_sellable_slots, 0) > 0 OR COALESCE(a.valid_open_date_events, 0) > 0 THEN 'ACTIVE_SALE'
    WHEN COALESCE(a.future_active_slots, 0) > 0 THEN 'FUTURE_SLOT_WITHOUT_ACTIVE_OFFER'
    ELSE 'NO_CURRENT_SALE'
  END AS sale_status,
  CASE
    WHEN p.content::text LIKE '%ACTIVE_EDITORIAL_REWRITE%' AND (COALESCE(a.future_sellable_slots, 0) > 0 OR COALESCE(a.valid_open_date_events, 0) > 0) THEN 'REWRITE_LIVE'
    WHEN p.content::text LIKE '%ACTIVE_EDITORIAL_REWRITE%' THEN 'REWRITE_NO_CURRENT_SALE'
    WHEN (COALESCE(a.future_sellable_slots, 0) > 0 OR COALESCE(a.valid_open_date_events, 0) > 0) THEN 'NEEDS_REWRITE_LIVE'
    ELSE 'NO_REWRITE_NO_CURRENT_SALE'
  END AS tracker_status
FROM "EventPage" p
LEFT JOIN activity a ON a."eventPageId" = p.id
LEFT JOIN latest_revision lr ON lr."eventPageId" = p.id
ORDER BY p.slug
) TO STDOUT WITH (FORMAT csv, HEADER true);
COMMIT;