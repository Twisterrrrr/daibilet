-- Read-only production export of saleable recurring Ticketscloud records.
-- Run: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f this-file.sql > matrix.csv
COPY (
  WITH tc_identity AS (
    SELECT
      sl."eventId",
      count(*)::int AS tc_source_links,
      count(DISTINCT NULLIF(trim(sl."metaExternalId"), ''))::int AS parent_count,
      min(NULLIF(trim(sl."metaExternalId"), '')) AS parent_id
    FROM "EventSourceLink" sl
    JOIN "Source" src ON src.id = sl."sourceId"
    WHERE upper(src.code::text) = 'TICKETSCLOUD'
    GROUP BY sl."eventId"
  ),
  future_sessions AS (
    SELECT s."eventId", min(s."startsAt") AS next_session
    FROM "EventSession" s
    WHERE s."isActive" IS NOT FALSE AND s."archivedAt" IS NULL AND s."cancelledAt" IS NULL
      AND s."startsAt" >= now()
      AND lower(coalesce(s."sourceStatus", '')) NOT IN
        ('widget_blocked','paused','suspended','stopped','cancelled','canceled','draft','hidden','stand_by','closed','sales_closed','sale_closed','not_for_sale')
    GROUP BY s."eventId"
  ),
  active_offers AS (
    SELECT DISTINCT o."eventId" FROM "EventOffer" o WHERE o.active IS NOT FALSE
  ),
  primary_suppliers AS (
    SELECT DISTINCT ON (se."eventId") se."eventId", se."supplierId"
    FROM "SupplierEvent" se
    WHERE se."isActive" IS TRUE
    ORDER BY se."eventId", se."isPrimary" DESC, se."createdAt" ASC
  ),
  event_sources AS (
    SELECT sl."eventId", string_agg(DISTINCT src.code::text, ' || ' ORDER BY src.code::text) AS source_codes
    FROM "EventSourceLink" sl JOIN "Source" src ON src.id = sl."sourceId"
    GROUP BY sl."eventId"
  ),
  page_links AS (
    SELECT link."eventId",
      count(DISTINCT page.id)::int AS page_count,
      string_agg(DISTINCT page.slug, ' || ' ORDER BY page.slug) AS page_slugs,
      string_agg(DISTINCT page.status::text, ' || ' ORDER BY page.status::text) AS page_statuses
    FROM "EventPageEvent" link JOIN "EventPage" page ON page.id = link."eventPageId"
    GROUP BY link."eventId"
  ),
  live AS (
    SELECT e.id, e.slug, e.title, e."primaryCityId" AS city_id, city.title AS city, city.slug AS city_slug,
      e."venueId" AS venue_id, venue.title AS venue,
      COALESCE(e."supplierId", ps."supplierId") AS supplier_id, supplier.title AS supplier,
      COALESCE(tc.parent_count, 0) AS parent_count, tc.parent_id, fs.next_session,
      es.source_codes,
      COALESCE(pl.page_count, 0) AS page_count, pl.page_slugs, pl.page_statuses
    FROM "Event" e
    LEFT JOIN tc_identity tc ON tc."eventId" = e.id
    JOIN future_sessions fs ON fs."eventId" = e.id
    JOIN active_offers ao ON ao."eventId" = e.id
    LEFT JOIN "City" city ON city.id = e."primaryCityId"
    LEFT JOIN "Venue" venue ON venue.id = e."venueId"
    LEFT JOIN primary_suppliers ps ON ps."eventId" = e.id
    LEFT JOIN "Supplier" supplier ON supplier.id = COALESCE(e."supplierId", ps."supplierId")
    LEFT JOIN event_sources es ON es."eventId" = e.id
    LEFT JOIN page_links pl ON pl."eventId" = e.id
    WHERE upper(e.kind::text) = 'RECURRING' AND upper(e.status::text) = 'READY'
  ),
  tc_group_pages AS (
    SELECT groups.parent_id, groups.city_id,
      count(DISTINCT page_link."eventId") FILTER (WHERE page_link."eventId" IS NOT NULL)::int AS linked_event_count,
      count(DISTINCT page.id)::int AS linked_page_count,
      string_agg(DISTINCT page.slug, ' || ' ORDER BY page.slug) AS linked_page_slugs,
      string_agg(DISTINCT page.status::text, ' || ' ORDER BY page.status::text) AS linked_page_statuses
    FROM (SELECT DISTINCT parent_id, city_id FROM live WHERE parent_count = 1 AND parent_id IS NOT NULL) groups
    JOIN "Source" src ON upper(src.code::text) = 'TICKETSCLOUD'
    JOIN "EventSourceLink" sl ON sl."sourceId" = src.id AND sl."metaExternalId" = groups.parent_id
    JOIN "Event" sibling ON sibling.id = sl."eventId"
      AND sibling."primaryCityId" IS NOT DISTINCT FROM groups.city_id
    LEFT JOIN "EventPageEvent" page_link ON page_link."eventId" = sibling.id
    LEFT JOIN "EventPage" page ON page.id = page_link."eventPageId"
    GROUP BY groups.parent_id, groups.city_id
  ),
  parent_groups AS (
    SELECT 'TC_PARENT_CITY'::text AS row_type, l.parent_id AS provider_parent_id,
      l.city_id, l.city, l.city_slug,
      string_agg(DISTINCT l.source_codes, ' || ' ORDER BY l.source_codes) AS source_codes,
      count(DISTINCT l.id)::int AS live_event_ids,
      count(DISTINCT l.title)::int AS title_variants,
      string_agg(DISTINCT l.title, ' || ' ORDER BY l.title) AS titles,
      count(DISTINCT l.venue_id)::int AS venue_variants,
      string_agg(DISTINCT COALESCE(l.venue, '(no venue)'), ' || ' ORDER BY COALESCE(l.venue, '(no venue)')) AS venues,
      count(DISTINCT l.supplier_id)::int AS supplier_variants,
      string_agg(DISTINCT COALESCE(l.supplier, '(no supplier)'), ' || ' ORDER BY COALESCE(l.supplier, '(no supplier)')) AS suppliers,
      min(l.next_session) AS next_live_session,
      (array_agg(l.id ORDER BY l.next_session NULLS LAST, l.id))[1] AS representative_event_id,
      (array_agg(l.slug ORDER BY l.next_session NULLS LAST, l.id))[1] AS representative_event_slug,
      COALESCE(MAX(gp.linked_event_count), 0)::int AS linked_event_count,
      COALESCE(MAX(gp.linked_page_count), 0)::int AS linked_page_count,
      MAX(gp.linked_page_slugs) AS linked_page_slugs,
      MAX(gp.linked_page_statuses) AS linked_page_statuses,
      string_agg(DISTINCT l.id, ',' ORDER BY l.id) AS event_ids
    FROM live l
    LEFT JOIN tc_group_pages gp ON gp.parent_id = l.parent_id
      AND gp.city_id IS NOT DISTINCT FROM l.city_id
    WHERE l.parent_count = 1 AND l.parent_id IS NOT NULL
    GROUP BY l.parent_id, l.city_id, l.city, l.city_slug
  ),
  no_parent AS (
    SELECT CASE WHEN parent_count > 1 THEN 'MULTIPLE_TC_PARENTS' ELSE 'NO_TC_PARENT' END::text AS row_type,
      ''::text AS provider_parent_id, city_id, city, city_slug, source_codes,
      1::int AS live_event_ids, 1::int AS title_variants, title AS titles,
      1::int AS venue_variants, COALESCE(venue, '(no venue)') AS venues,
      1::int AS supplier_variants, COALESCE(supplier, '(no supplier)') AS suppliers,
      next_session AS next_live_session,
      id AS representative_event_id, slug AS representative_event_slug,
      CASE WHEN page_count > 0 THEN 1 ELSE 0 END::int AS linked_event_count,
      page_count AS linked_page_count, page_slugs AS linked_page_slugs,
      page_statuses AS linked_page_statuses, id AS event_ids
    FROM live
    WHERE COALESCE(parent_count, 0) <> 1 OR parent_id IS NULL
  )
  SELECT * FROM parent_groups
  UNION ALL
  SELECT * FROM no_parent
  ORDER BY row_type, city, titles, provider_parent_id
) TO STDOUT WITH (FORMAT CSV, HEADER TRUE);
