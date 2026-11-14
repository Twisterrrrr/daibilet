import { createRequire } from 'node:module';
const require = createRequire('/opt/daibilet/apps/backend/package.json');
const { Client } = require('pg');

const slugs = [
  'gmii-im-pushkina-672f34b6ebf4808956f1474a',
  'государственныи-музеи-а-с-пушкина-5bf694763dc0e5000bc16feb',
  'дом-музеи-гоголя-5693cd139cb53836a4dbec2c',
  'государственныи-геологическии-музеи-им-вернадского-58d0097cd352860017f35db4',
  'memorialnyi-muzei-a-n-skryabina-bolshoi-zal-633e7d3b1156365c15b6da1a',
  'музеи-им-н-островского-5d61087e6be9adfb0dd8425b',
  'muzei-zapovednik-caricyno-bazhenovskii-zal-tavricheskii-zal-6998512396ca62a956f2c5b9',
  'усадьба-кусково-портретная-галерея-большои-каменнои-оранжереи-65c23f6cb4500cc20a8be9f3',
  'новодевичии-монастырь-62931a512b3d98181e4f888c',
  'покровскии-собор-638f165cb2496ab2eb6eb37a',
  'petrovskii-putevoi-dvorec-5cd1bf3d079a40000c1e0639',
  'moskva-lavrushinskii-pereulok-10-6a1fd5158bd71b8ae77e127c',
  'galereya-ili-glazunova-6225a53df0a5daf0e7ce8b21',
  'muzei-benua-na-vasilevskom-5bc4567597a630000ce38d64',
  'музеи-квартира-актеров-самоиловых-629a730956297debbec65aa0',
  'muzei-usadba-g-r-derzhavina-5a04a866515e3500198b0d76',
  'muzei-karla-bully-688a364c4653f82b8cdd3734',
  'planetarii-1-5b30cfdd519f7b001a12d8be',
  'muzeinyi-centr-ploschad-mira-5b59418f515e35001ebf3c42',
  'muzeinyi-kompleks-verhnyaya-pyshma-69ce61cbda2cf85a00abb80d',
  'muzei-sovremennogo-iskusstva-permm-5e4423fcaadb42a1889abee3',
  'картинная-галерея-паршин-6991ec6651cf628fef564fdb',
];

const dryRun = process.env.DRY_RUN !== '0';
const c = new Client({ connectionString: process.env.DATABASE_URL });
await c.connect();

const { rows } = await c.query(
  `SELECT id, title, slug, kind::text AS kind, "pageStatus"::text AS status,
          "canonicalPath", "isIndexable",
          (latitude IS NOT NULL AND longitude IS NOT NULL) AS has_coords,
          NULLIF(trim(address), '') IS NOT NULL AS has_address
   FROM "Venue" WHERE slug = ANY($1::text[]) ORDER BY title`,
  [slugs],
);

console.log('matched', rows.length, '/', slugs.length);
for (const r of rows) {
  console.log(
    `${r.status.padEnd(10)} coords=${r.has_coords} addr=${r.has_address} idx=${r.isIndexable} | ${r.title} | ${r.slug} | ${r.canonicalPath || '-'}`,
  );
}

const missing = slugs.filter((s) => !rows.some((r) => r.slug === s));
if (missing.length) console.log('MISSING SLUGS:', missing);

// Skip: Tretyakov duplicate (already published elsewhere), hall-only fragments
const SKIP = new Set([
  'moskva-lavrushinskii-pereulok-10-6a1fd5158bd71b8ae77e127c', // дубль Третьяковки
  'muzei-zapovednik-caricyno-bazhenovskii-zal-tavricheskii-zal-6998512396ca62a956f2c5b9', // зал, не музей
  'усадьба-кусково-портретная-галерея-большои-каменнои-оранжереи-65c23f6cb4500cc20a8be9f3', // комната галереи
]);

const toPublish = rows.filter((r) => !SKIP.has(r.slug) && r.status === 'CANDIDATE');
console.log('\nTO PUBLISH:', toPublish.length);
for (const r of toPublish) console.log(' -', r.slug);

if (!dryRun) {
  const ids = toPublish.map((r) => r.id);
  const upd = await c.query(
    `UPDATE "Venue"
     SET "pageStatus" = 'PUBLISHED',
         "isIndexable" = true,
         "updatedAt" = NOW()
     WHERE id = ANY($1::text[])
     RETURNING slug, title, "pageStatus"::text`,
    [ids],
  );
  console.log('\nUPDATED', upd.rows.length);
  for (const r of upd.rows) console.log(' OK', r.slug);
} else {
  console.log('\nDRY_RUN=1 (set DRY_RUN=0 to apply)');
}

await c.end();
