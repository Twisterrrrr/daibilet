/** Apply only independently corroborated taxonomy proposals. Dry-run by default. */
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const proposals = JSON.parse(fs.readFileSync(path.resolve('data/places/imported-taxonomy.json'), 'utf8'));
const apply = process.argv.includes('--apply');
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) throw new Error('DATABASE_URL is required');
const db = new pg.Client({ connectionString: dbUrl });
const summary = { proposals: proposals.length, eligible: 0, staleIdentity: 0, alreadyTyped: 0, applied: 0 };

await db.connect();
try {
  const ids = proposals.map((row) => row.id);
  const rows = (await db.query('SELECT id, title, kind, "placeType", "placeSubtype" FROM "Venue" WHERE id = ANY($1::text[])', [ids])).rows;
  const byId = new Map(rows.map((row) => [row.id, row]));
  if (apply) await db.query('BEGIN');
  for (const proposal of proposals) {
    const current = byId.get(proposal.id);
    if (!current || current.title !== proposal.title || current.kind !== proposal.oldKind) {
      summary.staleIdentity++;
      continue;
    }
    if (current.placeType || current.placeSubtype) {
      summary.alreadyTyped++;
      continue;
    }
    summary.eligible++;
    if (apply) {
      const result = await db.query(`UPDATE "Venue" SET "placeType"=$1::"PlaceType", "placeSubtype"=$2,
        "updatedAt"=now() WHERE id=$3 AND title=$4 AND kind=$5::"VenueKind"
        AND "placeType" IS NULL AND "placeSubtype" IS NULL`,
      [proposal.placeType, proposal.placeSubtype, proposal.id, proposal.title, proposal.oldKind]);
      summary.applied += result.rowCount;
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
