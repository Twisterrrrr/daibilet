/** Reconcile the completed city-hub workbook. Dry-run unless --apply is passed.
 * Existing Venue rows outside this source are never hidden or deleted.
 */
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const records = JSON.parse(fs.readFileSync(path.resolve('data/places/pdp.json'), 'utf8'));
const apply = process.argv.includes('--apply');
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) throw new Error('DATABASE_URL is required');
const db = new pg.Client({ connectionString: dbUrl });
const normalize = (text) => String(text || '').toLocaleLowerCase('ru').replace(/ё/g, 'е').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const legacyKind = { ARCHITECTURE: 'ATTRACTION', MONUMENT: 'MONUMENT', MUSEUM: 'MUSEUM_ART_SPACE',
  RELIGION: 'TEMPLE', NATURE: 'PARK', URBAN: 'OUTDOOR_LOCATION', THEATRE: 'THEATER',
  ENTERTAINMENT: 'ATTRACTION', FOOD: 'GASTRO', VENUE: 'VENUE', TRANSPORT: 'VENUE' };
const metersApart = (a, b) => {
  if (a.latitude == null || a.longitude == null || b.latitude == null || b.longitude == null) return Infinity;
  const radians = (degrees) => degrees * Math.PI / 180;
  const deltaLat = radians(a.latitude - b.latitude);
  const deltaLon = radians(a.longitude - b.longitude);
  const h = Math.sin(deltaLat / 2) ** 2 + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(deltaLon / 2) ** 2;
  return 12742000 * Math.asin(Math.sqrt(Math.min(1, h)));
};
const sourceKeySet = new Set();
const sourceKeyCounts = new Map();
for (const item of records) sourceKeyCounts.set(item.sourceKey, (sourceKeyCounts.get(item.sourceKey) || 0) + 1);
const summary = { sourceRows: records.length, matched: 0, createdCandidates: 0, review: 0, duplicateRows: 0, missingCity: 0, unchangedOtherVenues: true, reviewRows: [] };

await db.connect();
try {
  const cities = (await db.query('SELECT id, title FROM "City"')).rows;
  const venues = (await db.query('SELECT id, title, address, latitude, longitude, "cityId", "poiSourceKey" FROM "Venue"')).rows;
  const cityByName = new Map(cities.map((city) => [normalize(city.title), city.id]));
  const bySource = new Map(venues.filter((venue) => venue.poiSourceKey).map((venue) => [venue.poiSourceKey, venue]));
  const byCityName = new Map();
  for (const venue of venues) {
    const key = `${venue.cityId}|${normalize(venue.title)}`;
    byCityName.set(key, [...(byCityName.get(key) || []), venue]);
  }
  if (apply) await db.query('BEGIN');
  for (const item of records) {
    if (sourceKeySet.has(item.sourceKey)) { summary.duplicateRows++; continue; }
    sourceKeySet.add(item.sourceKey);
    if (sourceKeyCounts.get(item.sourceKey) > 1) {
      summary.review++;
      summary.reviewRows.push({ row: item.sourceRow, name: item.name, reason: 'duplicate_source_key' });
      continue;
    }
    if (item.reviewReasons?.length) {
      summary.review++;
      summary.reviewRows.push({ row: item.sourceRow, name: item.name, reason: item.reviewReasons.join(',') });
      continue;
    }
    const cityId = cityByName.get(normalize(item.city));
    if (!cityId) { summary.missingCity++; summary.reviewRows.push({ row: item.sourceRow, name: item.name, reason: 'missing_city' }); continue; }
    const existingSource = bySource.get(item.sourceKey);
    const exact = existingSource ? [existingSource] : (byCityName.get(`${cityId}|${normalize(item.name)}`) || []);
    const candidate = exact[0];
    const hasCoordinates = candidate?.latitude != null && candidate?.longitude != null && item.latitude != null && item.longitude != null;
    const latitudeMeters = hasCoordinates ? Math.abs(candidate.latitude - item.latitude) * 111000 : Infinity;
    const longitudeMeters = hasCoordinates ? Math.abs(candidate.longitude - item.longitude) * 111000 * Math.cos(item.latitude * Math.PI / 180) : Infinity;
    const locationConfirmed = existingSource || (latitudeMeters < 120 && longitudeMeters < 120) ||
      (normalize(item.address).length > 8 && normalize(candidate?.address) === normalize(item.address));
    if (exact.length === 1 && locationConfirmed && (!candidate.poiSourceKey || candidate.poiSourceKey === item.sourceKey)) {
      summary.matched++;
      if (apply) await db.query(`UPDATE "Venue" SET
        "placeType"=$1::"PlaceType", "placeSubtype"=$2, "isMainPlace"=$3,
        "isTouristPlace"=true, "hubTags"=$4, "poiSourceKey"=$5,
        "updatedAt"=now() WHERE id=$6`,
      [item.placeType, item.placeSubtype, item.isMainPlace, item.hubTags, item.sourceKey, exact[0].id]);
      continue;
    }
    if (exact.length > 0 || item.reviewReasons?.length) {
      summary.review++;
      summary.reviewRows.push({ row: item.sourceRow, name: item.name, reason: exact.length > 1 ? 'ambiguous_exact' : 'identity_or_source_conflict' });
      continue;
    }
    const nearby = venues.some((venue) => venue.cityId === cityId &&
      (metersApart(item, venue) <= 120 ||
        (normalize(item.address).length > 8 && normalize(item.address) === normalize(venue.address))));
    if (nearby) {
      summary.review++;
      summary.reviewRows.push({ row: item.sourceRow, name: item.name, reason: 'nearby_existing_venue' });
      continue;
    }
    // Existing hub gates expose CANDIDATE, so new places stay HIDDEN until image and fact review.
    summary.createdCandidates++;
    if (apply) {
      const id = `poi_${item.sourceKey.slice(4)}`;
      const slug = `poi-${item.sourceKey.slice(4)}`;
      await db.query(`INSERT INTO "Venue" (id, slug, title, description, "cityId", address, latitude, longitude,
        kind, "placeType", "placeSubtype", "poiSourceKey", "isMainPlace", "isTouristPlace", "hubTags", "pageStatus",
        "isIndexable", "createdAt", "updatedAt")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::"VenueKind",$10::"PlaceType",$11,$12,$13,true,$14,'HIDDEN',false,now(),now())`,
        [id, slug, item.name, item.description, cityId, item.address || null, item.latitude, item.longitude,
          item.placeType === 'TRANSPORT' && item.placeSubtype === 'pier' ? 'PIER' : legacyKind[item.placeType] || 'OTHER',
          item.placeType, item.placeSubtype, item.sourceKey, item.isMainPlace, item.hubTags]);
    }
  }
  if (apply) await db.query('COMMIT');
  console.log(JSON.stringify(summary, null, 2));
} catch (error) {
  if (apply) await db.query('ROLLBACK');
  throw error;
} finally {
  await db.end();
}
