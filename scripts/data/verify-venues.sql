SELECT title, left("shortDescription", 80) AS short FROM "Venue" WHERE id = 'venue_6a12997483e517bb483575d3';
SELECT count(*) AS with_short FROM "Venue" v
JOIN (SELECT unnest(ARRAY[
  'venue_6a12997483e517bb483575d3','venue_6617e4b1a5fa0b03d0dc29f6','venue_5dd900bd6314a2f6642d8b07'
]) AS id) t ON t.id = v.id
WHERE coalesce(trim(v."shortDescription"), '') <> '';
