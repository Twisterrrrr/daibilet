/**
 * Применить venue-content-draft.json к БД.
 * Требует DATABASE_URL или локальный postgres на :5437.
 *
 *   node scripts/apply-venue-content.mjs --dry-run
 *   node scripts/apply-venue-content.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDb } from '../apps/backend/src/db.js';

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const draftPath = path.join(rootDir, 'scripts', 'data', 'venue-content-draft.json');
const dryRun = process.argv.includes('--dry-run');

if (!fs.existsSync(draftPath)) {
  console.error('Missing venue-content-draft.json — run generate-venue-content.mjs first');
  process.exit(1);
}

const draft = JSON.parse(fs.readFileSync(draftPath, 'utf8'));
const rows = (draft.results || []).filter((r) => !r.skipped && r.shortDescription);

console.log(`${dryRun ? '[DRY RUN] ' : ''}Applying ${rows.length} venue content updates...`);

const db = await createDb(rootDir);
let applied = 0;

for (const row of rows) {
  if (dryRun) {
    console.log(`- ${row.name}: ${row.shortDescription.slice(0, 80)}…`);
    applied += 1;
    continue;
  }

  await db.query(
    `
      update "Venue"
      set
        "shortDescription" = $2,
        description = $3,
        "seoDescription" = coalesce($4, "seoDescription"),
        "seoTitle" = coalesce($5, "seoTitle"),
        "updatedAt" = now()
      where id = $1
    `,
    [row.id, row.shortDescription, row.description || null, row.seoDescription || null, row.seoTitle || null],
  );
  applied += 1;
}

console.log(`Applied: ${applied}`);
process.exit(0);
