import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';

const records = JSON.parse(fs.readFileSync(path.resolve('data/places/pdp.json'), 'utf8'));
const apply = process.argv.includes('--apply');
const connectionString = process.env.DATABASE_URL || 'postgresql://daibilet:daibilet@127.0.0.1:5437/daibilet';
const client = new pg.Client({ connectionString });
const normalize = (text) => String(text || '').toLocaleLowerCase('ru').replace(/ё/g, 'е').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const tokenSimilarity = (a, b) => {
  const left = new Set(normalize(a).split(' ').filter(Boolean));
  const right = new Set(normalize(b).split(' ').filter(Boolean));
  const overlap = [...left].filter((word) => right.has(word)).length;
  return overlap / Math.max(left.size, right.size, 1);
};
const distance = (a, b) => {
  if (a.latitude == null || b.latitude == null) return Infinity;
  const radians = (degrees) => degrees * Math.PI / 180;
  const dLat = radians(b.latitude - a.latitude);
  const dLon = radians(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 12742000 * Math.asin(Math.sqrt(h));
};
const translit = { а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya' };
const slug = (text) => [...String(text).toLocaleLowerCase('ru')].map((letter) => translit[letter] ?? letter).join('').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
const sourceIds = new Set();
const summary = { source: records.length, create: 0, update: 0, matchImported: 0, relatedImported: 0, hideRemoved: 0, review: 0, skippedDuplicate: 0, candidateMatches: [], possibleRelated: [] };
const confirmedChildren = [
  ['venue_tep_10', 'pdp:7cbf8b3f7ec45ee7a819'],
  ['venue_tep_63', 'pdp:7cbf8b3f7ec45ee7a819'],
  ['venue_tep_57', 'pdp:7cbf8b3f7ec45ee7a819'],
  ['venue_693feebaf4721617de342a14', 'pdp:3da9836c348f3b6bc3cc'],
  ['venue_69c4fe1e73c4fefe8a905870', 'pdp:4cd3290f84e3dc4ffbfb'],
  ['venue_6a12ff9aa12cb60db6e31260', 'pdp:5a3a6eaefd2d3cba648a'],
];

await client.connect();
try {
  const [cityResult, venueResult] = await Promise.all([
    client.query('SELECT id, title FROM "City"'),
    client.query('SELECT id, title, address, latitude, longitude, kind, "cityId", "poiSourceKey", "pageStatus" FROM "Venue"'),
  ]);
  const cityByName = new Map(cityResult.rows.map((row) => [normalize(row.title), row.id]));
  const venues = venueResult.rows;
  const bySource = new Map(venues.filter((row) => row.poiSourceKey).map((row) => [row.poiSourceKey, row]));
  const byCity = new Map();
  for (const venue of venues) {
    const key = `${venue.cityId}|${normalize(venue.title)}`;
    byCity.set(key, [...(byCity.get(key) || []), venue]);
  }
  const sourceByCity = new Map();
  for (const item of records) {
    const cityId = cityByName.get(normalize(item.city));
    if (cityId) sourceByCity.set(cityId, [...(sourceByCity.get(cityId) || []), item]);
  }
  for (const venue of venues.filter((row) => !row.poiSourceKey)) {
    const related = (sourceByCity.get(venue.cityId) || [])
      .map((item) => ({ item, meters: distance(venue, item) }))
      .filter(({ item, meters }) => meters <= 80 || (normalize(venue.address).length > 8 && normalize(venue.address) === normalize(item.address)))
      .sort((left, right) => left.meters - right.meters);
    if (related.length) summary.possibleRelated.push({ venue: venue.title, place: related[0].item.name,
      meters: Math.round(related[0].meters), venueId: venue.id, sourceRow: related[0].item.sourceRow });
  }
  if (apply) await client.query('BEGIN');
  if (apply) await client.query(`UPDATE "Venue" SET "placeType" = CASE kind
    WHEN 'MUSEUM_ART_SPACE' THEN 'MUSEUM'::"PlaceType"
    WHEN 'THEATER' THEN 'THEATRE'::"PlaceType"
    WHEN 'CLUB_BAR_RESTAURANT' THEN 'FOOD'::"PlaceType"
    WHEN 'PIER' THEN CASE WHEN title ~* '(причал|пристань|речной вокзал|морской вокзал|морвокзал|автовокзал|автостанция|аэропорт|марина)' THEN 'TRANSPORT'::"PlaceType" ELSE 'VENUE'::"PlaceType" END
    WHEN 'OUTDOOR_LOCATION' THEN 'URBAN'::"PlaceType"
    WHEN 'ATTRACTION' THEN 'ENTERTAINMENT'::"PlaceType"
    ELSE 'VENUE'::"PlaceType" END,
    "placeSubtype" = CASE WHEN kind = 'PIER' AND title ~* '(причал|пристань)' THEN 'pier' ELSE NULL END,
    "placeRoles" = CASE WHEN kind = 'PIER' AND title ~* '(причал|пристань)' THEN ARRAY['boarding_point', 'departure_point']::TEXT[] ELSE ARRAY[]::TEXT[] END,
    "pageTemplate" = 'DEFAULT'::"PlacePageTemplate"
    WHERE "poiSourceKey" IS NULL AND "isTouristPlace" = false`);
  for (const item of records) {
    if (sourceIds.has(item.sourceKey)) { summary.skippedDuplicate++; continue; }
    sourceIds.add(item.sourceKey);
    const cityId = cityByName.get(normalize(item.city));
    let venue = bySource.get(item.sourceKey);
    if (!venue) {
      const candidates = venues.filter((candidate) => candidate.cityId === cityId &&
        !(candidate.kind === 'PIER' && item.placeType === 'URBAN') &&
        !/причал|павильон|сектор|\bзал\b|\bвход\b|сцена/i.test(candidate.title));
      const confirmed = candidates.filter((candidate) => {
        const sameAddress = normalize(candidate.address).length > 8 && normalize(candidate.address) === normalize(item.address);
        const meters = distance(candidate, item);
        const similarity = tokenSimilarity(candidate.title, item.name);
        return similarity >= 0.6 && (sameAddress || (similarity >= 0.8 && meters <= 120));
      });
      if (confirmed.length === 1) {
        venue = confirmed[0];
        summary.matchImported++;
        summary.candidateMatches.push({ sourceRow: item.sourceRow, name: item.name, venueId: venue.id });
      }
    }
    const reviewed = item.reviewReasons.length === 0;
    const imageUrl = typeof item.imageUrl === 'string' && item.imageUrl.trim() ? item.imageUrl.trim() : null;
    const values = [item.name, item.description, item.address || null, item.latitude, item.longitude,
      item.placeType, item.placeSubtype, item.isMainPlace, item.hubTags, item.sourceKey, reviewed ? 'PUBLISHED' : 'CANDIDATE',
      false, imageUrl];
    if (venue) {
      summary.update++;
      if (apply) await client.query(`UPDATE "Venue" SET
        title = CASE WHEN "poiSourceKey" IS NOT NULL THEN $1 ELSE title END,
        description = CASE WHEN "poiSourceKey" IS NOT NULL OR description IS NULL THEN $2 ELSE description END,
        address = COALESCE(address, $3), latitude = COALESCE(latitude, $4), longitude = COALESCE(longitude, $5),
        "placeType" = $6::"PlaceType", "placeSubtype" = $7, "isMainPlace" = $8, "hubTags" = $9,
        "poiSourceKey" = $10, "isTouristPlace" = true,
        "pageStatus" = CASE WHEN "pageStatus" = 'HIDDEN' THEN "pageStatus" ELSE $11::"VenuePageStatus" END,
        "isIndexable" = $12, "heroImageUrl" = COALESCE($13, "heroImageUrl"),
        "canonicalPath" = COALESCE("canonicalPath", '/places/' || slug), "updatedAt" = now()
        WHERE id = $14`, [...values, venue.id]);
    } else {
      summary.create++;
      const id = `poi_${item.sourceKey.split(':')[1]}`;
      const placeSlug = `${slug(item.city)}-${slug(item.name) || 'place'}-${item.sourceKey.slice(-6)}`;
      if (apply) await client.query(`INSERT INTO "Venue" (id, slug, title, description, "shortDescription", "heroImageUrl", "cityId", address,
        latitude, longitude, kind, "placeType", "placeSubtype", "poiSourceKey", "isMainPlace", "isTouristPlace", "hubTags", "pageStatus",
        "isIndexable", "canonicalPath", "createdAt", "updatedAt")
        VALUES ($1,$2,$3,$4,$4,$5,$6,$7,$8,$9,'ATTRACTION',$10::"PlaceType",$11,$12,$13,true,$14,$15::"VenuePageStatus",$16,$17,now(),now())`,
        [id, placeSlug, item.name, item.description, null, cityId, item.address || null,
          item.latitude, item.longitude, item.placeType, item.placeSubtype, item.sourceKey, item.isMainPlace, item.hubTags,
          reviewed ? 'PUBLISHED' : 'CANDIDATE', false, `/places/${placeSlug}`]);
    }
    if (!reviewed) summary.review++;
  }
  const removed = venues.filter((venue) => venue.poiSourceKey && !sourceIds.has(venue.poiSourceKey));
  summary.relatedImported = confirmedChildren.length;
  if (apply) for (const [childId, parentSourceKey] of confirmedChildren) {
    await client.query(`UPDATE "Venue" AS child SET "parentPlaceId" = parent.id, "updatedAt" = now()
      FROM "Venue" AS parent WHERE child.id = $1 AND parent."poiSourceKey" = $2
      AND child.id <> parent.id`, [childId, parentSourceKey]);
  }
  summary.hideRemoved = removed.length;
  if (apply && removed.length) await client.query(`UPDATE "Venue" SET "pageStatus"='HIDDEN', "isTouristPlace"=false,
    "isMainPlace"=false, "isIndexable"=false, "updatedAt"=now() WHERE "poiSourceKey" = ANY($1::text[])`, [removed.map((row) => row.poiSourceKey)]);
  if (apply) await client.query('COMMIT');
  console.log(JSON.stringify(summary, null, 2));
} catch (error) {
  if (apply) await client.query('ROLLBACK');
  throw error;
} finally {
  await client.end();
}

