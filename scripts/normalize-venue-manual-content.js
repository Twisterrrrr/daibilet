/**
 * Нормализует title/city/address в venue-content-manual.json (убирает латиницу).
 *
 *   node scripts/normalize-venue-manual-content.js
 */
const fs = require('fs');
const path = require('path');
const { normalizePublicText } = require('./lib/latin-to-cyrillic');

const manualPath = path.join(__dirname, 'data', 'venue-content-manual.json');
const manual = JSON.parse(fs.readFileSync(manualPath, 'utf8'));
const entries = Array.isArray(manual.venues) ? manual.venues : manual;

let changed = 0;
const lat = /[A-Za-z]/;

for (const entry of entries) {
  const originalTitle = entry.title;
  if (originalTitle && !(entry.match || []).includes(originalTitle)) {
    entry.match = [...(entry.match || []), originalTitle];
  }

  for (const field of ['title', 'city', 'address']) {
    const before = entry[field];
    if (!before) continue;
    const after = normalizePublicText(before);
    if (after !== before) {
      entry[field] = after;
      changed += 1;
    }
  }

  if (entry.description && entry.description.includes('.. ABRIKOS ARENA')) {
    entry.description = entry.description.replace(/\.\. ABRIKOS ARENA.*$/, '.');
    changed += 1;
  }
}

manual.normalizedAt = new Date().toISOString();
fs.writeFileSync(manualPath, `${JSON.stringify(manual, null, 2)}\n`, 'utf8');

const remaining = [];
for (const entry of entries) {
  for (const field of ['title', 'city', 'address']) {
    if (lat.test(entry[field] || '')) {
      remaining.push(`${field}: ${entry.title?.slice(0, 30)} → ${entry[field]}`);
    }
  }
}

console.log(`Updated fields: ${changed}`);
if (remaining.length) {
  console.log('Remaining Latin:');
  for (const line of remaining) console.log(`  ${line}`);
} else {
  console.log('No Latin left in title/city/address.');
}
