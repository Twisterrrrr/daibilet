import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createDb } from '../apps/backend/src/db.js';
import { savePdpDocument } from '../apps/backend/src/pdp-documents.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = createDb(root);
const venueId = 'poi_466fcf361a73b55dcf19';
const document = JSON.parse(await readFile(path.join(root, 'data/places/hermitage-editorial.json'), 'utf8'));
const result = await db.query('SELECT id, title FROM "Venue" WHERE id = $1 AND "poiSourceKey" = $2', [venueId, 'pdp:466fcf361a73b55dcf19']);
if (result.rows.length !== 1) throw new Error('Expected Hermitage venue was not found');

await db.query(`UPDATE "Venue" SET
  "placeType" = 'MUSEUM', kind = 'MUSEUM_ART_SPACE',
  address = 'Дворцовая площадь, 2',
  description = $2, "shortDescription" = $3,
  "seoTitle" = 'Государственный Эрмитаж — как посетить, коллекции и билеты | Дайбилет',
  "seoDescription" = 'Государственный Эрмитаж в Санкт-Петербурге: коллекции, маршруты, часы работы, вход и билеты. Проверенные сведения и ссылки на сайт музея.',
  "updatedAt" = now() WHERE id = $1`, [venueId,
  document.content.sections.find((section) => section.kind === 'about').body,
  document.content.summary,
]);
const saved = await savePdpDocument(db, 'venues', venueId, document);
console.log(JSON.stringify({ venueId, variant: saved.variant, status: saved.status, sections: saved.content.sections.length, photos: saved.content.gallery.length, version: saved.version }));
process.exit(0);
