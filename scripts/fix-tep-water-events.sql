-- Reclassify Teplohod river events wrongly tagged as bus tours.
UPDATE "Event"
SET
  "categoryId" = 'cat_excursions',
  "primarySubcategoryId" = 'sub_excursions_water',
  "updatedAt" = now()
WHERE id IN ('evt_tep_1365', 'evt_tep_1367', 'evt_tep_1368');

DELETE FROM "EventSubcategory"
WHERE "eventId" IN ('evt_tep_1365', 'evt_tep_1367', 'evt_tep_1368')
  AND "subcategoryId" = 'sub_excursions_bus';

INSERT INTO "EventSubcategory" ("eventId", "subcategoryId", "isPrimary")
VALUES
  ('evt_tep_1365', 'sub_excursions_water', true),
  ('evt_tep_1367', 'sub_excursions_water', true),
  ('evt_tep_1368', 'sub_excursions_water', true)
ON CONFLICT ("eventId", "subcategoryId") DO UPDATE SET "isPrimary" = true;

DELETE FROM "EventTag"
WHERE "eventId" IN ('evt_tep_1365', 'evt_tep_1367', 'evt_tep_1368')
  AND "tagId" IN (SELECT id FROM "Tag" WHERE title IN ('Автобусные туры', 'Автобусные экскурсии'));

INSERT INTO "EventTag" ("eventId", "tagId")
SELECT event_id, tag.id
FROM (
  VALUES ('evt_tep_1365'), ('evt_tep_1367'), ('evt_tep_1368')
) AS events(event_id)
CROSS JOIN "Tag" tag
WHERE tag.title IN ('Речные прогулки', 'Водные экскурсии')
ON CONFLICT DO NOTHING;

SELECT e.id, left(e.title, 55) AS title, sc.title AS subcategory
FROM "Event" e
LEFT JOIN "Subcategory" sc ON sc.id = e."primarySubcategoryId"
WHERE e.id IN ('evt_tep_1365', 'evt_tep_1367', 'evt_tep_1368');
