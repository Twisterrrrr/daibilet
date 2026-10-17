import { createDb } from '../apps/backend/src/db.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = createDb(rootDir);

const IMAGE_MAP = new Map([
  ['Активный отдых|ACA 206', '/images/events/generated/evt-cover-aca-206.png'],
  [
    'Мероприятия|Балет "Лебединое озеро"///Swan Lake ballet',
    '/images/events/generated/evt-cover-swan-lake.png',
  ],
  [
    'Экскурсии|Мультимодальный маршрут Санкт-Петербург - Форт Красная Горка Электропоезд + Ретро-автобус ПАЗ-672М',
    '/images/events/generated/evt-cover-fort-multimodal.png',
  ],
  [
    'Экскурсии|Тур по форту Красная Горка с посещением заброшенной станции Краснофлотск Ретро-автобус ПАЗ-672М',
    '/images/events/generated/evt-cover-fort-tour.png',
  ],
  [
    'Экскурсии|Экскурсия в галерею «Золотой век СССР. Искусство эпохи. Музей живописца Бориса Семёнова» + трансфер до музея на РАФ-22038',
    '/images/events/generated/evt-cover-sortavala-gallery-raf.png',
  ],
  [
    'Экскурсии|Экскурсия в галерею «Золотой век СССР. Искусство эпохи». Музей живописца Бориса Семёнова',
    '/images/events/generated/evt-cover-sortavala-gallery.png',
  ],
]);

const publicDir = path.join(rootDir, 'apps/public/public');
for (const imageUrl of new Set(IMAGE_MAP.values())) {
  const filePath = path.join(publicDir, imageUrl.replace(/^\//, ''));
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing generated image file: ${filePath}`);
  }
}

const { rows } = await db.query(`
  select
    e.id,
    e.title,
    coalesce(c.title, 'unknown') as category
  from "Event" e
  left join "EventOverride" o on o."eventId" = e.id
  left join "Category" c on c.id = e."categoryId"
  where e.status not in ('HIDDEN', 'DRAFT')
    and coalesce(nullif(trim(e."imageUrl"), ''), '') = ''
    and coalesce(nullif(trim(o."imageUrl"), ''), '') = ''
`);

let updated = 0;
let skipped = 0;

for (const row of rows) {
  const imageUrl = IMAGE_MAP.get(`${row.category}|${row.title}`);
  if (!imageUrl) {
    skipped += 1;
    console.warn(`No cover mapping for: ${row.category} | ${row.title}`);
    continue;
  }

  await db.query(
    `
      update "Event"
      set "imageUrl" = $2,
          "updatedAt" = now()
      where id = $1
    `,
    [row.id, imageUrl],
  );
  updated += 1;
}

console.log(`Applied generated covers to ${updated} events (${skipped} skipped).`);
