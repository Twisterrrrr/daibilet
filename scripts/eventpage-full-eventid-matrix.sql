-- Read-only production inventory: one row per catalog Event ID.
-- Includes scheduling/session counts and exact source/PDP relations. It does not
-- decide title-based merges, publish pages, or change routes/SEO.
COPY (
  WITH sessions AS (
    SELECT s."eventId",
      count(*) FILTER (WHERE s."isActive" IS NOT FALSE AND s."archivedAt" IS NULL
        AND s."cancelledAt" IS NULL)::int AS active_session_count,
      count(*) FILTER (WHERE s."isActive" IS NOT FALSE AND s."archivedAt" IS NULL
        AND s."cancelledAt" IS NULL AND s."startsAt" >= now()
        AND lower(coalesce(s."sourceStatus", '')) NOT IN
          ('widget_blocked','paused','suspended','stopped','cancelled','canceled','draft','hidden','stand_by','closed','sales_closed','sale_closed','not_for_sale'))::int AS future_sellable_session_count,
      min(s."startsAt") FILTER (WHERE s."isActive" IS NOT FALSE AND s."archivedAt" IS NULL
        AND s."cancelledAt" IS NULL AND s."startsAt" >= now()
        AND lower(coalesce(s."sourceStatus", '')) NOT IN
          ('widget_blocked','paused','suspended','stopped','cancelled','canceled','draft','hidden','stand_by','closed','sales_closed','sale_closed','not_for_sale')) AS next_future_sellable_session
    FROM "EventSession" s GROUP BY s."eventId"
  ), offers AS (
    SELECT o."eventId", count(*) FILTER (WHERE o.active IS NOT FALSE)::int AS active_offer_count
    FROM "EventOffer" o GROUP BY o."eventId"
  ), sources AS (
    SELECT sl."eventId",
      string_agg(DISTINCT src.code::text, '|' ORDER BY src.code::text) AS source_codes,
      count(DISTINCT NULLIF(trim(sl."metaExternalId"), '')) FILTER (WHERE upper(src.code::text)='TICKETSCLOUD')::int AS tc_parent_count,
      string_agg(DISTINCT NULLIF(trim(sl."metaExternalId"), ''), '|' ORDER BY NULLIF(trim(sl."metaExternalId"), '')) FILTER (WHERE upper(src.code::text)='TICKETSCLOUD') AS tc_parent_ids,
      string_agg(DISTINCT sl."externalId", '|' ORDER BY sl."externalId") AS provider_event_ids
    FROM "EventSourceLink" sl JOIN "Source" src ON src.id=sl."sourceId"
    GROUP BY sl."eventId"
  ), suppliers AS (
    SELECT DISTINCT ON (se."eventId") se."eventId", se."supplierId"
    FROM "SupplierEvent" se WHERE se."isActive" IS TRUE
    ORDER BY se."eventId", se."isPrimary" DESC, se."createdAt" ASC
  ), pages AS (
    SELECT l."eventId", count(DISTINCT p.id)::int AS eventpage_count,
      string_agg(DISTINCT p.slug, '|' ORDER BY p.slug) AS eventpage_slugs,
      string_agg(DISTINCT p.status, '|' ORDER BY p.status) AS eventpage_statuses
    FROM "EventPageEvent" l JOIN "EventPage" p ON p.id=l."eventPageId"
    GROUP BY l."eventId"
  )
  SELECT e.id AS event_id, e.slug AS current_event_slug, e.title,
    upper(e.kind::text) AS event_kind, upper(e.status::text) AS event_status,
    e."openDateValidTo" AS open_date_valid_to,
    CURRENT_DATE AS snapshot_date,
    e."primaryCityId" AS city_id, c.title AS city,
    e."venueId" AS venue_id, v.title AS venue,
    e."categoryId" AS category_id, cat.title AS category,
    e."primarySubcategoryId" AS subcategory_id, sub.title AS subcategory,
    upper(e."purchaseFlow"::text) AS purchase_flow, upper(e."managementMode"::text) AS management_mode,
    coalesce(src.source_codes, '') AS source_codes,
    coalesce(src.tc_parent_count, 0) AS tc_parent_count,
    coalesce(src.tc_parent_ids, '') AS tc_parent_ids,
    coalesce(src.provider_event_ids, '') AS provider_event_ids,
    coalesce(e."supplierId", suppliers."supplierId") AS supplier_id,
    supplier.title AS supplier,
    coalesce(ses.active_session_count, 0) AS active_session_count,
    coalesce(ses.future_sellable_session_count, 0) AS future_sellable_session_count,
    ses.next_future_sellable_session,
    coalesce(offers.active_offer_count, 0) AS active_offer_count,
    coalesce(pages.eventpage_count, 0) AS eventpage_count,
    coalesce(pages.eventpage_slugs, '') AS eventpage_slugs,
    coalesce(pages.eventpage_statuses, '') AS eventpage_statuses,
    CASE
      WHEN coalesce(pages.eventpage_count,0)>1 THEN 'REVIEW_MULTIPLE_EVENTPAGES'
      WHEN coalesce(pages.eventpage_count,0)=1 THEN 'LINKED_TO_EVENTPAGE'
      WHEN upper(e.status::text)='HIDDEN' THEN 'HIDDEN_NO_PUBLIC_PAGE'
      WHEN upper(e.kind::text)='RECURRING' AND coalesce(src.tc_parent_count,0)=1 AND e."primaryCityId" IS NOT NULL
        AND coalesce(offers.active_offer_count,0)>0 AND coalesce(ses.future_sellable_session_count,0)>0
        THEN 'GROUP_CANDIDATE_EXACT_TC_PARENT_CITY'
      WHEN coalesce(offers.active_offer_count,0)>0 AND coalesce(ses.future_sellable_session_count,0)>0
        THEN 'EVENTID_PAGE_CANDIDATE'
      WHEN upper(e.kind::text)='OPEN_DATE' AND coalesce(offers.active_offer_count,0)>0
        AND (e."openDateValidTo" IS NULL OR e."openDateValidTo">=now()) THEN 'OPEN_DATE_PAGE_CANDIDATE'
      ELSE 'NO_CURRENT_SELLABLE_OFFER_REVIEW_ARCHIVE_OR_NOINDEX'
    END AS matrix_decision
  FROM "Event" e
  LEFT JOIN "City" c ON c.id=e."primaryCityId"
  LEFT JOIN "Venue" v ON v.id=e."venueId"
  LEFT JOIN "Category" cat ON cat.id=e."categoryId"
  LEFT JOIN "Subcategory" sub ON sub.id=e."primarySubcategoryId"
  LEFT JOIN sessions ses ON ses."eventId"=e.id
  LEFT JOIN offers ON offers."eventId"=e.id
  LEFT JOIN sources src ON src."eventId"=e.id
  LEFT JOIN suppliers ON suppliers."eventId"=e.id
  LEFT JOIN "Supplier" supplier ON supplier.id=coalesce(e."supplierId", suppliers."supplierId")
  LEFT JOIN pages ON pages."eventId"=e.id
  ORDER BY e.id
) TO STDOUT WITH (FORMAT CSV, HEADER TRUE);
