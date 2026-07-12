import { createDb } from '../apps/backend/src/db.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = createDb(rootDir);

const res = await fetch('http://127.0.0.1:4000/api/public/catalog?refresh=1&city=spb&limit=500');
const data = await res.json();
const items = (data.items || []).filter((x) => /гарри|potter|музей/i.test(`${x.title || ''}${x.venue || ''}`));
console.log('catalog cards:', items.length);
for (const x of items) {
  console.log(`${x.title} | ${x.venue} | grouped=${x.groupedEventsCount || 1}`);
}
