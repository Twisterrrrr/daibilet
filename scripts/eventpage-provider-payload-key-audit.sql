-- Read-only: inspect imported payload field names only, never raw values.
SELECT 'raw' AS record_kind, event.id AS event_id, raw."entityType",
       string_agg(DISTINCT keys.key, ',' ORDER BY keys.key) AS top_level_keys
FROM "Event" event
JOIN "EventSourceLink" source_link ON source_link."eventId" = event.id
JOIN "RawImportRecord" raw ON raw.id = source_link."rawRecordId"
CROSS JOIN LATERAL jsonb_object_keys(raw.payload) AS keys(key)
WHERE event.id IN (
  'evt_6a7dd7df3175ef2954c0c4e5',
  'evt_6abaa7ce3a8e4249b44e75b5',
  'evt_69b7c6dc14d4a5287725735e',
  'evt_6ae4048b837890b13374fda4'
)
GROUP BY record_kind, event.id, raw."entityType"
UNION ALL
SELECT 'provider' AS record_kind, event.id AS event_id, provider."entityKind"::text,
       string_agg(DISTINCT keys.key, ',' ORDER BY keys.key) AS top_level_keys
FROM "Event" event
JOIN "ProviderLink" provider ON provider."eventId" = event.id
CROSS JOIN LATERAL jsonb_object_keys(provider.payload) AS keys(key)
WHERE event.id IN (
  'evt_6a7dd7df3175ef2954c0c4e5',
  'evt_6abaa7ce3a8e4249b44e75b5',
  'evt_69b7c6dc14d4a5287725735e',
  'evt_6ae4048b837890b13374fda4'
)
GROUP BY record_kind, event.id, provider."entityKind"::text
UNION ALL
SELECT 'offer' AS record_kind, event.id AS event_id, offer."sourceCode"::text,
       string_agg(DISTINCT keys.key, ',' ORDER BY keys.key) AS top_level_keys
FROM "Event" event
JOIN "EventOffer" offer ON offer."eventId" = event.id
CROSS JOIN LATERAL jsonb_object_keys(offer.payload) AS keys(key)
WHERE event.id IN (
  'evt_6a7dd7df3175ef2954c0c4e5',
  'evt_6abaa7ce3a8e4249b44e75b5',
  'evt_69b7c6dc14d4a5287725735e',
  'evt_6ae4048b837890b13374fda4'
)
GROUP BY record_kind, event.id, offer."sourceCode"::text
ORDER BY record_kind, event_id;
