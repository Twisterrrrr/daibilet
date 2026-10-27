import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rows = JSON.parse(fs.readFileSync(path.join(rootDir, 'data/events-without-images.json'), 'utf8'));
const unique = new Map();
for (const row of rows) {
  const key = `${row.category}|${row.title}`;
  if (!unique.has(key)) unique.set(key, row);
}
console.log(`unique groups: ${unique.size} / ${rows.length} events`);
for (const row of unique.values()) {
  console.log(`${row.category} | ${row.city} | ${row.title}`);
}
