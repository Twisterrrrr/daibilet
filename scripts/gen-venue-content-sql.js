const fs = require('fs');
const path = require('path');

const manual = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/venue-content-manual.json'), 'utf8'));
const entries = manual.venues || [];

function esc(value) {
  return String(value || '').replace(/'/g, "''");
}

const lines = ['BEGIN;'];
for (const entry of entries) {
  if (!entry.id || !entry.description) continue;
  const short = entry.shortDescription || entry.description.slice(0, 220);
  lines.push(`
UPDATE "Venue"
SET
  title = COALESCE(NULLIF('${esc(entry.title)}', ''), title),
  address = COALESCE(NULLIF('${esc(entry.address)}', ''), address),
  "shortDescription" = '${esc(short)}',
  description = '${esc(entry.description)}',
  "seoDescription" = '${esc(short)}',
  "updatedAt" = now()
WHERE id = '${esc(entry.id)}';`);
}
lines.push('COMMIT;');

const out = path.join(__dirname, 'data/venue-content-apply.sql');
fs.writeFileSync(out, lines.join('\n'), 'utf8');
console.log(`Wrote ${entries.length} updates to ${out}`);
