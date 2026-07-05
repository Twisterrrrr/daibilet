-- Remove TC tags that duplicate a top-level catalog category but belong to another category.
DELETE FROM "EventTag" et
USING "Tag" t, "Event" e, "Category" c
WHERE et."tagId" = t.id
  AND et."eventId" = e.id
  AND e."categoryId" = c.id
  AND lower(trim(t.title)) IN ('экскурсии', 'музеи и арт', 'мероприятия', 'активный отдых', 'развлечения')
  AND lower(trim(t.title)) <> lower(trim(c.title));
