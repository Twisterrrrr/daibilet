-- Read-only export of every current EventPageEvent relation plus source identity
-- and current saleability for the linked Event IDs only.
COPY (
  WITH mapped_ids AS (
    SELECT DISTINCT "eventId" FROM "EventPageEvent"
  ), source_info AS (
    SELECT link."eventId",
      string_agg(DISTINCT upper(source.code::text), '|' ORDER BY upper(source.code::text)) AS source_codes,
      count(DISTINCT trim(link."metaExternalId")) FILTER (
        WHERE upper(source.code::text) = 'TICKETSCLOUD'
          AND NULLIF(trim(link."metaExternalId"), '') IS NOT NULL
      )::int AS tc_parent_count,
      min(trim(link."metaExternalId")) FILTER (
        WHERE upper(source.code::text) = 'TICKETSCLOUD'
          AND NULLIF(trim(link."metaExternalId"), '') IS NOT NULL
      ) AS tc_parent_id
    FROM "EventSourceLink" link
    JOIN mapped_ids mapped ON mapped."eventId" = link."eventId"
    JOIN "Source" source ON source.id = link."sourceId"
    GROUP BY link."eventId"
  ), active_sessions AS (
    SELECT session."eventId", count(*)::int AS active_future_session_count,
      min(session."startsAt") AS next_active_session_at
    FROM "EventSession" session
    JOIN mapped_ids mapped ON mapped."eventId" = session."eventId"
    WHERE session."isActive" IS NOT FALSE AND session."archivedAt" IS NULL
      AND session."cancelledAt" IS NULL AND session."startsAt" >= now()
      AND lower(coalesce(session."sourceStatus", '')) NOT IN
        ('widget_blocked','paused','suspended','stopped','cancelled','canceled','draft','hidden','stand_by','closed','sales_closed','sale_closed','not_for_sale')
    GROUP BY session."eventId"
  ), active_offers AS (
    SELECT offer."eventId", count(*)::int AS active_offer_count
    FROM "EventOffer" offer
    JOIN mapped_ids mapped ON mapped."eventId" = offer."eventId"
    WHERE offer.active IS NOT FALSE
    GROUP BY offer."eventId"
  ), candidate_routes AS (
    SELECT route."eventPageId", string_agg(DISTINCT route.path, '|' ORDER BY route.path) AS candidate_paths
    FROM "EventPageRoute" route
    WHERE route.kind = 'CANDIDATE'
      AND EXISTS (SELECT 1 FROM "EventPageEvent" link WHERE link."eventPageId" = route."eventPageId")
    GROUP BY route."eventPageId"
  )
  SELECT link."eventId" AS event_id, event.title AS event_title, event.slug AS event_slug,
    upper(event.kind::text) AS event_kind, upper(event.status::text) AS event_status,
    city.id AS city_id, city.title AS city, city.slug AS city_slug,
    venue.id AS venue_id, venue.title AS venue, venue.address AS venue_address,
    COALESCE(event."supplierId", supplier_event."supplierId") AS supplier_id, supplier.title AS supplier,
    category.title AS category,
    COALESCE(subcategories.subcategory_list, '') AS subcategories,
    COALESCE(source_info.source_codes, '') AS source_codes,
    COALESCE(source_info.tc_parent_id, '') AS tc_parent_id,
    event."managementMode"::text AS management_mode, event."purchaseFlow"::text AS purchase_flow,
    COALESCE(active_sessions.active_future_session_count, 0) AS active_future_session_count,
    active_sessions.next_active_session_at,
    COALESCE(active_offers.active_offer_count, 0) AS active_offer_count,
    link."eventPageId" AS eventpage_id, page.slug AS eventpage_slug,
    page.status::text AS eventpage_status, page."isIndexable" AS eventpage_is_indexable,
    page."publishedAt" AS eventpage_published_at, page."canonicalPath" AS eventpage_canonical_path,
    link.position, link.role::text AS eventpage_event_role,
    candidate_routes.candidate_paths,
    count(*) OVER (PARTITION BY link."eventId")::int AS eventpage_count_for_event
  FROM "EventPageEvent" link
  JOIN "EventPage" page ON page.id = link."eventPageId"
  JOIN "Event" event ON event.id = link."eventId"
  LEFT JOIN "City" city ON city.id = event."primaryCityId"
  LEFT JOIN "Venue" venue ON venue.id = event."venueId"
  LEFT JOIN "Category" category ON category.id = event."categoryId"
  LEFT JOIN LATERAL (
    SELECT relation."supplierId" FROM "SupplierEvent" relation
    WHERE relation."eventId" = event.id AND relation."isActive" IS TRUE
    ORDER BY relation."isPrimary" DESC, relation."createdAt" ASC LIMIT 1
  ) supplier_event ON true
  LEFT JOIN "Supplier" supplier ON supplier.id = COALESCE(event."supplierId", supplier_event."supplierId")
  LEFT JOIN source_info ON source_info."eventId" = event.id
  LEFT JOIN active_sessions ON active_sessions."eventId" = event.id
  LEFT JOIN active_offers ON active_offers."eventId" = event.id
  LEFT JOIN candidate_routes ON candidate_routes."eventPageId" = page.id
  LEFT JOIN LATERAL (
    SELECT string_agg(DISTINCT subcategory.title, '|' ORDER BY subcategory.title) AS subcategory_list
    FROM (
      SELECT subcategory.title
      FROM "EventSubcategory" relation
      JOIN "Subcategory" subcategory ON subcategory.id = relation."subcategoryId"
      WHERE relation."eventId" = event.id
      UNION
      SELECT subcategory.title FROM "Subcategory" subcategory
      WHERE subcategory.id = event."primarySubcategoryId"
    ) subcategory
  ) subcategories ON true
  ORDER BY city.title, event.title, page.slug, link.position, event.id
) TO STDOUT WITH (FORMAT CSV, HEADER TRUE);
