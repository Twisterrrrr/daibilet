import { createRequire } from 'node:module';
const require = createRequire('/opt/daibilet/apps/backend/package.json');
const { Client } = require('pg');

const slugs = [
  'государственныи-геологическии-музеи-им-вернадского-58d0097cd352860017f35db4',
  'государственныи-музеи-а-с-пушкина-5bf694763dc0e5000bc16feb',
  'дом-музеи-гоголя-5693cd139cb53836a4dbec2c',
  'картинная-галерея-паршин-6991ec6651cf628fef564fdb',
  'музеи-им-н-островского-5d61087e6be9adfb0dd8425b',
  'музеи-квартира-актеров-самоиловых-629a730956297debbec65aa0',
  'новодевичии-монастырь-62931a512b3d98181e4f888c',
  'покровскии-собор-638f165cb2496ab2eb6eb37a',
];

const c = new Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
const upd = await c.query(
  `UPDATE "Venue"
   SET "canonicalPath" = '/venues/' || slug,
       "updatedAt" = NOW()
   WHERE slug = ANY($1::text[])
     AND ("canonicalPath" IS NULL OR trim("canonicalPath") = '')
   RETURNING slug, "canonicalPath", "pageStatus"::text`,
  [slugs],
);
console.log('canonicalPath set:', upd.rows.length);
for (const r of upd.rows) console.log(r.slug, '->', r.canonicalPath);
await c.end();
