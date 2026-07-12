import { createDb } from '../apps/backend/src/db.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = createDb(rootDir);

const res = await fetch('http://127.0.0.1:4000/api/catalog/sessions?refresh=1&limit=2000');
const data = await res.json();
const sessions = data.sessions || data.items || [];
const items = sessions.filter((x) => /гарри|potter/i.test(`${x.title || ''}${x.venue || ''}`));
console.log('catalog sessions total:', sessions.length, 'reported total:', data.total);
console.log('harry potter catalog cards:', items.length);
const comboItems = sessions.filter((x) => /комбо/i.test(`${x.title || ''}`) && /гарри|potter/i.test(`${x.venue || ''}`));
console.log('combo-titled cards at HP venue:', comboItems.length);
for (const x of comboItems) {
  console.log(`  ${x.title} | grouped=${x.groupedEventsCount || 1}`);
}
